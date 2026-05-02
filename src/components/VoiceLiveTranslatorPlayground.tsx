import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildInterpreterPrompt,
  DEFAULT_CONFIG,
  MODEL_OPTIONS,
  TARGET_LANGUAGE_OPTIONS,
  type VoiceLiveConfig,
} from '../lib/voiceLive/defaults';
import { MicCapture } from '../lib/voiceLive/audio/micCapture';
import { VoiceLiveInterpreter, type SessionLogItem } from '../lib/voiceLive/interpreter';
import { calculatePercentile, calculateAverage, calculateCost } from '../lib/voiceLive/metrics';
import { PageDocsLink, AZURE_SPEECH_DOCS } from './PageDocsLink';
import { notifySidebarConfigAttention } from '../utils/sidebarConfigAttention';

interface VoiceLiveTranslatorPlaygroundProps {
  endpoint: string;
  apiKey: string;
}

function formatMs(ms: number) {
  if (!Number.isFinite(ms)) return '-';
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function calculatorHref(params: Record<string, string | number>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    search.set(key, String(value));
  }
  return `${window.location.pathname}?${search.toString()}#voice-live-calculator`;
}

function percent(numerator: number, denominator: number) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)));
}

export function VoiceLiveTranslatorPlayground({ endpoint, apiKey }: VoiceLiveTranslatorPlaygroundProps) {
  const [config, setConfig] = useState<VoiceLiveConfig>(() => {
    const raw = localStorage.getItem('voicelive.translator.config');
    if (!raw) {
      const c = { ...DEFAULT_CONFIG };
      c.prompt = buildInterpreterPrompt(c.targetLanguage);
      return c;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<VoiceLiveConfig>;
      const merged = { ...DEFAULT_CONFIG, ...parsed };
      merged.prompt = merged.prompt?.trim() ? merged.prompt : buildInterpreterPrompt(merged.targetLanguage);
      return merged;
    } catch {
      const c = { ...DEFAULT_CONFIG };
      c.prompt = buildInterpreterPrompt(c.targetLanguage);
      return c;
    }
  });

  const [statusText, setStatusText] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [logs, setLogs] = useState<SessionLogItem[]>([]);
  const [showInfoLogs, setShowInfoLogs] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [turns, setTurns] = useState(() => 0);
  const [sessionStartMs, setSessionStartMs] = useState(() => 0);
  const [inputAudioSeconds, setInputAudioSeconds] = useState(() => 0);
  const [inputAudioTokens, setInputAudioTokens] = useState(() => 0);
  const [cachedAudioSeconds, setCachedAudioSeconds] = useState(() => 0);
  const [cachedAudioTokens, setCachedAudioTokens] = useState(() => 0);
  const [outputAudioSeconds, setOutputAudioSeconds] = useState(() => 0);
  const [outputAudioTokens, setOutputAudioTokens] = useState(() => 0);
  const [inputTextTokens, setInputTextTokens] = useState(() => 0);
  const [cachedTextTokens, setCachedTextTokens] = useState(() => 0);
  const [outputTextTokens, setOutputTextTokens] = useState(() => 0);
  const [startLatencies, setStartLatencies] = useState<number[]>(() => []);
  const [endLatencies, setEndLatencies] = useState<number[]>(() => []);

  const interpreterRef = useRef<VoiceLiveInterpreter | null>(null);
  const micRef = useRef<MicCapture | null>(null);
  const logViewRef = useRef<HTMLDivElement | null>(null);
  const prevLangRef = useRef<string>(config.targetLanguage);

  if (!interpreterRef.current) {
    interpreterRef.current = new VoiceLiveInterpreter({
      onState: (s) => {
        setIsConnected(s.isConnected);
        setLogs(s.logs);
        setTurns(s.totals.turns);
        setSessionStartMs(s.totals.sessionStartMs);
        setInputAudioSeconds(s.totals.inputAudioSeconds);
        setInputAudioTokens(s.totals.inputAudioTokens);
        setCachedAudioSeconds(s.totals.cachedAudioSeconds);
        setCachedAudioTokens(s.totals.cachedAudioTokens);
        setOutputAudioSeconds(s.totals.outputAudioSeconds);
        setOutputAudioTokens(s.totals.outputAudioTokens);
        setInputTextTokens(s.totals.inputTextTokens);
        setCachedTextTokens(s.totals.cachedTextTokens);
        setOutputTextTokens(s.totals.outputTextTokens);
        setStartLatencies(s.totals.startLatencies);
        setEndLatencies(s.totals.endLatencies);
      },
    });
  }

  const interpreter = interpreterRef.current;

  useEffect(() => {
    localStorage.setItem('voicelive.translator.config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    if (/error|failed|connect first|unauthorized|forbidden|denied|invalid|mic error/i.test(statusText)) {
      notifySidebarConfigAttention();
    }
  }, [statusText]);

  // Cleanup on unmount - disconnect when switching playgrounds
  useEffect(() => {
    return () => {
      const client = interpreterRef.current;
      if (client?.snapshot.isConnected) {
        console.log('[VoiceLive Translator] Disconnecting on unmount');
        client.disconnect().catch(console.error);
      }
    };
  }, []);

  useEffect(() => {
    const prevLang = prevLangRef.current;
    if (prevLang === config.targetLanguage) return;

    const prevDefault = buildInterpreterPrompt(prevLang);
    if (config.prompt.trim() === prevDefault.trim()) {
      setConfig((c) => ({ ...c, prompt: buildInterpreterPrompt(c.targetLanguage) }));
    }

    prevLangRef.current = config.targetLanguage;
  }, [config.targetLanguage, config.prompt]);

  useEffect(() => {
    const el = logViewRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logs.length]);

  const sessionTimeSeconds = sessionStartMs > 0 ? (Date.now() - sessionStartMs) / 1000 : 0;
  const avgStartLatency = startLatencies.length > 0 ? calculateAverage(startLatencies) : 0;
  const p90StartLatency = startLatencies.length > 0 ? calculatePercentile(startLatencies, 90) : 0;
  const avgEndLatency = endLatencies.length > 0 ? calculateAverage(endLatencies) : 0;

  const pricingTier = useMemo(() => {
    const modelOption = MODEL_OPTIONS.find((m) => m.id === config.model);
    if (!modelOption) return 'standard' as const;
    if (modelOption.tier === 'basic') return 'standard' as const;
    return modelOption.tier as 'pro' | 'standard' | 'lite';
  }, [config.model]);

  const totalCost = calculateCost(
    {
      turns,
      sessionStartMs,
      inputAudioSeconds,
      inputAudioTokens,
      cachedAudioSeconds,
      cachedAudioTokens,
      outputAudioSeconds,
      outputAudioTokens,
      inputTextTokens,
      cachedTextTokens,
      outputTextTokens,
      startLatencies,
      endLatencies,
    },
    pricingTier,
    config.voiceProvider
  );
  const costPerSecond = sessionTimeSeconds > 0 ? totalCost / sessionTimeSeconds : 0;

  const visibleLogs = useMemo(() => {
    if (showInfoLogs) return logs;
    return logs.filter((l) => l.level !== 'info');
  }, [logs, showInfoLogs]);

  const modelOptions = useMemo(() => {
    const tiers: Record<string, string[]> = {};
    for (const m of MODEL_OPTIONS) {
      tiers[m.tier] ??= [];
      tiers[m.tier].push(m.id);
    }
    return tiers;
  }, []);

  const calculatorImportHref = useMemo(() => {
    const turnsPerUser = Math.max(1, turns || 1);
    const perTurnInputAudio = turns > 0 ? inputAudioSeconds / turns : 10;
    const perTurnOutputAudio = turns > 0 ? outputAudioSeconds / turns : 15;
    const perTurnInputText = turns > 0 ? inputTextTokens / turns : 2000;

    return calculatorHref({
      dailyActiveUsers: 1,
      averageTurnsPerUser: turnsPerUser,
      averageInputAudioSeconds: Number(perTurnInputAudio.toFixed(1)),
      averageOutputAudioSeconds: Number(perTurnOutputAudio.toFixed(1)),
      averageInputTextTokens: Math.round(perTurnInputText),
      textInputCacheRate: percent(cachedTextTokens, inputTextTokens),
      audioInputCacheRate: percent(cachedAudioTokens, inputAudioTokens),
      serviceMode: 'managed',
      selectedModel: config.model,
      audioInputType: 'standard',
      audioOutputType: config.voiceProvider === 'openai' ? 'native' : 'standard',
      avatarType: 'none',
    });
  }, [cachedAudioTokens, cachedTextTokens, config.model, config.voiceProvider, inputAudioSeconds, inputAudioTokens, inputTextTokens, outputAudioSeconds, turns]);

  async function onConnect() {
    setStatusText('Connecting…');
    try {
      await interpreter.connect({ ...config, endpoint, apiKey });
      setStatusText('Connected');
      await startMic();
    } catch (e) {
      setStatusText(e instanceof Error ? e.message : String(e));
    }
  }

  async function onDisconnect() {
    setStatusText('Disconnecting…');
    try {
      await stopMic();
      await interpreter.disconnect();
      setStatusText('Disconnected');
    } catch (e) {
      setStatusText(e instanceof Error ? e.message : String(e));
    }
  }

  async function startMic() {
    if (isMicOn) return;
    if (!interpreter.snapshot.isConnected) {
      setStatusText('Connect first');
      return;
    }

    micRef.current = new MicCapture(
      { sampleRate: 16000, bufferSize: 4096 },
      {
        onChunk: (bytes) => {
          void interpreter.sendMicPcmChunk(bytes);
        },
        onState: (s, detail) => {
          if (s === 'started') setIsMicOn(true);
          if (s === 'stopped') setIsMicOn(false);
          if (s === 'error') setStatusText(detail ?? 'Mic error');
        },
      }
    );
    await micRef.current.start();
  }

  async function stopMic() {
    if (!micRef.current) {
      setIsMicOn(false);
      return;
    }
    await micRef.current.stop();
    micRef.current = null;
    setIsMicOn(false);
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="theme-page-header">
        <div className="theme-page-header__inner">
          <div>
            <h1 className="theme-page-title">Voice Live Translator</h1>
            <p className="theme-page-subtitle">
              Real-time voice translation powered by Azure Voice Live
            </p>
          </div>
          <div className="theme-page-header__actions">
            <a className="theme-docs-link" href={calculatorImportHref} title="Import current translator usage into calculator">
              <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-6 4h.01M12 11h.01M15 11h.01M9 15h.01M12 15h.01M15 15h.01M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
              </svg>
              <span className="text-sm font-medium">Calc</span>
            </a>
            <PageDocsLink href={AZURE_SPEECH_DOCS.voiceLive} />
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
              isConnected ? 'bg-green-500/20 text-green-100' : 'bg-white/20 text-white/80'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-white/60'}`} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {isMicOn && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-red-500/20 text-red-100">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                Recording
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left side - Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">

        {/* Statistics Bar */}
        <div className="border-b border-gray-200 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-xs text-gray-500">Turns</p>
              <p className="text-sm font-semibold text-gray-900">{turns}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-xs text-gray-500">Session</p>
              <p className="text-sm font-semibold text-gray-900">{sessionTimeSeconds.toFixed(1)}s</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-xs text-gray-500">Cost</p>
              <p className="text-sm font-semibold text-gray-900">${totalCost.toFixed(4)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-xs text-gray-500">Cost/sec</p>
              <p className="text-sm font-semibold text-gray-900">${costPerSecond.toFixed(5)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-xs text-gray-500">Avg Latency</p>
              <p className="text-sm font-semibold text-gray-900">{formatMs(avgStartLatency)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-xs text-gray-500">P90 Latency</p>
              <p className="text-sm font-semibold text-gray-900">{formatMs(p90StartLatency)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-xs text-gray-500">Input Audio</p>
              <p className="text-sm font-semibold text-gray-900">{inputAudioSeconds.toFixed(1)}s</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-xs text-gray-500">Output Audio</p>
              <p className="text-sm font-semibold text-gray-900">{outputAudioSeconds.toFixed(1)}s</p>
            </div>
          </div>
        </div>

        {/* Log Panel */}
        <div className="flex-1 flex flex-col overflow-hidden p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium text-gray-900">Conversation Log</h2>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showInfoLogs}
                onChange={(e) => setShowInfoLogs(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Show INFO
            </label>
          </div>
          <div
            ref={logViewRef}
            className="flex-1 overflow-y-auto bg-gray-900 rounded-lg p-4 font-mono text-sm"
          >
            {visibleLogs.map((l) => (
              <div key={l.id} className="flex gap-2 py-0.5">
                <span className="text-gray-500 shrink-0">
                  {new Date(l.ts).toLocaleTimeString()}
                </span>
                <span
                  className={`shrink-0 w-14 ${
                    l.level === 'error'
                      ? 'text-red-400'
                      : l.level === 'input'
                      ? 'text-blue-400'
                      : l.level === 'output'
                      ? 'text-green-400'
                      : l.level === 'user'
                      ? 'text-yellow-400'
                      : 'text-gray-400'
                  }`}
                >
                  {l.level.toUpperCase()}
                </span>
                <span className="text-gray-100 break-all">{l.text}</span>
              </div>
            ))}
            {visibleLogs.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No logs yet. Click Start to begin translation.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600">
              {statusText || 'Ready to translate'}
            </p>
          </div>
        </div>
      </div>

        {/* Right side - Configuration Panel */}
        <div className="theme-side-panel p-6 flex flex-col overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Configuration</h2>

        <div className="space-y-4 flex-1">
          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <select
              value={config.model}
              onChange={(e) => setConfig((c) => ({ ...c, model: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <optgroup label="Voice Live Pro">
                {modelOptions.pro?.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </optgroup>
              <optgroup label="Voice Live Basic">
                {modelOptions.basic?.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </optgroup>
              <optgroup label="Voice Live Lite">
                {modelOptions.lite?.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Target Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Language</label>
            <select
              value={config.targetLanguage}
              onChange={(e) => setConfig((c) => ({ ...c, targetLanguage: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {TARGET_LANGUAGE_OPTIONS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label} ({l.code})
                </option>
              ))}
            </select>
          </div>

          {/* Connect/Disconnect Button */}
          <div className="pt-2">
            {!isConnected ? (
              <button
                onClick={onConnect}
                disabled={!endpoint || !apiKey}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Start Translation
              </button>
            ) : (
              <button
                onClick={onDisconnect}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h12v12H6z" />
                </svg>
                Stop
              </button>
            )}
          </div>

          {/* Mic Status */}
          {isConnected && (
            <div className={`flex items-center gap-2 p-3 rounded-md ${isMicOn ? 'bg-green-50 border border-green-200' : 'bg-gray-100 border border-gray-200'}`}>
              <svg className={`w-5 h-5 ${isMicOn ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className={`text-sm font-medium ${isMicOn ? 'text-green-700' : 'text-gray-500'}`}>
                {isMicOn ? 'Microphone active' : 'Microphone off'}
              </span>
            </div>
          )}

          {/* Advanced Settings */}
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-700"
            >
              <span>Advanced Settings</span>
              <svg
                className={`w-5 h-5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4">
                {/* Prompt */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Prompt</label>
                    <button
                      onClick={() => setConfig((c) => ({ ...c, prompt: buildInterpreterPrompt(c.targetLanguage) }))}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Reset
                    </button>
                  </div>
                  <textarea
                    value={config.prompt}
                    onChange={(e) => setConfig((c) => ({ ...c, prompt: e.target.value }))}
                    rows={6}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* ASR Model */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ASR Model</label>
                  <select
                    value={config.asrModel}
                    onChange={(e) => setConfig((c) => ({ ...c, asrModel: e.target.value as VoiceLiveConfig['asrModel'] }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="azure-speech">azure-speech</option>
                    <option value="gpt-4o-mini-transcribe">gpt-4o-mini-transcribe</option>
                    <option value="gpt-4o-transcribe">gpt-4o-transcribe</option>
                    <option value="whisper-1">whisper-1</option>
                  </select>
                </div>

                {/* ASR Languages */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ASR Languages</label>
                  <input
                    type="text"
                    value={config.asrLanguages}
                    onChange={(e) => setConfig((c) => ({ ...c, asrLanguages: e.target.value }))}
                    placeholder="en,zh or en-US,zh-CN"
                    disabled={config.asrModel !== 'azure-speech'}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  />
                </div>

                {/* Voice Provider */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Voice Provider</label>
                  <select
                    value={config.voiceProvider}
                    onChange={(e) => {
                      const nextProvider = e.target.value as VoiceLiveConfig['voiceProvider'];
                      setConfig((c) => ({
                        ...c,
                        voiceProvider: nextProvider,
                        voiceName: nextProvider === 'openai' ? 'alloy' : 'en-US-AvaMultilingualNeural',
                      }));
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="azure-standard">Azure Neural</option>
                  </select>
                </div>

                {/* Voice */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Voice</label>
                  <select
                    value={config.voiceName}
                    onChange={(e) => setConfig((c) => ({ ...c, voiceName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {config.voiceProvider === 'openai' ? (
                      <>
                        <option value="alloy">Alloy (OpenAI)</option>
                        <option value="echo">Echo (OpenAI)</option>
                        <option value="fable">Fable (OpenAI)</option>
                        <option value="nova">Nova (OpenAI)</option>
                        <option value="shimmer">Shimmer (OpenAI)</option>
                      </>
                    ) : (
                      <>
                        <option value="en-US-AvaMultilingualNeural">Ava (Female, conversational)</option>
                        <option value="en-US-Ava:DragonHDLatestNeural">Ava HD (Female, friendly)</option>
                        <option value="en-US-AndrewMultilingualNeural">Andrew (Male, conversational)</option>
                        <option value="en-US-GuyMultilingualNeural">Guy (Male, professional)</option>
                        <option value="zh-CN-XiaochenMultilingualNeural">Xiaochen (Female, assistant)</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Turn Detection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Turn Detection</label>
                  <select
                    value={config.turnDetectionType}
                    onChange={(e) => setConfig((c) => ({ ...c, turnDetectionType: e.target.value as VoiceLiveConfig['turnDetectionType'] }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="server_vad">server_vad</option>
                    <option value="azure_semantic_vad">azure_semantic_vad</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
