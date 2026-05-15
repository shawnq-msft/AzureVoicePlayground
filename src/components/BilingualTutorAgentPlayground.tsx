import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AzureSettings } from '../types/azure';
import { VoiceLiveChatClient, type ChatState } from '../lib/voiceLive/chatClient';
import { ChatAudioHandler } from '../lib/voiceLive/audio/chatAudioHandler';
import { DEFAULT_CHAT_CONFIG, getChatVoices, type ChatMessage } from '../lib/voiceLive/chatDefaults';
import {
  BILINGUAL_TUTOR_LANGUAGES,
  getBilingualTutorPrompt,
  getLanguageByValue,
  SET_REFERENCE_TEXT_TOOL,
  type BilingualTutorLevel,
} from '../lib/bilingualTutor';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { usePronunciationAssessment, type PronunciationAssessmentResult, type PronunciationAssessmentSession } from '../hooks/usePronunciationAssessment';
import { PageDocsLink, AZURE_SPEECH_DOCS } from './PageDocsLink';
import { notifySidebarConfigAttention } from '../utils/sidebarConfigAttention';

interface BilingualTutorAgentPlaygroundProps {
  settings: AzureSettings;
}

const CONFIG_STORAGE_KEY = 'bilingual-tutor-agent.config';

const LEVELS: { value: BilingualTutorLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

// Silence duration that ends a learner turn. Shared between Voice Live server VAD
// (turnDetection.silenceDurationInMs) and the pronunciation assessment recognizer
// (Speech_SegmentationSilenceTimeoutMs) so both segment learner turns identically.
const SILENCE_TIMEOUT_MS = 1000;
const MAX_PA_VOICELIVE_DISTANCE = 0.55;
const MIN_COMPARABLE_TOKEN_COUNT = 3;
const MIN_EDIT_DISTANCE_TO_HIDE_PA = 3;

function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    return raw ? JSON.parse(raw) as Partial<{
      l1: string;
      l2: string;
      level: BilingualTutorLevel;
      voice: string;
    }> : {};
  } catch {
    return {};
  }
}

