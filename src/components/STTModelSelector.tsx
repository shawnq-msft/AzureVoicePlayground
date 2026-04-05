// STT Model Selector Component

import React, { useState, useMemo } from 'react';
import { STTModel } from '../types/stt';
import { FAST_TRANSCRIPTION_LANGUAGES, REALTIME_LANGUAGES } from '../utils/sttLanguages';
import { LLM_SPEECH_LANGUAGES } from '../hooks/useLLMSpeech';
import { MAI_TRANSCRIBE_LANGUAGES } from '../hooks/useMAITranscribe';

// Regions supporting Fast Transcription
// https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions?tabs=stt
const FAST_TRANSCRIPTION_REGIONS = [
  'australiaeast',
  'centralindia',
  'eastus',
  'eastus2',
  'northeurope',
  'southcentralus',
  'southeastasia',
  'swedencentral',
  'westeurope',
];

// Regions supporting LLM Speech
// https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions?tabs=llmspeech
const LLM_SPEECH_REGIONS = [
  'centralindia',
  'eastus',
  'northeurope',
  'southeastasia',
  'westus',
];

// All regions support Realtime STT, so no need for a separate list

interface STTModelSelectorProps {
  selectedModel: STTModel;
  onModelChange: (model: STTModel) => void;
  region?: string; // Current Azure region
}

interface ModelInfo {
  id: STTModel;
  name: string;
  description: string;
  icon: string;
  useCases: string;
  features: string[];
}

const MODELS: ModelInfo[] = [
  {
    id: 'realtime',
    name: 'Azure Realtime ASR',
    description: 'WebSocket streaming, low-latency recognition',
    icon: '⚡',
    useCases: 'Live transcription, real-time captions',
    features: ['Streaming results', 'Word-level timestamps', 'Low latency', 'Any file size', `${REALTIME_LANGUAGES.length} locales`]
  },
  {
    id: 'fast-transcription',
    name: 'Azure Fast Transcription',
    description: 'REST API optimized for speed',
    icon: '🚀',
    useCases: 'Quick audio file transcription',
    features: ['Fast processing', 'Batch transcription', 'Max 25 MB', `${FAST_TRANSCRIPTION_LANGUAGES.length} locales`]
  },
  {
    id: 'llm-speech',
    name: 'LLM Speech (Preview)',
    description: 'LLM-enhanced with deep contextual understanding',
    icon: '🧠',
    useCases: 'High-accuracy transcription & translation',
    features: ['LLM-enhanced', 'Prompt tuning', 'Translation', 'Diarization', `${LLM_SPEECH_LANGUAGES.length} locales`]
  },
  {
    id: 'mai-transcribe',
    name: 'MAI-Transcribe-1 (Preview)',
    description: 'High accuracy & efficiency by Microsoft AI',
    icon: '🎯',
    useCases: 'High-accuracy transcription with broad language support',
    features: ['High accuracy', 'High efficiency', 'Max 300 MB', `${MAI_TRANSCRIBE_LANGUAGES.length} languages`]
  },
  // Whisper temporarily hidden - requires Azure Blob Storage for audio URLs
  // {
  //   id: 'whisper',
  //   name: 'Whisper Model',
  //   description: 'OpenAI Whisper via Batch ASR',
  //   icon: '🎯',
  //   useCases: 'High-accuracy batch processing',
  //   features: ['Highest accuracy', 'Multi-language support', 'Max 10 MB']
  // }
];

function isModelSupportedInRegion(modelId: STTModel, region: string): boolean {
  const regionLower = region.toLowerCase();

  switch (modelId) {
    case 'realtime':
      // All regions support realtime STT
      return true;
    case 'fast-transcription':
      return FAST_TRANSCRIPTION_REGIONS.includes(regionLower);
    case 'llm-speech':
    case 'mai-transcribe':
      return LLM_SPEECH_REGIONS.includes(regionLower);
    case 'whisper':
      return true; // Whisper has its own region handling
    default:
      return true;
  }
}

export function STTModelSelector({ selectedModel, onModelChange, region = '' }: STTModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedModelInfo = useMemo(() => {
    return MODELS.find(m => m.id === selectedModel);
  }, [selectedModel]);

  const handleSelect = (modelId: STTModel) => {
    onModelChange(modelId);
    setIsOpen(false);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Recognition Model
      </label>

      {/* Combobox dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{selectedModelInfo?.icon}</span>
            <span className="text-gray-900">{selectedModelInfo?.name || 'Select model'}</span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
            {MODELS.map((model) => {
              const isSupported = isModelSupportedInRegion(model.id, region);

              return (
                <button
                  key={model.id}
                  onClick={() => isSupported && handleSelect(model.id)}
                  disabled={!isSupported}
                  className={`
                    w-full px-4 py-3 text-left transition-colors
                    ${!isSupported
                      ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                      : selectedModel === model.id
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xl ${!isSupported ? 'opacity-50' : ''}`}>{model.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${!isSupported ? 'text-gray-500' : 'text-gray-900'}`}>
                            {model.name}
                          </span>
                          {!isSupported && (
                            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                              Not in region
                            </span>
                          )}
                        </div>
                        <p className={`text-xs ${!isSupported ? 'text-gray-400' : 'text-gray-500'}`}>
                          {model.description}
                        </p>
                      </div>
                    </div>
                    {selectedModel === model.id && isSupported && (
                      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Close dropdown when clicking outside */}
        {isOpen && (
          <div
            className="fixed inset-0 z-0"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>

      {/* Selected model card */}
      {selectedModelInfo && (
        <div className="p-4 rounded-lg border-2 border-blue-500 bg-blue-50">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">{selectedModelInfo.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{selectedModelInfo.name}</h3>
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm mt-1 text-gray-600">{selectedModelInfo.description}</p>
              <p className="text-xs mt-1 text-gray-500">{selectedModelInfo.useCases}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedModelInfo.features.map((feature, idx) => (
                  <span
                    key={idx}
                    className="inline-block px-2 py-0.5 text-xs rounded bg-white text-gray-700"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
