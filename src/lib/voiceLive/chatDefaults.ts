/**
 * Voice Live Chat configuration types and defaults
 */

export type AvatarType = 'none' | 'video' | 'photo';

export type VoiceType = 'standard' | 'personal';

export interface AvatarConfig {
  enabled: boolean;
  type: AvatarType;
  character: string;
  style?: string;
  customized: boolean;
  customAvatarName?: string;
}

export interface VoiceLiveChatConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  instructions: string;
  voice: string;
  voiceType: VoiceType;
  personalVoiceSpeakerProfileId: string;
  personalVoiceModel: string;
  recognitionLanguage: string;
  turnDetectionType: 'server_vad' | 'azure_semantic_vad';
  asrOnly: boolean;
  removeFillerWords: boolean;
  useNoiseSuppression: boolean;
  useEchoCancellation: boolean;
  temperature: number;
  avatar: AvatarConfig;
  enableFunctionCalling: boolean;
  functions: {
    enableDateTime: boolean;
    enableWeatherForecast: boolean;
  };
}

export const PERSONAL_VOICE_MODELS = [
  { id: 'DragonLatestNeural', name: 'Dragon (Latest)' },
  { id: 'PhoenixLatestNeural', name: 'Phoenix (Latest)' },
  { id: 'PhoenixV2Neural', name: 'Phoenix V2' },
];

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  enabled: false,
  type: 'video',
  character: 'lisa',
  style: 'casual-sitting',
  customized: false,
};

export const DEFAULT_CHAT_CONFIG: VoiceLiveChatConfig = {
  endpoint: '',
  apiKey: '',
  model: 'gpt-realtime',
  instructions: 'You are a helpful and friendly AI assistant. Be concise and natural in your responses.\n\nPlease only respond in English.\n\nBefore calling weather, say something to acknowledge in A FEW words.',
  voice: 'en-us-ava:DragonHDLatestNeural',
  voiceType: 'standard',
  personalVoiceSpeakerProfileId: '',
  personalVoiceModel: 'DragonLatestNeural',
  recognitionLanguage: 'auto',
  turnDetectionType: 'server_vad',
  asrOnly: false,
  removeFillerWords: false,
  useNoiseSuppression: false,
  useEchoCancellation: false,
  temperature: 0.9,
  avatar: { ...DEFAULT_AVATAR_CONFIG },
  enableFunctionCalling: true,
  functions: {
    enableDateTime: true,
    enableWeatherForecast: true,
  },
};

export const CHAT_MODEL_OPTIONS = [
  { id: 'gpt-realtime', name: 'GPT Realtime' },
  { id: 'gpt-realtime-mini', name: 'GPT Realtime Mini' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'gpt-4.1', name: 'GPT-4.1' },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
  { id: 'gpt-5-chat', name: 'GPT-5' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini' },
];

export const RECOGNITION_LANGUAGES = [
  { code: 'auto', name: 'Auto Detect' },
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'de-DE', name: 'German' },
  { code: 'fr-FR', name: 'French' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'es-MX', name: 'Spanish (Mexico)' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'hi-IN', name: 'Hindi' },
];

