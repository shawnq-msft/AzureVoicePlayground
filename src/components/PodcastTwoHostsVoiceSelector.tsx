import { useState, useEffect, useMemo } from 'react';
import { Voice, PodcastApiConfig } from '../types/podcast';
import { queryVoices, getTwoHostsVoices } from '../lib/podcast/podcastClient';

interface Speaker {
  name: string;
  gender: 'Male' | 'Female';
  audioSampleUrl?: string;
}

interface PodcastTwoHostsVoiceSelectorProps {
  apiConfig: PodcastApiConfig;
  locale: string;
  selectedVoice: Voice | null;
  selectedSpeaker1: string | null;
  selectedSpeaker2: string | null;
  onVoiceChange: (voice: Voice | null) => void;
  onSpeakersChange: (speaker1: string | null, speaker2: string | null) => void;
  disabled?: boolean;
}

export function PodcastTwoHostsVoiceSelector({
  apiConfig,
  locale,
  selectedVoice,
  selectedSpeaker1,
  selectedSpeaker2,
  onVoiceChange,
  onSpeakersChange,
  disabled = false,
}: PodcastTwoHostsVoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [allVoices, setAllVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch voices when locale changes
  useEffect(() => {
    const fetchVoices = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const fetchedVoices = await queryVoices(apiConfig, locale);
        const twoHostsVoices = getTwoHostsVoices(fetchedVoices);
        setVoices(twoHostsVoices);
        setAllVoices(fetchedVoices); // Keep all voices for audio sample lookup
        
        // Reset selections if current voice is not in the new list
        if (selectedVoice && !twoHostsVoices.find(v => v.id === selectedVoice.id)) {
          onVoiceChange(null);
          onSpeakersChange(null, null);
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
  }, [locale, apiConfig.apiKey, apiConfig.region, selectedVoice, onVoiceChange, onSpeakersChange]);

  // Extract locale from multitalker voice name
  const extractLocaleFromVoiceName = (voiceName: string): string => {
    // Examples:
    // "en-Multitalker-1:DragonHDLatestNeural" -> "en" -> "en-US" (mapped)
    // "en-US-MultiTalker-Ava-Andrew:DragonHDLatestNeural" -> "en-US"
    // "fr-CA-MultiTalker-Vivienne-Remy:DragonHDLatestNeural" -> "fr-CA"
    
    const match = voiceName.match(/^([a-z]{2}(?:-[A-Z]{2})?)-multitalker/i);
    if (match) {
      const extractedLocale = match[1];
      
      // Map 2-letter codes to full regional locales for neural voice lookup
      // Neural voices use full locales like "en-US-AvaNeural", not "en-AvaNeural"
      const localeMap: Record<string, string> = {
        'en': 'en-US',
      };
      
      return localeMap[extractedLocale] || extractedLocale;
    }
    
    // Fallback to the podcast locale if pattern doesn't match
    return locale;
  };

  // Find audio sample for a speaker by matching name to neural voice
  const findAudioSampleForSpeaker = (speakerName: string, gender: 'Male' | 'Female'): string | undefined => {
    if (!selectedVoice) return undefined;
    
    // Extract locale from the multitalker voice name, not the podcast locale
    const voiceLocale = extractLocaleFromVoiceName(selectedVoice.shortName);
    
    // Try to find a neural voice matching the speaker name
    // Format: speakerName (e.g., "Ava") -> "{voiceLocale}-{SpeakerName}Neural" (e.g., "en-US-AvaNeural")
    const expectedShortName = `${voiceLocale}-${speakerName}Neural`;
    
    const matchingVoice = allVoices.find(v => 
      v.shortName === expectedShortName && 
      v.properties.Gender === gender
    );

    if (matchingVoice && matchingVoice.samples.styleSamples.length > 0) {
      return matchingVoice.samples.styleSamples[0].audioFileEndpointWithSas;
    }

    return undefined;
  };

  // Extract speakers from selected voice
  const availableSpeakers = useMemo((): Speaker[] => {
    if (!selectedVoice) return [];

    const speakers: Speaker[] = [];
    
    // Find femaleSpeakers and maleSpeakers in voiceTags
    const femaleSpeakersTag = selectedVoice.voiceTags.find(tag => tag.name === 'femaleSpeakers');
    const maleSpeakersTag = selectedVoice.voiceTags.find(tag => tag.name === 'maleSpeakers');

    // Add female speakers
    if (femaleSpeakersTag) {
      femaleSpeakersTag.tags.forEach(speakerName => {
        const audioSampleUrl = findAudioSampleForSpeaker(speakerName, 'Female');
        speakers.push({ name: speakerName, gender: 'Female', audioSampleUrl });
      });
    }

    // Add male speakers
    if (maleSpeakersTag) {
      maleSpeakersTag.tags.forEach(speakerName => {
        const audioSampleUrl = findAudioSampleForSpeaker(speakerName, 'Male');
        speakers.push({ name: speakerName, gender: 'Male', audioSampleUrl });
      });
    }

    return speakers;
  }, [selectedVoice, allVoices, locale]);

  const handleVoiceChange = (voiceId: string) => {
    const voice = voices.find(v => v.id === voiceId) || null;
    onVoiceChange(voice);
    // Reset speaker selections when voice changes
    onSpeakersChange(null, null);
  };

  const handleSpeaker1Change = (speakerName: string) => {
    onSpeakersChange(speakerName || null, selectedSpeaker2);
  };

  const handleSpeaker2Change = (speakerName: string) => {
    onSpeakersChange(selectedSpeaker1, speakerName || null);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Voice (TwoHosts)</label>
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
        <label className="block text-sm font-medium text-gray-700">Voice (TwoHosts)</label>
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (voices.length === 0) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Voice (TwoHosts)</label>
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-700">No multitalker voices available for {locale}</p>
        </div>
      </div>
    );
  }

  const speaker1Options = availableSpeakers;
  const speaker2Options = availableSpeakers.filter(s => s.name !== selectedSpeaker1);

  return (
    <div className="space-y-4">
      {/* Multitalker Voice Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Multitalker Voice <span className="text-gray-500 font-normal">- Optional</span>
        </label>
        <p className="text-xs text-gray-500 -mt-1 mb-2">
          Choose a multitalker voice model, then select two speakers
        </p>
        <select
          value={selectedVoice?.id || ''}
          onChange={(e) => handleVoiceChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Auto (System will choose)</option>
          {voices.map((voice) => {
            const displayName = voice.properties.DisplayName || voice.shortName;
            return (
              <option key={voice.id} value={voice.id}>
                {displayName}
              </option>
            );
          })}
        </select>
      </div>

      {/* Speaker Selection - only show if a voice is selected */}
      {selectedVoice && availableSpeakers.length > 0 && (
        <div className="space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-md">
          <h3 className="text-sm font-medium text-purple-900">Select Two Speakers</h3>
          
          {/* Speaker 1 */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700">Speaker 1</label>
            <select
              value={selectedSpeaker1 || ''}
              onChange={(e) => handleSpeaker1Change(e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select speaker...</option>
              {speaker1Options.map((speaker) => (
                <option key={speaker.name} value={speaker.name}>
                  {speaker.name} ({speaker.gender})
                </option>
              ))}
            </select>
            
            {selectedSpeaker1 && speaker1Options.find(s => s.name === selectedSpeaker1)?.audioSampleUrl && (
              <div className="mt-2">
                <audio
                  controls
                  className="w-full h-8"
                  src={speaker1Options.find(s => s.name === selectedSpeaker1)!.audioSampleUrl}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </div>

          {/* Speaker 2 */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700">Speaker 2</label>
            <select
              value={selectedSpeaker2 || ''}
              onChange={(e) => handleSpeaker2Change(e.target.value)}
              disabled={disabled || !selectedSpeaker1}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select speaker...</option>
              {speaker2Options.map((speaker) => (
                <option key={speaker.name} value={speaker.name}>
                  {speaker.name} ({speaker.gender})
                </option>
              ))}
            </select>
            
            {selectedSpeaker2 && speaker2Options.find(s => s.name === selectedSpeaker2)?.audioSampleUrl && (
              <div className="mt-2">
                <audio
                  controls
                  className="w-full h-8"
                  src={speaker2Options.find(s => s.name === selectedSpeaker2)!.audioSampleUrl}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </div>

          {selectedSpeaker1 && selectedSpeaker2 && (
            <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
              ✓ Ready: {selectedSpeaker1} and {selectedSpeaker2} will have a conversation
            </div>
          )}
        </div>
      )}
    </div>
  );
}