function messageClasses(type: ChatMessage['type']) {
  const base = 'max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed';
  switch (type) {
    case 'user':
      return `${base} self-end border border-blue-200 bg-blue-50 text-blue-950`;
    case 'assistant':
      return `${base} self-start border border-gray-200 bg-white text-gray-900`;
    case 'error':
      return `${base} self-center border border-red-200 bg-red-50 text-red-800`;
    default:
      return `${base} self-center border border-gray-200 bg-gray-50 text-gray-600`;
  }
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function containsCjk(value: string) {
  return /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(value);
}

function wordTokens(value: string) {
  return value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function characterTokens(value: string) {
  return Array.from(value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''));
}

function editDistance(source: string[], target: string[]) {
  const previous = Array.from({ length: target.length + 1 }, (_, index) => index);
  const current = new Array<number>(target.length + 1);

  for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex += 1) {
    current[0] = sourceIndex;
    for (let targetIndex = 1; targetIndex <= target.length; targetIndex += 1) {
      const substitutionCost = source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1;
      current[targetIndex] = Math.min(
        previous[targetIndex] + 1,
        current[targetIndex - 1] + 1,
        previous[targetIndex - 1] + substitutionCost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[target.length];
}

function transcriptDistance(paText: string, voiceLiveText: string) {
  const useCer = containsCjk(paText) || containsCjk(voiceLiveText);
  const paTokens = useCer ? characterTokens(paText) : wordTokens(paText);
  const voiceLiveTokens = useCer ? characterTokens(voiceLiveText) : wordTokens(voiceLiveText);
  const comparableTokenCount = Math.max(paTokens.length, voiceLiveTokens.length);
  if (paTokens.length === 0 || voiceLiveTokens.length === 0) return { distance: 0, edits: 0, comparableTokenCount };

  const edits = editDistance(paTokens, voiceLiveTokens);
  return {
    distance: edits / comparableTokenCount,
    edits,
    comparableTokenCount,
  };
}

function shouldShowPronunciationResult(paText: string, voiceLiveText: string) {
  const comparison = transcriptDistance(paText, voiceLiveText);
  if (comparison.comparableTokenCount < MIN_COMPARABLE_TOKEN_COUNT) return true;
  return comparison.edits < MIN_EDIT_DISTANCE_TO_HIDE_PA || comparison.distance <= MAX_PA_VOICELIVE_DISTANCE;
}

function formatPaScoreLine(result: PronunciationAssessmentResult) {
  const { scores } = result;
  const parts = [
    `Pronunciation ${scores.pronunciation}`,
    `Accuracy ${scores.accuracy}`,
    `Fluency ${scores.fluency}`,
  ];
  if (scores.prosody != null) parts.push(`Prosody ${scores.prosody}`);
  return parts.join(' · ');
}

function getPaComparisonText(result: PronunciationAssessmentResult) {
  if (result.recognizedText.trim()) return result.recognizedText;
  return result.words.map((word) => word.word).join(' ');
}

function buildPronunciationHtml(rawJson: string, fallbackText: string) {
  try {
    const parsed = JSON.parse(rawJson);
    const words = parsed?.NBest?.[0]?.Words ?? parsed?.[0]?.NBest?.[0]?.Words ?? [];
    if (!Array.isArray(words) || words.length === 0) return escapeHtml(fallbackText);

    return words.map((word: any) => {
      const text = String(word.Word ?? '');
      const score = Number(word.PronunciationAssessment?.AccuracyScore ?? 100);
      const errorType = String(word.PronunciationAssessment?.ErrorType ?? 'None');
      let className = 'pa-word pa-word-good';
      if (errorType === 'Omission') className = 'pa-word pa-word-omission';
      else if (errorType === 'Insertion') className = 'pa-word pa-word-insertion';
      else if (score < 60) className = 'pa-word pa-word-bad';
      else if (score < 80) className = 'pa-word pa-word-fair';
      const title = errorType === 'Omission'
        ? `Error: ${escapeHtml(errorType)}`
        : `Score: ${Math.round(score)}, Error: ${escapeHtml(errorType)}`;
      return `<span class="${className}" title="${title}">${escapeHtml(text)}</span>`;
    }).join(' ');
  } catch {
    return escapeHtml(fallbackText);
  }
}

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

export function BilingualTutorAgentPlayground({ settings }: BilingualTutorAgentPlaygroundProps) {
  const { enableMAIVoices } = useFeatureFlags();
  const chatVoices = getChatVoices(enableMAIVoices);
  const storedConfig = useMemo(() => loadConfig(), []);
  const [l1, setL1] = useState(storedConfig.l1 ?? 'Chinese');
  const [l2, setL2] = useState(storedConfig.l2 ?? 'English');
  const [level, setLevel] = useState<BilingualTutorLevel>(storedConfig.level ?? 'intermediate');
  const [voice, setVoice] = useState(storedConfig.voice ?? 'en-us-ava:DragonHDLatestNeural');
  const [referenceText, setReferenceText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [statusText, setStatusText] = useState('Ready');
  const [sessionId, setSessionId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);

  const audioHandlerRef = useRef<ChatAudioHandler | null>(null);
  const circleRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isSpeakingRef = useRef(false);
  const paSessionRef = useRef<PronunciationAssessmentSession | null>(null);
  // Rolling pre-roll buffer of recent mic chunks. We drain it into the PA session
  // at speech-start to recover audio that the server-side VAD missed before firing.
  const prerollChunksRef = useRef<Uint8Array[]>([]);
  const prerollBytesRef = useRef(0);
  const PREROLL_MS = 800;
  const referenceTextRef = useRef(referenceText);
  const targetLocaleRef = useRef(getLanguageByValue(l2).locale);
  const assessment = usePronunciationAssessment(settings);
  const startStreamRef = useRef(assessment.startStream);
  useEffect(() => { startStreamRef.current = assessment.startStream; }, [assessment.startStream]);

  const stopLocalConversation = () => {
    audioHandlerRef.current?.stopRecording();
    audioHandlerRef.current?.stopStreamingPlayback();
    setIsRecording(false);
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    paSessionRef.current?.cancel();
    paSessionRef.current = null;
    prerollChunksRef.current = [];
    prerollBytesRef.current = 0;
  };

  const clientRef = useRef<VoiceLiveChatClient | null>(null);
  const assessLastTurnRef = useRef<(messageId: string, transcript: string) => Promise<void>>(async () => {});
  if (!clientRef.current) {
    clientRef.current = new VoiceLiveChatClient({
      onState: (state: ChatState) => {
        const wasSpeaking = isSpeakingRef.current;
        isSpeakingRef.current = state.isSpeaking;
        setIsConnected(state.isConnected);
        // Do NOT sync isRecording from chatClient: recording is owned by ChatAudioHandler
        // here, while chatClient.state.isRecording stays false. Overwriting it would flip
        // the Start/Stop button back to "Start" right after we set it to "Stop".
        setIsSpeaking(state.isSpeaking);
        setMessages(state.messages);
        setStatusText(state.statusText || 'Ready');
        setSessionId(state.sessionId);
        if (!state.isConnected) {
          stopLocalConversation();
          return;
        }
        if (!wasSpeaking && state.isSpeaking) {
          // Consume reference text on use: snapshot the latest model-set value, then clear.
          const turnReferenceText = referenceTextRef.current;
          referenceTextRef.current = '';
          setReferenceText('');
          // Cancel any leftover session (e.g. previous turn ended without transcript).
          paSessionRef.current?.cancel();
          try {
            const session = startStreamRef.current({
              referenceText: turnReferenceText,
              language: targetLocaleRef.current,
              enableProsodyAssessment: true,
              enableMiscue: turnReferenceText.length > 0,
              sampleRate: audioHandlerRef.current?.getSampleRate() ?? 24000,
              silenceTimeoutMs: SILENCE_TIMEOUT_MS,
            });
            // Drain pre-roll: server VAD fires after speech has already started,
            // so prepend the most recent ~PREROLL_MS of mic audio to recover the head.
            for (const chunk of prerollChunksRef.current) session.pushAudio(chunk);
            paSessionRef.current = session;
          } catch (error) {
            console.warn('Failed to start PA stream:', error);
            paSessionRef.current = null;
          }
        }
      },
      onUserTranscriptComplete: async (messageId, transcript) => {
        await assessLastTurnRef.current(messageId, transcript);
      },
      onFunctionCall: (name, args) => {
        if (name !== 'set_reference_text') return undefined;
        try {
          const parsed = JSON.parse(args) as { reference_text?: string };
          const nextReference = parsed.reference_text?.trim() ?? '';
          if (nextReference) {
            setReferenceText(nextReference);
            referenceTextRef.current = nextReference;
          }
        } catch (error) {
          console.warn('Failed to parse set_reference_text arguments:', error);
        }
        return JSON.stringify({ success: true });
      },
    });
  }

  const chatClient = clientRef.current;
  const targetLanguage = getLanguageByValue(l2);
  const nativeLanguage = getLanguageByValue(l1);
  const voiceLiveRecognitionLanguages = useMemo(() => {
    return Array.from(new Set([targetLanguage.locale, nativeLanguage.locale])).join(',');
  }, [targetLanguage.locale, nativeLanguage.locale]);
  const prompt = getBilingualTutorPrompt(l1, l2, level);
  const voiceLiveApiKeyLooksInvalid = Boolean(settings.voiceLiveApiKey?.trim() && looksLikeUrl(settings.voiceLiveApiKey));
  const hasVoiceLiveConfig = Boolean(settings.voiceLiveEndpoint?.trim() && settings.voiceLiveApiKey?.trim() && !voiceLiveApiKeyLooksInvalid);

  const assessLastTurn = useCallback(async (messageId: string, transcript: string) => {
    const session = paSessionRef.current;
    paSessionRef.current = null;
    if (!session) {
      await chatClient.requestResponse();
      return;
    }

    const result = await session.stop();

    let extraInstructions: string | undefined;
    if (result?.rawJson && chatClient.snapshot.isConnected) {
      const paComparisonText = getPaComparisonText(result);
      const showPaResult = shouldShowPronunciationResult(paComparisonText, transcript);
      const paHtml = showPaResult ? buildPronunciationHtml(result.rawJson, paComparisonText || transcript) : undefined;
      const paScoreLine = showPaResult ? formatPaScoreLine(result) : undefined;
      chatClient.updateMessageHtmlById(messageId, transcript, buildUserTranscriptHtml(transcript, paHtml, paScoreLine));
      if (showPaResult) {
        extraInstructions = `[Pronunciation assessment result]: [${result.rawJson}]`;
      }
    }
    await chatClient.requestResponse(extraInstructions);
  }, [chatClient]);

  useEffect(() => {
    assessLastTurnRef.current = assessLastTurn;
  }, [assessLastTurn]);

  useEffect(() => {
    targetLocaleRef.current = targetLanguage.locale;
  }, [targetLanguage.locale]);

  useEffect(() => {
    referenceTextRef.current = referenceText;
  }, [referenceText]);

  useEffect(() => {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ l1, l2, level, voice }));
  }, [l1, l2, level, voice]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (/error|failed|missing|unauthorized|forbidden|denied|invalid/i.test(statusText)) notifySidebarConfigAttention();
  }, [statusText]);

  useEffect(() => {
    return () => {
      paSessionRef.current?.cancel();
      paSessionRef.current = null;
      audioHandlerRef.current?.close().catch(console.error);
      if (chatClient.snapshot.isConnected) chatClient.disconnect().catch(console.error);
    };
  }, [chatClient]);

  const stopConversation = async () => {
    stopLocalConversation();
  };

  const handleConnect = async () => {
    if (isConnected) {
      await stopConversation();
      await chatClient.disconnect();
      return;
    }

    if (!hasVoiceLiveConfig) {
      setStatusText(voiceLiveApiKeyLooksInvalid ? 'Invalid Voice Live API key' : 'Missing Voice Live endpoint or API key');
      notifySidebarConfigAttention();
      return;
    }

    try {
      await chatClient.connect({
        ...DEFAULT_CHAT_CONFIG,
        endpoint: settings.voiceLiveEndpoint || '',
        apiKey: settings.voiceLiveApiKey || '',
        model: 'gpt-4o',
        instructions: prompt,
        voice,
        recognitionLanguage: voiceLiveRecognitionLanguages,
        asrOnly: true,
        enableFunctionCalling: true,
        functions: { enableDateTime: false, enableWeatherForecast: false },
        customTools: [SET_REFERENCE_TEXT_TOOL],
        temperature: 0.4,
        avatar: { ...DEFAULT_CHAT_CONFIG.avatar, enabled: false },
        turnDetection: {
          type: 'server_vad',
          threshold: 0.5,
          prefixPaddingInMs: 1000,
          silenceDurationInMs: SILENCE_TIMEOUT_MS,
          createResponse: false,
        },
      });
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : String(error));
      notifySidebarConfigAttention();
    }
  };

  const startConversation = async () => {
    if (!chatClient.snapshot.isConnected) {
      setStatusText('Connect first');
      return;
    }

    if (!audioHandlerRef.current) audioHandlerRef.current = new ChatAudioHandler();
    audioHandlerRef.current.setCircleElement(circleRef.current);

    try {
      await audioHandlerRef.current.startRecording((chunk) => {
        // Maintain a rolling pre-roll window (PREROLL_MS) of the most recent mic audio.
        const sampleRate = audioHandlerRef.current?.getSampleRate() ?? 24000;
        const maxPrerollBytes = Math.ceil((sampleRate * 2 * PREROLL_MS) / 1000);
        // chunk is reused by the worklet; copy it for safe retention.
        const copy = chunk.slice();
        prerollChunksRef.current.push(copy);
        prerollBytesRef.current += copy.byteLength;
        while (prerollBytesRef.current > maxPrerollBytes && prerollChunksRef.current.length > 1) {
          const dropped = prerollChunksRef.current.shift()!;
          prerollBytesRef.current -= dropped.byteLength;
        }

        if (isSpeakingRef.current) paSessionRef.current?.pushAudio(chunk);
        void chatClient.sendAudio(chunk);
      });
      setIsRecording(true);
      chatClient.addStatusMessage('Conversation started. Start speaking.');
      await chatClient.addSystemText(
        'Greet briefly in L1, randomly propose one practical topic for today, and say the learner can choose another topic. Do not call set_reference_text unless you ask them to repeat a specific L2 phrase.',
      );
      await chatClient.requestResponse();
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : String(error));
    }
  };

  const handleStartStop = async () => {
    if (isRecording) await stopConversation();
    else await startConversation();
  };

  const handleSendText = async () => {
    if (!textInput.trim()) return;
    if (!isConnected) {
      setStatusText('Connect first');
      return;
    }
    try {
      await chatClient.sendText(textInput);
      setTextInput('');
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="theme-page-header">
        <div className="theme-page-header__inner">
          <div>
            <h1 className="theme-page-title">Bilingual Tutor Agent</h1>
            <p className="theme-page-subtitle">Voice Live bilingual tutoring with per-turn pronunciation assessment context.</p>
          </div>
          <div className="theme-page-header__actions">
            <PageDocsLink href={AZURE_SPEECH_DOCS.pronunciationAssessment} />
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${isConnected ? 'bg-green-500/20 text-green-100' : 'bg-white/20 text-white/80'}`}>
              <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-white/60'}`} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200">
          <div className="flex-shrink-0 border-b border-gray-100 py-5">
            <div className="mx-auto flex w-full max-w-3xl items-center justify-center gap-6 px-6">
              <div ref={circleRef} className="flex h-28 w-28 flex-shrink-0 transform-gpu items-center justify-center rounded-full bg-gray-200 will-change-transform">
                <svg className="h-11 w-11 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Bilingual Tutor Mode</p>
                <p className="mt-2 text-sm leading-6 text-gray-600">{l1} scaffolding, {l2} practice, {level} level. The prompt is generated from the original scenario logic.</p>
                <p className="mt-2 text-xs text-gray-500">{isSpeaking ? 'Speech detected...' : statusText}</p>
              </div>
            </div>
          </div>

          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">Connect, start conversation, then speak to the bilingual tutor.</div>
            ) : (
              <div className="flex min-h-full flex-col gap-3">
                {messages.map((message) => (
                  <div key={message.id} className={messageClasses(message.type)}>
                    {message.contentHtml ? (
                      <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: message.contentHtml }} />
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                    <p className="mt-1 text-[10px] opacity-60">{new Date(message.timestamp).toLocaleTimeString()}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <input
                value={textInput}
                onChange={(event) => setTextInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleSendText();
                  }
                }}
                disabled={!isConnected}
                placeholder="Type to the tutor, or use voice..."
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <button onClick={handleSendText} disabled={!isConnected || !textInput.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" title="Send message">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <aside className="theme-side-panel flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Controls</h2>
              {sessionId && <p className="mt-1 truncate font-mono text-xs text-gray-500">Session: {sessionId}</p>}
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Native Language (L1)</label>
                <select value={l1} onChange={(event) => setL1(event.target.value)} disabled={isConnected} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100">
                  {BILINGUAL_TUTOR_LANGUAGES.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Target Language (L2)</label>
                <select value={l2} onChange={(event) => setL2(event.target.value)} disabled={isConnected} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100">
                  {BILINGUAL_TUTOR_LANGUAGES.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Proficiency Level</label>
                <div className="flex gap-2">
                  {LEVELS.map((item) => (
                    <button key={item.value} onClick={() => setLevel(item.value)} disabled={isConnected} className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold capitalize transition disabled:cursor-not-allowed ${level === item.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>{item.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tutor Voice</label>
                <select value={voice} onChange={(event) => setVoice(event.target.value)} disabled={isConnected} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100">
                  {chatVoices.map((chatVoice) => <option key={chatVoice.id} value={chatVoice.id}>{chatVoice.name}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Reference Text from Tutor Tool</label>
                <div className="min-h-[76px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm leading-6 text-gray-700">
                  {referenceText || 'The tutor will set this automatically before asking you to repeat.'}
                </div>
              </div>
            </div>

            {!hasVoiceLiveConfig && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                {voiceLiveApiKeyLooksInvalid
                  ? 'The Voice Live API key field contains a URL. Paste the resource key in the sidebar before connecting.'
                  : 'Configure Voice Live endpoint and API key in the sidebar before connecting.'}
              </div>
            )}

            <div className="space-y-2 border-t border-gray-200 pt-5">
              <button onClick={handleConnect} className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition ${isConnected ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{isConnected ? 'Disconnect' : 'Connect'}</button>
              <button onClick={handleStartStop} disabled={!isConnected} className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{isRecording ? 'Stop Conversation' : 'Start Conversation'}</button>
            </div>

            <button onClick={() => setShowPrompt((value) => !value)} className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm font-semibold text-gray-700">
              <span>Generated Scenario Prompt</span>
              <svg className={`h-4 w-4 transition ${showPrompt ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showPrompt && <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-950 p-3 text-xs leading-5 text-gray-100">{prompt}</pre>}
          </div>
        </aside>
      </div>
    </div>
  );
}

function buildUserTranscriptHtml(voiceLiveTranscript: string, paHtml?: string, paScoreLine?: string) {
  const voiceLiveHtml = escapeHtml(voiceLiveTranscript);
  const scoreLine = paScoreLine ? `<span class="bt-pa-scoreline">${escapeHtml(paScoreLine)}</span>` : '';
  const paSection = paHtml
    ? `<div class="bt-user-result bt-user-result--pa"><span class="bt-user-result__label">PA</span><span class="bt-user-result__text">${scoreLine}<span class="bt-pa-words">${paHtml}</span></span></div>`
    : '';

  return `<div class="bt-user-results"><div class="bt-user-result bt-user-result--voicelive"><span class="bt-user-result__label">Voice Live</span><span class="bt-user-result__text">${voiceLiveHtml}</span></div>${paSection}</div>`;
}