const ALL_CHAT_VOICES = [
  // Azure HD Voices - en-US (DragonHD)
  { id: 'en-us-ava:DragonHDLatestNeural', name: 'Ava (HD, en-US)' },
  { id: 'en-us-andrew:DragonHDLatestNeural', name: 'Andrew (HD, en-US)' },
  { id: 'en-us-adam:DragonHDLatestNeural', name: 'Adam (HD, en-US)' },
  { id: 'en-us-alloy:DragonHDLatestNeural', name: 'Alloy (HD, en-US)' },
  { id: 'en-us-aria:DragonHDLatestNeural', name: 'Aria (HD, en-US)' },
  { id: 'en-us-bree:DragonHDLatestNeural', name: 'Bree (HD, en-US)' },
  { id: 'en-us-brian:DragonHDLatestNeural', name: 'Brian (HD, en-US)' },
  { id: 'en-us-davis:DragonHDLatestNeural', name: 'Davis (HD, en-US)' },
  { id: 'en-us-emma:DragonHDLatestNeural', name: 'Emma (HD, en-US)' },
  { id: 'en-us-emma2:DragonHDLatestNeural', name: 'Emma2 (HD, en-US)' },
  { id: 'en-us-jane:DragonHDLatestNeural', name: 'Jane (HD, en-US)' },
  { id: 'en-us-jenny:DragonHDLatestNeural', name: 'Jenny (HD, en-US)' },
  { id: 'en-us-nova:DragonHDLatestNeural', name: 'Nova (HD, en-US)' },
  { id: 'en-us-phoebe:DragonHDLatestNeural', name: 'Phoebe (HD, en-US)' },
  { id: 'en-us-serena:DragonHDLatestNeural', name: 'Serena (HD, en-US)' },
  { id: 'en-us-steffan:DragonHDLatestNeural', name: 'Steffan (HD, en-US)' },
  { id: 'en-us-andrew2:DragonHDLatestNeural', name: 'Andrew2 (HD, en-US)' },
  { id: 'en-us-andrew3:DragonHDLatestNeural', name: 'Andrew3 (HD, en-US)' },
  { id: 'en-us-ava3:DragonHDLatestNeural', name: 'Ava3 (HD, en-US)' },
  // Azure HD Voices - en-US (DragonHD Omni)
  { id: 'en-us-andrew:DragonHDOmniLatestNeural', name: 'Andrew (HD Omni, en-US)' },
  { id: 'en-us-ava:DragonHDOmniLatestNeural', name: 'Ava (HD Omni, en-US)' },
  { id: 'en-us-caleb:DragonHDOmniLatestNeural', name: 'Caleb (HD Omni, en-US)' },
  { id: 'en-us-dana:DragonHDOmniLatestNeural', name: 'Dana (HD Omni, en-US)' },
  { id: 'en-us-lewis:DragonHDOmniLatestNeural', name: 'Lewis (HD Omni, en-US)' },
  { id: 'en-us-phoebe:DragonHDOmniLatestNeural', name: 'Phoebe (HD Omni, en-US)' },
  // Azure HD Voices - en-US (DragonHD Flash)
  { id: 'en-us-jimmie:DragonHDFlashLatestNeural', name: 'Jimmie (HD Flash, en-US)' },
  { id: 'en-us-tiana:DragonHDFlashLatestNeural', name: 'Tiana (HD Flash, en-US)' },
  { id: 'en-us-tyler:DragonHDFlashLatestNeural', name: 'Tyler (HD Flash, en-US)' },
  // Azure HD Voices - en-GB (DragonHD)
  { id: 'en-gb-ada:DragonHDLatestNeural', name: 'Ada (HD, en-GB)' },
  { id: 'en-gb-ollie:DragonHDLatestNeural', name: 'Ollie (HD, en-GB)' },
  // Azure HD Voices - en-IN (DragonHD)
  { id: 'en-in-meera:DragonHDLatestNeural', name: 'Meera (HD, en-IN)' },
  { id: 'en-in-aarti:DragonHDLatestNeural', name: 'Aarti (HD, en-IN)' },
  { id: 'en-in-arjun:DragonHDLatestNeural', name: 'Arjun (HD, en-IN)' },
  // Azure HD Voices - de-DE (DragonHD)
  { id: 'de-de-seraphina:DragonHDLatestNeural', name: 'Seraphina (HD, de-DE)' },
  { id: 'de-de-florian:DragonHDLatestNeural', name: 'Florian (HD, de-DE)' },
  // Azure HD Voices - es-ES (DragonHD)
  { id: 'es-es-ximena:DragonHDLatestNeural', name: 'Ximena (HD, es-ES)' },
  { id: 'es-es-tristan:DragonHDLatestNeural', name: 'Tristan (HD, es-ES)' },
  // Azure HD Voices - es-MX (DragonHD)
  { id: 'es-mx-ximena:DragonHDLatestNeural', name: 'Ximena (HD, es-MX)' },
  { id: 'es-mx-tristan:DragonHDLatestNeural', name: 'Tristan (HD, es-MX)' },
  // Azure HD Voices - fr-FR (DragonHD)
  { id: 'fr-fr-vivienne:DragonHDLatestNeural', name: 'Vivienne (HD, fr-FR)' },
  { id: 'fr-fr-remy:DragonHDLatestNeural', name: 'Remy (HD, fr-FR)' },
  // Azure HD Voices - fr-CA (DragonHD)
  { id: 'fr-ca-sylvie:DragonHDLatestNeural', name: 'Sylvie (HD, fr-CA)' },
  { id: 'fr-ca-thierry:DragonHDLatestNeural', name: 'Thierry (HD, fr-CA)' },
  // Azure HD Voices - it-IT (DragonHD)
  { id: 'it-it-isabella:DragonHDLatestNeural', name: 'Isabella (HD, it-IT)' },
  { id: 'it-it-alessio:DragonHDLatestNeural', name: 'Alessio (HD, it-IT)' },
  // Azure HD Voices - ja-JP (DragonHD)
  { id: 'ja-jp-nanami:DragonHDLatestNeural', name: 'Nanami (HD, ja-JP)' },
  { id: 'ja-jp-masaru:DragonHDLatestNeural', name: 'Masaru (HD, ja-JP)' },
  // Azure HD Voices - ko-KR (DragonHD)
  { id: 'ko-kr-sunhi:DragonHDLatestNeural', name: 'SunHi (HD, ko-KR)' },
  { id: 'ko-kr-hyunsu:DragonHDLatestNeural', name: 'Hyunsu (HD, ko-KR)' },
  // Azure HD Voices - pt-BR (DragonHD)
  { id: 'pt-br-thalita:DragonHDLatestNeural', name: 'Thalita (HD, pt-BR)' },
  { id: 'pt-br-macerio:DragonHDLatestNeural', name: 'Macerio (HD, pt-BR)' },
  // Azure HD Voices - zh-CN (DragonHD)
  { id: 'zh-cn-xiaochen:DragonHDLatestNeural', name: 'Xiaochen (HD, zh-CN)' },
  { id: 'zh-cn-yunfan:DragonHDLatestNeural', name: 'Yunfan (HD, zh-CN)' },
  // Azure HD Voices - zh-CN (DragonHD Omni)
  { id: 'zh-cn-xiaoyue:DragonHDOmniLatestNeural', name: 'Xiaoyue (HD Omni, zh-CN)' },
  { id: 'zh-cn-yunqi:DragonHDOmniLatestNeural', name: 'Yunqi (HD Omni, zh-CN)' },
  // Azure HD Voices - zh-CN (DragonHD Flash)
  { id: 'zh-cn-xiaoxiao:DragonHDFlashLatestNeural', name: 'Xiaoxiao (HD Flash, zh-CN)' },
  { id: 'zh-cn-xiaoxiao2:DragonHDFlashLatestNeural', name: 'Xiaoxiao2 (HD Flash, zh-CN)' },
  { id: 'zh-cn-xiaochen:DragonHDFlashLatestNeural', name: 'Xiaochen (HD Flash, zh-CN)' },
  { id: 'zh-cn-xiaoshuang:DragonHDFlashLatestNeural', name: 'Xiaoshuang (HD Flash, zh-CN)' },
  { id: 'zh-cn-xiaoyou:DragonHDFlashLatestNeural', name: 'Xiaoyou (HD Flash, zh-CN)' },
  { id: 'zh-cn-xiaoyu:DragonHDFlashLatestNeural', name: 'Xiaoyu (HD Flash, zh-CN)' },
  { id: 'zh-cn-yunxiao:DragonHDFlashLatestNeural', name: 'Yunxiao (HD Flash, zh-CN)' },
  { id: 'zh-cn-yunyi:DragonHDFlashLatestNeural', name: 'Yunyi (HD Flash, zh-CN)' },
  { id: 'zh-cn-yunxia:DragonHDFlashLatestNeural', name: 'Yunxia (HD Flash, zh-CN)' },
  { id: 'zh-cn-yunye:DragonHDFlashLatestNeural', name: 'Yunye (HD Flash, zh-CN)' },
  // Azure Multilingual Voices
  { id: 'en-US-AvaMultilingualNeural', name: 'Ava Multilingual' },
  { id: 'en-US-AndrewMultilingualNeural', name: 'Andrew Multilingual' },
  { id: 'en-US-EmmaMultilingualNeural', name: 'Emma Multilingual' },
  { id: 'en-US-BrianMultilingualNeural', name: 'Brian Multilingual' },
  { id: 'zh-CN-XiaoxiaoMultilingualNeural', name: 'Xiaoxiao Multilingual' },
  // Azure MAI Voices
  { id: 'en-us-phoebe:MAI-Voice-1', name: 'Phoebe (MAI)' },
  { id: 'en-us-benjamin:MAI-Voice-1', name: 'Benjamin (MAI)' },
  // OpenAI Voices
  { id: 'alloy', name: 'Alloy (OpenAI)' },
  { id: 'ash', name: 'Ash (OpenAI)' },
  { id: 'ballad', name: 'Ballad (OpenAI)' },
  { id: 'coral', name: 'Coral (OpenAI)' },
  { id: 'echo', name: 'Echo (OpenAI)' },
  { id: 'sage', name: 'Sage (OpenAI)' },
  { id: 'shimmer', name: 'Shimmer (OpenAI)' },
  { id: 'verse', name: 'Verse (OpenAI)' },
];

