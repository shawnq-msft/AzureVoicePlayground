import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AzureSettings } from '../types/azure';
import {
  VoiceConversionVoice,
  BlobStorageConfig,
  ConversionHistoryEntry,
  VOICE_CONVERSION_VOICES,
} from '../types/voiceConversion';
import { useVoiceConversion } from '../hooks/useVoiceConversion';
import { loadBlobConfig, saveBlobConfig } from '../utils/blobStorage';
import { getAudioDuration } from '../utils/audioUtils';
import { VoiceConversionSelector } from './VoiceConversionSelector';
import { AudioUploader } from './AudioUploader';
import { ConversionHistoryPanel } from './ConversionHistoryPanel';
import { VoiceConversionFeedbackButton } from './VoiceConversionFeedbackButton';
import { PageDocsLink, AZURE_SPEECH_DOCS } from './PageDocsLink';

interface VoiceChangerPlaygroundProps {
  settings: AzureSettings;
  onSettingsChange: (settings: Partial<AzureSettings>) => void;
  isConfigured: boolean;
  history: ConversionHistoryEntry[];
  addToHistory: (entry: Omit<ConversionHistoryEntry, 'id'>) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
}

export function VoiceChangerPlayground({
  settings,
  onSettingsChange,
  isConfigured,
  history,
  addToHistory,
  removeFromHistory,
  clearHistory,
}: VoiceChangerPlaygroundProps) {
  // Blob storage config
  const [blobConfig, setBlobConfig] = useState<BlobStorageConfig>(loadBlobConfig);
  const [showBlobConfig, setShowBlobConfig] = useState(false);

  // Voice conversion state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceConversionVoice | null>(
    VOICE_CONVERSION_VOICES[0]
  );

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const previousResultRef = useRef<ArrayBuffer | null>(null);

  // Voice conversion hook
  const { state, error, resultAudioData, convert, reset } = useVoiceConversion({
    apiKey: settings.apiKey,
    region: settings.region,
  });

  // Save blob config when it changes
  useEffect(() => {
    saveBlobConfig(blobConfig);
  }, [blobConfig]);

  // Add to history when conversion completes
  useEffect(() => {
    if (resultAudioData && selectedFile && selectedVoice && resultAudioData !== previousResultRef.current) {
      previousResultRef.current = resultAudioData;

      getAudioDuration(resultAudioData)
        .then((duration) => {
          addToHistory({
            timestamp: Date.now(),
            sourceFileName: selectedFile.name,
            targetVoice: selectedVoice.name,
            region: settings.region,
            resultAudioData: resultAudioData,
            duration: duration,
          });
        })
        .catch((err) => {
          console.error('Failed to get audio duration:', err);
          const estimatedDuration = (resultAudioData.byteLength * 8) / 48000;
          addToHistory({
            timestamp: Date.now(),
            sourceFileName: selectedFile.name,
            targetVoice: selectedVoice.name,
            region: settings.region,
            resultAudioData: resultAudioData,
            duration: estimatedDuration,
          });
        });
    }
  }, [resultAudioData, selectedFile, selectedVoice, settings.region, addToHistory]);

  // Create blob URL for result audio playback
  useEffect(() => {
    if (resultAudioData) {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      const blob = new Blob([resultAudioData], { type: 'audio/mpeg' });
      blobUrlRef.current = URL.createObjectURL(blob);
    }

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, [resultAudioData]);

  const handleConvert = useCallback(() => {
    if (!selectedFile || !selectedVoice) return;
    convert(selectedFile, selectedVoice, blobConfig);
  }, [selectedFile, selectedVoice, blobConfig, convert]);

  const handlePlayResult = useCallback(() => {
    if (!blobUrlRef.current) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(blobUrlRef.current);
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
      });
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const isBlobConfigured =
    blobConfig.accountName && blobConfig.containerName && blobConfig.sasToken;

  // Voice Changer only works in these regions
  const SUPPORTED_REGIONS = ['eastus', 'westeurope', 'southeastasia'];
  const isRegionSupported = SUPPORTED_REGIONS.includes(settings.region.toLowerCase());

  const canConvert =
    isConfigured && isRegionSupported && isBlobConfigured && selectedFile && selectedVoice && (state === 'idle' || state === 'error');

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="theme-page-header">
        <div className="theme-page-header__inner">
          <div>
            <h1 className="theme-page-title">Voice Changer</h1>
            <p className="theme-page-subtitle">
              Transform your voice using Azure Voice Conversion (Preview)
            </p>
          </div>
          <div className="theme-page-header__actions">
            <PageDocsLink href={AZURE_SPEECH_DOCS.overview} />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left side - Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                    Voice Changer is currently only available in the following regions:
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

          {/* Only show configuration and controls if region is supported */}
          {(!isConfigured || isRegionSupported) && (
            <>
          {/* Blob Storage Config */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowBlobConfig(!showBlobConfig)}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
                <span className="font-medium text-gray-800">Azure Blob Storage Configuration</span>
                {isBlobConfigured && (
                  <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                    Configured
                  </span>
                )}
              </div>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${showBlobConfig ? 'rotate-180' : ''}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {showBlobConfig && (
              <div className="p-4 space-y-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Voice conversion requires uploading audio to Azure Blob Storage.
                  <a
                    href="https://portal.azure.com/#create/Microsoft.StorageAccount"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline ml-1"
                  >
                    Create a storage account
                  </a>
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Storage Account Name
                    </label>
                    <input
                      type="text"
                      value={blobConfig.accountName}
                      onChange={(e) =>
                        setBlobConfig((prev) => ({ ...prev, accountName: e.target.value }))
                      }
                      placeholder="mystorageaccount"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Container Name
                    </label>
                    <input
                      type="text"
                      value={blobConfig.containerName}
                      onChange={(e) =>
                        setBlobConfig((prev) => ({ ...prev, containerName: e.target.value }))
                      }
                      placeholder="audio-files"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SAS Token
                    </label>
                    <input
                      type="password"
                      value={blobConfig.sasToken}
                      onChange={(e) =>
                        setBlobConfig((prev) => ({ ...prev, sasToken: e.target.value }))
                      }
                      placeholder="?sv=2022-11-02&ss=b..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  SAS token needs read and write permissions. Credentials are stored locally in your browser.
                </p>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-xs font-medium text-amber-800 mb-1">CORS Configuration Required</p>
                  <p className="text-xs text-amber-700">
                    In Azure Portal, go to your Storage Account → Resource sharing (CORS) and add a rule:
                  </p>
                  <ul className="text-xs text-amber-700 mt-1 ml-4 list-disc">
                    <li>Allowed origins: <code className="bg-amber-100 px-1 rounded">*</code></li>
                    <li>Allowed methods: <code className="bg-amber-100 px-1 rounded">GET, PUT, OPTIONS</code></li>
                    <li>Allowed headers: <code className="bg-amber-100 px-1 rounded">*</code></li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Audio Upload */}
          <AudioUploader
            file={selectedFile}
            onFileChange={setSelectedFile}
            disabled={state !== 'idle'}
          />

          {/* Convert Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleConvert}
              disabled={!canConvert}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                canConvert
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {state === 'uploading'
                ? 'Uploading...'
                : state === 'converting'
                ? 'Converting...'
                : 'Convert Voice'}
            </button>

            {!isConfigured && (
              <p className="text-sm text-amber-600">Please configure Azure API key and region in the sidebar.</p>
            )}
            {isConfigured && !isBlobConfigured && (
              <p className="text-sm text-amber-600">Please configure Blob Storage above.</p>
            )}
          </div>

          {/* Status / Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Result Audio Player */}
          {resultAudioData && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-green-800">Conversion Complete</p>
                  <p className="text-sm text-green-600">
                    {selectedFile?.name} → {selectedVoice?.displayName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePlayResult}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    {isPlaying ? (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
                        </svg>
                        Pause
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                        Play Result
                      </>
                    )}
                  </button>
                  <button
                    onClick={reset}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    New Conversion
                  </button>
                </div>
              </div>
            </div>
          )}
            </>
          )}
        </div>

        {/* History Panel */}
        <ConversionHistoryPanel
          history={history}
          onClearHistory={clearHistory}
          onDeleteEntry={removeFromHistory}
        />

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600">
              Voice Conversion is a preview feature. Only en-US voices are supported. Zeroshot is also supported, contact us.
            </p>
            <VoiceConversionFeedbackButton
              sourceFileName={selectedFile?.name || null}
              targetVoice={selectedVoice?.displayName || null}
              region={settings.region}
              audioData={resultAudioData}
            />
          </div>
        </div>
      </div>

        {/* Right side - Voice Selector */}
        <div className="theme-side-panel p-6 overflow-y-auto">
        <VoiceConversionSelector
          selectedVoice={selectedVoice}
          onVoiceChange={setSelectedVoice}
        />
        </div>
      </div>
    </div>
  );
}
