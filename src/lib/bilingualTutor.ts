export type BilingualTutorLevel = 'beginner' | 'intermediate' | 'advanced';

export interface BilingualTutorLanguage {
  value: string;
  label: string;
  locale: string;
}

export const BILINGUAL_TUTOR_LANGUAGES: BilingualTutorLanguage[] = [
  { value: 'English', label: 'English (US)', locale: 'en-US' },
  { value: 'Spanish', label: 'Spanish (Spain)', locale: 'es-ES' },
  { value: 'French', label: 'French (France)', locale: 'fr-FR' },
  { value: 'Chinese', label: 'Chinese (Mandarin)', locale: 'zh-CN' },
  { value: 'Japanese', label: 'Japanese', locale: 'ja-JP' },
  { value: 'Arabic (Egypt)', label: 'Arabic (Egypt)', locale: 'ar-EG' },
  { value: 'Arabic (Saudi Arabia)', label: 'Arabic (Saudi Arabia)', locale: 'ar-SA' },
  { value: 'Catalan', label: 'Catalan', locale: 'ca-ES' },
  { value: 'Chinese (Cantonese)', label: 'Chinese (Cantonese)', locale: 'zh-HK' },
  { value: 'Chinese (Taiwanese)', label: 'Chinese (Taiwanese)', locale: 'zh-TW' },
  { value: 'Danish', label: 'Danish', locale: 'da-DK' },
  { value: 'Dutch', label: 'Dutch', locale: 'nl-NL' },
  { value: 'English (Australia)', label: 'English (Australia)', locale: 'en-AU' },
  { value: 'English (Canada)', label: 'English (Canada)', locale: 'en-CA' },
  { value: 'English (India)', label: 'English (India)', locale: 'en-IN' },
  { value: 'English (UK)', label: 'English (UK)', locale: 'en-GB' },
  { value: 'Finnish', label: 'Finnish', locale: 'fi-FI' },
  { value: 'French (Canada)', label: 'French (Canada)', locale: 'fr-CA' },
  { value: 'German', label: 'German', locale: 'de-DE' },
  { value: 'Hindi', label: 'Hindi', locale: 'hi-IN' },
  { value: 'Italian', label: 'Italian', locale: 'it-IT' },
  { value: 'Korean', label: 'Korean', locale: 'ko-KR' },
  { value: 'Malay', label: 'Malay', locale: 'ms-MY' },
  { value: 'Norwegian', label: 'Norwegian', locale: 'nb-NO' },
  { value: 'Polish', label: 'Polish', locale: 'pl-PL' },
  { value: 'Portuguese (Brazil)', label: 'Portuguese (Brazil)', locale: 'pt-BR' },
  { value: 'Portuguese (Portugal)', label: 'Portuguese (Portugal)', locale: 'pt-PT' },
  { value: 'Russian', label: 'Russian', locale: 'ru-RU' },
  { value: 'Spanish (Mexico)', label: 'Spanish (Mexico)', locale: 'es-MX' },
  { value: 'Swedish', label: 'Swedish', locale: 'sv-SE' },
  { value: 'Tamil', label: 'Tamil', locale: 'ta-IN' },
  { value: 'Thai', label: 'Thai', locale: 'th-TH' },
  { value: 'Vietnamese', label: 'Vietnamese', locale: 'vi-VN' },
];

// =============================================================================
// v2 (in use) - compact lesson-flow prompt paired with SET_REFERENCE_TEXT_TOOL.
// Designed for low temperature (~0.4) to maximize tool-call reliability.
// =============================================================================

export function getBilingualTutorPrompt(l1: string, l2: string, level: BilingualTutorLevel): string {
  const l1Pct =
    level === 'beginner'
      ? '60%'
      : level === 'intermediate'
        ? '40%'
        : '20%';

  const levelGuidance = level === 'beginner'
    ? 'The learner is starting from zero or near-zero; teach useful words, popular phrases, and very short chunks.'
    : level === 'intermediate'
      ? 'The learner can speak sentences and simple dialogues; practice useful conversations, short answers, and follow-up questions.'
      : 'The learner wants stronger proficiency and nativeness; refine phrasing, rhythm, pronunciation, idioms, and natural expression.';

  return `
You are a bilingual ${l2} tutor for a learner whose L1 is ${l1}.

Goal: improve speaking with short lesson turns, repeat-after-me practice, and pronunciation assessment feedback.

Rules:
* Keep replies to 2 short coaching sentences; target ${l2} phrases do not count.
* Use about ${l1Pct} ${l1}; use ${l2} for model phrases and conversation practice.
* Teach briefly in ${l1}, model one natural ${l2} phrase, ask for repeat, then give feedback and expand.
* Practice phrases must be natural, 5-15 words, and matched to this level: ${levelGuidance}
* At the start, randomly propose one practical topic, such as travel, food, shopping, greetings, work, school, daily life, hobbies, or small talk.
* After learner turns, silently use any pronunciation assessment data; never mention JSON, raw scores, or scoring internals.
* Correct only one key issue per turn: pronunciation, extra words, missing words, fluency, or intonation.

Tool rule:
* If the learner should repeat/read a specific ${l2} phrase, FIRST call \`set_reference_text\` with exactly that phrase, then say the same phrase in your response.
* Do not call \`set_reference_text\` for pure explanations, free conversation, grammar/vocabulary answers, or feedback that does not ask for a repeat.
`;
}

/**
 * Stronger tool description, designed for the v2 prompt above.
 * The Realtime API weighs the tool's own \`description\` heavily when deciding
 * whether to call it, so the strict rule is duplicated here.
 */
export const SET_REFERENCE_TEXT_TOOL = {
  name: 'set_reference_text',
  description:
    'Call this before asking the learner to repeat/read a specific L2 phrase. The phrase you speak must exactly match reference_text. Do not use for explanation-only or free-conversation turns.',
  parameters: {
    type: 'object',
    properties: {
      reference_text: {
        type: 'string',
        description: 'Exact L2 phrase the learner will repeat, without labels, quotes, translation, or instruction text.',
      },
    },
    required: ['reference_text'],
  },
} as const;

export function getLanguageByValue(value: string): BilingualTutorLanguage {
  return BILINGUAL_TUTOR_LANGUAGES.find((language) => language.value === value) ?? BILINGUAL_TUTOR_LANGUAGES[0];
}

export function getLanguageByLocale(locale: string): BilingualTutorLanguage {
  return BILINGUAL_TUTOR_LANGUAGES.find((language) => language.locale === locale) ?? BILINGUAL_TUTOR_LANGUAGES[0];
}