/**
 * Get filtered voice list based on feature flags
 * @param enableMAIVoices - Whether to include MAI voices in the list
 */
export function getChatVoices(enableMAIVoices: boolean = false) {
  if (enableMAIVoices) {
    return ALL_CHAT_VOICES;
  }
  // Filter out MAI voices
  return ALL_CHAT_VOICES.filter(voice => !voice.id.includes(':MAI-Voice-'));
}

// Export default list without MAI voices for backward compatibility
export const CHAT_VOICES = getChatVoices(false);

export const VIDEO_AVATARS = [
  { id: 'lisa-casual-sitting', name: 'Lisa (Casual Sitting)', character: 'lisa', style: 'casual-sitting' },
  { id: 'harry-business', name: 'Harry (Business)', character: 'harry', style: 'business' },
  { id: 'harry-casual', name: 'Harry (Casual)', character: 'harry', style: 'casual' },
  { id: 'harry-youthful', name: 'Harry (Youthful)', character: 'harry', style: 'youthful' },
  { id: 'jeff-business', name: 'Jeff (Business)', character: 'jeff', style: 'business' },
  { id: 'jeff-formal', name: 'Jeff (Formal)', character: 'jeff', style: 'formal' },
  { id: 'lori-casual', name: 'Lori (Casual)', character: 'lori', style: 'casual' },
  { id: 'lori-formal', name: 'Lori (Formal)', character: 'lori', style: 'formal' },
  { id: 'lori-graceful', name: 'Lori (Graceful)', character: 'lori', style: 'graceful' },
  { id: 'max-business', name: 'Max (Business)', character: 'max', style: 'business' },
  { id: 'max-casual', name: 'Max (Casual)', character: 'max', style: 'casual' },
  { id: 'max-formal', name: 'Max (Formal)', character: 'max', style: 'formal' },
  { id: 'meg-business', name: 'Meg (Business)', character: 'meg', style: 'business' },
  { id: 'meg-casual', name: 'Meg (Casual)', character: 'meg', style: 'casual' },
  { id: 'meg-formal', name: 'Meg (Formal)', character: 'meg', style: 'formal' },
];

