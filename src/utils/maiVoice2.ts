import { VoiceInfo } from '../types/azure';

export const MAI_VOICE_2_BY_LOCALE: Record<string, string> = {
  'de-DE': 'de-DE-Mia:MAI-Voice-2',
  'en-AU': 'en-AU-Lisa:MAI-Voice-2',
  'en-US': 'en-US-Harper:MAI-Voice-2',
  'es-ES': 'es-ES-Marta:MAI-Voice-2',
  'es-MX': 'es-MX-Valeria:MAI-Voice-2',
  'fr-FR': 'fr-FR-Soleil:MAI-Voice-2',
  'hi-IN': 'hi-IN-Kavya:MAI-Voice-2',
  'hu-HU': 'hu-HU-Lilla:MAI-Voice-2',
  'it-IT': 'it-IT-Rosa:MAI-Voice-2',
  'ko-KR': 'ko-KR-Hana:MAI-Voice-2',
  'nl-NL': 'nl-NL-Fleur:MAI-Voice-2',
  'pt-BR': 'pt-BR-Luana:MAI-Voice-2',
  'pt-PT': 'pt-PT-Rui:MAI-Voice-2',
  'ro-RO': 'ro-RO-Elena:MAI-Voice-2',
  'ru-RU': 'ru-RU-Masha:MAI-Voice-2',
  'th-TH': 'th-TH-Krit:MAI-Voice-2',
  'tr-TR': 'tr-TR-Elif:MAI-Voice-2',
  'zh-CN': 'zh-CN-Mei:MAI-Voice-2',
};

export const DEFAULT_MAI_VOICE_2 = MAI_VOICE_2_BY_LOCALE['en-US'];

export function isMaiVoice2(voiceName: string | undefined): boolean {
  return Boolean(voiceName?.toLowerCase().includes(':mai-voice-2'));
}

export function getMaiVoice2ForLocale(locale: string | undefined): string | undefined {
  if (!locale) return undefined;
  return MAI_VOICE_2_BY_LOCALE[locale];
}

export function getMaiVoice2FallbackVoices(): VoiceInfo[] {
  return Object.entries(MAI_VOICE_2_BY_LOCALE).map(([locale, name]) => {
    const displayName = name.split(':')[0].split('-').slice(2).join(' ');

    return {
      name,
      locale,
      gender: name.includes('-Klaus:') || name.includes('-Ethan:') || name.includes('-Alejo:') ||
        name.includes('-Arjun:') || name.includes('-Luca:') || name.includes('-Junho:') ||
        name.includes('-Caio:') || name.includes('-Pedro:') || name.includes('-Rui:') ||
        name.includes('-Rafael:') || name.includes('-Lev:') || name.includes('-Krit:') ||
        name.includes('-Aydin:') || name.includes('-Bo:')
        ? 'Male'
        : 'Female',
      description: `${displayName} MAI Voice 2 (${locale})`,
      styleList: [],
      isFeatured: true,
      voiceType: 'Neural',
      isNeuralHD: true,
      keywords: ['MAI', 'MAI-Voice-2'],
      wordsPer: undefined,
      voiceTag: { Source: ['MAI'] },
    };
  });
}