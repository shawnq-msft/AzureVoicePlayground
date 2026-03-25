/**
 * Type definitions for Podcast Agent API
 */

export type HostType = 'OneHost' | 'TwoHosts';
export type PodcastStyle = 'Default' | 'Professional' | 'Casual';
export type PodcastLength = 'VeryShort' | 'Short' | 'Medium' | 'Long' | 'VeryLong';
export type FileFormat = 'Txt' | 'Pdf';
export type OperationStatus = 'NotStarted' | 'Running' | 'Succeeded' | 'Failed';
export type GenerationStatus =
  | 'idle'
  | 'uploading'
  | 'creating'
  | 'processing'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface PodcastContent {
  text?: string;           // For PlainText <= 1MB
  url?: string;            // For AzureStorageBlobPublicUrl
  base64Text?: string;     // For content > 1MB and <= 8MB (base64 encoded)
  tempFileId?: string;     // For content > 8MB (uploaded via temp file API)
  fileFormat?: FileFormat; // File format (Txt or Pdf)
}

export interface PodcastTTS {
  voiceName?: string;                    // e.g., "en-us-multitalker-set1:DragonHDLatestNeural"
  multiTalkerVoiceSpeakerNames?: string; // e.g., "ava,andrew"
  genderPreference?: 'Male' | 'Female';  // For OneHost mode
}

export interface AdvancedConfig {
  keepIntermediateZipFile?: boolean;     // Keep intermediate files for debugging
}

export interface ScriptGeneration {
  additionalInstructions?: string;       // Custom instructions for script generation
  template?: string;                    // Script template
  length?: PodcastLength;               // Desired podcast length
  style?: PodcastStyle;                 // Podcast style
}

export interface CreateGenerationParams {
  generationId: string;
  locale: string;
  host: HostType;
  displayName?: string;
  description?: string;
  content: PodcastContent;
  scriptGeneration?: ScriptGeneration;
  tts?: PodcastTTS;
  advancedConfig?: AdvancedConfig;
}

export interface PodcastOutput {
  audioFileUrl?: string;
  reportFileUrl?: string;
  intermediateZipFileUrl?: string;  // Available when keepIntermediateZipFile is enabled
}

export interface Generation {
  id: string;
  locale: string;
  host: HostType;
  displayName?: string;
  description?: string;
  status: OperationStatus;
  createdDateTime: string;
  lastActionDateTime?: string;
  content?: PodcastContent;
  scriptGeneration?: ScriptGeneration;
  tts?: PodcastTTS;
  output?: PodcastOutput;
  failureReason?: string;
  advancedConfig?: AdvancedConfig;
}

