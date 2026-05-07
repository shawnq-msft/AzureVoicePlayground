import type { TokenUsage } from '@azure/ai-voicelive';

export type TurnMetrics = {
  responseId: string;
  startedAtMs: number;
  firstTextDeltaAtMs?: number;
  firstAudioDeltaAtMs?: number;
  finishedAtMs?: number;
  latencyMs?: number;
  firstTokenLatencyMs?: number;
  usage?: TokenUsage;
  assistantText?: string;
  speechStartedAtMs?: number;
  speechStoppedAtMs?: number;
  startLatencyMs?: number;
  endLatencyMs?: number;
};

export type Totals = {
  turns: number;
  sessionStartMs: number;
  inputAudioSeconds: number;
  cachedAudioSeconds: number;
  outputAudioSeconds: number;
  inputTextTokens: number;
  cachedTextTokens: number;
  outputTextTokens: number;
  inputAudioTokens: number;
  cachedAudioTokens: number;
  outputAudioTokens: number;
  startLatencies: number[];
  endLatencies: number[];
};

export const EMPTY_TOTALS: Totals = {
  turns: 0,
  sessionStartMs: 0,
  inputAudioSeconds: 0,
  cachedAudioSeconds: 0,
  outputAudioSeconds: 0,
  inputTextTokens: 0,
  cachedTextTokens: 0,
  outputTextTokens: 0,
  inputAudioTokens: 0,
  cachedAudioTokens: 0,
  outputAudioTokens: 0,
  startLatencies: [],
  endLatencies: [],
};

export function addUsage(t: Totals, usage: TokenUsage): Totals {
  const newInputAudioTokens = t.inputAudioTokens + usage.inputTokenDetails.audioTokens;
  const newOutputAudioTokens = t.outputAudioTokens + usage.outputTokenDetails.audioTokens;
  return {
    ...t,
    inputTextTokens: t.inputTextTokens + usage.inputTokenDetails.textTokens,
    inputAudioTokens: newInputAudioTokens,
    inputAudioSeconds: newInputAudioTokens / 10,
    cachedTextTokens: t.cachedTextTokens + usage.inputTokenDetails.cachedTokensDetails.textTokens,
    cachedAudioTokens: t.cachedAudioTokens + usage.inputTokenDetails.cachedTokensDetails.audioTokens,
    outputTextTokens: t.outputTextTokens + usage.outputTokenDetails.textTokens,
    outputAudioTokens: newOutputAudioTokens,
    outputAudioSeconds: newOutputAudioTokens / 20,
  };
}

export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

type VoiceLiveTier = 'pro' | 'standard' | 'lite';
type VoiceType = 'text' | 'azure-standard' | 'native-audio';

interface PricingRates {
  inputText: number;
  cachedText: number;
  outputText: number;
  inputAudio: number;
  cachedAudio: number;
  outputAudio: number;
}

const PRICING_TABLE: Record<VoiceLiveTier, Record<VoiceType, PricingRates>> = {
  pro: {
    text: {
      inputText: 4,
      cachedText: 0.40,
      outputText: 16,
      inputAudio: 17,
      cachedAudio: 0.40,
      outputAudio: 31,
    },
    'azure-standard': {
      inputText: 4,
      cachedText: 0.40,
      outputText: 16,
      inputAudio: 17,
      cachedAudio: 0.40,
      outputAudio: 31,
    },
    'native-audio': {
      inputText: 4,
      cachedText: 0.40,
      outputText: 16,
      inputAudio: 32,
      cachedAudio: 0.40,
      outputAudio: 64,
    },
  },
  standard: {
    text: {
      inputText: 0.66,
      cachedText: 0.33,
      outputText: 2.64,
      inputAudio: 15,
      cachedAudio: 0.33,
      outputAudio: 26,
    },
    'azure-standard': {
      inputText: 0.66,
      cachedText: 0.33,
      outputText: 2.64,
      inputAudio: 15,
      cachedAudio: 0.33,
      outputAudio: 26,
    },
    'native-audio': {
      inputText: 0.66,
      cachedText: 0.33,
      outputText: 2.64,
      inputAudio: 11,
      cachedAudio: 0.33,
      outputAudio: 22,
    },
  },
  lite: {
    text: {
      inputText: 0.11,
      cachedText: 0.04,
      outputText: 0.44,
      inputAudio: 15,
      cachedAudio: 0.04,
      outputAudio: 25,
    },
    'azure-standard': {
      inputText: 0.11,
      cachedText: 0.04,
      outputText: 0.44,
      inputAudio: 15,
      cachedAudio: 0.04,
      outputAudio: 25,
    },
    'native-audio': {
      inputText: 0.11,
      cachedText: 0.04,
      outputText: 0.44,
      inputAudio: 4,
      cachedAudio: 0.04,
      outputAudio: 0,
    },
  },
};

export function calculateCost(
  totals: Totals,
  modelTier: VoiceLiveTier = 'standard',
  voiceProvider: 'openai' | 'azure-standard' = 'azure-standard'
): number {
  const voiceType: VoiceType = voiceProvider === 'openai' ? 'native-audio' : 'azure-standard';
  const rates = PRICING_TABLE[modelTier][voiceType];

  const inputTextCost = (totals.inputTextTokens / 1_000_000) * rates.inputText;
  const cachedTextCost = (totals.cachedTextTokens / 1_000_000) * rates.cachedText;
  const outputTextCost = (totals.outputTextTokens / 1_000_000) * rates.outputText;
  const inputAudioCost = (totals.inputAudioTokens / 1_000_000) * rates.inputAudio;
  const cachedAudioCost = (totals.cachedAudioTokens / 1_000_000) * rates.cachedAudio;
  const outputAudioCost = (totals.outputAudioTokens / 1_000_000) * rates.outputAudio;

  return inputTextCost + cachedTextCost + outputTextCost + inputAudioCost + cachedAudioCost + outputAudioCost;
}
