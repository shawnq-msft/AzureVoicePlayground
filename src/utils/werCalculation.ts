/**
 * Word/Character Error Rate Calculation Utility
 *
 * WER = (Substitutions + Deletions + Insertions) / Total Words in Reference
 * CER = (Substitutions + Deletions + Insertions) / Total Characters in Reference
 *
 * Uses Levenshtein distance at word level (for alphabetic languages)
 * or character level (for CJK languages)
 */

export interface WERResult {
  wer: number;                    // Word/Character Error Rate (0-1)
  werPercentage: number;          // WER/CER as percentage (0-100)
  substitutions: number;
  deletions: number;
  insertions: number;
  totalReferenceWords: number;    // Words for alphabetic, characters for CJK
  totalHypothesisWords: number;   // Words for alphabetic, characters for CJK
  referenceText: string;
  hypothesisText: string;
  accuracy: number;               // 1 - WER (clamped to 0-1)
  accuracyPercentage: number;     // Accuracy as percentage
  isCJK: boolean;                 // Whether CER mode was used
  metricName: string;             // "WER" or "CER"
}

/**
 * CJK Unicode ranges for Chinese, Japanese, and Korean characters
 */
const CJK_RANGES = [
  [0x4E00, 0x9FFF],   // CJK Unified Ideographs
  [0x3400, 0x4DBF],   // CJK Unified Ideographs Extension A
  [0x20000, 0x2A6DF], // CJK Unified Ideographs Extension B
  [0x2A700, 0x2B73F], // CJK Unified Ideographs Extension C
  [0x2B740, 0x2B81F], // CJK Unified Ideographs Extension D
  [0x2B820, 0x2CEAF], // CJK Unified Ideographs Extension E
  [0x2CEB0, 0x2EBEF], // CJK Unified Ideographs Extension F
  [0x30000, 0x3134F], // CJK Unified Ideographs Extension G
  [0x3040, 0x309F],   // Hiragana
  [0x30A0, 0x30FF],   // Katakana
  [0xAC00, 0xD7AF],   // Hangul Syllables
  [0x1100, 0x11FF],   // Hangul Jamo
  [0x3130, 0x318F],   // Hangul Compatibility Jamo
];

/**
 * Check if a character is CJK
 */
function isCJKChar(char: string): boolean {
  const code = char.codePointAt(0);
  if (code === undefined) return false;
  return CJK_RANGES.some(([start, end]) => code >= start && code <= end);
}

/**
 * Detect if text is primarily CJK (Chinese, Japanese, Korean)
 * Returns true if more than 30% of non-whitespace characters are CJK
 */
function isCJKText(text: string): boolean {
  const chars = text.replace(/\s/g, '');
  if (chars.length === 0) return false;

  let cjkCount = 0;
  for (const char of chars) {
    if (isCJKChar(char)) {
      cjkCount++;
    }
  }

  return cjkCount / chars.length > 0.3;
}

/**
 * Normalize text for comparison
 * - Converts to lowercase (for non-CJK)
 * - Removes punctuation
 * - Normalizes whitespace
 * - Removes HD voice markers like [laughter], [whisper], etc.
 */
