import { useState, useEffect, useCallback, useRef } from 'react';
import { AzureSettings } from '../types/azure';
import { PodcastContentUploader } from './PodcastContentUploader';
import { PodcastOneHostVoiceSelector } from './PodcastOneHostVoiceSelector';
import { PodcastTwoHostsVoiceSelector } from './PodcastTwoHostsVoiceSelector';
import { ALL_TTS_REGIONS } from './NavigationSidebar';
import { usePodcastGeneration } from '../hooks/usePodcastGeneration';
import { PodcastVideoRenderer } from '../lib/podcast/videoRenderer';
import {
  PodcastContentSource,
  PodcastConfig,
  HostType,
  PodcastStyle,
  PodcastLength,
  PodcastHistoryEntry,
  GenerationStatus,
  Voice,
  PODCAST_LOCALES,
} from '../types/podcast';

interface PodcastAgentPlaygroundProps {
  settings: AzureSettings;
  isConfigured: boolean;
  history: PodcastHistoryEntry[];
  addToHistory: (entry: Omit<PodcastHistoryEntry, 'id'>) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
}

// Podcast Agent supported regions
const SUPPORTED_REGIONS = [
  'westeurope',
  'centralus',
  'eastus',
  'eastus2',
  'northcentralus',
  'southcentralus',
  'westcentralus',
  'westus',
  'westus2',
  'westus3',
];



const HOST_TYPES: { value: HostType; label: string; description: string }[] = [
  {
    value: 'OneHost',
    label: 'Single Host',
    description: 'One narrator guides the podcast',
  },
  {
    value: 'TwoHosts',
    label: 'Two Hosts',
    description: 'Conversational format with two speakers',
  },
];

const STYLES: { value: PodcastStyle; label: string }[] = [
  { value: 'Default', label: 'Default' },
  { value: 'Professional', label: 'Professional' },
  { value: 'Casual', label: 'Casual' },
];

const LENGTHS: { value: PodcastLength; label: string; description: string }[] = [
  { value: 'VeryShort', label: 'Very Short', description: '~1 min' },
  { value: 'Short', label: 'Short', description: '~3 min' },
  { value: 'Medium', label: 'Medium', description: '~5 min' },
  { value: 'Long', label: 'Long', description: '~10 min' },
  { value: 'VeryLong', label: 'Very Long', description: '~15+ min' },
];

const TEMPLATES: { value: string; label: string; description: string; maxChars: number; audience: string }[] = [
  { 
    value: 'Default', 
    label: 'Default', 
    description: 'Standard template with system-generated dialog structure. Best for most use cases.',
    maxChars: 1000,
    audience: 'Public Users'
  },
  { 
    value: 'CustomizeDialogStructure', 
    label: 'Custom Dialog Structure', 
    description: 'Allows customization of conversation flow and dialog patterns. Provides more control over podcast structure while maintaining quality.',
    maxChars: 10000,
    audience: 'Advanced Users'
  },
];

const CONFIG_STORAGE_KEY = 'podcast-agent-config';

interface StoredConfig {
  locale: string;
  hostType: HostType;
  style: PodcastStyle;
  length: PodcastLength;
  additionalInstructions: string;
  template?: string;
  genderPreference?: 'Male' | 'Female';
  oneHostVoiceId?: string;
  twoHostsVoiceId?: string;
  twoHostsSpeaker1?: string;
  twoHostsSpeaker2?: string;
}

