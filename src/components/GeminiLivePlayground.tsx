import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GeminiClient, type ConnectionStatus } from '../lib/geminiLive/geminiClient';
import { GeminiAudioHandler } from '../lib/geminiLive/audioHandler';
import { SAMPLE_PRODUCT_DATA } from '../data/productData';
import { PageDocsLink, AZURE_SPEECH_DOCS } from './PageDocsLink';

// VAD type for the dynamically loaded library
type MicVADInstance = {
  start: () => void;
  pause: () => void;
  destroy: () => void;
};

// Declare the global vad object loaded from script
declare global {
  interface Window {
    vad?: {
      MicVAD: {
        new: (options: Record<string, unknown>) => Promise<MicVADInstance>;
      };
    };
  }
}

// Load VAD script dynamically
async function loadVADScript(): Promise<void> {
  if (window.vad) return;

  // First load onnxruntime-web
  await new Promise<void>((resolve, reject) => {
    const ortScript = document.createElement('script');
    ortScript.src = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.0/dist/ort.min.js';
    ortScript.onload = () => resolve();
    ortScript.onerror = () => reject(new Error('Failed to load ONNX Runtime script'));
    document.head.appendChild(ortScript);
  });

  // Then load VAD
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/bundle.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load VAD script'));
    document.head.appendChild(script);
  });
}

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface GeminiLivePlaygroundProps {}

