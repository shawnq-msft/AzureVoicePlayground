// Speech to Text Playground Component

import React, { useState, useEffect } from 'react';
import { AzureSettings } from '../types/azure';
import { STTHistoryEntry, STTModel } from '../types/stt';
import { useRealtimeSTT } from '../hooks/useRealtimeSTT';
import { useFastTranscription } from '../hooks/useFastTranscription';
import { useWhisperTranscription } from '../hooks/useWhisperTranscription';
import { useLLMSpeech } from '../hooks/useLLMSpeech';
import { useMAITranscribe } from '../hooks/useMAITranscribe';
import { STTModelSelector } from './STTModelSelector';
import { LanguageSelector } from './LanguageSelector';
import { TranscriptDisplay } from './TranscriptDisplay';
import { ExportTranscript } from './ExportTranscript';
import { AudioUploader } from './AudioUploader';
import { AudioRecorder } from './AudioRecorder';
import { getAudioDuration } from '../utils/audioUtils';
import { PageDocsLink, AZURE_SPEECH_DOCS } from './PageDocsLink';

interface SpeechToTextPlaygroundProps {
  settings: AzureSettings;
  onSettingsChange: (settings: Partial<AzureSettings>) => void;
  isConfigured: boolean;
  history: STTHistoryEntry[];
  addToHistory: (entry: Omit<STTHistoryEntry, 'id'>) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
}

