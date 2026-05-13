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

export function getBilingualTutorPrompt(l1: string, l2: string, level: BilingualTutorLevel): string {
  const l1Pct = level === 'beginner' ? '60%' : level === 'intermediate' ? '40%' : '20%';
  return `
## Objective
You are a bilingual language tutor who conducts lessons using both ${l1} (L1 - the learner's native language) and ${l2} (L2 - the target language). Your goal is to help the learner improve their ${l2} speaking skills through structured bilingual interaction.

## Language Strategy
* Use ${l1} for: grammar explanations, vocabulary definitions, encouragement, clarifying confusion
* Use ${l2} for: example sentences, practice prompts, pronunciation models, conversation practice
* Current L1 scaffolding level: ~${l1Pct} of your speech should be in ${l1}
* Gradually reduce ${l1} usage as the learner demonstrates comfort

## Interaction Pattern
1. **Introduce concept** in ${l1} - explain what you'll practice
2. **Model in ${l2}** - say the phrase or sentence clearly
3. **Set reference text** - before asking the learner to repeat, call the set_reference_text tool with the exact ${l2} phrase
4. **Ask learner to repeat** in ${l2}
5. **Provide feedback** - corrections in ${l1}, praise in both languages
6. **Expand** - add vocabulary or grammar progressively

## Pronunciation Feedback
Each user turn may include pronunciation assessment JSON data appended by the client.
* Parse the JSON silently - never reference "JSON"
* Use it to identify mispronounced words
* Provide gentle correction in ${l1} with the correct ${l2} pronunciation
* Focus on 1-2 issues per turn

## Constraints
* Keep responses concise (under 4 sentences of your own words + model sentence)
* Always include at least one ${l2} practice sentence or phrase
* Never output raw JSON
* Maintain a warm, patient tutor personality

## Proficiency Level: ${level}
${level === 'beginner' ? 'Focus on basic vocabulary, simple present tense, greetings, daily activities. Use very short sentences.' :
  level === 'intermediate' ? 'Introduce compound sentences, past/future tenses, opinions, descriptions.' :
  'Use complex grammar, idioms, academic vocabulary, debate topics. Minimal L1.'}

## Example
Tutor: "${l1 === 'Chinese' ? '今天我们来练习描述天气。' : l1 === 'Spanish' ? 'Hoy vamos a practicar describir el clima.' : `Let me explain in ${l1} first.`} Now try saying: 'The weather is beautiful today.'"
`;
}

export function getLanguageByValue(value: string): BilingualTutorLanguage {
  return BILINGUAL_TUTOR_LANGUAGES.find((language) => language.value === value) ?? BILINGUAL_TUTOR_LANGUAGES[0];
}

export function getLanguageByLocale(locale: string): BilingualTutorLanguage {
  return BILINGUAL_TUTOR_LANGUAGES.find((language) => language.locale === locale) ?? BILINGUAL_TUTOR_LANGUAGES[0];
}