export function GeminiLivePlayground({}: GeminiLivePlaygroundProps) {
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('gemini-api-key') || '';
  });
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [enableProductLookup, setEnableProductLookup] = useState(false);
  const [showResponseLatency, setShowResponseLatency] = useState(() => {
    return localStorage.getItem('gemini-show-latency') === 'true';
  });
  const [interruptionSensitivity, setInterruptionSensitivity] = useState<'low' | 'medium' | 'high'>('medium');
  const [systemPrompt, setSystemPrompt] = useState(`You are a helpful voice assistant. You help customers find products.

When asked about products, use the get_product_inventory tool to retrieve the product catalog. Be conversational and helpful.

Keep your responses concise and natural for voice interaction. Focus on the most relevant information.`);
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  const clientRef = useRef<GeminiClient | null>(null);
  const audioHandlerRef = useRef<GeminiAudioHandler | null>(null);
  const vadRef = useRef<MicVADInstance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const circleRef = useRef<HTMLDivElement | null>(null);
  const vadSilenceDurationRef = useRef<number>(500); // Store VAD silence duration
  const currentLatencyRef = useRef<number | null>(null); // Store current turn latency
  const currentVadDelayRef = useRef<number | null>(null); // Store current turn VAD delay
  const showResponseLatencyRef = useRef<boolean>(showResponseLatency); // Ref for current setting value

  // Transcript state tracking
  const transcriptRef = useRef<{
    inputTranscript: string;
    outputTranscript: string;
    inputMessageId: string | null;
    outputMessageId: string | null;
  }>({
    inputTranscript: '',
    outputTranscript: '',
    inputMessageId: null,
    outputMessageId: null,
  });

  // Save API key to localStorage
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('gemini-api-key', apiKey);
    }
  }, [apiKey]);

  // Save latency setting to localStorage
  useEffect(() => {
    localStorage.setItem('gemini-show-latency', showResponseLatency.toString());
    showResponseLatencyRef.current = showResponseLatency; // Update ref
  }, [showResponseLatency]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
      if (audioHandlerRef.current) {
        audioHandlerRef.current.cleanup();
      }
      if (vadRef.current) {
        vadRef.current.destroy();
      }
    };
  }, []);

  // Set up audio handler circle element
  useEffect(() => {
    if (audioHandlerRef.current && circleRef.current) {
      audioHandlerRef.current.setCircleElement(circleRef.current);
    }
  }, []);

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const updateMessage = useCallback((id: string, content: string) => {
    setMessages((prev) => prev.map((msg) => (msg.id === id ? { ...msg, content } : msg)));
  }, []);

  async function handleConnect() {
    if (!apiKey.trim()) {
      setError('Please enter a Gemini API key');
      return;
    }

    // Cleanup existing client
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
    if (audioHandlerRef.current) {
      audioHandlerRef.current.cleanup();
    }
    if (vadRef.current) {
      vadRef.current.destroy();
      vadRef.current = null;
    }

    // Reset state
    transcriptRef.current = {
      inputTranscript: '',
      outputTranscript: '',
      inputMessageId: null,
      outputMessageId: null,
    };

    // Create audio handler
    const audioHandler = new GeminiAudioHandler();
    audioHandlerRef.current = audioHandler;

    // Set circle element for visualization
    if (circleRef.current) {
      audioHandler.setCircleElement(circleRef.current);
    }

    // Create client
    const client = new GeminiClient({
      apiKey,
      enableProductLookup,
      interruptionSensitivity,
      systemPrompt: systemPrompt.trim() || undefined,
      onAudioData: (audioData) => {
        // Pause VAD during playback to avoid detecting AI's voice
        if (vadRef.current) {
          vadRef.current.pause();
        }
        audioHandler.queueAudioForPlayback(audioData);
      },
      onInputTranscript: (text) => {
        const ts = transcriptRef.current;
        ts.inputTranscript += text;

        if (ts.inputMessageId) {
          updateMessage(ts.inputMessageId, ts.inputTranscript);
        } else {
          const newId = crypto.randomUUID();
          ts.inputMessageId = newId;
          addMessage({
            id: newId,
            type: 'user',
            content: ts.inputTranscript,
            timestamp: new Date(),
          });
        }
      },
      onOutputTranscript: (text) => {
        const ts = transcriptRef.current;

        // Clear input tracking when output starts
        if (ts.inputTranscript) {
          ts.inputTranscript = '';
          ts.inputMessageId = null;
        }

        ts.outputTranscript += text;

        if (ts.outputMessageId) {
          updateMessage(ts.outputMessageId, ts.outputTranscript);
        } else {
          const newId = crypto.randomUUID();
          ts.outputMessageId = newId;
          addMessage({
            id: newId,
            type: 'assistant',
            content: ts.outputTranscript,
            timestamp: new Date(),
          });
        }
      },
      onToolCall: (toolName) => {
        // Reset output state before tool call
        transcriptRef.current.outputTranscript = '';
        transcriptRef.current.outputMessageId = null;

        addMessage({
          id: crypto.randomUUID(),
          type: 'system',
          content: `Calling function: ${toolName}`,
          timestamp: new Date(),
        });
      },
      onTurnComplete: () => {
        // Add latency system message if enabled and latency data available
        if (showResponseLatencyRef.current && currentLatencyRef.current !== null && currentVadDelayRef.current !== null) {
          const totalLatency = Math.round(currentLatencyRef.current + currentVadDelayRef.current);
          addMessage({
            id: crypto.randomUUID(),
            type: 'system',
            content: `Response latency: ${Math.round(currentLatencyRef.current)}ms (Gemini) + ${currentVadDelayRef.current}ms (VAD) = ${totalLatency}ms (total)`,
            timestamp: new Date(),
          });
        }

        // Resume VAD for next turn
        if (vadRef.current) {
          vadRef.current.start();
        }
        // Reset transcript state for next turn
        transcriptRef.current = {
          inputTranscript: '',
          outputTranscript: '',
          inputMessageId: null,
          outputMessageId: null,
        };
        // Reset latency tracking for next turn
        currentLatencyRef.current = null;
        currentVadDelayRef.current = null;
      },
      onInterrupted: () => {
        audioHandler.stopPlayback();
        // Resume VAD after interruption
        if (vadRef.current) {
          vadRef.current.start();
        }
        transcriptRef.current.outputTranscript = '';
        transcriptRef.current.outputMessageId = null;

        addMessage({
          id: crypto.randomUUID(),
          type: 'system',
          content: '[Interrupted]',
          timestamp: new Date(),
        });
      },
      onError: (err) => {
        setError(err);
      },
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
        if (newStatus === 'disconnected') {
          transcriptRef.current = {
            inputTranscript: '',
            outputTranscript: '',
            inputMessageId: null,
            outputMessageId: null,
          };
          setLatency(null);
        }
      },
      onLatencyMeasured: (latencyMs) => {
        const vadSilenceMs = vadSilenceDurationRef.current;
        const totalLatencyMs = latencyMs + vadSilenceMs;
        setLatency(latencyMs);

        // Store latency for current turn
        currentLatencyRef.current = latencyMs;
        currentVadDelayRef.current = vadSilenceMs;

        console.log(`[Gemini] Response latency: ${latencyMs.toFixed(0)}ms (Gemini) + ${vadSilenceMs}ms (VAD silence) = ${totalLatencyMs.toFixed(0)}ms (total from actual speech end)`);
      },
    });

    if (enableProductLookup) {
      client.setProductData(SAMPLE_PRODUCT_DATA);
    }

    clientRef.current = client;

    try {
      setError(null);

      // Pre-load VAD script while connecting to Gemini (in parallel)
      const vadLoadPromise = loadVADScript();

      await client.connect();

      // Initialize VAD for speech end detection (latency measurement)
      await vadLoadPromise;
      if (!window.vad) {
        console.warn('[VAD] Failed to load VAD library, latency measurement disabled');
      } else {
        const basePath = import.meta.env.BASE_URL || '/';
        let speechStartTime: number | null = null;
        let lastAudioChunkTime: number | null = null; // Track when we last received actual audio
        const negativeSpeechThreshold = 0.5;
        const vadSilenceDurationMs = Math.round(negativeSpeechThreshold * 1000);
        vadSilenceDurationRef.current = vadSilenceDurationMs; // Store for latency calculation
        const vad = await window.vad.MicVAD.new({
          onSpeechStart: () => {
            // @ts-ignore - fractionalSecondDigits is valid but not in TypeScript types
            const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
            console.log(`[VAD] Speech start detected at ${timestamp}`);
            speechStartTime = performance.now();
            lastAudioChunkTime = performance.now(); // Reset on speech start
          },
          onFrameProcessed: (probs: Record<string, number>) => {
            // Track when we're actually receiving speech audio (high speech probability)
            if (probs.isSpeech > 0.5) {
              lastAudioChunkTime = performance.now();
            }
          },
          onSpeechEnd: (audio: Float32Array) => {
            // @ts-ignore - fractionalSecondDigits is valid but not in TypeScript types
            const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
            const vadDetectionTime = performance.now();

            // Calculate actual VAD delay from last audio chunk to detection
            if (lastAudioChunkTime !== null) {
              const actualVadDelay = vadDetectionTime - lastAudioChunkTime;

              console.log(`[VAD] Speech end detected at ${timestamp}`);
              console.log(`  - Time since last speech audio: ${actualVadDelay.toFixed(0)}ms`);
              console.log(`  - Configured silence threshold: ${vadSilenceDurationMs}ms`);
              console.log(`  - Additional VAD processing overhead: ${(actualVadDelay - vadSilenceDurationMs).toFixed(0)}ms`);

              // Update the ref with actual measured delay
              vadSilenceDurationRef.current = Math.round(actualVadDelay);
            } else {
              console.log(`[VAD] Speech end detected at ${timestamp} (using configured silence threshold: ${vadSilenceDurationMs}ms)`);
            }

            clientRef.current?.markSpeechEnd();
            speechStartTime = null;
            lastAudioChunkTime = null;
          },
          onVADMisfire: () => {
            // Speech was too short, but still mark it as speech end for latency
            // @ts-ignore - fractionalSecondDigits is valid but not in TypeScript types
            const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
            console.log(`[VAD] Speech too short (misfire) at ${timestamp}, still marking end`);
            clientRef.current?.markSpeechEnd();
          },
          model: 'v5',
          // Speech detection thresholds
          positiveSpeechThreshold: 0.8,
          negativeSpeechThreshold: negativeSpeechThreshold,
          // Timing parameters (in milliseconds)
          redemptionMs: 500,      // Wait 500ms of silence before ending speech (default: 1400ms)
          preSpeechPadMs: 100,    // Prepend 100ms of audio to speech segment (default: 800ms)
          minSpeechMs: 250,       // Minimum speech duration (default: 400ms)
          // Load from local public folder
          onnxWASMBasePath: `${window.location.origin}${basePath}onnx/`,
          baseAssetPath: `${window.location.origin}${basePath}vad/`,
        });
        vadRef.current = vad;
        vad.start();
        console.log('[VAD] Voice Activity Detection initialized');
      }

      // Auto-start recording
      await startRecording();
    } catch (err) {
      setError(`Connection failed: ${err}`);
    }
  }

  async function handleDisconnect() {
    if (audioHandlerRef.current) {
      audioHandlerRef.current.stopRecording();
      audioHandlerRef.current.stopPlayback();
    }
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
    if (vadRef.current) {
      vadRef.current.destroy();
      vadRef.current = null;
    }
    setIsRecording(false);
  }

  async function startRecording() {
    if (!audioHandlerRef.current || !clientRef.current) return;

    try {
      await audioHandlerRef.current.startRecording((audioData) => {
        clientRef.current?.sendAudio(audioData);
      });
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError(`Microphone access failed: ${err}`);
    }
  }

  function stopRecording() {
    if (audioHandlerRef.current) {
      audioHandlerRef.current.stopRecording();
    }
    setIsRecording(false);
  }

  function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  function handleSendText() {
    if (!textInput.trim() || !clientRef.current || status !== 'connected') return;

    addMessage({
      id: crypto.randomUUID(),
      type: 'user',
      content: textInput,
      timestamp: new Date(),
    });

    clientRef.current.sendText(textInput);
    setTextInput('');
  }

  function handleClearMessages() {
    transcriptRef.current = {
      inputTranscript: '',
      outputTranscript: '',
      inputMessageId: null,
      outputMessageId: null,
    };
    setMessages([]);
  }

  function getMessageStyle(type: Message['type']) {
    switch (type) {
      case 'user':
        return 'bg-blue-100 text-blue-900 ml-auto';
      case 'assistant':
        return 'bg-gray-100 text-gray-900 mr-auto';
      case 'system':
        return 'bg-yellow-100 text-yellow-800 mx-auto text-xs';
      default:
        return 'bg-gray-100 text-gray-900';
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="theme-page-header">
        <div className="theme-page-header__inner">
          <div>
            <h1 className="theme-page-title">Gemini Live</h1>
            <p className="theme-page-subtitle">Real-time voice conversation with Gemini AI</p>
          </div>
          <div className="theme-page-header__actions">
            <PageDocsLink href={AZURE_SPEECH_DOCS.overview} />
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                status === 'connected'
                  ? 'bg-green-500/20 text-green-100'
                  : 'bg-white/20 text-white/80'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-400' : 'bg-white/60'}`}
              />
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
            {isRecording && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-red-500/20 text-red-100">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                Recording
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left side - Main Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">

        {/* Audio visualization circle */}
        <div
          className="flex-shrink-0 flex flex-col items-center py-8 border-b border-gray-100"
          style={{ height: '320px' }}
        >
          <div
            ref={circleRef}
            className="rounded-full transition-all duration-150 ease-out flex items-center justify-center"
            style={{
              width: '120px',
              height: '120px',
              backgroundColor: '#e5e7eb',
            }}
          >
            {isPlaying ? (
              /* Speaker icon when AI is speaking */
              <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </svg>
            ) : (
              /* Mic icon when recording/idle */
              <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            )}
          </div>
          {status !== 'connected' && (
            <p className="text-sm text-gray-400 mt-2">Click Connect to begin conversation</p>
          )}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <p className="text-sm">Connect and speak to start chatting with Gemini</p>
              {enableProductLookup && (
                <p className="text-xs mt-2 text-gray-500">
                  Try asking: "What products do you have?"
                </p>
              )}
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id} className={`max-w-[80%] px-4 py-2 rounded-lg ${getMessageStyle(msg.type)}`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-xs opacity-60 mt-1">{msg.timestamp.toLocaleTimeString()}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Text Input & Status */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendText();
                }
              }}
              placeholder="Type a message (or just speak)..."
              disabled={status !== 'connected'}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSendText}
              disabled={status !== 'connected' || !textInput.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
            <button
              onClick={handleClearMessages}
              disabled={messages.length === 0}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Clear chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>

        {/* Right side - Configuration Panel */}
        <div className="theme-side-panel p-6 flex flex-col overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Configuration</h2>

        <div className="space-y-4 flex-1">
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gemini API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={status === 'connected'}
              placeholder="Enter your API key"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
            />
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-600 hover:text-purple-700 underline mt-1 inline-block"
            >
              Get API key
            </a>
          </div>

          {/* Function Calling */}
          <div className="border-t border-gray-200 pt-4">
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={enableProductLookup}
                onChange={(e) => setEnableProductLookup(e.target.checked)}
                disabled={status === 'connected'}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">Enable Product Lookup</span>
            </label>
            <p className="text-xs text-gray-500 ml-6">
              Allows Gemini to look up product information when asked
            </p>
          </div>

          {/* Show Response Latency */}
          <div className="border-t border-gray-200 pt-4">
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={showResponseLatency}
                onChange={(e) => setShowResponseLatency(e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">Show Response Latency</span>
            </label>
            <p className="text-xs text-gray-500 ml-6">
              Display response time metrics in assistant messages
            </p>
          </div>

          {/* Interruption Sensitivity */}
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Interruption Sensitivity</label>
            <select
              value={interruptionSensitivity}
              onChange={(e) => setInterruptionSensitivity(e.target.value as 'low' | 'medium' | 'high')}
              disabled={status === 'connected'}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
            >
              <option value="low">Low - Less likely to interrupt</option>
              <option value="medium">Medium - Balanced</option>
              <option value="high">High - More responsive</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              How easily Gemini gets interrupted when you speak
            </p>
          </div>

          {/* System Prompt */}
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>

            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              disabled={status === 'connected'}
              placeholder="Enter custom instructions for Gemini's behavior"
              rows={6}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 resize-none font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              Custom instructions for Gemini's behavior
            </p>
          </div>

          {/* Connect/Disconnect Button */}
          <div className="pt-2">
            {status !== 'connected' ? (
              <button
                onClick={handleConnect}
                disabled={!apiKey.trim() || status === 'connecting'}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {status === 'connecting' ? 'Connecting...' : 'Connect'}
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h12v12H6z" />
                </svg>
                Disconnect
              </button>
            )}
          </div>

          {/* Mic Toggle (when connected) */}
          {status === 'connected' && (
            <div className="pt-2">
              <button
                onClick={toggleRecording}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md transition-colors ${
                  isRecording
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                {isRecording ? 'Mute Microphone' : 'Unmute Microphone'}
              </button>
            </div>
          )}

          {/* Info */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">About</h3>
            <p className="text-xs text-gray-600">
              This playground demonstrates Gemini Live API integration with real-time voice conversation and
              optional function calling capabilities.
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
