// Language Selector Component

import React, { useState, useMemo } from 'react';
import { getAllLanguages, searchLanguages, STTLanguage, AUTO_DETECT } from '../utils/sttLanguages';
import { STTModel } from '../types/stt';
import { LLM_SPEECH_LANGUAGES } from '../hooks/useLLMSpeech';
import { MAI_TRANSCRIBE_LANGUAGES } from '../hooks/useMAITranscribe';

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (languageCode: string) => void;
  selectedModel: STTModel;
}

// Convert LLM Speech languages to STTLanguage format
const llmSpeechLanguagesAsSTT: STTLanguage[] = LLM_SPEECH_LANGUAGES.map(lang => ({
  code: lang.code,
  name: lang.name,
  nativeName: lang.nativeName,
}));

// Convert MAI-Transcribe languages to STTLanguage format
const maiTranscribeLanguagesAsSTT: STTLanguage[] = MAI_TRANSCRIBE_LANGUAGES.map(lang => ({
  code: lang.code,
  name: lang.name,
  nativeName: lang.nativeName,
}));

export function LanguageSelector({ selectedLanguage, onLanguageChange, selectedModel }: LanguageSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const allLanguages = useMemo(() => {
    if (selectedModel === 'llm-speech') {
      // LLM Speech has its own language list (auto-detect is supported)
      return [AUTO_DETECT, ...llmSpeechLanguagesAsSTT];
    }
    if (selectedModel === 'mai-transcribe') {
      // MAI-Transcribe-1 has its own language list (auto-detect is supported)
      return [AUTO_DETECT, ...maiTranscribeLanguagesAsSTT];
    }
    const modelType = selectedModel === 'fast-transcription' ? 'fast-transcription' : 'realtime';
    return getAllLanguages(modelType);
  }, [selectedModel]);

  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) {
      return allLanguages;
    }
    const query = searchQuery.toLowerCase();
    return allLanguages.filter(lang =>
      lang.name.toLowerCase().includes(query) ||
      lang.nativeName.toLowerCase().includes(query) ||
      lang.code.toLowerCase().includes(query)
    );
  }, [searchQuery, allLanguages]);

  const selectedLang = useMemo(() => {
    return allLanguages.find(lang => lang.code === selectedLanguage);
  }, [selectedLanguage, allLanguages]);

  const handleSelect = (code: string) => {
    onLanguageChange(code);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Recognition Language
      </label>

      {/* Selected language display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="flex items-center gap-2">
          {selectedLang?.code === 'auto' ? (
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          ) : (
            <span className="text-sm text-gray-500 font-mono">{selectedLang?.code}</span>
          )}
          <span className="text-gray-900">{selectedLang?.nativeName || 'Select language'}</span>
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

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search languages..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Language list */}
          <div className="overflow-y-auto max-h-64">
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  className={`
                    w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors
                    ${selectedLanguage === lang.code ? 'bg-blue-50' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {lang.code === 'auto' ? (
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        ) : (
                          <span className="text-xs text-gray-500 font-mono w-16">{lang.code}</span>
                        )}
                        <span className="text-sm text-gray-900">{lang.nativeName}</span>
                      </div>
                      {lang.code !== 'auto' && lang.name !== lang.nativeName && (
                        <div className="text-xs text-gray-500 ml-[72px]">{lang.name}</div>
                      )}
                    </div>
                    {selectedLanguage === lang.code && (
                      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                No languages found
              </div>
            )}
          </div>
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
  );
}
