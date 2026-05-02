import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { PersonalVoiceModel } from './personalVoice';

export interface AzureSettings {
  apiKey: string;
  region: string;
  selectedVoice: string;
  // Personal voice info
  personalVoiceInfo?: {
    isPersonalVoice: boolean;
    speakerProfileId?: string;
    locale?: string;
    model?: PersonalVoiceModel;
  };
  // Voice Live settings
  voiceLiveEndpoint?: string;
  voiceLiveApiKey?: string;
}

export interface VoiceInfo {
  name: string;
  locale: string;
  gender: 'Female' | 'Male' | 'Neutral';
  description: string;
  styleList?: string[];
  isFeatured?: boolean;
  voiceType?: string;
  isNeuralHD?: boolean;
  keywords?: string[];
  wordsPer?: string;
  voiceTag?: {
    ContentCategories?: string[];
    VoicePersonalities?: string[];
    Source?: string[];
    FemaleSpeakers?: string[];
    MaleSpeakers?: string[];
  };
}

export interface WordBoundary {
  text: string;
  offset: number;
  length: number;
  audioOffset: number;
}

export type SynthesisState = 'idle' | 'synthesizing' | 'playing' | 'paused' | 'error';

export type PlaygroundMode = 'text-to-speech' | 'speech-to-text' | 'voice-changer' | 'multi-talker' | 'voice-creation' | 'video-translation' | 'voice-live-chat' | 'voice-live-translator' | 'voice-live-calculator' | 'storyland-agent' | 'podcast-agent' | 'gemini-live';

export interface SynthesisResult {
  audioData?: ArrayBuffer;
  error?: string;
}

export { SpeechSDK };
