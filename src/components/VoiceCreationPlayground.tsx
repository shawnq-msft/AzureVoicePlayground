import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AudioRecorder } from './AudioRecorder';
import {
  type PersonalVoice,
  type VoiceCreationConfig,
  type Consent,
  type BaseModel,
  DEFAULT_VOICE_CREATION_CONFIG,
  SUPPORTED_LOCALES,
  PERSONAL_VOICE_MODELS,
} from '../types/personalVoice';
import {
  listPersonalVoices,
  listConsents,
  listBaseModels,
  createProject,
  getProject,
  createConsent,
  createPersonalVoice,
  deletePersonalVoice,
  deleteConsent,
  waitForConsentReady,
  waitForPersonalVoiceReady,
  synthesizeWithPersonalVoice,
  buildPersonalVoiceSsml,
  type PersonalVoiceClientConfig,
} from '../lib/personalVoice/personalVoiceClient';

interface VoiceCreationPlaygroundProps {
  settings: {
    apiKey: string;
    region: string;
  };
}

export function VoiceCreationPlayground({ settings }: VoiceCreationPlaygroundProps) {
  // Config
  const [config, setConfig] = useState<VoiceCreationConfig>(() => {
    const raw = localStorage.getItem('voicecreation.config');
    if (!raw) return { ...DEFAULT_VOICE_CREATION_CONFIG };
    try {
      return { ...DEFAULT_VOICE_CREATION_CONFIG, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_VOICE_CREATION_CONFIG };
    }
  });

  // Audio state
  const [consentAudio, setConsentAudio] = useState<Blob | null>(null);
  const [voiceAudio, setVoiceAudio] = useState<Blob | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [creationStatus, setCreationStatus] = useState('');
  const [creationError, setCreationError] = useState<string | null>(null);

  // Voice list
  const [voices, setVoices] = useState<PersonalVoice[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<PersonalVoice | null>(null);

  // TTS testing
  const [testText, setTestText] = useState(`Hello, this is my personal voice speaking.
I can speak different languages.
你好，这是我的个人语音。
こんにちは、これは私の個人音声です。
Hola, esta es mi voz personal.
Bonjour, ceci est ma voix personnelle.`);
  const [testModel, setTestModel] = useState<string>('DragonLatestNeural');
  const [baseModels, setBaseModels] = useState<BaseModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [showSsml, setShowSsml] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isConfigured = settings.apiKey && settings.region;

  // Audio-based voice creation only works in these regions
  const SUPPORTED_AUDIO_REGIONS = ['eastus', 'eastus2', 'westeurope', 'southeastasia', 'swedencentral'];
  const isAudioRegionSupported = SUPPORTED_AUDIO_REGIONS.includes(settings.region.toLowerCase());

  const clientConfig: PersonalVoiceClientConfig = {
    apiKey: settings.apiKey,
    region: settings.region,
  };

  // Save config to localStorage
  useEffect(() => {
    localStorage.setItem('voicecreation.config', JSON.stringify(config));
  }, [config]);

  // Load base models on mount
  const loadBaseModels = useCallback(async () => {
    if (!isConfigured) return;

    setIsLoadingModels(true);
    try {
      const models = await listBaseModels(clientConfig);
      console.log('[VoiceCreation] Base models from API:', models);
      setBaseModels(models);
      // Set default model if current selection is not in the list
      if (models.length > 0 && !models.find(m => m.name === testModel)) {
        setTestModel(models[0].name);
      }
    } catch (error) {
      console.error('Failed to load base models:', error);
      // Fall back to hardcoded models if API fails
      setBaseModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  }, [isConfigured, settings.apiKey, settings.region]);

  // Load voices and consents on mount
  const loadVoices = useCallback(async () => {
    if (!isConfigured) return;

    setIsLoadingVoices(true);
    try {
      const [voiceList, consentList] = await Promise.all([
        listPersonalVoices(clientConfig, config.projectId),
        listConsents(clientConfig, config.projectId),
      ]);
      setVoices(voiceList);
      setConsents(consentList);
    } catch (error) {
      console.error('Failed to load voices:', error);
    } finally {
      setIsLoadingVoices(false);
    }
  }, [isConfigured, settings.apiKey, settings.region, config.projectId]);

  useEffect(() => {
    loadBaseModels();
    loadVoices();
  }, [loadBaseModels, loadVoices]);

  // Ensure project exists
  const ensureProject = async () => {
    const existing = await getProject(clientConfig, config.projectId);
    if (!existing) {
      await createProject(clientConfig, config.projectId);
    }
  };

  // Create voice handler
  const handleCreateVoice = async () => {
    if (!consentAudio || !voiceAudio || !config.voiceTalentName || !config.voiceName) {
      setCreationError('Please complete all steps and provide a voice name');
      return;
    }

    setIsCreating(true);
    setCreationError(null);

    try {
      // Step 1: Ensure project exists
      setCreationStatus('Creating project...');
      await ensureProject();

      // Step 2: Create consent
      const consentId = `consent-${Date.now()}`;
      setCreationStatus('Uploading consent...');
      await createConsent(clientConfig, {
        projectId: config.projectId,
        consentId,
        voiceTalentName: config.voiceTalentName,
        companyName: config.companyName,
        audioFile: consentAudio,
        locale: config.locale,
      });

      setCreationStatus('Verifying consent...');
      const consent = await waitForConsentReady(clientConfig, consentId);
      if (consent.status === 'Failed') {
        throw new Error('Consent verification failed. Please ensure the audio clearly states the consent statement.');
      }

      // Step 3: Create personal voice with user-specified name
      const personalVoiceId = config.voiceName.trim().replace(/\s+/g, '-').toLowerCase();
      setCreationStatus('Creating personal voice...');
      await createPersonalVoice(clientConfig, {
        projectId: config.projectId,
        personalVoiceId,
        consentId,
        audioFiles: [voiceAudio],
      });

      setCreationStatus('Training voice model...');
      const voice = await waitForPersonalVoiceReady(clientConfig, personalVoiceId);
      if (voice.status === 'Failed') {
        throw new Error('Voice creation failed. Please try with a different audio sample. Ensure it is the same person as the consent audio.');
      }

      setCreationStatus('Voice created successfully!');

      // Refresh voice list
      await loadVoices();

      // Clear status after delay (but keep audio for user to re-use if desired)
      setTimeout(() => {
        setCreationStatus('');
      }, 3000);
    } catch (error) {
      console.error('Voice creation failed:', error);
      let errorMessage = 'Voice creation failed';
      if (error instanceof Error) {
        if (error.message.includes('409')) {
          errorMessage = 'A voice with this name already exists. Please use a different voice name.';
        } else {
          errorMessage = error.message;
        }
      }
      setCreationError(errorMessage);
      setCreationStatus('');
    } finally {
      setIsCreating(false);
    }
  };

  // Delete voice handler
  const handleDeleteVoice = async (voice: PersonalVoice) => {
    if (!confirm(`Delete voice "${voice.id}"? This cannot be undone.`)) return;

    try {
      await deletePersonalVoice(clientConfig, voice.id);
      // Also try to delete associated consent
      try {
        await deleteConsent(clientConfig, voice.consentId);
      } catch {
        // Consent might already be deleted or shared
      }
      await loadVoices();
      if (selectedVoice?.id === voice.id) {
        setSelectedVoice(null);
      }
    } catch (error) {
      console.error('Failed to delete voice:', error);
      alert('Failed to delete voice');
    }
  };

  // TTS synthesis handler
  const handleSynthesize = async () => {
    if (!selectedVoice || !testText.trim()) return;

    setIsSynthesizing(true);
    setSynthesisError(null);

    try {
      const audioData = await synthesizeWithPersonalVoice(
        clientConfig,
        testText,
        selectedVoice.speakerProfileId,
        config.locale,
        testModel
      );

      // Create audio URL and play
      const blob = new Blob([audioData], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Synthesis failed:', error);
      setSynthesisError(error instanceof Error ? error.message : 'Synthesis failed');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const getConsentTemplate = () => {
    return `I ${config.voiceTalentName || '[your name]'} am aware that recordings of my voice will be used by ${config.companyName} to create and use a synthetic version of my voice.`;
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      {/* Left Panel - Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 shadow-md">
          <h1 className="text-3xl font-bold">Voice Creation</h1>
          <p className="text-emerald-100 mt-1">
            Create your custom AI voice from audio samples
          </p>
        </div>

        {/* Main Content - Split into Creation and Test areas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!isConfigured ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-lg">Please configure your Azure API key and region</p>
              </div>
            </div>
          ) : (
            <>
              {/* Top Section - Voice Creation */}
              <div className="flex-[3] min-h-0 border-b border-gray-200 flex flex-col">
                <div className="flex-1 min-h-0 p-4 overflow-hidden">
                  {/* Audio Based Voice Creation - Compact Layout */}
                  <div className="h-full flex flex-col gap-3">
                      {/* Region Not Supported Message */}
                      {!isAudioRegionSupported ? (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                              <h3 className="font-semibold text-amber-800">Region Not Supported</h3>
                              <p className="text-sm text-amber-700 mt-1">
                                Audio-based voice creation is currently only available in the following regions:
                              </p>
                              <ul className="text-sm text-amber-700 mt-2 list-disc list-inside">
                                <li><strong>East US</strong> (eastus)</li>
                                <li><strong>East US 2</strong> (eastus2)</li>
                                <li><strong>West Europe</strong> (westeurope)</li>
                                <li><strong>Southeast Asia</strong> (southeastasia)</li>
                                <li><strong>Sweden Central</strong> (swedencentral)</li>
                              </ul>
                              <p className="text-sm text-amber-700 mt-2">
                                Your current region is <strong>{settings.region}</strong>. Please update your region in the sidebar settings.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                      {/* Gating Notice */}
                      <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex items-center gap-2 text-sm flex-shrink-0">
                        <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-amber-800">
                          Audio-based voice creation requires gating approval. You must have consent of the speaker to create the voice.{' '}
                          <a
                            href="https://learn.microsoft.com/en-us/azure/ai-services/speech-service/custom-neural-voice"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-700 underline hover:text-amber-900 font-medium"
                          >
                            Learn more and apply for access
                          </a>
                        </span>
                      </div>
                      {/* Settings Row */}
                      <div className="flex gap-4 items-end flex-shrink-0">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Voice Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={config.voiceName}
                            onChange={(e) => setConfig((c) => ({ ...c, voiceName: e.target.value }))}
                            placeholder="my-custom-voice"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Your Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={config.voiceTalentName}
                            onChange={(e) => setConfig((c) => ({ ...c, voiceTalentName: e.target.value }))}
                            placeholder="John Doe"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>
                        <div className="w-32">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Language</label>
                          <select
                            value={config.locale}
                            onChange={(e) => setConfig((c) => ({ ...c, locale: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                          >
                            {SUPPORTED_LOCALES.map((loc) => (
                              <option key={loc.code} value={loc.code}>
                                {loc.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Two Recording Sections Side by Side */}
                      <div className="flex-1 min-h-0 max-h-[250px] grid grid-cols-2 gap-3 overflow-auto">
                        {/* Consent Recording */}
                        <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-3">
                          <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${consentAudio ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                              {consentAudio ? '✓' : '1'}
                            </span>
                            <h3 className="text-sm font-semibold text-gray-800">Consent</h3>
                          </div>

                          <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs flex-shrink-0">
                            <p className="text-blue-800 font-medium">Read aloud:</p>
                            <p className="text-blue-900 italic mt-0.5 line-clamp-2">"{getConsentTemplate()}"</p>
                          </div>

                          <div className="flex-shrink-0">
                            <AudioRecorder
                              onRecordingComplete={setConsentAudio}
                              maxDuration={30}
                              minDuration={3}
                              disabled={isCreating}
                            />
                          </div>
                        </div>

                        {/* Voice Sample Recording */}
                        <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-3">
                          <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${voiceAudio ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                              {voiceAudio ? '✓' : '2'}
                            </span>
                            <h3 className="text-sm font-semibold text-gray-800">Voice Sample</h3>
                          </div>

                          <div className="text-xs text-gray-600 mb-2 flex-shrink-0 space-y-1">
                            <p className="font-medium">Recording Guidelines (5-90 seconds):</p>
                            <ul className="list-disc list-inside space-y-0.5 text-gray-500">
                              <li>Record in a quiet environment with minimal background noise</li>
                              <li>Speak naturally in the style you want for your voice</li>
                              <li>Maintain consistent volume and microphone distance</li>
                            </ul>
                          </div>

                          <div className="flex-shrink-0">
                            <AudioRecorder
                              onRecordingComplete={setVoiceAudio}
                              maxDuration={90}
                              minDuration={5}
                              disabled={isCreating}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Create Button and Status */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <button
                          onClick={handleCreateVoice}
                          disabled={isCreating || !voiceAudio || !consentAudio || !config.voiceTalentName.trim() || !config.voiceName.trim()}
                          className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                        >
                          {isCreating ? 'Creating...' : 'Create My Voice'}
                        </button>

                        {creationError && (
                          <p className="text-sm text-red-600">{creationError}</p>
                        )}

                        {isCreating && creationStatus && (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 animate-spin text-emerald-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <p className="text-sm text-emerald-700">{creationStatus}</p>
                          </div>
                        )}
                      </div>
                        </>
                      )}
                    </div>
                </div>
              </div>

              {/* Bottom Section - Test Voice */}
              <div className="flex-[2] min-h-0 p-4 bg-gray-50 flex flex-col">
                <div className="bg-white rounded-lg border border-gray-200 p-4 flex-1 min-h-0 flex flex-col">
                  <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <h2 className="text-sm font-semibold text-gray-800">Test Voice</h2>
                    {selectedVoice && (
                      <span className="text-xs text-gray-500">
                        Using: <span className="font-medium text-gray-700">{selectedVoice.id}</span>
                      </span>
                    )}
                  </div>

                  {selectedVoice ? (
                    <div className="flex-1 min-h-0 flex flex-col gap-3">
                      <div className="flex gap-3 items-end flex-shrink-0">
                        <div className="w-48">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Model {isLoadingModels && <span className="text-gray-400">(loading...)</span>}
                          </label>
                          <select
                            value={testModel}
                            onChange={(e) => setTestModel(e.target.value)}
                            disabled={isLoadingModels}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100"
                          >
                            {baseModels.length > 0 ? (
                              baseModels.map((m) => (
                                <option key={m.name} value={m.name}>
                                  {m.name}
                                </option>
                              ))
                            ) : (
                              // Fall back to hardcoded models if API fails
                              PERSONAL_VOICE_MODELS.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                        <button
                          onClick={handleSynthesize}
                          disabled={isSynthesizing || !testText.trim()}
                          className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                        >
                          {isSynthesizing ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Synthesizing...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                              Speak
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setShowSsml(!showSsml)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border ${
                            showSsml
                              ? 'bg-gray-100 border-gray-400 text-gray-700'
                              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                          SSML
                        </button>
                        <button
                          onClick={() => {
                            const ssml = buildPersonalVoiceSsml(testText, selectedVoice.speakerProfileId, config.locale, testModel);
                            const emailBody = `
Voice Name: ${selectedVoice.id}
Speaker Name: ${config.voiceTalentName}
Model: ${testModel}
Language: ${config.locale}

Test Text:
${testText}

SSML:
${ssml}

[Please attach the audio file if available]
                            `.trim();
                            const subject = encodeURIComponent(`Personal Voice Feedback - ${selectedVoice.id}`);
                            const body = encodeURIComponent(emailBody);
                            const mailtoLink = `mailto:ttsvoicefeedback@microsoft.com?subject=${subject}&body=${body}`;

                            // Copy SSML to clipboard
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(ssml);
                            }

                            window.open(mailtoLink, '_blank');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border bg-green-600 border-green-600 text-white hover:bg-green-700"
                          title="Send feedback email"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                          </svg>
                          Feedback
                        </button>
                        {synthesisError && (
                          <span className="text-xs text-red-600">{synthesisError}</span>
                        )}
                      </div>

                      <div className="flex-1 min-h-0 flex gap-3">
                        <div className={`flex-1 min-h-0 ${showSsml ? 'w-1/2' : 'w-full'}`}>
                          <textarea
                            value={testText}
                            onChange={(e) => setTestText(e.target.value)}
                            placeholder="Enter text to speak..."
                            className="w-full h-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                          />
                        </div>
                        {showSsml && (
                          <div className="flex-1 min-h-0 w-1/2">
                            <pre className="w-full h-full px-2 py-1.5 bg-gray-900 text-gray-100 rounded text-xs font-mono overflow-auto whitespace-pre-wrap">
                              {buildPersonalVoiceSsml(testText, selectedVoice.speakerProfileId, config.locale, testModel)}
                            </pre>
                          </div>
                        )}
                      </div>

                      <audio ref={audioRef} className="hidden" />
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                        <p className="text-sm">Select a voice from the panel to test</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Panel - Voice List */}
      <div className="w-full md:w-80 flex-shrink-0 bg-gray-50 border-l border-gray-200 flex flex-col overflow-hidden">
        {/* Voice List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">My Voices</h2>
            <button
              onClick={loadVoices}
              disabled={isLoadingVoices || !isConfigured}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              title="Refresh"
            >
              <svg className={`w-5 h-5 ${isLoadingVoices ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {voices.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <p>No voices created yet</p>
              <p className="text-sm mt-1">Create your first voice above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {voices.map((voice) => (
                <div
                  key={voice.id}
                  onClick={() => voice.status === 'Succeeded' && setSelectedVoice(voice)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedVoice?.id === voice.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } ${voice.status !== 'Succeeded' ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      <span className="font-medium text-gray-800 text-sm">{voice.displayName || voice.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          voice.status === 'Succeeded'
                            ? 'bg-green-100 text-green-700'
                            : voice.status === 'Failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {voice.status}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVoice(voice);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete voice"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
