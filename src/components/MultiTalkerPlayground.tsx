import React, { useState, useEffect, useRef } from 'react';
import { AzureSettings, SynthesisState, VoiceInfo } from '../types/azure';
import { MultiTalkerHistoryEntry, buildMultiTalkerSSML } from '../types/multiTalker';
import { useMultiTalkerTTS } from '../hooks/useMultiTalkerTTS';
import { MultiTalkerSpeakerPairSelector, SpeakerPair, getVoiceDetailsFromPair, generateSpeakerPairs, getMultiTalkerVoices } from './MultiTalkerSpeakerPairSelector';
import { PlaybackControls } from './PlaybackControls';
import { FeedbackButton } from './FeedbackButton';
import { getAudioDuration } from '../utils/audioUtils';
import { PODCAST_PRESETS, adaptPresetToSpeakers } from '../utils/podcastPresets';
import { generatePodcastScript, AzureOpenAIConfig } from '../utils/azureOpenAI';
import { fetchVoiceList } from '../utils/voiceList';

interface MultiTalkerPlaygroundProps {
  settings: AzureSettings;
  onSettingsChange: (settings: Partial<AzureSettings>) => void;
  isConfigured: boolean;
  history: MultiTalkerHistoryEntry[];
  addToHistory: (entry: Omit<MultiTalkerHistoryEntry, 'id'>) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
}

const SAMPLE_TEXT = `Ada: Welcome back! Today we're talking about what it actually takes to make voice a "first-class citizen" in the world of AI agents. It's not just about adding a microphone icon anymore—it's about making the experience, uh, totally seamless.
Andrew: Exactly. To really move the needle, a platform has to be—first and foremost—easy to enable. But for the big players, it also has to be best-in-class and, um, completely enterprise-ready. You can't have a system that's "performant" for one person but then, uh, chokes when you scale it to thousands of concurrent calls.
Ada: Right, because the stakes are so much higher at that level. So, what are the actual… I don't know, the "building blocks" that make that happen?
Andrew: We look at it through five key pillars. First is Platform Enablement. That's the, uh, the underlying "plumbing" that lets the agent actually live and breathe in a complex environment.
Ada: And I'm guessing Latency is right at the top of that list too?
Andrew: Oh, it's huge. In voice, latency is the ultimate "vibe killer." If there's even a slight lag, the conversation starts to feel like a, um, a walkie-talkie chat from the 90s. You need that near-instant response to keep it natural.
Ada: Which leads right into Model Quality, right? The "face and voice" of the thing?
Andrew: Precisely. You're looking at STT for rock-solid understanding, TTS for a voice that doesn't sound like a robot, and high-fidelity Avatars to keep users engaged. If any of those are "off," the whole illusion of a helpful assistant just… disappears.
Ada: That makes sense. But what about the people actually building these agents?
Andrew: That's where Developer Experience (DX) comes in. If it's a nightmare to code or deploy, nobody's going to use it. You want developers to feel like they have superpowers, not like they're fighting the platform.
Ada: And then there's the, uh, the "boring" but necessary part—the money.
Andrew: Exactly. COGS—the cost of goods sold. To make this work for a real business at scale, the economics have to be sustainable. You can't just throw infinite compute at the problem. It's about being smart with how you, uh, balance all those pieces together.
Ada: It sounds like a massive engineering challenge, but when it works, it's like magic.
Andrew: It really is. It's about moving from "cool tech demo" to a tool that a company can actually, um, rely on every single day.`;

