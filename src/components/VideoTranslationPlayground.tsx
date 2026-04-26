import { useState, useEffect, useCallback } from 'react'
import { VideoUploader } from './VideoUploader'
import { useVideoTranslation, TranslationStatus } from '../hooks/useVideoTranslation'
import { VideoTranslationConfig, VoiceKind } from '../types/videoTranslation'
import { BlobStorageConfig } from '../types/voiceConversion'
import { uploadToBlob, loadBlobConfig, saveBlobConfig, validateBlobConfig } from '../utils/blobStorage'
import { AzureSettings } from '../types/azure'
import { PageDocsLink, AZURE_SPEECH_DOCS } from './PageDocsLink'

interface VideoTranslationPlaygroundProps {
  settings: AzureSettings
  isConfigured: boolean
}

// Common locales for video translation
const LOCALES = [
  { code: '', label: 'Auto-detect' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'zh-CN', label: 'Chinese (Simplified)' },
  { code: 'zh-TW', label: 'Chinese (Traditional)' },
  { code: 'ja-JP', label: 'Japanese' },
  { code: 'ko-KR', label: 'Korean' },
  { code: 'es-ES', label: 'Spanish (Spain)' },
  { code: 'es-MX', label: 'Spanish (Mexico)' },
  { code: 'fr-FR', label: 'French (France)' },
  { code: 'de-DE', label: 'German' },
  { code: 'it-IT', label: 'Italian' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)' },
  { code: 'pt-PT', label: 'Portuguese (Portugal)' },
  { code: 'ru-RU', label: 'Russian' },
  { code: 'ar-SA', label: 'Arabic (Saudi Arabia)' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'th-TH', label: 'Thai' },
  { code: 'vi-VN', label: 'Vietnamese' },
  { code: 'id-ID', label: 'Indonesian' },
  { code: 'ms-MY', label: 'Malay' },
  { code: 'nl-NL', label: 'Dutch' },
  { code: 'pl-PL', label: 'Polish' },
  { code: 'tr-TR', label: 'Turkish' },
  { code: 'sv-SE', label: 'Swedish' },
  { code: 'da-DK', label: 'Danish' },
  { code: 'fi-FI', label: 'Finnish' },
  { code: 'nb-NO', label: 'Norwegian' },
  { code: 'uk-UA', label: 'Ukrainian' },
  { code: 'cs-CZ', label: 'Czech' },
  { code: 'he-IL', label: 'Hebrew' },
]

const TARGET_LOCALES = LOCALES.filter(l => l.code !== '')

// Video Translation supported regions
// https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions
const SUPPORTED_REGIONS = [
  'centralus',
  'eastus',
  'japaneast',
  'northcentralus',
  'southcentralus',
  'southeastasia',
  'westcentralus',
  'westeurope',
  'westus',
  'westus2',
  'westus3',
]

const CONFIG_STORAGE_KEY = 'video-translation-config'