export const PHOTO_AVATARS = [
  { id: 'adrian', name: 'Adrian' },
  { id: 'amara', name: 'Amara' },
  { id: 'amira', name: 'Amira' },
  { id: 'anika', name: 'Anika' },
  { id: 'bianca', name: 'Bianca' },
  { id: 'camila', name: 'Camila' },
  { id: 'carlos', name: 'Carlos' },
  { id: 'clara', name: 'Clara' },
  { id: 'darius', name: 'Darius' },
  { id: 'diego', name: 'Diego' },
  { id: 'elise', name: 'Elise' },
  { id: 'farhan', name: 'Farhan' },
  { id: 'faris', name: 'Faris' },
  { id: 'gabrielle', name: 'Gabrielle' },
  { id: 'hyejin', name: 'Hyejin' },
  { id: 'imran', name: 'Imran' },
  { id: 'isabella', name: 'Isabella' },
  { id: 'layla', name: 'Layla' },
  { id: 'ling', name: 'Ling' },
  { id: 'liwei', name: 'Liwei' },
  { id: 'marcus', name: 'Marcus' },
  { id: 'matteo', name: 'Matteo' },
  { id: 'rahul', name: 'Rahul' },
  { id: 'rana', name: 'Rana' },
  { id: 'ren', name: 'Ren' },
  { id: 'riya', name: 'Riya' },
  { id: 'sakura', name: 'Sakura' },
  { id: 'simone', name: 'Simone' },
  { id: 'zayd', name: 'Zayd' },
  { id: 'zoe', name: 'Zoe' },
];

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'status' | 'error';
  content: string;
  timestamp: number;
}
