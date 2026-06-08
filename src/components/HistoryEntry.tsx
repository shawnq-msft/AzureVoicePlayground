import React, { useState, useRef, useEffect } from 'react';
import { HistoryEntry as HistoryEntryType } from '../types/history';
import { downloadAudioAsMP3, formatDuration } from '../utils/audioUtils';

interface HistoryEntryProps {
  entry: HistoryEntryType;
  onDelete?: (id: string) => void;
}

export function HistoryEntry({ entry, onDelete }: HistoryEntryProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const hasAudio = Boolean(entry.audioData);

  // Create blob URL from audio data
  useEffect(() => {
    if (!entry.audioData) return;

    const blob = new Blob([entry.audioData], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    blobUrlRef.current = url;

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, [entry.audioData]);

  const handlePlayPause = () => {
    if (!entry.audioData) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(blobUrlRef.current || '');
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
  };

  const handleSave = () => {
    if (!entry.audioData) return;

    const timestamp = new Date(entry.timestamp).toISOString().replace(/[:.]/g, '-').slice(0, -5);
    // Sanitize voice name and region for filename (remove special characters)
    const voiceName = entry.voice.replace(/[^a-zA-Z0-9-]/g, '_');
    const region = entry.region.replace(/[^a-zA-Z0-9-]/g, '_');
    const modelPart = entry.model ? `-${entry.model.replace(/[^a-zA-Z0-9-]/g, '_')}` : '';
    const filename = `azurevoice-${region}-${voiceName}${modelPart}-${timestamp}.mp3`;
    downloadAudioAsMP3(entry.audioData, filename);
  };

  const handleDelete = () => {
    if (onDelete) {
      // Stop audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      onDelete(entry.id);
    }
  };

  // Truncate text to ~100 characters
  const truncatedText =
    entry.text.length > 100 ? entry.text.substring(0, 100) + '...' : entry.text;

  // Format timestamp
  const timeString = new Date(entry.timestamp).toLocaleTimeString();

  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50">
      {/* Text snippet and metadata */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 truncate mb-1">{truncatedText}</p>
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
          <span>{timeString}</span>
          <span>•</span>
          <span className="truncate max-w-[200px]">{entry.voice}</span>
          {entry.model && (
            <>
              <span>•</span>
              <span className="text-emerald-600 font-medium">{entry.model}</span>
            </>
          )}
          <span>•</span>
          <span>{entry.region}</span>
          {hasAudio ? (
            <>
              <span>•</span>
              <span>{formatDuration(entry.duration)}</span>
            </>
          ) : (
            <>
              <span>•</span>
              <span>Audio unavailable</span>
            </>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handlePlayPause}
          disabled={!hasAudio}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          title={hasAudio ? (isPlaying ? 'Pause' : 'Play') : 'Audio unavailable'}
        >
          {isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          )}
        </button>
        <button
          onClick={handleSave}
          disabled={!hasAudio}
          className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          title={hasAudio ? 'Save as MP3' : 'Audio unavailable'}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
          </svg>
        </button>
        {onDelete && (
          <button
            onClick={handleDelete}
            className="px-2 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors text-xs font-medium"
            title="Remove"
          >
            <span className="inline-flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                clipRule="evenodd"
              />
              </svg>
              Remove
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