function normalizeText(text: string, isCJK: boolean): string {
  let normalized = text
    // Remove HD voice emotion/style markers like [laughter], [whisper], [shouting], [angry], [sad]
    .replace(/\[(?:laughter|whisper|shouting|angry|sad|singing|sigh|cough)\]/gi, '');

  if (isCJK) {
    // For CJK: remove all punctuation and whitespace, keep CJK characters
    normalized = normalized
      // Remove common CJK punctuation
      .replace(/[。、！？：；「」『』（）【】《》〈〉""''…—～·]/g, '')
      // Remove ASCII punctuation
      .replace(/[^\w\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u3400-\u4DBF]/g, '')
      // Remove whitespace
      .replace(/\s+/g, '');
  } else {
    // For alphabetic languages: lowercase, remove punctuation, normalize whitespace
    normalized = normalized
      .toLowerCase()
      // Remove punctuation but keep apostrophes in contractions
      .replace(/[^\w\s']/g, ' ')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  return normalized;
}

/**
 * Tokenize text into units (words for alphabetic, characters for CJK)
 */
function tokenize(text: string, isCJK: boolean): string[] {
  const normalized = normalizeText(text, isCJK);
  if (!normalized) return [];

  if (isCJK) {
    // Split into individual characters for CJK
    return [...normalized];
  } else {
    // Split into words for alphabetic languages
    return normalized.split(' ').filter(word => word.length > 0);
  }
}

/**
 * Calculate Levenshtein distance with backtracking
 * Returns the edit operations needed to transform reference to hypothesis
 */
function calculateEditDistance(reference: string[], hypothesis: string[]): {
  distance: number;
  substitutions: number;
  deletions: number;
  insertions: number;
} {
  const m = reference.length;
  const n = hypothesis.length;

  // Create DP matrix
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;  // Deletions
  for (let j = 0; j <= n; j++) dp[0][j] = j;  // Insertions

  // Fill DP matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (reference[i - 1] === hypothesis[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];  // Match
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1,  // Substitution
          dp[i - 1][j] + 1,      // Deletion
          dp[i][j - 1] + 1       // Insertion
        );
      }
    }
  }

  // Backtrack to count operations
  let i = m;
  let j = n;
  let substitutions = 0;
  let deletions = 0;
  let insertions = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && reference[i - 1] === hypothesis[j - 1]) {
      // Match - no operation
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      // Substitution
      substitutions++;
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      // Deletion (unit in reference not in hypothesis)
      deletions++;
      i--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      // Insertion (unit in hypothesis not in reference)
      insertions++;
      j--;
    } else {
      // Edge case - shouldn't happen with correct implementation
      break;
    }
  }

  return {
    distance: dp[m][n],
    substitutions,
    deletions,
    insertions
  };
}

/**
 * Calculate Word Error Rate (WER) or Character Error Rate (CER)
 * Automatically detects CJK text and uses CER for those languages
 *
 * @param referenceText - The original/expected text
 * @param hypothesisText - The recognized/transcribed text
 * @returns WERResult with detailed metrics
 */
export function calculateWER(referenceText: string, hypothesisText: string): WERResult {
  // Detect if this is CJK text
  const isCJK = isCJKText(referenceText);
  const metricName = isCJK ? 'CER' : 'WER';

  const referenceUnits = tokenize(referenceText, isCJK);
  const hypothesisUnits = tokenize(hypothesisText, isCJK);

  // Edge case: empty reference
  if (referenceUnits.length === 0) {
    const insertions = hypothesisUnits.length;
    return {
      wer: insertions > 0 ? 1 : 0,
      werPercentage: insertions > 0 ? 100 : 0,
      substitutions: 0,
      deletions: 0,
      insertions,
      totalReferenceWords: 0,
      totalHypothesisWords: hypothesisUnits.length,
      referenceText,
      hypothesisText,
      accuracy: insertions > 0 ? 0 : 1,
      accuracyPercentage: insertions > 0 ? 0 : 100,
      isCJK,
      metricName
    };
  }

  const { substitutions, deletions, insertions } = calculateEditDistance(referenceUnits, hypothesisUnits);

  const totalErrors = substitutions + deletions + insertions;
  const wer = totalErrors / referenceUnits.length;

  // Clamp accuracy to 0-1 range (WER/CER can exceed 1 if many insertions)
  const accuracy = Math.max(0, 1 - wer);

  return {
    wer,
    werPercentage: Math.round(wer * 10000) / 100,  // Round to 2 decimal places
    substitutions,
    deletions,
    insertions,
    totalReferenceWords: referenceUnits.length,
    totalHypothesisWords: hypothesisUnits.length,
    referenceText,
    hypothesisText,
    accuracy,
    accuracyPercentage: Math.round(accuracy * 10000) / 100,
    isCJK,
    metricName
  };
}
