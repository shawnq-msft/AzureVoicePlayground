/**
 * Icon constants used across the application
 */

/**
 * Gender icon constants used across voice and speaker selectors
 */
export const GENDER_ICONS = {
  Male: '\ud83d\ude4d\u200d\u2642\ufe0f',    // 🙍‍♂️ Man frowning
  Female: '\ud83d\ude4d\u200d\u2640\ufe0f',  // 🙍‍♀️ Woman frowning
  Unknown: '\ud83d\udc64'                    // 👤 Bust silhouette
} as const;

export type Gender = keyof typeof GENDER_ICONS;
