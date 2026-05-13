import { AzureKeyCredential } from '@azure/core-auth';
import {
  VoiceLiveClient,
  type VoiceLiveSession,
  type VoiceLiveSubscription,
  type ServerEventResponseTextDelta,
  type ServerEventResponseTextDone,
  type ServerEventResponseDone,
  type ServerEventResponseCreated,
  type ServerEventResponseAudioDelta,
  type ServerEventConversationItemInputAudioTranscriptionDelta,
  type ServerEventConversationItemInputAudioTranscriptionCompleted,
  type ServerEventError,
  type ServerEventSessionAvatarConnecting,
  type ServerEventSessionUpdated,
  type ServerEventSessionCreated,
  type ServerEventResponseFunctionCallArgumentsDelta,
  type ServerEventResponseFunctionCallArgumentsDone,
  type VoiceLiveSessionHandlers,
  type RequestSession,
  type AvatarConfig as SdkAvatarConfig,
  type ClientEventSessionAvatarConnect,
} from '@azure/ai-voicelive';
import type { VoiceLiveChatConfig, ChatMessage, AvatarConfig } from './chatDefaults';
import { Pcm16Player, type VolumeCallback } from './audio/pcmPlayer';

export type ChatState = {
  isConnected: boolean;
  isRecording: boolean;
  isSpeaking: boolean;
  isAvatarConnected: boolean;
  messages: ChatMessage[];
  statusText: string;
  sessionId: string;
};

export type ChatClientEvents = {
  onState: (next: ChatState) => void;
  onAvatarTrack?: (event: RTCTrackEvent) => void;
  onResponseComplete?: () => void; // Called when a response is fully complete
  onResponseStart?: () => void; // Called when response starts (to pause VAD)
  onUserTranscriptComplete?: (messageId: string, transcript: string) => void | Promise<void>;
  onFunctionCall?: (name: string, args: string) => string | Promise<string | void> | void;
};

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

export class VoiceLiveChatClient {
  private client?: VoiceLiveClient;
  private session?: VoiceLiveSession;
  private subscription?: VoiceLiveSubscription;
  private readonly pcmPlayer = new Pcm16Player();
  private peerConnection?: RTCPeerConnection;
  private avatarConfig?: AvatarConfig;
  private pendingIceServers?: RTCIceServer[];

  private state: ChatState = {
    isConnected: false,
    isRecording: false,
    isSpeaking: false,
    isAvatarConnected: false,
    messages: [],
    statusText: '',
    sessionId: '',
  };

  private currentResponseText = '';
  private currentResponseId = '';
  private currentResponseMessageId = '';  // Track the ID of the current streaming message
  private currentFunctionCallName = '';
  private currentFunctionCallArgs = '';
  private currentFunctionCallId = '';
  private pendingFunctionResult: { callId: string; output: string } | null = null;
  private currentUserTranscript = '';
  private currentUserMessageId = '';  // Track the ID of the current user message
  private isResponseInProgress = false;

  // Latency tracking
  private userSpeechEndTime: number | null = null;
  private firstAudioReceived = false;
  private currentTurnLatency: number | null = null;

  private readonly events: ChatClientEvents;

  constructor(events: ChatClientEvents) {
    this.events = events;
  }

  get snapshot(): ChatState {
    return this.state;
  }

  getCurrentTurnLatency(): number | null {
    return this.currentTurnLatency;
  }

  getUserSpeechEndTime(): number | null {
    return this.userSpeechEndTime;
  }

  setCurrentTurnLatency(latency: number): void {
    this.currentTurnLatency = latency;
  }

  // Called by external VAD when user speech ends (for client-side latency measurement)
  markSpeechEndByClientVAD(): void {
    this.userSpeechEndTime = performance.now();
    this.firstAudioReceived = false;
    // @ts-ignore - fractionalSecondDigits is valid but not in TypeScript types
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    console.log(`🎤 [VoiceLive] Speech end detected by client VAD at ${timestamp} - starting latency measurement`);
  }

  setPlaybackVolumeCallback(callback: VolumeCallback | null) {
    this.pcmPlayer.setVolumeCallback(callback);
  }

