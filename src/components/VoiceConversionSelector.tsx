import React, { useState, useMemo } from 'react';
import { VoiceConversionVoice, VOICE_CONVERSION_VOICES } from '../types/voiceConversion';

interface VoiceConversionSelectorProps {
  selectedVoice: VoiceConversionVoice | null;
  onVoiceChange: (voice: VoiceConversionVoice) => void;
}

type GenderFilter = 'All' | 'Female' | 'Male' | 'Neutral';

export function VoiceConversionSelector({
  selectedVoice,
  onVoiceChange,
}: VoiceConversionSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('All');

  const filteredVoices = useMemo(() => {
    return VOICE_CONVERSION_VOICES.filter((voice) => {
      // Apply gender filter
      if (genderFilter !== 'All' && voice.gender !== genderFilter) {
        return false;
      }

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          voice.displayName.toLowerCase().includes(searchLower) ||
          voice.name.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [searchTerm, genderFilter]);

  const genderFilters: GenderFilter[] = ['All', 'Female', 'Male'];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[var(--text-strong)]">Target Voice</h3>

      {/* Gender filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {genderFilters.map((gender) => (
          <button
            key={gender}
            onClick={() => setGenderFilter(gender)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              genderFilter === gender
                ? 'bg-blue-600 text-white'
                : 'bg-[var(--surface-muted)] text-[var(--text-body)] hover:bg-[var(--surface-elevated)]'
            }`}
          >
            {gender}
          </button>
        ))}
      </div>

      {/* Search input */}
      <input
        type="text"
        placeholder="Search voices..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-3 py-2 border border-[var(--border-soft)] bg-[var(--surface-elevated)] text-[var(--text-strong)] placeholder:text-[var(--text-muted)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />

      {/* Selected voice display */}
      {selectedVoice && (
        <div className="p-2 bg-[rgba(59,130,246,0.14)] border border-blue-500/50 rounded-md">
          <div className="text-xs text-blue-400 font-medium">Selected:</div>
          <div className="text-sm text-[var(--text-strong)] truncate">{selectedVoice.displayName}</div>
        </div>
      )}

      {/* Voice list */}
      <div className="max-h-96 overflow-y-auto border border-[var(--border-soft)] rounded-md">
        {filteredVoices.length === 0 ? (
          <div className="p-4 text-center text-[var(--text-muted)] text-sm">No voices found</div>
        ) : (
          filteredVoices.map((voice) => (
            <button
              key={voice.name}
              onClick={() => onVoiceChange(voice)}
              className={`w-full px-4 py-3 text-left border-b border-[var(--border-soft)] last:border-b-0 transition-colors ${
                selectedVoice?.name === voice.name
                  ? 'bg-[rgba(59,130,246,0.16)] border-l-4 border-l-blue-500'
                  : 'hover:bg-[var(--surface-muted)]'
              }`}
            >
              <div className="font-medium text-[var(--text-strong)]">{voice.displayName}</div>
              <div className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                    voice.gender === 'Female'
                      ? 'bg-pink-100 text-pink-700'
                      : voice.gender === 'Male'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {voice.gender}
                </span>
                <span className="text-[var(--text-muted)]">en-US</span>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="text-xs text-[var(--text-muted)]">
        {filteredVoices.length} voice{filteredVoices.length !== 1 ? 's' : ''} available
      </div>
    </div>
  );
}