export function SpeechToTextPlayground({
  settings,
  onSettingsChange,
  isConfigured,
  history,
  addToHistory,
  removeFromHistory,
  clearHistory,
}: SpeechToTextPlaygroundProps) {
  const [selectedModel, setSelectedModel] = useState<STTModel>('realtime');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
  const [audioSource, setAudioSource] = useState<File | Blob | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [isUsingRecorder, setIsUsingRecorder] = useState<boolean>(false);
  const [enableDiarization, setEnableDiarization] = useState<boolean>(false);
  const [maxSpeakers, setMaxSpeakers] = useState<number>(2);
  const [llmPrompt, setLlmPrompt] = useState<string>('');

  // Hooks for each STT model
  const realtimeSTT = useRealtimeSTT(settings);
  const fastTranscription = useFastTranscription(settings);
  const whisperTranscription = useWhisperTranscription(settings);
  const llmSpeech = useLLMSpeech(settings);
  const maiTranscribe = useMAITranscribe(settings);

  // Get the current active hook based on selected model
  const getCurrentHook = () => {
    switch (selectedModel) {
      case 'realtime':
        return realtimeSTT;
      case 'fast-transcription':
        return fastTranscription;
      case 'llm-speech':
        return llmSpeech;
      case 'mai-transcribe':
        return maiTranscribe;
      case 'whisper':
        return whisperTranscription;
    }
  };

  const currentHook = getCurrentHook();

  // Add to history when transcription completes successfully
  useEffect(() => {
    if (currentHook.state === 'completed' && audioSource) {
      const getTranscriptData = () => {
        if (selectedModel === 'realtime' && realtimeSTT.transcript) {
          return {
            text: realtimeSTT.transcript.text,
            segments: realtimeSTT.transcript.segments
          };
        } else if (selectedModel === 'fast-transcription' && fastTranscription.transcript) {
          return {
            text: fastTranscription.transcript.fullText,
            segments: fastTranscription.transcript.segments
          };
        } else if (selectedModel === 'llm-speech' && llmSpeech.transcript) {
          return {
            text: llmSpeech.transcript.fullText,
            segments: llmSpeech.transcript.segments
          };
        } else if (selectedModel === 'mai-transcribe' && maiTranscribe.transcript) {
          return {
            text: maiTranscribe.transcript.fullText,
            segments: maiTranscribe.transcript.segments
          };
        } else if (selectedModel === 'whisper' && whisperTranscription.transcript) {
          return {
            text: whisperTranscription.transcript.fullText,
            segments: whisperTranscription.transcript.segments
          };
        }
        return null;
      };

      const transcriptData = getTranscriptData();
      if (transcriptData) {
        getAudioDuration(audioSource)
          .then((duration) => {
            addToHistory({
              timestamp: Date.now(),
              model: selectedModel,
              audioFileName: audioFileName || 'audio',
              audioSize: audioSource.size,
              audioDuration: duration,
              language: selectedLanguage,
              transcript: transcriptData.text,
              processingTime: 0, // Could track this if needed
              segments: transcriptData.segments
            });
          })
          .catch((err) => {
            console.error('Failed to get audio duration:', err);
          });
      }
    }
  }, [currentHook.state, selectedModel, audioSource, audioFileName, selectedLanguage, addToHistory]);

  const handleAudioFileChange = (file: File | null) => {
    setAudioSource(file);
    setAudioFileName(file?.name || '');
    setIsUsingRecorder(false);
    // Reset current transcription
    currentHook.reset();
  };

  const handleRecordingComplete = (blob: Blob | null) => {
    if (blob) {
      setAudioSource(blob);
      setAudioFileName('recording');
      setIsUsingRecorder(true);
      // Reset current transcription
      currentHook.reset();
    }
  };

  const handleTranscribe = async () => {
    if (!audioSource) {
      return;
    }

    try {
      if (selectedModel === 'realtime') {
        await realtimeSTT.startRecognition(audioSource, selectedLanguage);
      } else if (selectedModel === 'fast-transcription') {
        await fastTranscription.transcribe(audioSource, selectedLanguage, {
          enableDiarization,
          maxSpeakers
        });
      } else if (selectedModel === 'llm-speech') {
        await llmSpeech.transcribe(audioSource, selectedLanguage, {
          enableDiarization,
          maxSpeakers,
          prompt: llmPrompt.trim() ? llmPrompt.split('\n').filter(line => line.trim()) : undefined
        });
      } else if (selectedModel === 'mai-transcribe') {
        await maiTranscribe.transcribe(audioSource, selectedLanguage);
      } else if (selectedModel === 'whisper') {
        await whisperTranscription.transcribe(audioSource, selectedLanguage);
      }
    } catch (err) {
      console.error('Transcription error:', err);
    }
  };

  const handleCancel = () => {
    if (selectedModel === 'realtime') {
      realtimeSTT.stopRecognition();
    } else if (selectedModel === 'whisper') {
      whisperTranscription.cancelJob();
    }
  };

  const isProcessing = currentHook.state === 'processing' || currentHook.state === 'streaming';
  const hasTranscript = currentHook.state === 'completed';

  // Get transcript data for display
  const getDisplayData = () => {
    if (selectedModel === 'realtime' && realtimeSTT.transcript) {
      return {
        segments: realtimeSTT.transcript.segments,
        fullText: realtimeSTT.transcript.text,
        interimText: realtimeSTT.transcript.interimText,
        isStreaming: realtimeSTT.transcript.isStreaming,
        detectedLanguage: undefined
      };
    } else if (selectedModel === 'fast-transcription' && fastTranscription.transcript) {
      return {
        segments: fastTranscription.transcript.segments,
        fullText: fastTranscription.transcript.fullText,
        interimText: undefined,
        isStreaming: false,
        detectedLanguage: fastTranscription.transcript.language
      };
    } else if (selectedModel === 'llm-speech' && llmSpeech.transcript) {
      return {
        segments: llmSpeech.transcript.segments,
        fullText: llmSpeech.transcript.fullText,
        interimText: undefined,
        isStreaming: false,
        detectedLanguage: llmSpeech.transcript.language
      };
    } else if (selectedModel === 'mai-transcribe' && maiTranscribe.transcript) {
      return {
        segments: maiTranscribe.transcript.segments,
        fullText: maiTranscribe.transcript.fullText,
        interimText: undefined,
        isStreaming: false,
        detectedLanguage: maiTranscribe.transcript.language
      };
    } else if (selectedModel === 'whisper' && whisperTranscription.transcript) {
      return {
        segments: whisperTranscription.transcript.segments,
        fullText: whisperTranscription.transcript.fullText,
        interimText: undefined,
        isStreaming: false,
        detectedLanguage: whisperTranscription.transcript.language
      };
    }
    return {
      segments: [],
      fullText: '',
      interimText: undefined,
      isStreaming: false,
      detectedLanguage: undefined
    };
  };

  const displayData = getDisplayData();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="theme-page-header">
        <div className="theme-page-header__inner">
          <div>
            <h1 className="theme-page-title">Speech to Text</h1>
            <p className="theme-page-subtitle">
              Transcribe audio using Azure Speech Recognition APIs
            </p>
          </div>
          <div className="theme-page-header__actions">
            <PageDocsLink href={AZURE_SPEECH_DOCS.speechToText} />
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left side - Audio Source & Transcript */}
        <div className="flex-1 border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col gap-6 p-6 overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-800">Audio Source</h2>

            {/* Audio Uploader */}
            <div>
              <AudioUploader
                file={audioSource instanceof File ? audioSource : null}
                onFileChange={handleAudioFileChange}
                disabled={!isConfigured}
              />
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">or</span>
              </div>
            </div>

            {/* Audio Recorder */}
            <div>
              <AudioRecorder
                onRecordingComplete={handleRecordingComplete}
                shouldReset={!isUsingRecorder}
              />
            </div>

            {/* Transcription Button */}
            <div className="space-y-2">
              {!isConfigured && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    Please configure your Azure API key and region in the settings to use Speech-to-Text.
                  </p>
                </div>
              )}

              {currentHook.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{currentHook.error}</p>
                </div>
              )}

              {selectedModel === 'whisper' && whisperTranscription.pollingStatus && !currentHook.error && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">{whisperTranscription.pollingStatus}</p>
                </div>
              )}

              <button
                onClick={isProcessing ? handleCancel : handleTranscribe}
                disabled={!isConfigured || !audioSource}
                className={`
                  w-full py-3 px-6 rounded-lg font-semibold text-white transition-all
                  ${isProcessing
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                `}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Cancel</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                    <span>Transcribe Audio</span>
                  </>
                )}
              </button>
            </div>

            {/* Transcript Display */}
            <TranscriptDisplay
              segments={displayData.segments}
              fullText={displayData.fullText}
              interimText={displayData.interimText}
              isStreaming={displayData.isStreaming}
              audioSource={audioSource}
              detectedLanguage={displayData.detectedLanguage}
              showConfidence={selectedModel !== 'llm-speech' && selectedModel !== 'mai-transcribe'}
            />

            {/* Export Options */}
            {hasTranscript && (
              <ExportTranscript
                segments={displayData.segments}
                filename={audioFileName || 'transcript'}
              />
            )}
          </div>
        </div>

        {/* Right side - Recognition Config */}
        <div className="theme-side-panel flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col gap-6 p-6 overflow-y-auto">
            {/* Model Selection */}
            <STTModelSelector
              selectedModel={selectedModel}
              onModelChange={(model) => {
                setSelectedModel(model);
                currentHook.reset();
              }}
              region={settings.region}
            />

            {/* Language Selection */}
            <LanguageSelector
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
              selectedModel={selectedModel}
            />

            {/* Diarization Settings (Fast Transcription & LLM Speech only) */}
            {(selectedModel === 'fast-transcription' || selectedModel === 'llm-speech') && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Speaker Diarization
                </label>

                {/* Enable Diarization Checkbox */}
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="enableDiarization"
                    checked={enableDiarization}
                    onChange={(e) => setEnableDiarization(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enableDiarization" className="ml-2 block text-sm text-gray-700">
                    Identify different speakers in the audio
                  </label>
                </div>

                {/* Max Speakers Selector */}
                {enableDiarization && (
                  <div className="ml-6 space-y-2">
                    <label htmlFor="maxSpeakers" className="block text-sm text-gray-700">
                      Maximum speakers
                    </label>
                    <select
                      id="maxSpeakers"
                      value={maxSpeakers}
                      onChange={(e) => setMaxSpeakers(parseInt(e.target.value))}
                      className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value={2}>2 speakers</option>
                      <option value={3}>3 speakers</option>
                      <option value={4}>4 speakers</option>
                      <option value={5}>5 speakers</option>
                      <option value={6}>6 speakers</option>
                      <option value={8}>8 speakers</option>
                      <option value={10}>10 speakers</option>
                    </select>
                    <p className="text-xs text-gray-500">
                      Set the maximum number of speakers expected in the audio
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* LLM Prompt (LLM Speech only) */}
            {selectedModel === 'llm-speech' && (
              <div className="space-y-2">
                <label htmlFor="llmPrompt" className="block text-sm font-medium text-gray-700">
                  LLM Prompt (Optional)
                </label>
                <textarea
                  id="llmPrompt"
                  value={llmPrompt}
                  onChange={(e) => setLlmPrompt(e.target.value)}
                  placeholder="Example: Output must be in lexical format.&#10;Include all technical terms.&#10;Preserve punctuation."
                  rows={3}
                  className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono text-xs"
                />
                <p className="text-xs text-gray-500">
                  Add custom instructions for the LLM to guide transcription output format and style. Each line becomes a separate prompt instruction.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-3">
            <p className="text-xs text-gray-600">
              Powered by Azure Speech Services - Realtime, Fast Transcription, and Whisper APIs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
