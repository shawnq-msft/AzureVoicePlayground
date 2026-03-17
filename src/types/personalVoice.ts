/**
 * Types for Azure Custom Voice Personal Voice API
 */

export type PersonalVoiceStatus = 'NotStarted' | 'Running' | 'Succeeded' | 'Failed';

export interface PersonalVoiceProject {
  id: string;
  kind: 'PersonalVoice';
  description?: string;
  createdDateTime?: string;
  lastActionDateTime?: string;
}

export interface Consent {
  id: string;
  status: PersonalVoiceStatus;
  voiceTalentName: string;
  companyName: string;
  locale: string;
  projectId: string;
  description?: string;
  createdDateTime?: string;
  lastActionDateTime?: string;
}

export interface PersonalVoice {
  id: string;
  status: PersonalVoiceStatus;
  projectId: string;
  consentId: string;
  speakerProfileId: string;
  displayName?: string;
  description?: string;
  createdDateTime?: string;
  lastActionDateTime?: string;
}

export interface CreateConsentParams {
  projectId: string;
  consentId: string;
  voiceTalentName: string;
  companyName: string;
  audioFile: Blob;
  locale: string;
  description?: string;
}

export interface CreatePersonalVoiceParams {
  projectId: string;
  personalVoiceId: string;
  consentId: string;
  audioFiles: Blob[];
  description?: string;
}

export interface VoiceCreationConfig {
  projectId: string;
  voiceTalentName: string;
  companyName: string;
  locale: string;
  voiceName: string;
}

export const DEFAULT_VOICE_CREATION_CONFIG: VoiceCreationConfig = {
  projectId: 'personal-voice-playground',
  voiceTalentName: '',
  companyName: 'Voice Playground',
  locale: 'en-US',
  voiceName: '',
};

export const SUPPORTED_LOCALES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'de-DE', name: 'German' },
  { code: 'fr-FR', name: 'French' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
];

export type PersonalVoiceModel = 'DragonLatestNeural' | 'PhoenixLatestNeural';

export const PERSONAL_VOICE_MODELS: { id: PersonalVoiceModel; name: string; description: string }[] = [
  { id: 'DragonLatestNeural', name: 'Dragon (Latest)', description: 'High quality personal voice' },
  { id: 'PhoenixLatestNeural', name: 'Phoenix (Latest)', description: 'Supports word boundary events' },
];

// Base model from API
export interface BaseModel {
  name: string;
  description: string;
  releaseDateTime: string;
  expirationDateTime?: string;
  capabilities: string[];
}

// ============ Text-Prompt Voice Design Types ============

export interface VoiceCandidate {
  id: string;
  uri: string;
  expiresAt: string;
}

export interface DesignVoiceResponse {
  voicePrompt: string;
  sampleText: string;
  candidates: VoiceCandidate[];
}

export interface VoiceExample {
  title: string;
  prompt: string;
  sampleText: string;
}