export function MultiTalkerPlayground({
  settings,
  onSettingsChange,
  isConfigured,
  history,
  addToHistory,
  removeFromHistory,
  clearHistory,
}: MultiTalkerPlaygroundProps) {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voiceLoadError, setVoiceLoadError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceInfo | null>(null);
  const [selectedPair, setSelectedPair] = useState<SpeakerPair | null>(null);
  const [showSSML, setShowSSML] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('en-US');
  const [playingHistoryId, setPlayingHistoryId] = useState<string | null>(null);
  const previousAudioDataRef = useRef<ArrayBuffer | null>(null);
  const historyAudioRef = useRef<HTMLAudioElement | null>(null);

  // URL to script generation state
  const [urlInput, setUrlInput] = useState(() => localStorage.getItem('podcast_url') || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [aiEndpoint, setAiEndpoint] = useState(() => localStorage.getItem('aoai_endpoint') || '');
  const [aiApiKey, setAiApiKey] = useState(() => localStorage.getItem('aoai_apikey') || '');
  const [aiDeployment, setAiDeployment] = useState(() => localStorage.getItem('aoai_deployment') || 'gpt-5');

  // Save URL to localStorage when changed
  useEffect(() => {
    localStorage.setItem('podcast_url', urlInput);
  }, [urlInput]);

  const { state, error, audioData, generatedSSML, synthesize, pause, resume, stop } =
    useMultiTalkerTTS({
      apiKey: settings.apiKey,
      region: settings.region,
    });

  // Multi Talker only works in these regions
  const SUPPORTED_REGIONS = ['eastus', 'southeastasia', 'westeurope'];
  const isRegionSupported = SUPPORTED_REGIONS.includes(settings.region.toLowerCase());

  // Fetch voices when configured and region is supported
  useEffect(() => {
    if (isConfigured && isRegionSupported && settings.apiKey && settings.region) {
      setIsLoadingVoices(true);
      setVoiceLoadError(null);

      fetchVoiceList(settings.apiKey, settings.region, false)
        .then((fetchedVoices) => {
          setVoices(fetchedVoices);

          // Auto-select first multitalker voice and its first pair
          const multiTalkerVoices = getMultiTalkerVoices(fetchedVoices);
          if (multiTalkerVoices.length > 0 && !selectedVoice) {
            const firstVoice = multiTalkerVoices[0];
            setSelectedVoice(firstVoice);
            const pairs = generateSpeakerPairs(firstVoice);
            if (pairs.length > 0) {
              setSelectedPair(pairs[0]);
              // Update sample text with selected speakers
              const voiceDetails = getVoiceDetailsFromPair(firstVoice, pairs[0]);
              if (voiceDetails) {
                updateSampleTextWithSpeakers(voiceDetails.speakers);
              }
            }
          }
        })
        .catch((err) => {
          console.error('Failed to fetch voices:', err);
          setVoiceLoadError(err instanceof Error ? err.message : 'Failed to fetch voices');
        })
        .finally(() => {
          setIsLoadingVoices(false);
        });
    }
  }, [isConfigured, isRegionSupported, settings.apiKey, settings.region]);

  // Helper to update sample text with new speaker names
  const updateSampleTextWithSpeakers = (speakers: string[]) => {
    if (speakers.length >= 2) {
      const [speaker1, speaker2] = speakers;
      const capitalizedSpeaker1 = speaker1.charAt(0).toUpperCase() + speaker1.slice(1);
      const capitalizedSpeaker2 = speaker2.charAt(0).toUpperCase() + speaker2.slice(1);

      const newText = `${capitalizedSpeaker1}: Welcome back! Today we're talking about what it actually takes to make voice a "first-class citizen" in the world of AI agents. It's not just about adding a microphone icon anymore—it's about making the experience, uh, totally seamless.
${capitalizedSpeaker2}: Exactly. To really move the needle, a platform has to be—first and foremost—easy to enable. But for the big players, it also has to be best-in-class and, um, completely enterprise-ready. You can't have a system that's "performant" for one person but then, uh, chokes when you scale it to thousands of concurrent calls.
${capitalizedSpeaker1}: Right, because the stakes are so much higher at that level. So, what are the actual… I don't know, the "building blocks" that make that happen?
${capitalizedSpeaker2}: We look at it through five key pillars. First is Platform Enablement. That's the, uh, the underlying "plumbing" that lets the agent actually live and breathe in a complex environment.
${capitalizedSpeaker1}: And I'm guessing Latency is right at the top of that list too?
${capitalizedSpeaker2}: Oh, it's huge. In voice, latency is the ultimate "vibe killer." If there's even a slight lag, the conversation starts to feel like a, um, a walkie-talkie chat from the 90s. You need that near-instant response to keep it natural.
${capitalizedSpeaker1}: Which leads right into Model Quality, right? The "face and voice" of the thing?
${capitalizedSpeaker2}: Precisely. You're looking at STT for rock-solid understanding, TTS for a voice that doesn't sound like a robot, and high-fidelity Avatars to keep users engaged. If any of those are "off," the whole illusion of a helpful assistant just… disappears.
${capitalizedSpeaker1}: That makes sense. But what about the people actually building these agents?
${capitalizedSpeaker2}: That's where Developer Experience (DX) comes in. If it's a nightmare to code or deploy, nobody's going to use it. You want developers to feel like they have superpowers, not like they're fighting the platform.
${capitalizedSpeaker1}: And then there's the, uh, the "boring" but necessary part—the money.
${capitalizedSpeaker2}: Exactly. COGS—the cost of goods sold. To make this work for a real business at scale, the economics have to be sustainable. You can't just throw infinite compute at the problem. It's about being smart with how you, uh, balance all those pieces together.
${capitalizedSpeaker1}: It sounds like a massive engineering challenge, but when it works, it's like magic.
${capitalizedSpeaker2}: It really is. It's about moving from "cool tech demo" to a tool that a company can actually, um, rely on every single day.`;
      setText(newText);
    }
  };

  // Load preset when selected
  const handlePresetChange = (presetLocale: string) => {
    setSelectedPreset(presetLocale);
    if (presetLocale && selectedVoice && selectedPair) {
      const voiceDetails = getVoiceDetailsFromPair(selectedVoice, selectedPair);
      if (voiceDetails) {
        const preset = PODCAST_PRESETS.find(p => p.locale === presetLocale);
        if (preset) {
          const adaptedScript = adaptPresetToSpeakers(preset, voiceDetails.speakers);
          setText(adaptedScript);
        }
      }
    }
  };

  // Update text when pair changes to adapt speaker names
  useEffect(() => {
    if (selectedVoice && selectedPair && selectedPreset) {
      const voiceDetails = getVoiceDetailsFromPair(selectedVoice, selectedPair);
      if (voiceDetails) {
        const preset = PODCAST_PRESETS.find(p => p.locale === selectedPreset);
        if (preset) {
          const adaptedScript = adaptPresetToSpeakers(preset, voiceDetails.speakers);
          setText(adaptedScript);
        }
      }
    }
  }, [selectedPair, selectedPreset, selectedVoice]);

  // Add to history when synthesis completes successfully with NEW audio
  useEffect(() => {
    if (audioData && audioData !== previousAudioDataRef.current && selectedVoice && selectedPair) {
      previousAudioDataRef.current = audioData;
      const voiceDetails = getVoiceDetailsFromPair(selectedVoice, selectedPair);

      getAudioDuration(audioData)
        .then((duration) => {
          addToHistory({
            timestamp: Date.now(),
            text: text,
            voice: voiceDetails?.displayName || selectedPair.display,
            region: settings.region,
            audioData: audioData,
            duration: duration,
          });
        })
        .catch((err) => {
          console.error('Failed to get audio duration:', err);
          const estimatedDuration = (audioData.byteLength * 8) / 48000;
          addToHistory({
            timestamp: Date.now(),
            text: text,
            voice: voiceDetails?.displayName || selectedPair.display,
            region: settings.region,
            audioData: audioData,
            duration: estimatedDuration,
          });
        });
    }
  }, [audioData, text, selectedVoice, selectedPair, settings.region, addToHistory]);

  const handlePlay = () => {
    if (selectedVoice && selectedPair) {
      const voiceDetails = getVoiceDetailsFromPair(selectedVoice, selectedPair);
      if (voiceDetails) {
        synthesize(text, voiceDetails.voiceName, voiceDetails.locale, voiceDetails.speakers);
      }
    }
  };

  // Save AI config to localStorage when changed
  const saveAIConfig = () => {
    localStorage.setItem('aoai_endpoint', aiEndpoint);
    localStorage.setItem('aoai_apikey', aiApiKey);
    localStorage.setItem('aoai_deployment', aiDeployment);
    setShowAIConfig(false);
  };

  // Generate podcast script from URL
  const handleGenerateFromUrl = async () => {
    if (!urlInput.trim()) {
      setGenerateError('Please enter a URL');
      return;
    }
    if (!aiEndpoint || !aiApiKey) {
      setGenerateError('Please configure Azure OpenAI settings first');
      setShowAIConfig(true);
      return;
    }
    if (!selectedVoice || !selectedPair) {
      setGenerateError('Please select a voice and speaker pair first');
      return;
    }

    setIsGenerating(true);
    setGenerateError('');

    try {
      const config: AzureOpenAIConfig = {
        endpoint: aiEndpoint,
        apiKey: aiApiKey,
        deploymentName: aiDeployment,
      };

      const voiceDetails = getVoiceDetailsFromPair(selectedVoice, selectedPair);
      if (!voiceDetails) {
        throw new Error('Failed to get voice details');
      }

      // Determine language: use preset language if selected, otherwise voice locale, default to en-US
      const localeToUse = selectedPreset || voiceDetails.locale || 'en-US';
      const langCode = localeToUse.split('-')[0].toLowerCase();
      const languageMap: Record<string, string> = {
        'zh': 'Chinese',
        'ja': 'Japanese',
        'ko': 'Korean',
        'de': 'German',
        'fr': 'French',
        'es': 'Spanish',
        'pt': 'Portuguese',
        'it': 'Italian',
        'en': 'English',
      };
      const language = languageMap[langCode] || 'English';

      const script = await generatePodcastScript(config, {
        url: urlInput,
        speakers: voiceDetails.speakers,
        language,
      });

      setText(script);
      setSelectedPreset(''); // Clear preset since we're using generated script
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate script');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (entry: MultiTalkerHistoryEntry) => {
    const blob = new Blob([entry.audioData], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multitalker-${entry.voice}-${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePlayHistoryEntry = (entry: MultiTalkerHistoryEntry) => {
    // If clicking the same entry that's playing, stop it
    if (playingHistoryId === entry.id && historyAudioRef.current) {
      historyAudioRef.current.pause();
      historyAudioRef.current = null;
      setPlayingHistoryId(null);
      return;
    }

    // Stop any currently playing audio
    if (historyAudioRef.current) {
      historyAudioRef.current.pause();
      historyAudioRef.current = null;
    }

    const blob = new Blob([entry.audioData], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    historyAudioRef.current = audio;
    setPlayingHistoryId(entry.id);

    audio.play();
    audio.onended = () => {
      URL.revokeObjectURL(url);
      setPlayingHistoryId(null);
      historyAudioRef.current = null;
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      setPlayingHistoryId(null);
      historyAudioRef.current = null;
    };
  };

  // Handle voice change from selector
  const handleVoiceChange = (voice: VoiceInfo) => {
    setSelectedVoice(voice);
  };

  // Handle pair change from selector
  const handlePairChange = (pair: SpeakerPair) => {
    setSelectedPair(pair);
    // Update text with new speaker names if using default text
    if (selectedVoice) {
      const voiceDetails = getVoiceDetailsFromPair(selectedVoice, pair);
      if (voiceDetails && !selectedPreset) {
        updateSampleTextWithSpeakers(voiceDetails.speakers);
      }
    }
  };

  // Map MultiTalkerState to SynthesisState for PlaybackControls compatibility
  const synthesisState: SynthesisState = state as SynthesisState;

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      {/* Left side - Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 shadow-md">
          <h1 className="text-3xl font-bold">Multi Talker</h1>
          <p className="text-purple-100 mt-1">
            Create multi-speaker dialog content with AI-powered voices
          </p>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-4 p-6 overflow-y-auto">
          {/* Region Not Supported Message */}
          {isConfigured && !isRegionSupported && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-amber-800">Region Not Supported</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Multi Talker is currently only available in the following regions:
                  </p>
                  <ul className="text-sm text-amber-700 mt-2 list-disc list-inside">
                    <li><strong>East US</strong> (eastus)</li>
                    <li><strong>West Europe</strong> (westeurope)</li>
                    <li><strong>Southeast Asia</strong> (southeastasia)</li>
                  </ul>
                  <p className="text-sm text-amber-700 mt-2">
                    Your current region is <strong>{settings.region}</strong>. Please update your region in the sidebar settings.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Voice Load Error */}
          {voiceLoadError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-red-800">Failed to Load Voices</h3>
                  <p className="text-sm text-red-700 mt-1">{voiceLoadError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Only show controls if region is supported */}
          {(!isConfigured || isRegionSupported) && (
            <>
          {/* URL to Script Generator */}
          <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-purple-700">Generate Script from URL</label>
              <button
                onClick={() => setShowAIConfig(!showAIConfig)}
                className="text-xs text-purple-600 hover:text-purple-800 underline"
              >
                {showAIConfig ? 'Hide' : 'Configure'} Azure OpenAI
              </button>
            </div>

            {/* AI Config Panel */}
            {showAIConfig && (
              <div className="mb-3 p-3 bg-white border border-purple-200 rounded-md space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Endpoint</label>
                  <input
                    type="text"
                    value={aiEndpoint}
                    onChange={(e) => setAiEndpoint(e.target.value)}
                    placeholder="https://your-resource.openai.azure.com"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
                  <input
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder="Enter API key"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Deployment Name</label>
                  <input
                    type="text"
                    value={aiDeployment}
                    onChange={(e) => setAiDeployment(e.target.value)}
                    placeholder="gpt-5"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <button
                  onClick={saveAIConfig}
                  className="px-3 py-1 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700"
                >
                  Save Config
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Enter URL to generate podcast script from..."
                className="flex-1 px-3 py-2 border border-purple-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                disabled={isGenerating}
              />
              <button
                onClick={handleGenerateFromUrl}
                disabled={isGenerating || !urlInput.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Generating...
                  </>
                ) : (
                  'Generate Script'
                )}
              </button>
            </div>
            {generateError && (
              <p className="mt-2 text-xs text-red-600">{generateError}</p>
            )}
          </div>

          {/* Preset Selector */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Podcast Script Preset:</label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              disabled={state === 'synthesizing' || state === 'playing'}
            >
              <option value="">-- Select a preset --</option>
              {PODCAST_PRESETS.map((preset) => (
                <option key={preset.locale} value={preset.locale}>
                  {preset.language}
                </option>
              ))}
            </select>
            {selectedPreset && (
              <button
                onClick={() => {
                  setSelectedPreset('');
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>

          {/* Text Input Area */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {showSSML ? 'SSML Preview' : 'Dialog Text'}
              </label>
              {selectedVoice && selectedPair && !showSSML && (() => {
                const voiceDetails = getVoiceDetailsFromPair(selectedVoice, selectedPair);
                return voiceDetails ? (
                  <div className="text-xs text-gray-500">
                    Format: <code className="bg-gray-100 px-1 rounded">speaker: text</code>
                    {' | Speakers: '}
                    {voiceDetails.speakers.map((s) => (
                      <code key={s} className="bg-purple-100 text-purple-700 px-1 rounded mx-0.5">
                        {s}
                      </code>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
            <textarea
              value={(() => {
                if (showSSML && selectedVoice && selectedPair) {
                  const voiceDetails = getVoiceDetailsFromPair(selectedVoice, selectedPair);
                  return voiceDetails
                    ? buildMultiTalkerSSML(text, voiceDetails.voiceName, voiceDetails.locale, voiceDetails.speakers)
                    : text;
                }
                return text;
              })()}
              onChange={(e) => !showSSML && setText(e.target.value)}
              placeholder={`Enter dialog text with speaker prefixes:\nspeaker1: Hello!\nspeaker2: Hi there!`}
              className={`flex-1 w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm resize-none ${showSSML ? 'bg-gray-900 text-green-400' : ''}`}
              disabled={state === 'synthesizing' || state === 'playing'}
              readOnly={showSSML}
            />
            <div className="mt-2 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {text.split('\n').filter(l => l.trim()).length} lines | {text.length} characters
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSSML(!showSSML)}
                  disabled={!selectedVoice || !selectedPair || !text}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {showSSML ? 'Show Plain Text' : 'Show SSML'}
                </button>
                <button
                  onClick={() => setText('')}
                  disabled={!text}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear Text
                </button>
              </div>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="border-t border-gray-200 pt-4">
            <PlaybackControls
              state={synthesisState}
              error={error}
              audioData={audioData}
              hasText={text.trim().length > 0}
              isConfigured={isConfigured && selectedVoice !== null && selectedPair !== null}
              onPlay={handlePlay}
              onPause={pause}
              onResume={resume}
              onStop={stop}
            />
          </div>
            </>
          )}
        </div>

        {/* History Panel */}
        <div className="border-t border-gray-200 bg-gray-50">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-100"
            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
          >
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-800">Synthesis History</h3>
              {history.length > 0 && (
                <span className="px-2 py-1 text-xs font-medium text-white bg-purple-600 rounded-full">
                  {history.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Clear all history?')) {
                      clearHistory();
                    }
                  }}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  Clear All
                </button>
              )}
              <svg
                className={`w-5 h-5 text-gray-600 transform transition-transform ${isHistoryExpanded ? 'rotate-180' : ''}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          {isHistoryExpanded && (
            <div className="max-h-64 overflow-y-auto">
              {history.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  No synthesis history yet
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="px-4 py-3 flex items-center justify-between hover:bg-gray-100"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">
                          {entry.voice}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(entry.timestamp).toLocaleTimeString()} |{' '}
                          {entry.duration.toFixed(1)}s |{' '}
                          {entry.text.substring(0, 50)}...
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handlePlayHistoryEntry(entry)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title={playingHistoryId === entry.id ? 'Pause' : 'Play'}
                        >
                          {playingHistoryId === entry.id ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleDownload(entry)}
                          className="p-2 text-gray-600 hover:bg-gray-200 rounded-full"
                          title="Download"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => removeFromHistory(entry.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
          <p className="text-xs text-gray-600">
            Multi Talker uses Azure Speech Service with multi-talker voices.
          </p>
          <FeedbackButton
            text={text}
            selectedVoice={(() => {
              const voiceDetails = getVoiceDetailsFromPair(selectedVoice, selectedPair);
              return voiceDetails?.displayName || '';
            })()}
            region={settings.region}
            audioData={audioData}
          />
        </div>
      </div>

      {/* Right side - Voice and Speaker Pair Selector */}
      <div className="w-full md:w-[28rem] flex-shrink-0 bg-gray-50 border-l border-gray-200 p-6 flex flex-col overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Voice & Speaker Selection</h2>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <MultiTalkerSpeakerPairSelector
            voices={voices}
            selectedVoice={selectedVoice}
            selectedPair={selectedPair}
            onVoiceChange={handleVoiceChange}
            onPairChange={handlePairChange}
            isLoading={isLoadingVoices}
          />
        </div>
      </div>
    </div>
  );
}
