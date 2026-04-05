// Hook for MAI-Transcribe-1 model via LLM Speech API
// https://learn.microsoft.com/en-us/azure/ai-services/speech-service/mai-transcribe

import { useState, useCallback } from 'react';
import { AzureSettings } from '../types/azure';
import { FastTranscript, TranscriptSegment, WordTiming } from '../types/transcription';
import { STTState } from '../types/stt';
import { convertToWav16kHz } from '../utils/audioConversion';

// MAI-Transcribe-1 supported languages (25 languages)
export const MAI_TRANSCRIBE_LANGUAGES = [
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية' },
  { code: 'zh-CN', name: 'Chinese', nativeName: '中文 (简体)' },
  { code: 'cs-CZ', name: 'Czech', nativeName: 'Čeština' },
  { code: 'da-DK', name: 'Danish', nativeName: 'Dansk' },
  { code: 'nl-NL', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'en-US', name: 'English', nativeName: 'English (United States)' },
  { code: 'fi-FI', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français (France)' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch (Deutschland)' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'hu-HU', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'id-ID', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'it-IT', name: 'Italian', nativeName: 'Italiano (Italia)' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語 (日本)' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어 (대한민국)' },
  { code: 'nb-NO', name: 'Norwegian Bokmål', nativeName: 'Norsk bokmål' },
  { code: 'pl-PL', name: 'Polish', nativeName: 'Polski' },
  { code: 'pt-BR', name: 'Portuguese', nativeName: 'Português (Brasil)' },
  { code: 'ro-RO', name: 'Romanian', nativeName: 'Română' },
  { code: 'ru-RU', name: 'Russian', nativeName: 'Русский' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español (España)' },
  { code: 'sv-SE', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'th-TH', name: 'Thai', nativeName: 'ไทย' },
  { code: 'tr-TR', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'vi-VN', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
];

interface UseMAITranscribeReturn {
  state: STTState;
  transcript: FastTranscript | null;
  error: string;
  progress: number;
  transcribe: (audioFile: File | Blob, language: string) => Promise<void>;
  reset: () => void;
}

/**
 * Hook for MAI-Transcribe-1 speech transcription via LLM Speech API
 */
export function useMAITranscribe(settings: AzureSettings): UseMAITranscribeReturn {
  const [state, setState] = useState<STTState>('idle');
  const [transcript, setTranscript] = useState<FastTranscript | null>(null);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  const transcribe = useCallback(async (
    audioFile: File | Blob,
    language: string
  ) => {
    try {
      setState('processing');
      setError('');
      setProgress(0);

      // Validate file size (300 MB limit)
      if (audioFile.size > 300 * 1024 * 1024) {
        throw new Error('Audio file must be less than 300 MB for MAI-Transcribe-1');
      }

      setProgress(10);

      // Convert audio to WAV format
      const wavBlob = await convertToWav16kHz(audioFile);
      setProgress(30);

      // Build the definition object for MAI-Transcribe-1
      const definition: Record<string, any> = {
        enhancedMode: {
          enabled: true,
          model: 'mai-transcribe-1',
        }
      };

      // Call LLM Speech API endpoint with MAI-Transcribe-1 model
      const endpoint = `https://${settings.region}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2025-10-15`;

      setProgress(50);

      // Create FormData with audio and definition
      const formData = new FormData();
      formData.append('audio', wavBlob, 'audio.wav');
      formData.append('definition', JSON.stringify(definition));

      console.log('MAI-Transcribe-1 API Request:', definition);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': settings.apiKey,
        },
        body: formData
      });

      setProgress(70);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      setProgress(90);

      console.log('MAI-Transcribe-1 API Response:', result);

      // Parse the transcription result
      const parsedTranscript = parseTranscriptResult(result, language);
      setTranscript(parsedTranscript);
      setProgress(100);
      setState('completed');

    } catch (err: any) {
      setError(err.message || 'Transcription failed');
      setState('error');
      setProgress(0);
    }
  }, [settings]);

  const reset = useCallback(() => {
    setState('idle');
    setTranscript(null);
    setError('');
    setProgress(0);
  }, []);

  return {
    state,
    transcript,
    error,
    progress,
    transcribe,
    reset
  };
}

/**
 * Parse MAI-Transcribe-1 API response (same format as LLM Speech)
 */
function parseTranscriptResult(apiResponse: any, language: string): FastTranscript {
  let fullText = '';
  let segments: TranscriptSegment[] = [];

  // Try to extract from combinedPhrases
  if (apiResponse.combinedPhrases && apiResponse.combinedPhrases.length > 0) {
    fullText = apiResponse.combinedPhrases[0].text || '';
  }

  // Parse segments from phrases
  if (apiResponse.phrases && Array.isArray(apiResponse.phrases)) {
    segments = apiResponse.phrases.map((phrase: any) => {
      const offset = phrase.offsetMilliseconds ?? parseTimestamp(phrase.offset || phrase.offsetInTicks || 0);
      const duration = phrase.durationMilliseconds ?? parseTimestamp(phrase.duration || phrase.durationInTicks || 0);
      const confidence = phrase.confidence || 0;
      const text = phrase.text || '';

      // Parse word-level timings if available
      const words: WordTiming[] | undefined = phrase.words?.map((word: any) => ({
        text: word.text || word.word,
        offset: word.offsetMilliseconds ?? parseTimestamp(word.offset || word.offsetInTicks || 0),
        duration: word.durationMilliseconds ?? parseTimestamp(word.duration || word.durationInTicks || 0),
        confidence: word.confidence || confidence
      }));

      const locale = phrase.locale;

      return {
        text,
        offset,
        duration,
        confidence,
        words,
        locale
      };
    }).filter((seg: any) => seg.text);
  }

  // Calculate total duration
  const totalDuration = segments.length > 0
    ? Math.max(...segments.map(s => s.offset + s.duration))
    : 0;

  return {
    fullText,
    segments,
    language,
    duration: totalDuration
  };
}

/**
 * Parse timestamp - handles both ticks (100-nanosecond units) and ISO 8601 duration
 */
function parseTimestamp(value: any): number {
  if (typeof value === 'number') {
    return value / 10000;
  }
  if (typeof value === 'string') {
    return parseISO8601Duration(value);
  }
  return 0;
}

/**
 * Parse ISO 8601 duration to milliseconds
 */
function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/);

  if (!match) {
    return 0;
  }

  const hours = parseFloat(match[1] || '0');
  const minutes = parseFloat(match[2] || '0');
  const seconds = parseFloat(match[3] || '0');

  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}