function loadConfig(): Partial<StoredConfig> {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveConfig(config: Partial<StoredConfig>): void {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export function PodcastAgentPlayground({
  settings,
  isConfigured,
  history,
  addToHistory,
  removeFromHistory,
  clearHistory,
}: PodcastAgentPlaygroundProps) {
  // Load saved config
  const savedConfig = loadConfig();

  // Content source state
  const [contentSource, setContentSource] = useState<PodcastContentSource | null>(null);

  // Config state
  const [locale, setLocale] = useState(savedConfig.locale || 'en-US');
  const [hostType, setHostType] = useState<HostType>(savedConfig.hostType || 'TwoHosts');
  // OneHost voice selection
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [genderPreference, setGenderPreference] = useState<'Male' | 'Female' | undefined>(
    savedConfig.genderPreference
  );
  // TwoHosts voice selection
  const [twoHostsVoice, setTwoHostsVoice] = useState<Voice | null>(null);
  const [twoHostsSpeaker1, setTwoHostsSpeaker1] = useState<string | null>(savedConfig.twoHostsSpeaker1 || null);
  const [twoHostsSpeaker2, setTwoHostsSpeaker2] = useState<string | null>(savedConfig.twoHostsSpeaker2 || null);
  
  // Manual voice input (for hidden/unlisted voices)
  const [manualOneHostVoiceName, setManualOneHostVoiceName] = useState<string>('');
  const [manualTwoHostsVoiceName, setManualTwoHostsVoiceName] = useState<string>('');
  const [manualSpeakerNames, setManualSpeakerNames] = useState<string>('');
  
  const [style, setStyle] = useState<PodcastStyle>(savedConfig.style || 'Default');
  const [length, setLength] = useState<PodcastLength>(savedConfig.length || 'Medium');
  const [additionalInstructions, setAdditionalInstructions] = useState(
    savedConfig.additionalInstructions || ''
  );
  const [template, setTemplate] = useState<string>(savedConfig.template || 'Default');
  const [manualTemplate, setManualTemplate] = useState<string>('');

  // UI state
  const [showHistory, setShowHistory] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Video generation state
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [generatedVideoBlob, setGeneratedVideoBlob] = useState<Blob | null>(null);
  const videoRendererRef = useRef<PodcastVideoRenderer | null>(null);

  // Podcast generation hook
  const {
    status,
    progress,
    error,
    currentGeneration,
    startGeneration,
    cancelGeneration,
    reset,
  } = usePodcastGeneration({
    apiKey: settings.apiKey,
    region: settings.region,
  });

  // Save config when settings change
  useEffect(() => {
    saveConfig({
      locale,
      hostType,
      style,
      length,
      additionalInstructions,
      template,
      genderPreference,
      oneHostVoiceId: selectedVoice?.id,
      twoHostsVoiceId: twoHostsVoice?.id,
      twoHostsSpeaker1: twoHostsSpeaker1 || undefined,
      twoHostsSpeaker2: twoHostsSpeaker2 || undefined,
    });
  }, [locale, hostType, style, length, additionalInstructions, template, genderPreference, selectedVoice, twoHostsVoice, twoHostsSpeaker1, twoHostsSpeaker2]);

  // Reset voice selections when locale or host type changes
  useEffect(() => {
    setSelectedVoice(null);
    setGenderPreference(undefined);
    setTwoHostsVoice(null);
    setTwoHostsSpeaker1(null);
    setTwoHostsSpeaker2(null);
    setManualOneHostVoiceName('');
    setManualTwoHostsVoiceName('');
    setManualSpeakerNames('');
  }, [locale, hostType]);

  // Get available locales based on host type
  const availableLocales = hostType === 'TwoHosts'
    ? PODCAST_LOCALES.filter(l => l.supportsTwoHosts)
    : PODCAST_LOCALES;

  // Reset locale if current locale doesn't support the selected host type
  useEffect(() => {
    const currentLocale = PODCAST_LOCALES.find(l => l.code === locale);
    if (hostType === 'TwoHosts' && currentLocale && !currentLocale.supportsTwoHosts) {
      // Reset to first available locale that supports TwoHosts
      const firstTwoHostsLocale = PODCAST_LOCALES.find(l => l.supportsTwoHosts);
      if (firstTwoHostsLocale) {
        setLocale(firstTwoHostsLocale.code);
      }
    }
  }, [hostType, locale]);

  const handleStartGeneration = useCallback(async () => {
    if (!contentSource) return;

    // Determine which template to use: manual input or selected template
    const effectiveTemplate = template === 'custom' ? manualTemplate : template;
    
    const config: PodcastConfig = {
      locale,
      hostType,
      style,
      length,
      additionalInstructions: additionalInstructions.trim() || undefined,
      template: effectiveTemplate !== 'Default' ? effectiveTemplate : undefined,  // Only include if not default
    };

    let voiceName: string | undefined;
    let speakerNames: string | undefined;

    if (hostType === 'TwoHosts') {
      // Priority 1: Manual input (for hidden/unlisted voices)
      if (manualTwoHostsVoiceName && manualSpeakerNames) {
        voiceName = manualTwoHostsVoiceName;
        speakerNames = manualSpeakerNames;
      }
      // Priority 2: New voice selector
      else if (twoHostsVoice && twoHostsSpeaker1 && twoHostsSpeaker2) {
        voiceName = twoHostsVoice.shortName;
        speakerNames = `${twoHostsSpeaker1},${twoHostsSpeaker2}`;
      }
    } else if (hostType === 'OneHost') {
      // Priority 1: Manual input (for hidden/unlisted voices)
      if (manualOneHostVoiceName) {
        voiceName = manualOneHostVoiceName;
      }
      // Priority 2: Selected voice from dropdown
      else if (selectedVoice) {
        voiceName = selectedVoice.shortName;
      }
    }

    await startGeneration(contentSource, config, voiceName, speakerNames, genderPreference, addToHistory);
  }, [contentSource, locale, hostType, style, length, additionalInstructions, template, manualTemplate, selectedVoice, twoHostsVoice, twoHostsSpeaker1, twoHostsSpeaker2, manualOneHostVoiceName, manualTwoHostsVoiceName, manualSpeakerNames, genderPreference, startGeneration, addToHistory]);

  const handleReset = useCallback(() => {
    reset();
    setContentSource(null);
  }, [reset]);

  const handlePlayFromHistory = useCallback((entry: PodcastHistoryEntry) => {
    // Scroll to results section and play audio
    if (entry.audioUrl) {
      window.open(entry.audioUrl, '_blank');
    }
  }, []);

  const handleGenerateVideo = useCallback(async () => {
    if (!currentGeneration?.output?.audioFileUrl) return;

    try {
      setIsGeneratingVideo(true);
      setVideoProgress(0);
      setVideoError(null);
      setGeneratedVideoBlob(null);

      const podcastTitle = currentGeneration.displayName || 'AI Podcast';

      const renderer = new PodcastVideoRenderer({
        audioUrl: currentGeneration.output.audioFileUrl,
        podcastTitle,
        width: 1280,
        height: 720,
        onProgress: (progress) => {
          setVideoProgress(progress);
        },
        onComplete: (videoBlob) => {
          setGeneratedVideoBlob(videoBlob);
          setIsGeneratingVideo(false);
          console.log('Video generation completed!', videoBlob);
        },
        onError: (error) => {
          setVideoError(error.message);
          setIsGeneratingVideo(false);
          console.error('Video generation error:', error);
        },
      });

      videoRendererRef.current = renderer;
      await renderer.generate();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setVideoError(errorMessage);
      setIsGeneratingVideo(false);
    }
  }, [currentGeneration]);

  const handleCancelVideo = useCallback(() => {
    if (videoRendererRef.current) {
      videoRendererRef.current.cancel();
      videoRendererRef.current = null;
    }
    setIsGeneratingVideo(false);
    setVideoProgress(0);
  }, []);

  const handleDownloadVideo = useCallback(() => {
    if (!generatedVideoBlob) return;

    const url = URL.createObjectURL(generatedVideoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `podcast-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generatedVideoBlob]);

  const getStatusColor = (s: GenerationStatus): string => {
    switch (s) {
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'cancelled':
        return 'text-yellow-600';
      default:
        return 'text-blue-600';
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const isProcessing = ['uploading', 'creating', 'processing'].includes(status);
  // Skip region validation for:
  // 1. TIP environments ending with "tip" (e.g., "*-tip")
  // 2. Local development URLs starting with "https://localhost"
  const isTipEnvironment = settings.region.endsWith('tip');
  const isLocalhost = settings.region.startsWith('https://localhost');
  const isRegionSupported = isTipEnvironment || isLocalhost || SUPPORTED_REGIONS.includes(settings.region.toLowerCase());
  
  // Check if TwoHosts requirements are met
  // TwoHosts is ready when NOT in invalid partial state:
  //    - Auto mode (nothing selected): valid
  //    - Voice selected with both speakers: valid
  //    - Manual voice + speaker names: valid
  //    - Voice selected WITHOUT speakers: INVALID (partial state)
  //    - Manual voice WITHOUT speaker names: INVALID (partial state)
  const isTwoHostsReady = hostType === 'TwoHosts' && (
    // Check: if voice is selected, speakers must be selected too
    (twoHostsVoice === null || (twoHostsSpeaker1 !== null && twoHostsSpeaker2 !== null)) &&
    // Check: if manual voice is entered, speaker names must be entered too
    (!manualTwoHostsVoiceName || manualSpeakerNames)
  );
  
  const canStart =
    isConfigured &&
    isRegionSupported &&
    !isProcessing &&
    contentSource !== null &&
    (hostType === 'OneHost' || isTwoHostsReady);

  if (!isConfigured) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Configuration Required</h3>
          <p className="text-yellow-700">
            Please configure your Azure Speech API key and region in the settings panel to use Podcast
            Agent.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Podcast Agent</h1>
            <p className="text-purple-100 mt-1">
              Generate AI podcasts from your content with natural conversational speech
            </p>
          </div>
          <a
            href="https://github.com/szhaomsft/AzureVoicePlayground/blob/main/public/docs/products/podcast/README.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors ml-4"
            title="View API Documentation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-sm font-medium">API Docs</span>
          </a>
        </div>
      </div>

      {/* Main Content - Two Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Content Source & Results */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Region Not Supported Message */}
            {isConfigured && !isRegionSupported && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-amber-800">Region Not Supported</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      Podcast Agent is currently only available in the following regions:
                    </p>
                    <ul className="text-sm text-amber-700 mt-2 list-disc list-inside">
                      {SUPPORTED_REGIONS.map((regionValue) => {
                        const regionInfo = ALL_TTS_REGIONS.find(r => r.value === regionValue);
                        return (
                          <li key={regionValue}>
                            {regionInfo ? `${regionInfo.label} (${regionValue})` : regionValue}
                          </li>
                        );
                      })}
                    </ul>
                    <p className="text-sm text-amber-700 mt-2">
                      Your current region: <strong>{settings.region}</strong>. Please change your region
                      in the sidebar settings.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Content Source */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Content Source</h2>
              <PodcastContentUploader
                onContentChange={setContentSource}
                disabled={isProcessing}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handleStartGeneration}
                disabled={!canStart}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Generate Podcast</span>
                  </>
                )}
              </button>

              {isProcessing && (
                <button
                  onClick={cancelGeneration}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              )}

              {status !== 'idle' && !isProcessing && (
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Progress Panel */}
            {isProcessing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <svg
                    className="animate-spin h-5 w-5 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-blue-900">{progress.message}</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.step / progress.totalSteps) * 100}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-blue-700">
                  Step {progress.step} of {progress.totalSteps}
                </div>
              </div>
            )}

            {/* Error Panel */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <h3 className="font-medium text-red-800">Generation Failed</h3>
                    <p className="text-sm text-red-700 mt-1">
                      {error || currentGeneration?.failureReason || 'Generation failed'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Results Panel */}
            {status === 'completed' && currentGeneration?.output?.audioFileUrl && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-900 mb-3">Podcast Generated Successfully!</h3>
                <div className="space-y-3">
                  <audio controls className="w-full" src={currentGeneration.output.audioFileUrl}>
                    Your browser does not support the audio element.
                  </audio>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={currentGeneration.output.audioFileUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      <span>Download Audio</span>
                    </a>
                    {currentGeneration.output.reportFileUrl && (
                      <a
                        href={currentGeneration.output.reportFileUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span>Download Report</span>
                      </a>
                    )}
                    {currentGeneration.output.intermediateZipFileUrl && (
                      <a
                        href={currentGeneration.output.intermediateZipFileUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                          />
                        </svg>
                        <span>Download Intermediate Files</span>
                      </a>
                    )}
                    <button
                      onClick={handleGenerateVideo}
                      disabled={isGeneratingVideo}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      <span>Generate Video</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Video Generation Progress */}
            {isGeneratingVideo && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-purple-900">Generating Video...</h3>
                  <button
                    onClick={handleCancelVideo}
                    className="text-sm text-purple-700 hover:text-purple-900 font-medium"
                  >
                    Cancel
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="w-full bg-purple-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${videoProgress * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-purple-700">
                    {Math.round(videoProgress * 100)}% complete
                  </div>
                  <div className="text-xs text-purple-600">
                    This may take as long as the audio duration. The video is being recorded in real-time.
                  </div>
                </div>
              </div>
            )}

            {/* Video Generation Error */}
            {videoError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <h3 className="font-medium text-red-800">Video Generation Failed</h3>
                    <p className="text-sm text-red-700 mt-1">{videoError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Video Generated Successfully */}
            {generatedVideoBlob && !isGeneratingVideo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-3">Video Generated Successfully!</h3>
                <div className="space-y-3">
                  <video
                    controls
                    className="w-full rounded"
                    src={URL.createObjectURL(generatedVideoBlob)}
                  >
                    Your browser does not support the video element.
                  </video>
                  <button
                    onClick={handleDownloadVideo}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    <span>Download Video (WebM)</span>
                  </button>
                  <div className="text-xs text-blue-600">
                    Video size: {(generatedVideoBlob.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Settings */}
        <div className="w-96 border-l border-gray-200 overflow-auto p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Podcast Configuration</h2>
            </div>

            {/* Locale */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                disabled={isProcessing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {availableLocales.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.supportsTwoHosts ? '👥' : '👤'} {l.name}
                  </option>
                ))}
              </select>
              <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                <div className="flex items-center gap-1">
                  <span>👥 Supports OneHost and TwoHosts</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>👤 Supports OneHost only</span>
                </div>
                {hostType === 'TwoHosts' && availableLocales.length < PODCAST_LOCALES.length && (
                  <p className="mt-1 text-amber-600 font-medium">
                    Note: Only languages with TwoHosts support are shown
                  </p>
                )}
              </div>
            </div>

            {/* Host Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Host Type</label>
              <div className="space-y-2">
                {HOST_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      hostType === type.value
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="radio"
                      value={type.value}
                      checked={hostType === type.value}
                      onChange={(e) => setHostType(e.target.value as HostType)}
                      disabled={isProcessing}
                      className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Voice Selector (only for TwoHosts) */}
            {hostType === 'TwoHosts' && (
              <PodcastTwoHostsVoiceSelector
                apiConfig={{
                  apiKey: settings.apiKey,
                  region: settings.region,
                }}
                locale={locale}
                selectedVoice={twoHostsVoice}
                selectedSpeaker1={twoHostsSpeaker1}
                selectedSpeaker2={twoHostsSpeaker2}
                onVoiceChange={setTwoHostsVoice}
                onSpeakersChange={(speaker1, speaker2) => {
                  setTwoHostsSpeaker1(speaker1);
                  setTwoHostsSpeaker2(speaker2);
                }}
                manualVoiceName={manualTwoHostsVoiceName}
                manualSpeakerNames={manualSpeakerNames}
                onManualVoiceNameChange={setManualTwoHostsVoiceName}
                onManualSpeakerNamesChange={setManualSpeakerNames}
                disabled={isProcessing}
              />
            )}

            {/* Voice Selector (only for OneHost) */}
            {hostType === 'OneHost' && (
              <PodcastOneHostVoiceSelector
                apiConfig={{
                  apiKey: settings.apiKey,
                  region: settings.region,
                }}
                locale={locale}
                selectedVoice={selectedVoice}
                onVoiceChange={(voice) => {
                  setSelectedVoice(voice);
                  // Clear gender preference when a specific voice is selected
                  if (voice) {
                    setGenderPreference(undefined);
                  }
                }}
                manualVoiceName={manualOneHostVoiceName}
                onManualVoiceNameChange={setManualOneHostVoiceName}
                disabled={isProcessing}
              />
            )}

            {/* Note when voice is selected */}
            {hostType === 'OneHost' && (selectedVoice || manualOneHostVoiceName) && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-xs text-gray-600">
                  <span className="font-medium">Note:</span> Gender preference is not available when a specific voice is selected. 
                  {manualOneHostVoiceName ? ' Clear the manual input' : ' Select "Auto"'} to use gender preference instead.
                </p>
              </div>
            )}

            {/* Gender Preference (only for OneHost when no voice is selected) */}
            {hostType === 'OneHost' && !selectedVoice && !manualOneHostVoiceName && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender Preference <span className="text-gray-500 font-normal">- Optional</span>
                </label>
                <p className="text-xs text-gray-500 -mt-1 mb-2">
                  Guide automatic voice selection by gender
                </p>
                <div className="space-y-2">
                  {[
                    { value: undefined, label: 'Auto', description: 'System will choose automatically' },
                    { value: 'Male' as const, label: 'Male', description: 'Prefer male voice' },
                    { value: 'Female' as const, label: 'Female', description: 'Prefer female voice' },
                  ].map((option) => (
                    <label
                      key={option.value || 'auto'}
                      className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                        genderPreference === option.value
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="radio"
                        checked={genderPreference === option.value}
                        onChange={() => setGenderPreference(option.value)}
                        disabled={isProcessing}
                        className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500"
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as PodcastStyle)}
                disabled={isProcessing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {STYLES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Length */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Length</label>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value as PodcastLength)}
                disabled={isProcessing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {LENGTHS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label} {l.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Additional Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Instructions
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <textarea
                value={additionalInstructions}
                onChange={(e) => {
                  const selectedTemplate = TEMPLATES.find(t => t.value === template);
                  // Use 100,000 for custom templates, otherwise use the template's maxChars
                  const maxLength = template === 'custom' ? 100000 : (selectedTemplate?.maxChars || 1000);
                  if (e.target.value.length <= maxLength) {
                    setAdditionalInstructions(e.target.value);
                  }
                }}
                disabled={isProcessing}
                placeholder="e.g., Focus on technical details, use casual tone, include examples..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
              />
              <div className="mt-1 text-xs text-gray-500">
                {additionalInstructions.length} / {template === 'custom' ? '100,000' : (TEMPLATES.find(t => t.value === template)?.maxChars.toLocaleString() || '1,000')} characters
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Advanced Settings</span>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transform transition-transform ${
                    showAdvancedSettings ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAdvancedSettings && (
                <div className="mt-4 space-y-4">
                  {/* Dialog Generation Prompt Template */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dialog Generation Prompt Template
                    </label>
                    <select
                      value={template}
                      onChange={(e) => {
                        const newTemplate = e.target.value;
                        setTemplate(newTemplate);
                        
                        if (newTemplate === 'custom') {
                          // Clear manual input when selecting Custom
                          setManualTemplate('');
                        } else {
                          // Truncate additionalInstructions if it exceeds the new template's limit
                          const selectedTemplate = TEMPLATES.find(t => t.value === newTemplate);
                          if (selectedTemplate && additionalInstructions.length > selectedTemplate.maxChars) {
                            setAdditionalInstructions(additionalInstructions.slice(0, selectedTemplate.maxChars));
                          }
                        }
                      }}
                      disabled={isProcessing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {TEMPLATES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label} ({t.audience})
                        </option>
                      ))}
                      <option value="custom">Custom...</option>
                    </select>
                    
                    {/* Manual Template Input - only show when Custom is selected */}
                    {template === 'custom' && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md space-y-2">
                        <label className="block text-sm font-medium text-amber-900">
                          Enter Custom Template Name
                        </label>
                        <p className="text-xs text-amber-700">
                          Specify a custom template name for specialized scenarios. Instruction length limit: 100,000 characters.
                        </p>
                        <input
                          type="text"
                          value={manualTemplate}
                          onChange={(e) => setManualTemplate(e.target.value)}
                          placeholder="e.g., MyCustomTemplate"
                          disabled={isProcessing}
                          autoFocus
                          className="w-full px-3 py-2 border border-amber-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono"
                        />
                        {manualTemplate && (
                          <div className="text-xs text-amber-700">
                            ℹ️ Using custom template: <code className="font-mono font-semibold bg-amber-100 px-1 rounded">{manualTemplate}</code>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Template description - only show for predefined templates */}
                    {template !== 'custom' && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-xs text-blue-700">
                          <strong>{TEMPLATES.find(t => t.value === template)?.label}:</strong>{' '}
                          {TEMPLATES.find(t => t.value === template)?.description}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Instruction length limit: {TEMPLATES.find(t => t.value === template)?.maxChars.toLocaleString()} characters
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History Panel */}
      <div className="border-t border-gray-200">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full px-6 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium text-gray-700">Generation History</span>
            <span className="text-xs text-gray-500">({history.length})</span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transform transition-transform ${
              showHistory ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showHistory && (
          <div className="max-h-96 overflow-auto bg-white">
            {history.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No podcast generations yet</p>
                <p className="text-sm mt-1">Your generated podcasts will appear here</p>
              </div>
            ) : (
              <div>
                <div className="px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    {history.length} generation{history.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={clearHistory}
                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                  >
                    Clear All
                  </button>
                </div>
                <div className="divide-y divide-gray-200">
                  {history.map((entry) => (
                    <div key={entry.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {entry.displayName}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                entry.status === 'Succeeded'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {entry.status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 space-y-0.5">
                            <div>
                              {entry.locale} • {entry.hostType} • {entry.style} • {entry.length}
                            </div>
                            {entry.voiceName && (
                              <div className="truncate">Voice: {entry.voiceName}</div>
                            )}
                            <div>{formatTimestamp(entry.timestamp)}</div>
                            <div className="truncate italic">"{entry.contentPreview}"</div>
                          </div>
                        </div>
                        <div className="ml-3 flex space-x-2">
                          {entry.audioUrl && (
                            <button
                              onClick={() => handlePlayFromHistory(entry)}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded"
                              title="Play"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => removeFromHistory(entry.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Remove"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