  setPlaybackCompleteCallback(callback: () => void) {
    this.pcmPlayer.setPlaybackCompleteCallback(callback);
  }

  setPlaybackStartCallback(callback: (actualStartTime: number) => void) {
    this.pcmPlayer.setPlaybackStartCallback(callback);
  }

  private setState(patch: Partial<ChatState>) {
    this.state = { ...this.state, ...patch };
    this.events.onState(this.state);
  }

  private addMessage(type: ChatMessage['type'], content: string): string {
    const message: ChatMessage = {
      id: generateId(),
      type,
      content,
      timestamp: Date.now(),
    };
    this.setState({ messages: [...this.state.messages, message] });
    return message.id;
  }

  // Public method to add status messages (like latency info)
  addStatusMessage(content: string): void {
    this.addMessage('status', content);
  }

  private updateLastMessage(content: string) {
    console.log('[VoiceLive Chat] Updating last message with:', content);
    const messages = [...this.state.messages];
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      console.log('[VoiceLive Chat] Last message type:', lastMessage.type);
      messages[messages.length - 1] = {
        ...lastMessage,
        content,
      };
      this.setState({ messages });
    } else {
      console.warn('[VoiceLive Chat] No messages to update!');
    }
  }

  private updateMessageById(messageId: string, content: string) {
    const messages = [...this.state.messages];
    const index = messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      messages[index] = {
        ...messages[index],
        content,
      };
      this.setState({ messages });
    } else {
      console.warn('[VoiceLive Chat] Message not found:', messageId);
    }
  }

  updateMessageHtmlById(messageId: string, content: string, contentHtml: string) {
    const messages = [...this.state.messages];
    const index = messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      messages[index] = {
        ...messages[index],
        content,
        contentHtml,
      };
      this.setState({ messages });
    }
  }

  private async createResponse() {
    if (!this.session) throw new Error('Not connected');
    await this.session.sendEvent({
      type: 'response.create',
      response: { modalities: ['text', 'audio'] },
    });
  }

  private async sendPendingFunctionResult() {
    if (this.pendingFunctionResult && this.session) {
      console.log('[VoiceLive Chat] Sending pending function result to server...');
      const { callId, output } = this.pendingFunctionResult;
      this.pendingFunctionResult = null;

      await this.session.addConversationItem({
        type: 'function_call_output',
        callId: callId,
        output: output,
      } as any);

      console.log('[VoiceLive Chat] Triggering response for function result...');
      await this.session.sendEvent({
        type: 'response.create',
        response: { modalities: ['text', 'audio'] },
      });
    }
  }

  private buildAvatarConfig(avatar: AvatarConfig): SdkAvatarConfig | undefined {
    if (!avatar.enabled || avatar.type === 'none') {
      return undefined;
    }

    // Basic video params - don't over-constrain with crop initially
    const videoParams = {
      codec: 'h264' as const,
    };

    if (avatar.customized && avatar.customAvatarName) {
      if (avatar.type === 'photo') {
        return {
          type: 'photo-avatar',
          model: 'vasa-1',
          character: avatar.customAvatarName,
          customized: true,
          video: videoParams,
        };
      }
      return {
        type: 'video-avatar',
        character: avatar.customAvatarName,
        customized: true,
        video: videoParams,
      };
    }

    if (avatar.type === 'photo') {
      return {
        type: 'photo-avatar',
        model: 'vasa-1',
        character: avatar.character,
        customized: false,
        video: videoParams,
      };
    }

    return {
      type: 'video-avatar',
      character: avatar.character,
      style: avatar.style,
      customized: false,
      video: videoParams,
    };
  }

  private buildSessionConfig(config: VoiceLiveChatConfig): RequestSession {
    // Determine voice configuration based on voice type
    let voiceConfig: string | { type: string; name: string; model?: string };

    if (config.voiceType === 'personal') {
      // Personal voice uses azure-personal type with speaker profile ID
      voiceConfig = {
        type: 'azure-personal',
        name: config.personalVoiceSpeakerProfileId,
        model: config.personalVoiceModel,
      };
    } else {
      // Standard voice: OpenAI voices are simple names without hyphens or colons (alloy, shimmer, etc.)
      // Azure voices contain hyphens or colons (en-US-AvaMultilingualNeural, en-us-ava:DragonHDLatestNeural)
      const isOpenAIVoice = !config.voice.includes('-') && !config.voice.includes(':');
      voiceConfig = isOpenAIVoice
        ? config.voice
        : {
            name: config.voice,
            type: 'azure-standard',
          };
    }

    const avatarSdkConfig = this.buildAvatarConfig(config.avatar);
    const modalities: string[] = ['text', 'audio'];
    if (avatarSdkConfig) {
      modalities.push('avatar');
    }

    // GPT-5 models don't support custom temperature, only default (1)
    const isGpt5Model = config.model.includes('gpt-5');
    const temperature = isGpt5Model ? 1 : config.temperature;

    // Define tools for function calling based on enabled functions
    const tools: any[] = [];

    if (config.enableFunctionCalling) {
      if (config.functions.enableDateTime) {
        tools.push({
          type: 'function',
          name: 'getCurrentDateTime',
          description: 'Get the current date and time in ISO 8601 format with timezone information',
          parameters: {
            type: 'object',
            properties: {},
            required: [],
          },
        });
      }

      if (config.functions.enableWeatherForecast) {
        tools.push({
          type: 'function',
          name: 'getWeatherForecast',
          description: 'Get a detailed 7-day weather forecast for the user\'s location. This is a long-running operation that takes about 10 seconds to fetch comprehensive weather data.',
          parameters: {
            type: 'object',
            properties: {},
            required: [],
          },
        });
      }
    }

    for (const tool of config.customTools ?? []) {
      tools.push({
        type: 'function',
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      });
    }

    return {
      modalities: modalities as any,
      model: config.model,
      instructions: config.instructions,
      voice: voiceConfig as any,
      inputAudioFormat: 'pcm16',
      outputAudioFormat: 'pcm16',
      inputAudioTranscription: {
        model: config.model.includes('gpt') && config.model.includes('realtime')
          ? 'whisper-1'
          : 'azure-speech',
        language: config.recognitionLanguage === 'auto' ? undefined : config.recognitionLanguage,
      },
      turnDetection: {
        type: config.turnDetectionType,
        removeFillerWords: config.removeFillerWords,
        createResponse: !config.asrOnly,
      },
      temperature,
      inputAudioNoiseReduction: config.useNoiseSuppression
        ? { type: 'azure_deep_noise_suppression' }
        : undefined,
      inputAudioEchoCancellation: config.useEchoCancellation
        ? { type: 'server_echo_cancellation' }
        : undefined,
      avatar: avatarSdkConfig,
      tools: tools.length > 0 ? tools : undefined,
      toolChoice: tools.length > 0 ? 'auto' : undefined,
    };
  }

  private async initPeerConnectionWithIceServers(iceServers: RTCIceServer[]): Promise<void> {
    console.log('[VoiceLive Chat] initPeerConnectionWithIceServers called');
    console.log('[VoiceLive Chat] ICE servers count:', iceServers.length);

    // Create peer connection with ICE servers from server
    this.peerConnection = new RTCPeerConnection({ iceServers });
    console.log('[VoiceLive Chat] RTCPeerConnection created');

    // Clean up any existing video elements will be handled by onAvatarTrack callback

    this.peerConnection.ontrack = (event: RTCTrackEvent) => {
      console.log('[VoiceLive Chat] ontrack event - track kind:', event.track.kind, 'streams:', event.streams.length);
      if (this.events.onAvatarTrack) {
        this.events.onAvatarTrack(event);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('[VoiceLive Chat] ICE connection state:', this.peerConnection?.iceConnectionState);
      if (this.peerConnection?.iceConnectionState === 'connected') {
        this.setState({ isAvatarConnected: true, statusText: 'Avatar connected' });
      } else if (
        this.peerConnection?.iceConnectionState === 'disconnected' ||
        this.peerConnection?.iceConnectionState === 'failed'
      ) {
        this.setState({ isAvatarConnected: false });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('[VoiceLive Chat] Connection state:', this.peerConnection?.connectionState);
    };

    this.peerConnection.onsignalingstatechange = () => {
      console.log('[VoiceLive Chat] Signaling state:', this.peerConnection?.signalingState);
    };

    // Use sendrecv direction as required by the avatar service
    this.peerConnection.addTransceiver('video', { direction: 'sendrecv' });
    this.peerConnection.addTransceiver('audio', { direction: 'sendrecv' });
    console.log('[VoiceLive Chat] Transceivers added');

    // Create data channel for events
    this.peerConnection.createDataChannel('eventChannel');
    console.log('[VoiceLive Chat] Data channel created');

    this.peerConnection.addEventListener('datachannel', (event) => {
      const dataChannel = event.channel;
      console.log('[VoiceLive Chat] Data channel received:', dataChannel.label);
      dataChannel.onmessage = (e) => {
        console.log('[VoiceLive Chat] WebRTC data channel message:', e.data);
      };
      dataChannel.onclose = () => {
        console.log('[VoiceLive Chat] Data channel closed');
      };
    });

    // Create offer
    console.log('[VoiceLive Chat] Creating offer...');
    const offer = await this.peerConnection.createOffer();
    console.log('[VoiceLive Chat] Offer created, type:', offer.type);
    await this.peerConnection.setLocalDescription(offer);
    console.log('[VoiceLive Chat] Local description set');

    // Wait for ICE gathering to complete (with timeout)
    console.log('[VoiceLive Chat] Waiting for ICE gathering...');
    await new Promise<void>((resolve) => {
      if (this.peerConnection?.iceGatheringState === 'complete') {
        console.log('[VoiceLive Chat] ICE gathering already complete');
        resolve();
      } else {
        this.peerConnection!.onicegatheringstatechange = () => {
          console.log('[VoiceLive Chat] ICE gathering state:', this.peerConnection?.iceGatheringState);
          if (this.peerConnection?.iceGatheringState === 'complete') resolve();
        };
        // Timeout after 2 seconds as in reference implementation
        setTimeout(() => {
          console.log('[VoiceLive Chat] ICE gathering timeout (2s)');
          resolve();
        }, 2000);
      }
    });

    // Send client SDP to server (base64 encoded JSON as expected by service)
    const localDescription = this.peerConnection.localDescription;
    console.log('[VoiceLive Chat] Local description:', localDescription?.type, 'SDP length:', localDescription?.sdp?.length);
    if (localDescription && this.session) {
      const clientSdp = btoa(JSON.stringify(localDescription));
      console.log('[VoiceLive Chat] Sending client SDP (base64 encoded), length:', clientSdp.length);
      const avatarConnectEvent: ClientEventSessionAvatarConnect = {
        type: 'session.avatar.connect',
        clientSdp,
      };
      await this.session.sendEvent(avatarConnectEvent);
      console.log('[VoiceLive Chat] Client SDP sent successfully');
    } else {
      console.error('[VoiceLive Chat] Cannot send SDP - no local description or session');
    }
  }

  private async handleServerSdpAnswer(serverSdp: string): Promise<void> {
    if (!this.peerConnection) {
      console.error('[VoiceLive Chat] No peer connection when receiving server SDP');
      return;
    }

    try {
      // Server sends base64-encoded JSON of the SDP
      const sdpAnswer = new RTCSessionDescription(
        JSON.parse(atob(serverSdp)) as RTCSessionDescriptionInit
      );
      console.log('[VoiceLive Chat] Setting remote description (answer)');
      await this.peerConnection.setRemoteDescription(sdpAnswer);
      console.log('[VoiceLive Chat] Remote description set successfully');
    } catch (error) {
      console.error('[VoiceLive Chat] Failed to set remote description:', error);
      throw error;
    }
  }

  private closePeerConnection(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = undefined;
      this.setState({ isAvatarConnected: false });
    }
  }

  private async executeFunction(name: string, args: string): Promise<string> {
    console.log('[VoiceLive Chat] Executing function:', name, 'with args:', args);

    const customResult = await this.events.onFunctionCall?.(name, args);
    if (customResult !== undefined) {
      return typeof customResult === 'string' ? customResult : JSON.stringify({ success: true });
    }

    if (name === 'getCurrentDateTime') {
      const now = new Date();
      const result = {
        datetime: now.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: now.getTime(),
      };
      return JSON.stringify(result);
    }

    if (name === 'getWeatherForecast') {
      console.log('[VoiceLive Chat] Starting weather forecast fetch (10 second operation)...');
      const startTime = Date.now();

      // Simulate 10-second weather API call
      await new Promise(resolve => setTimeout(resolve, 10000));

      const endTime = Date.now();
      console.log(`[VoiceLive Chat] Weather forecast completed. Actual time: ${endTime - startTime}ms`);

      // Generate realistic weather forecast data
      const result = {
        location: 'Seattle, WA',
        current: {
          temperature: 52,
          condition: 'Partly Cloudy',
          humidity: 65,
          windSpeed: 12,
        },
        forecast: [
          { day: 'Today', high: 55, low: 48, condition: 'Partly Cloudy', precipitation: 20 },
          { day: 'Tomorrow', high: 58, low: 50, condition: 'Sunny', precipitation: 5 },
          { day: 'Wednesday', high: 60, low: 52, condition: 'Sunny', precipitation: 0 },
          { day: 'Thursday', high: 57, low: 49, condition: 'Cloudy', precipitation: 30 },
          { day: 'Friday', high: 54, low: 47, condition: 'Rainy', precipitation: 75 },
          { day: 'Saturday', high: 56, low: 48, condition: 'Partly Cloudy', precipitation: 40 },
          { day: 'Sunday', high: 59, low: 51, condition: 'Sunny', precipitation: 10 },
        ],
        fetchedAt: new Date().toISOString(),
      };
      return JSON.stringify(result);
    }

    return JSON.stringify({ error: 'Unknown function' });
  }

  async connect(config: VoiceLiveChatConfig) {
    if (this.state.isConnected) return;

    const endpoint = config.endpoint.trim();
    const apiKey = config.apiKey.trim();

    if (!endpoint) throw new Error('Missing endpoint');
    if (!apiKey) throw new Error('Missing API key');
    if (looksLikeUrl(apiKey)) {
      throw new Error('Invalid Voice Live API key: the API key field contains a URL. Paste the resource key into Voice Live Config.');
    }

    this.avatarConfig = config.avatar;
    this.setState({ statusText: 'Connecting...' });

    this.client = new VoiceLiveClient(
      endpoint,
      new AzureKeyCredential(apiKey),
      {
        apiVersion: '2025-10-01',
        defaultSessionOptions: { enableDebugLogging: false },
      }
    );

    const sessionConfig = this.buildSessionConfig(config);
    console.log('[VoiceLive Chat] Session config:', JSON.stringify(sessionConfig, null, 2));

    // Create session without connecting first so we can subscribe to handlers
    this.session = this.client.createSession(config.model, { connectionTimeoutInMs: 30000 });
    console.log('[VoiceLive Chat] Session created, subscribing to handlers...');

    // Subscribe to handlers BEFORE connecting so we don't miss any events
    const handlers: VoiceLiveSessionHandlers = {
      onConnected: async (_args, ctx) => {
        console.log('[VoiceLive Chat] Connected', { sessionId: ctx.sessionId, ctx });
        this.setState({ statusText: 'Connected' });
      },
      onDisconnected: async (args) => {
        console.log('[VoiceLive Chat] Disconnected', args);
        this.closePeerConnection();
        this.setState({ statusText: `Disconnected: ${args.reason}` });
      },
      onServerError: async (event: ServerEventError) => {
        console.error('[VoiceLive Chat] Server error', event.error);
        console.error('[VoiceLive Chat] Error details:', JSON.stringify(event.error, null, 2));
        this.addMessage('error', `Server Error: ${event.error.message}`);
        this.setState({ statusText: `Error: ${event.error.message}` });
      },
      onSessionCreated: async (event: ServerEventSessionCreated) => {
        console.log('[VoiceLive Chat] Session created', JSON.stringify(event.session, null, 2));
        // Extract session ID from event.session.id
        const sid = (event.session as any).id || '';
        console.log('[VoiceLive Chat] Extracted session ID:', sid);
        if (sid) {
          this.setState({ sessionId: sid });
        }
        if (event.session.avatar) {
          console.log('[VoiceLive Chat] Avatar in created session:', JSON.stringify(event.session.avatar, null, 2));
        }
      },
      onSessionUpdated: async (event: ServerEventSessionUpdated) => {
        console.log('[VoiceLive Chat] Session updated', JSON.stringify(event.session, null, 2));
        // Check if avatar is configured with ICE servers
        if (event.session.avatar) {
          console.log('[VoiceLive Chat] Avatar configured in session:', JSON.stringify(event.session.avatar, null, 2));
          const iceServers = (event.session.avatar as any).iceServers;
          console.log('[VoiceLive Chat] ICE servers from avatar:', iceServers);
          if (iceServers && Array.isArray(iceServers)) {
            console.log('[VoiceLive Chat] Received ICE servers:', JSON.stringify(iceServers, null, 2));
            // Validate ICE servers format
            if (iceServers.every((server: any) => typeof server === 'object' && server.urls)) {
              console.log('[VoiceLive Chat] ICE servers valid, initializing peer connection...');
              try {
                await this.initPeerConnectionWithIceServers(iceServers as RTCIceServer[]);
                console.log('[VoiceLive Chat] Peer connection initialized successfully');
              } catch (error) {
                console.error('[VoiceLive Chat] Failed to init peer connection:', error);
                this.addMessage('error', `Avatar setup failed: ${error}`);
              }
            } else {
              console.error('[VoiceLive Chat] Invalid ICE servers format:', iceServers);
            }
          } else {
            console.log('[VoiceLive Chat] No ICE servers in avatar config yet');
          }
        } else {
          console.log('[VoiceLive Chat] No avatar in session update');
        }
      },
      onSessionAvatarConnecting: async (event: ServerEventSessionAvatarConnecting) => {
        console.log('[VoiceLive Chat] Avatar connecting event received');
        console.log('[VoiceLive Chat] Server SDP length:', event.serverSdp?.length);
        console.log('[VoiceLive Chat] Server SDP preview:', event.serverSdp?.substring(0, 100));
        try {
          await this.handleServerSdpAnswer(event.serverSdp);
          console.log('[VoiceLive Chat] Server SDP handled successfully');
        } catch (error) {
          console.error('[VoiceLive Chat] Failed to handle server SDP:', error);
          this.addMessage('error', `Avatar connection failed: ${error}`);
        }
      },
      onConversationItemInputAudioTranscriptionDelta: async (event: any) => {
        console.log('[VoiceLive Chat] User transcription delta:', event.delta);

        // Create user message on first delta if not exists
        if (!this.currentUserMessageId) {
          this.currentUserMessageId = this.addMessage('user', '');
        }

        this.currentUserTranscript += event.delta;
        this.updateMessageById(this.currentUserMessageId, this.currentUserTranscript);
      },
      onConversationItemInputAudioTranscriptionCompleted: async (
        event: ServerEventConversationItemInputAudioTranscriptionCompleted
      ) => {
        console.log('[VoiceLive Chat] Transcription completed', event.transcript);

        // If we didn't get deltas, add the full transcript now
        if (!this.currentUserMessageId && event.transcript?.trim()) {
          this.currentUserMessageId = this.addMessage('user', event.transcript);
        }

        if (this.currentUserMessageId && event.transcript?.trim()) {
          await this.events.onUserTranscriptComplete?.(this.currentUserMessageId, event.transcript);
        }

        // Reset user transcript and message ID
        this.currentUserTranscript = '';
        this.currentUserMessageId = '';
      },
      onInputAudioBufferSpeechStarted: async () => {
        console.log('[VoiceLive Chat] Speech started - interrupting playback');
        // Stop current audio playback immediately when user starts speaking
        this.pcmPlayer.stop();
        this.setState({ isSpeaking: true });
      },
      onInputAudioBufferSpeechStopped: async () => {
        console.log('[VoiceLive Chat] Speech stopped');
        this.setState({ isSpeaking: false });
      },
      onResponseCreated: async (event: ServerEventResponseCreated) => {
        console.log('[VoiceLive Chat] Response created', event);
        this.isResponseInProgress = true;
        this.currentResponseId = event.response.id ?? generateId();
        this.currentResponseText = '';
        this.currentResponseMessageId = '';  // Reset message ID for new response
        this.currentFunctionCallName = '';
        this.currentFunctionCallArgs = '';
        this.currentFunctionCallId = '';
      },
      onResponseTextDelta: async (event: ServerEventResponseTextDelta) => {
        console.log('[VoiceLive Chat] Text delta:', event.delta);

        // Create message on first delta if not exists
        if (!this.currentResponseMessageId) {
          this.currentResponseMessageId = this.addMessage('assistant', '');
        }

        this.currentResponseText += event.delta;
        this.updateMessageById(this.currentResponseMessageId, this.currentResponseText);
      },
      onResponseTextDone: async (event: ServerEventResponseTextDone) => {
        console.log('[VoiceLive Chat] Response text done', event);
      },
      onResponseFunctionCallArgumentsDelta: async (event: ServerEventResponseFunctionCallArgumentsDelta) => {
        console.log('[VoiceLive Chat] Function call arguments delta', event);
        this.currentFunctionCallArgs += event.delta;
        this.currentFunctionCallId = event.callId;
      },
      onResponseFunctionCallArgumentsDone: async (event: ServerEventResponseFunctionCallArgumentsDone) => {
        console.log('[VoiceLive Chat] Function call arguments done', event);

        // Execute the function asynchronously (don't await for long-running operations)
        // This allows the response to complete while the function runs in background
        this.executeFunction(event.name, event.arguments).then(async (result) => {
          console.log('[VoiceLive Chat] Function result:', result);

          // Store the pending result
          this.pendingFunctionResult = {
            callId: event.callId,
            output: result,
          };

          // Check if a response is currently in progress
          if (this.isResponseInProgress) {
            console.log('[VoiceLive Chat] Response in progress, waiting for onResponseDone to send function result...');
            // Don't send yet - wait for onResponseDone
          } else {
            // No response in progress, send immediately
            console.log('[VoiceLive Chat] No response in progress, sending function result immediately...');
            await this.sendPendingFunctionResult();
          }
        }).catch((error) => {
          console.error('[VoiceLive Chat] Function execution error:', error);
          this.addMessage('error', `Function error: ${error.message}`);
        });

        // Reset function call state
        this.currentFunctionCallName = '';
        this.currentFunctionCallArgs = '';
        this.currentFunctionCallId = '';
      },
      onResponseAudioDelta: async (event: ServerEventResponseAudioDelta) => {
        // Pause VAD on first audio chunk (always, regardless of latency measurement)
        if (!this.firstAudioReceived) {
          this.events.onResponseStart?.();
        }

        this.firstAudioReceived = true;

        if (!this.avatarConfig?.enabled) {
          const chunk = event.delta;
          if (chunk instanceof Uint8Array) {
            this.pcmPlayer.enqueuePcm16(chunk, 24000);
          }
        }
      },
      onResponseAudioTranscriptDelta: async (event: any) => {
        console.log('[VoiceLive Chat] Audio transcript delta:', event.delta);

        // Create message on first delta if not exists
        if (!this.currentResponseMessageId) {
          this.currentResponseMessageId = this.addMessage('assistant', '');
        }

        this.currentResponseText += event.delta;
        this.updateMessageById(this.currentResponseMessageId, this.currentResponseText);
      },
      onResponseAudioTranscriptDone: async (event: any) => {
        console.log('[VoiceLive Chat] Audio transcript done', event);
      },
      onResponseDone: async (event: ServerEventResponseDone) => {
        console.log('[VoiceLive Chat] Response done', event);

        // Mark response as no longer in progress
        this.isResponseInProgress = false;

        // Check for failed response status
        if (event.response.status === 'failed') {
          const statusDetails = (event.response as any).statusDetails;
          const errorMsg = statusDetails?.error?.message || 'Response failed';
          console.error('[VoiceLive Chat] Response failed:', statusDetails);
          this.addMessage('error', `Response Error: ${errorMsg}`);
          this.setState({ statusText: `Error: ${errorMsg}` });
          this.currentResponseText = '';
          this.currentResponseId = '';
          return;
        }

        // If we didn't get text deltas, try to extract text from response output
        if (!this.currentResponseText.trim() && event.response.output && event.response.output.length > 0) {
          const outputItem: any = event.response.output[0];
          if (outputItem?.content && Array.isArray(outputItem.content)) {
            const textContent = outputItem.content.find(
              (c: any) => (c.type === 'audio' && c.transcript) || c.type === 'text'
            );
            if (textContent?.transcript) {
              this.updateLastMessage(textContent.transcript);
            } else if (textContent?.text) {
              this.updateLastMessage(textContent.text);
            }
          }
        }

        this.currentResponseText = '';
        this.currentResponseId = '';
        this.currentResponseMessageId = '';

        // If there's a pending function result, send it now
        if (this.pendingFunctionResult) {
          console.log('[VoiceLive Chat] Response complete, sending pending function result...');
          await this.sendPendingFunctionResult();
        }

        // Notify that response is complete (before resetting latency)
        this.events.onResponseComplete?.();

        // Reset latency tracking for next turn
        this.userSpeechEndTime = null;
        this.firstAudioReceived = false;
        this.currentTurnLatency = null;
      },
      onError: async (args) => {
        console.log('[VoiceLive Chat] Error', args);
        this.addMessage('error', `${args.context}: ${args.error.message}`);
      },
    };

    this.subscription = this.session.subscribe(handlers);
    console.log('[VoiceLive Chat] Handlers subscribed, connecting...');

    // Now connect and send session configuration
    try {
      await this.session.connect();
      console.log('[VoiceLive Chat] WebSocket connected, sending session config...');
      await this.session.updateSession(sessionConfig);
      console.log('[VoiceLive Chat] Session config sent successfully');
    } catch (error) {
      console.error('[VoiceLive Chat] Failed to connect or update session:', error);
      throw error;
    }

    if (!config.avatar.enabled) {
      await this.pcmPlayer.resume();
    }

    this.setState({
      isConnected: true,
      statusText: config.avatar.enabled ? 'Connecting avatar...' : 'Ready',
    });
  }

  async disconnect() {
    this.setState({ isRecording: false, isSpeaking: false });

    try {
      this.closePeerConnection();
      this.pcmPlayer.stop();
      await this.subscription?.close();
      this.subscription = undefined;

      await this.session?.dispose();
      this.session = undefined;

      this.client = undefined;
    } finally {
      this.setState({ isConnected: false, isAvatarConnected: false, statusText: 'Disconnected' });
    }
  }

  async sendText(text: string) {
    if (!this.session) throw new Error('Not connected');
    const trimmed = text.trim();
    if (!trimmed) return;

    // Add user message to chat
    this.addMessage('user', trimmed);

    await this.session.addConversationItem({
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: trimmed }],
    } as any);

    await this.createResponse();
  }

  async addContextText(text: string) {
    if (!this.session) throw new Error('Not connected');
    const trimmed = text.trim();
    if (!trimmed) return;

    await this.session.addConversationItem({
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: trimmed }],
    } as any);
  }

  async addSystemText(text: string) {
    if (!this.session) throw new Error('Not connected');
    const trimmed = text.trim();
    if (!trimmed) return;

    await this.session.addConversationItem({
      type: 'message',
      role: 'system',
      content: [{ type: 'input_text', text: trimmed }],
    } as any);
  }

  async requestResponse() {
    await this.createResponse();
  }

  async sendAudio(pcm16leBytes: Uint8Array) {
    if (!this.session || !this.session.isConnected) return;
    await this.session.sendAudio(pcm16leBytes);
  }

  clearMessages() {
    this.setState({ messages: [] });
  }
}