export interface OperationResponse {
  id: string;
  status: OperationStatus;
  createdDateTime: string;
  lastActionDateTime?: string;
  resourceLocation?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface PodcastApiConfig {
  region: string;
  apiKey: string;
}

export interface GenerationProgress {
  step: number;
  totalSteps: number;
  message: string;
  generationId?: string;
}

export interface PodcastContentSource {
  file?: File;
  url?: string;
  text?: string;
  base64?: string;
  fileName?: string;
}

export interface PodcastHistoryEntry {
  id: string;
  generationId: string;
  timestamp: number;
  displayName: string;
  locale: string;
  hostType: HostType;
  voiceName?: string;
  style: string;
  length: string;
  status: OperationStatus;
  audioUrl?: string;
  duration?: number;
  contentPreview: string;
  error?: string;
}

export interface PodcastConfig {
  locale: string;
  hostType: HostType;
  style: PodcastStyle;
  length: PodcastLength;
  additionalInstructions?: string;
}

export interface TempFile {
  id: string;
  name: string;
  createdDateTime: string;
  expiresDateTime: string;
  sizeInBytes: number;
  status?: string;  // Optional status field
  links?: {         // Optional links object
    contentUrl?: string;
  };
}

export interface VoiceProperties {
  Gender?: string;
  DisplayName?: string;
  LocalName?: string;
  ShortName?: string;
  FrontendVoiceType?: string;
  AgeGroups?: string;
  Personality?: string;
  TailoredScenarios?: string;
  VoiceModelKind?: string;
  ReleaseScope?: string;
  isHiddenFromAccPortal?: boolean;  // Voice hidden from ACC portal
  [key: string]: string | boolean | undefined;
}

export interface VoiceSample {
  styleName: string;
  audioFileEndpointWithSas: string;
}

export interface VoiceSamples {
  languageSamples: any[];
  roleSamples: any[];
  styleSamples: VoiceSample[];
}

export interface VoiceTag {
  name: string;
  tags: string[];
}

export interface Voice {
  id: string;
  name: string;
  shortName: string;
  description: string;
  locale: string;
  properties: VoiceProperties;
  categories: string[];
  masterpieces: any[];
  samples: VoiceSamples;
  voiceType: string;
  voiceTags: VoiceTag[];
}

// Size limits (in bytes)
export const MAX_PLAIN_TEXT_LENGTH = 1 * 1024 * 1024;      // 1MB
export const MAX_BASE64_TEXT_LENGTH = 8 * 1024 * 1024;     // 8MB
export const MAX_CONTENT_FILE_SIZE = 50 * 1024 * 1024;     // 50MB

// Supported locales
// supportsTwoHosts flag based on IsPodcastTwoHostsSupported attribute in Language.cs
export const PODCAST_LOCALES = [
  { code: 'en-US', name: 'English (US)', supportsTwoHosts: true },
  { code: 'en-GB', name: 'English (UK)', supportsTwoHosts: true },
  { code: 'en-AU', name: 'English (Australia)', supportsTwoHosts: true },
  { code: 'zh-CN', name: 'Chinese (Simplified)', supportsTwoHosts: true },
  { code: 'zh-TW', name: 'Chinese (Traditional)', supportsTwoHosts: true },
  { code: 'ja-JP', name: 'Japanese', supportsTwoHosts: true },
  { code: 'ko-KR', name: 'Korean', supportsTwoHosts: true },
  { code: 'de-DE', name: 'German', supportsTwoHosts: true },
  { code: 'fr-FR', name: 'French', supportsTwoHosts: true },
  { code: 'es-ES', name: 'Spanish (Spain)', supportsTwoHosts: true },
  { code: 'it-IT', name: 'Italian', supportsTwoHosts: true },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', supportsTwoHosts: true },
  { code: 'ru-RU', name: 'Russian', supportsTwoHosts: true },
  { code: 'ar-AE', name: 'Arabic (UAE)', supportsTwoHosts: true },
  // Chinese regional dialects (OneHost only)
  { code: 'zh-CN-anhui', name: 'Chinese (Anhui)', supportsTwoHosts: false },
  { code: 'zh-CN-guangxi', name: 'Chinese (Guangxi)', supportsTwoHosts: false },
  { code: 'zh-CN-henan', name: 'Chinese (Henan)', supportsTwoHosts: false },
  { code: 'zh-CN-hunan', name: 'Chinese (Hunan)', supportsTwoHosts: false },
  { code: 'zh-CN-gansu', name: 'Chinese (Gansu)', supportsTwoHosts: false },
  { code: 'zh-CN-liaoning', name: 'Chinese (Liaoning)', supportsTwoHosts: false },
  { code: 'zh-CN-shaanxi', name: 'Chinese (Shaanxi)', supportsTwoHosts: false },
  { code: 'zh-CN-shanxi', name: 'Chinese (Shanxi)', supportsTwoHosts: false },
  { code: 'zh-CN-shandong', name: 'Chinese (Shandong)', supportsTwoHosts: false },
  { code: 'zh-CN-sichuan', name: 'Chinese (Sichuan)', supportsTwoHosts: false },
];

// Supported regions for Podcast API
export const PODCAST_SUPPORTED_REGIONS = [
  'eastus',
  'eastus2',
  'westeurope',
  'southeastasia',
  'swedencentral',
  'centralindia',
];