function loadConfig(): Partial<VideoTranslationConfig> {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveConfig(config: Partial<VideoTranslationConfig>): void {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
}

export function VideoTranslationPlayground({ settings, isConfigured }: VideoTranslationPlaygroundProps) {
  // Video source state
  const [sourceTab, setSourceTab] = useState<'upload' | 'url'>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [uploadedBlobUrl, setUploadedBlobUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Blob storage config
  const [blobConfig, setBlobConfig] = useState<BlobStorageConfig>(loadBlobConfig)
  const [showBlobConfig, setShowBlobConfig] = useState(false)

  // Translation config
  const savedConfig = loadConfig()
  const [sourceLocale, setSourceLocale] = useState(savedConfig.sourceLocale || '')
  const [targetLocale, setTargetLocale] = useState(savedConfig.targetLocale || 'en-US')
  const [voiceKind, setVoiceKind] = useState<VoiceKind>(savedConfig.voiceKind || 'PlatformVoice')
  const [enableLipSync, setEnableLipSync] = useState(savedConfig.enableLipSync || false)
  const [exportSubtitleInVideo, setExportSubtitleInVideo] = useState(savedConfig.exportSubtitleInVideo || false)
  const [speakerCount, setSpeakerCount] = useState<number | undefined>(savedConfig.speakerCount)
  const [subtitleMaxChars, setSubtitleMaxChars] = useState<number | undefined>(savedConfig.subtitleMaxCharCountPerSegment)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // History panel
  const [showHistory, setShowHistory] = useState(false)

  // Video translation hook
  const {
    status,
    progress,
    error,
    currentIteration,
    history,
    startTranslation,
    cancelTranslation,
    reset,
    removeFromHistory,
    clearHistory,
  } = useVideoTranslation({
    apiKey: settings.apiKey,
    region: settings.region,
  })

  // Save config when settings change
  useEffect(() => {
    saveConfig({
      sourceLocale,
      targetLocale,
      voiceKind,
      enableLipSync,
      exportSubtitleInVideo,
      speakerCount,
      subtitleMaxCharCountPerSegment: subtitleMaxChars,
    })
  }, [sourceLocale, targetLocale, voiceKind, enableLipSync, exportSubtitleInVideo, speakerCount, subtitleMaxChars])

  // Save blob config when it changes
  useEffect(() => {
    saveBlobConfig(blobConfig)
  }, [blobConfig])

  const handleFileSelected = useCallback((file: File) => {
    setSelectedFile(file)
    setUploadedBlobUrl(null)
    setUploadError(null)
  }, [])

  const handleUploadToBlob = useCallback(async () => {
    if (!selectedFile) return

    const validationError = validateBlobConfig(blobConfig)
    if (validationError) {
      setUploadError(validationError)
      setShowBlobConfig(true)
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      const blobUrl = await uploadToBlob(selectedFile, blobConfig)
      setUploadedBlobUrl(blobUrl)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload video')
    } finally {
      setIsUploading(false)
    }
  }, [selectedFile, blobConfig])

  const handleStartTranslation = useCallback(async () => {
    let videoFileUrl = ''

    if (sourceTab === 'upload') {
      if (!uploadedBlobUrl) {
        setUploadError('Please upload the video to blob storage first')
        return
      }
      videoFileUrl = uploadedBlobUrl
    } else {
      if (!videoUrl.trim()) {
        setUploadError('Please enter a video URL')
        return
      }
      videoFileUrl = videoUrl.trim()
    }

    const config: VideoTranslationConfig = {
      sourceLocale,
      targetLocale,
      voiceKind,
      enableLipSync,
      exportSubtitleInVideo,
      speakerCount,
      subtitleMaxCharCountPerSegment: subtitleMaxChars,
    }

    await startTranslation(videoFileUrl, config)
  }, [sourceTab, uploadedBlobUrl, videoUrl, sourceLocale, targetLocale, voiceKind, enableLipSync, exportSubtitleInVideo, speakerCount, subtitleMaxChars, startTranslation])

  const handleReset = useCallback(() => {
    reset()
    setSelectedFile(null)
    setUploadedBlobUrl(null)
    setVideoUrl('')
    setUploadError(null)
  }, [reset])

  const getStatusColor = (s: TranslationStatus): string => {
    switch (s) {
      case 'completed': return 'text-green-600'
      case 'error': return 'text-red-600'
      case 'cancelled': return 'text-yellow-600'
      default: return 'text-blue-600'
    }
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleString()
  }

  const isProcessing = ['creating', 'processing', 'iterating', 'uploading'].includes(status)
  const isRegionSupported = SUPPORTED_REGIONS.includes(settings.region.toLowerCase())
  const canStart = isConfigured && isRegionSupported && !isProcessing && (
    (sourceTab === 'upload' && uploadedBlobUrl) ||
    (sourceTab === 'url' && videoUrl.trim())
  )

  if (!isConfigured) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Configuration Required</h3>
          <p className="text-yellow-700">
            Please configure your Azure Speech API key and region in the settings panel to use Video Translation.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="theme-page-header">
        <div className="theme-page-header__inner">
          <div>
            <h1 className="theme-page-title !text-[2rem]">Video Translation</h1>
            <p className="theme-page-subtitle">
              Translate videos into different languages with AI-powered voice dubbing
            </p>
          </div>
          <div className="theme-page-header__actions">
            <PageDocsLink href={AZURE_SPEECH_DOCS.speechTranslation} />
          </div>
        </div>
      </div>

      {/* Main Content - Two Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Video Source & Results */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
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
                      Video Translation is currently only available in the following regions:
                    </p>
                    <ul className="text-sm text-amber-700 mt-2 list-disc list-inside grid grid-cols-2 gap-x-4">
                      <li><strong>Central US</strong> (centralus)</li>
                      <li><strong>East US</strong> (eastus)</li>
                      <li><strong>Japan East</strong> (japaneast)</li>
                      <li><strong>North Central US</strong> (northcentralus)</li>
                      <li><strong>South Central US</strong> (southcentralus)</li>
                      <li><strong>Southeast Asia</strong> (southeastasia)</li>
                      <li><strong>West Central US</strong> (westcentralus)</li>
                      <li><strong>West Europe</strong> (westeurope)</li>
                      <li><strong>West US</strong> (westus)</li>
                      <li><strong>West US 2</strong> (westus2)</li>
                      <li><strong>West US 3</strong> (westus3)</li>
                    </ul>
                    <p className="text-sm text-amber-700 mt-2">
                      Your current region: <strong>{settings.region}</strong>. Please change your region in the sidebar settings.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Blob Storage Config */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <button
                onClick={() => setShowBlobConfig(!showBlobConfig)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
              >
                <div className="flex items-center space-x-2">
                  <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  <span className="font-medium text-gray-700">Blob Storage Configuration</span>
                  {blobConfig.accountName && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">Configured</span>
                  )}
                </div>
                <svg
                  className={`h-5 w-5 text-gray-400 transform transition-transform ${showBlobConfig ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showBlobConfig && (
                <div className="px-4 pb-4 space-y-3 border-t">
                  <div className="pt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Storage Account Name</label>
                    <input
                      type="text"
                      value={blobConfig.accountName}
                      onChange={(e) => setBlobConfig({ ...blobConfig, accountName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="mystorageaccount"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Container Name</label>
                    <input
                      type="text"
                      value={blobConfig.containerName}
                      onChange={(e) => setBlobConfig({ ...blobConfig, containerName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="videos"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SAS Token</label>
                    <input
                      type="password"
                      value={blobConfig.sasToken}
                      onChange={(e) => setBlobConfig({ ...blobConfig, sasToken: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="?sv=2021-06-08&ss=b..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Video Source */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Video Source</h2>

              {/* Tabs */}
              <div className="flex space-x-4 mb-4">
                <button
                  onClick={() => setSourceTab('upload')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    sourceTab === 'upload'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Upload from Local
                </button>
                <button
                  onClick={() => setSourceTab('url')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    sourceTab === 'url'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  From URL
                </button>
              </div>

              {sourceTab === 'upload' ? (
                <div className="space-y-4">
                  <VideoUploader
                    onFileSelected={handleFileSelected}
                    disabled={isProcessing}
                  />
                  {selectedFile && !uploadedBlobUrl && (
                    <button
                      onClick={handleUploadToBlob}
                      disabled={isUploading || isProcessing}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {isUploading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Uploading to Blob...</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span>Upload to Blob Storage</span>
                        </>
                      )}
                    </button>
                  )}
                  {uploadedBlobUrl && (
                    <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 p-3 rounded-md">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Video uploaded to blob storage</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://example.com/video.mp4"
                      disabled={isProcessing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Enter a direct URL to an MP4 video file. The URL must be publicly accessible.
                  </p>
                </div>
              )}

              {uploadError && (
                <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                  {uploadError}
                </div>
              )}
            </div>

            {/* Start Button */}
            <div className="flex space-x-4">
              <button
                onClick={handleStartTranslation}
                disabled={!canStart}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Start Translation</span>
              </button>
              {isProcessing && (
                <button
                  onClick={cancelTranslation}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Progress Panel */}
            {status !== 'idle' && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Translation Progress</h2>

                {progress.translationId && (
                  <p className="text-sm text-gray-500 mb-3">
                    Translation ID: <code className="bg-gray-100 px-2 py-0.5 rounded">{progress.translationId}</code>
                  </p>
                )}

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span className={getStatusColor(status)}>{progress.message}</span>
                    <span>{Math.round((progress.step / progress.totalSteps) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        status === 'error' ? 'bg-red-500' :
                        status === 'completed' ? 'bg-green-500' :
                        'bg-indigo-500'
                      }`}
                      style={{ width: `${(progress.step / progress.totalSteps) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Steps */}
                <div className="space-y-2">
                  {[
                    'Upload video to blob',
                    'Create translation',
                    'Generate translated video',
                    'Download results',
                  ].map((step, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      {progress.step > index + 1 ? (
                        <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : progress.step === index + 1 && isProcessing ? (
                        <svg className="animate-spin h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                      )}
                      <span className={progress.step > index ? 'text-gray-900' : 'text-gray-400'}>
                        {index + 1}. {step}
                      </span>
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* Results Panel */}
            {status === 'completed' && currentIteration?.result && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Results</h2>

                {/* Video Player - Full Width */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Translated Video</h3>
                  {currentIteration.result.translatedVideoFileUrl ? (
                    <div className="space-y-3">
                      <video
                        src={currentIteration.result.translatedVideoFileUrl}
                        controls
                        className="w-full max-h-[480px] rounded-lg bg-black object-contain"
                      />
                      <a
                        href={currentIteration.result.translatedVideoFileUrl}
                        download
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Download Video</span>
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Video not available</p>
                  )}
                </div>

                {/* Subtitles - Horizontal Layout */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Subtitles & Metadata</h3>
                  <div className="flex flex-wrap gap-4">
                    {currentIteration.result.sourceLocaleSubtitleWebvttFileUrl && (
                      <a
                        href={currentIteration.result.sourceLocaleSubtitleWebvttFileUrl}
                        download
                        className="flex items-center space-x-2 text-sm text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-2 rounded-md"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Source Subtitles (WebVTT)</span>
                      </a>
                    )}
                    {currentIteration.result.targetLocaleSubtitleWebvttFileUrl && (
                      <a
                        href={currentIteration.result.targetLocaleSubtitleWebvttFileUrl}
                        download
                        className="flex items-center space-x-2 text-sm text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-2 rounded-md"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Target Subtitles (WebVTT)</span>
                      </a>
                    )}
                    {currentIteration.result.metadataJsonWebvttFileUrl && (
                      <a
                        href={currentIteration.result.metadataJsonWebvttFileUrl}
                        download
                        className="flex items-center space-x-2 text-sm text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-2 rounded-md"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Metadata JSON</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Start New Translation
                  </button>
                </div>
              </div>
            )}

            {/* History Panel */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
              >
                <div className="flex items-center space-x-2">
                  <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium text-gray-700">Translation History</span>
                  <span className="text-xs text-gray-500">({history.length})</span>
                </div>
                <svg
                  className={`h-5 w-5 text-gray-400 transform transition-transform ${showHistory ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showHistory && (
                <div className="border-t">
                  {history.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 text-center">No translation history yet</p>
                  ) : (
                    <>
                      <div className="max-h-64 overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-gray-600">Name</th>
                              <th className="px-4 py-2 text-left text-gray-600">Source</th>
                              <th className="px-4 py-2 text-left text-gray-600">Target</th>
                              <th className="px-4 py-2 text-left text-gray-600">Status</th>
                              <th className="px-4 py-2 text-left text-gray-600">Created</th>
                              <th className="px-4 py-2 text-right text-gray-600">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {history.map((entry) => (
                              <tr key={entry.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 truncate max-w-[150px]" title={entry.displayName}>
                                  {entry.displayName || entry.translationId.slice(0, 8)}
                                </td>
                                <td className="px-4 py-2">{entry.sourceLocale || 'Auto'}</td>
                                <td className="px-4 py-2">{entry.targetLocale}</td>
                                <td className="px-4 py-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    entry.status === 'Succeeded' ? 'bg-green-100 text-green-800' :
                                    entry.status === 'Failed' ? 'bg-red-100 text-red-800' :
                                    entry.status === 'Running' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {entry.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-gray-500">{formatDate(entry.createdAt)}</td>
                                <td className="px-4 py-2 text-right">
                                  <div className="flex items-center justify-end space-x-2">
                                    {entry.resultVideoUrl && (
                                      <a
                                        href={entry.resultVideoUrl}
                                        download
                                        className="text-indigo-600 hover:text-indigo-800"
                                        title="Download video"
                                      >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                      </a>
                                    )}
                                    <button
                                      onClick={() => removeFromHistory(entry.id)}
                                      className="text-red-600 hover:text-red-800"
                                      title="Remove from history"
                                    >
                                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="p-2 border-t bg-gray-50">
                        <button
                          onClick={clearHistory}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Clear All History
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Translation Settings */}
        <div className="theme-side-panel p-6 overflow-auto">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Translation Settings</h2>

          <div className="space-y-4">
            {/* Source Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Language</label>
              <select
                value={sourceLocale}
                onChange={(e) => setSourceLocale(e.target.value)}
                disabled={isProcessing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
              >
                {LOCALES.map((locale) => (
                  <option key={locale.code} value={locale.code}>
                    {locale.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Language</label>
              <select
                value={targetLocale}
                onChange={(e) => setTargetLocale(e.target.value)}
                disabled={isProcessing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
              >
                {TARGET_LOCALES.map((locale) => (
                  <option key={locale.code} value={locale.code}>
                    {locale.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Voice Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Voice Type</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="PlatformVoice"
                    checked={voiceKind === 'PlatformVoice'}
                    onChange={(e) => setVoiceKind(e.target.value as VoiceKind)}
                    disabled={isProcessing}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Platform Voice (Standard)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="PersonalVoice"
                    checked={voiceKind === 'PersonalVoice'}
                    onChange={(e) => setVoiceKind(e.target.value as VoiceKind)}
                    disabled={isProcessing}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Personal Voice</span>
                </label>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="border-t pt-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 w-full"
              >
                <svg
                  className={`h-4 w-4 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span>Advanced Options</span>
              </button>
              {showAdvanced && (
                <div className="mt-4 space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={enableLipSync}
                      onChange={(e) => setEnableLipSync(e.target.checked)}
                      disabled={isProcessing}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Enable Lip Sync</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportSubtitleInVideo}
                      onChange={(e) => setExportSubtitleInVideo(e.target.checked)}
                      disabled={isProcessing}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Burn Subtitles in Video</span>
                  </label>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Speaker Count</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={speakerCount || ''}
                      onChange={(e) => setSpeakerCount(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Auto-detect"
                      disabled={isProcessing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle Max Chars</label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={subtitleMaxChars || ''}
                      onChange={(e) => setSubtitleMaxChars(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Default"
                      disabled={isProcessing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
