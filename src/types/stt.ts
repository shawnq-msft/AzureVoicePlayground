// Speech-to-Text model types and settings

export type STTModel = 'realtime' | 'fast-transcription' | 'llm-speech' | 'mai-transcribe' | 'whisper';
export type STTState = 'idle' | 'processing' | 'streaming' | 'completed' | 'error';
export type ExportFormat = 'txt' | 'srt' | 'vtt';

export interface STTSettings {
  model: STTModel;
  language: string; // 'auto' or language code (e.g., 'en-US')
  enableWordTimings: boolean;
  enableProfanityFilter: boolean;
  enableDiarization: boolean;
  maxSpeakers: number;
}

export interface STTHistoryEntry {
  id: string;
  timestamp: number;
  model: STTModel;
  audioFileName: string;
  audioSize: number;
  audioDuration: number;
  language: string;
  transcript: string; // Full text for easy access
  processingTime: number; // milliseconds
  segments?: import('./transcription').TranscriptSegment[];
}
