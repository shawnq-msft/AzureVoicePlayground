import { useState, useEffect } from 'react';
import { Voice, PodcastApiConfig } from '../types/podcast';
import { queryVoices, getOneHostVoices } from '../lib/podcast/podcastClient';
import { GENDER_ICONS } from '../constants/icons';

interface PodcastOneHostVoiceSelectorProps {
  apiConfig: PodcastApiConfig;
  locale: string;
  selectedVoice: Voice | null;
  onVoiceChange: (voice: Voice | null) => void;
  manualVoiceName?: string;
  onManualVoiceNameChange?: (voiceName: string) => void;
  disabled?: boolean;
}

export function PodcastOneHostVoiceSelector({
  apiConfig,
  locale,
  selectedVoice,
  onVoiceChange,
  manualVoiceName = '',
  onManualVoiceNameChange,
  disabled = false,
}: PodcastOneHostVoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownValue, setDropdownValue] = useState<string>(''); // Track dropdown selection

  // Sync dropdown value with selectedVoice or manual input
  // Note: dropdownValue is intentionally omitted from deps to avoid infinite loop
  // (setDropdownValue inside the effect would retrigger if dropdownValue was a dependency)
  useEffect(() => {
    if (manualVoiceName) {
      setDropdownValue('custom');
    } else if (selectedVoice) {
      setDropdownValue(selectedVoice.id);
    } else if (dropdownValue !== 'custom') {
      // Only reset if not currently on custom (to prevent clearing when user explicitly selects Custom)
      setDropdownValue('');
    }
  }, [selectedVoice, manualVoiceName]);

  // Fetch voices when locale changes
  useEffect(() => {
    const fetchVoices = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const allVoices = await queryVoices(apiConfig, locale);
        const oneHostVoices = getOneHostVoices(allVoices);
        setVoices(oneHostVoices);
        
        // Reset selected voice if it's not in the new list
        if (selectedVoice && !oneHostVoices.find(v => v.id === selectedVoice.id)) {
          onVoiceChange(null);
          setDropdownValue('');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load voices';
        setError(errorMessage);
        console.error('Failed to fetch voices:', err);
      } finally {
        setLoading(false);
      }
    };

    if (apiConfig.apiKey && apiConfig.region) {
      fetchVoices();
    }
  }, [locale, apiConfig.apiKey, apiConfig.region]);

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Voice (OneHost)</label>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
          <span>Loading voices...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Voice (OneHost)</label>
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Warning when voice list is not available */}
      {voices.length === 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-700">Voice list not available for this region.</p>
          <p className="text-xs text-yellow-600 mt-1">You can still use Auto mode (no selection) or select "Custom..." to enter a voice name manually.</p>
        </div>
      )}
      
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Voice (OneHost) <span className="text-gray-500 font-normal">- Optional</span>
        </label>
        <p className="text-xs text-gray-500 -mt-1 mb-2">
          Choose a specific voice or use gender preference below
        </p>
        <select
          value={dropdownValue}
          onChange={(e) => {
            const value = e.target.value;
            setDropdownValue(value);
            
            if (value === 'custom') {
              // Clear voice selection and manual input when selecting Custom
              onVoiceChange(null);
              if (onManualVoiceNameChange) {
                onManualVoiceNameChange('');
              }
            } else {
              // Find and set the voice
              const voice = voices.find(v => v.id === value) || null;
              onVoiceChange(voice);
              // Clear manual input when selecting from dropdown
              if (onManualVoiceNameChange) {
                onManualVoiceNameChange('');
              }
            }
          }}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Auto (Use gender preference if set)</option>
          {voices.map((voice) => {
            const gender = voice.properties.Gender || 'Unknown';
            const genderIcon = GENDER_ICONS[gender as keyof typeof GENDER_ICONS] || GENDER_ICONS.Unknown;
            const displayName = voice.properties.DisplayName || voice.shortName;
            return (
              <option key={voice.id} value={voice.id}>
                {genderIcon} {displayName} ({gender}) - {voice.shortName}
              </option>
            );
          })}
          <option value="custom">Custom...</option>
        </select>
      </div>
      
      {/* Manual Voice Name Input - only show when Custom is selected */}
      {onManualVoiceNameChange && dropdownValue === 'custom' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Enter Voice Name
          </label>
          <p className="text-xs text-gray-500 -mt-1 mb-2">
            Provide the voice name or short name directly (e.g., "en-US-AvaNeural")
          </p>
          <input
            type="text"
            value={manualVoiceName}
            onChange={(e) => {
              onManualVoiceNameChange(e.target.value);
            }}
            placeholder="e.g., en-US-AvaNeural"
            disabled={disabled}
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono"
          />
          {manualVoiceName && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
              ℹ️ Using specified voice: <code className="font-mono font-semibold">{manualVoiceName}</code>
            </div>
          )}
        </div>
      )}
      
      {selectedVoice && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="text-sm">
            <div className="font-medium text-blue-900">{selectedVoice.properties.DisplayName}</div>
            <div className="text-blue-700 mt-1">{selectedVoice.description}</div>
            <div className="text-xs text-blue-600 mt-2">
              <span className="font-medium">Gender:</span> {selectedVoice.properties.Gender} | 
              <span className="font-medium ml-2">Voice:</span> {selectedVoice.shortName}
            </div>
            {selectedVoice.samples.styleSamples.length > 0 && (
              <div className="mt-2">
                <audio
                  controls
                  className="w-full h-8"
                  src={selectedVoice.samples.styleSamples[0].audioFileEndpointWithSas}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
