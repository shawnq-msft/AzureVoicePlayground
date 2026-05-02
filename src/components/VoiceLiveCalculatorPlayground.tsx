import { useEffect, useMemo, useState } from "react";
import { PageDocsLink } from "./PageDocsLink";

type Tier = "Pro" | "Standard" | "Lite" | "BYO";
type AudioType = "standard" | "custom" | "native";
type OutputType = AudioType;
type ServiceMode = "managed" | "byo-standard" | "byo-custom";
type AvatarType = "none" | "interactive";

type Model = {
  id: string;
  name: string;
  tier: Exclude<Tier, "BYO">;
  nativeAudioInput: boolean;
  nativeAudioOutput: boolean;
};

type RateSet = {
  text?: { input: number; cachedInput: number; output: number };
  audioStandard?: { input: number; cachedInput?: number; output: number };
  audioCustom?: { input: number | null; cachedInput?: number; output: number | null };
  nativeAudio?: { input: number | null; cachedInput?: number; output: number | null };
};

type Config = {
  dailyActiveUsers: number;
  averageTurnsPerUser: number;
  averageInputAudioSeconds: number;
  averageOutputAudioSeconds: number;
  averageInputTextTokens: number;
  textInputCacheRate: number;
  audioInputCacheRate: number;
  serviceMode: ServiceMode;
  selectedModel: string;
  audioInputType: AudioType;
  audioOutputType: OutputType;
  avatarType: AvatarType;
};

type Scenario = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  config: Partial<Config>;
};

type ScenarioVisual = "flow" | "signal" | "matrix" | "pulse";

function abstractScenarioPattern(visual: ScenarioVisual) {
  switch (visual) {
    case "flow":
      return `
        <path d="M298 42C424 26 518 74 566 184" fill="none" stroke="url(#line)" stroke-width="34" stroke-linecap="round" opacity="0.36"/>
        <path d="M330 92C414 86 486 128 526 218" fill="none" stroke="white" stroke-width="12" stroke-linecap="round" opacity="0.26"/>
        <circle cx="448" cy="126" r="76" fill="url(#soft)" opacity="0.64"/>
        <circle cx="510" cy="226" r="34" fill="white" opacity="0.18"/>
      `;
    case "signal":
      return `
        <path d="M292 236C354 86 450 50 564 84" fill="none" stroke="url(#line)" stroke-width="30" stroke-linecap="round" opacity="0.36"/>
        <path d="M322 252C386 154 462 126 548 146" fill="none" stroke="white" stroke-width="12" stroke-linecap="round" opacity="0.24"/>
        <circle cx="404" cy="140" r="52" fill="white" opacity="0.14"/>
        <circle cx="506" cy="100" r="86" fill="url(#soft)" opacity="0.72"/>
      `;
    case "matrix":
      return `
        <g opacity="0.34">
          <circle cx="348" cy="94" r="10" fill="white"/><circle cx="410" cy="76" r="14" fill="white"/><circle cx="474" cy="106" r="9" fill="white"/><circle cx="526" cy="164" r="13" fill="white"/>
          <circle cx="370" cy="178" r="12" fill="white"/><circle cx="444" cy="196" r="18" fill="white"/><circle cx="514" cy="246" r="10" fill="white"/>
          <path d="M348 94L410 76L474 106L526 164L444 196L370 178L348 94M444 196L514 246M474 106L444 196" fill="none" stroke="white" stroke-width="5" stroke-linecap="round"/>
        </g>
        <circle cx="462" cy="162" r="112" fill="url(#soft)" opacity="0.58"/>
      `;
    case "pulse":
      return `
        <path d="M294 176c34 0 34-70 68-70s34 132 68 132 34-102 68-102 34 40 68 40" fill="none" stroke="url(#line)" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" opacity="0.38"/>
        <path d="M316 178c28 0 28-42 56-42s28 74 56 74 28-58 56-58 28 24 56 24" fill="none" stroke="white" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity="0.24"/>
        <circle cx="512" cy="104" r="82" fill="url(#soft)" opacity="0.68"/>
        <circle cx="382" cy="238" r="42" fill="white" opacity="0.12"/>
      `;
  }
}

function createScenarioImage(visual: ScenarioVisual, startColor: string, endColor: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 320">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${startColor}"/>
          <stop offset="1" stop-color="${endColor}"/>
        </linearGradient>
        <linearGradient id="line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="white" stop-opacity="0.92"/>
          <stop offset="1" stop-color="white" stop-opacity="0.2"/>
        </linearGradient>
        <radialGradient id="soft" cx="50%" cy="50%" r="55%">
          <stop offset="0" stop-color="white" stop-opacity="0.54"/>
          <stop offset="1" stop-color="white" stop-opacity="0"/>
        </radialGradient>
        <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="20"/>
        </filter>
      </defs>
      <rect width="600" height="320" rx="36" fill="url(#bg)"/>
      <circle cx="96" cy="82" r="86" fill="white" opacity="0.08" filter="url(#blur)"/>
      <circle cx="528" cy="246" r="118" fill="white" opacity="0.11" filter="url(#blur)"/>
      <path d="M34 286C142 198 236 206 326 144c72-50 132-66 236-36" fill="none" stroke="white" stroke-width="18" opacity="0.12" stroke-linecap="round"/>
      <path d="M300 42H572V286H300Z" fill="white" opacity="0.025"/>
      ${abstractScenarioPattern(visual)}
    </svg>
  `;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const PRICING_SOURCE = {
  currency: "USD",
  effectiveDate: "July 1, 2025",
  pricingUrl: "https://azure.microsoft.com/en-us/pricing/details/speech/",
  docsUrl: "https://learn.microsoft.com/en-us/azure/ai-services/speech-service/voice-live#pricing",
  regionsUrl: "https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions?tabs=voice-live#regions",
};

const COMPETITOR_PRICING_SOURCE = {
  openAiUrl: "https://openai.com/api/pricing/",
};

const OPENAI_GPT_REALTIME_RATES = {
  model: "GPT-realtime-1.5",
  text: { input: 4, cachedInput: 0.4 },
  audio: { input: 32, cachedInput: 0.4, output: 64 },
};

const SUPPORTED_REGIONS = [
  "australiaeast",
  "brazilsouth",
  "canadacentral",
  "canadaeast",
  "centralindia",
  "centralus",
  "eastus",
  "eastus2",
  "francecentral",
  "germanywestcentral",
  "italynorth",
  "japaneast",
  "japanwest",
  "koreacentral",
  "northcentralus",
  "norwayeast",
  "southafricanorth",
  "southcentralus",
  "southeastasia",
  "swedencentral",
  "switzerlandnorth",
  "uaenorth",
  "uksouth",
  "westcentralus",
  "westeurope",
  "westus",
  "westus2",
  "westus3",
];

const MODELS: Model[] = [
  { id: "gpt-realtime", name: "GPT-Realtime", tier: "Pro", nativeAudioInput: true, nativeAudioOutput: true },
  { id: "gpt-4o", name: "GPT-4o", tier: "Pro", nativeAudioInput: false, nativeAudioOutput: false },
  { id: "gpt-4.1", name: "GPT-4.1", tier: "Pro", nativeAudioInput: false, nativeAudioOutput: false },
  { id: "gpt-5.4", name: "GPT-5.4", tier: "Pro", nativeAudioInput: false, nativeAudioOutput: false },
  { id: "gpt-5.3-chat", name: "GPT-5.3 Chat", tier: "Pro", nativeAudioInput: false, nativeAudioOutput: false },
  { id: "gpt-5.2", name: "GPT-5.2", tier: "Pro", nativeAudioInput: false, nativeAudioOutput: false },
  { id: "gpt-5.2-chat", name: "GPT-5.2 Chat", tier: "Pro", nativeAudioInput: false, nativeAudioOutput: false },
  { id: "gpt-5.1", name: "GPT-5.1", tier: "Pro", nativeAudioInput: false, nativeAudioOutput: false },
  { id: "gpt-5.1-chat", name: "GPT-5.1 Chat", tier: "Pro", nativeAudioInput: false, nativeAudioOutput: false },
  { id: "gpt-5", name: "GPT-5", tier: "Pro", nativeAudioInput: false, nativeAudioOutput: false },
  { id: "gpt-5-chat", name: "GPT-5 Chat", tier: "Pro", nativeAudioInput: false, nativeAudioOutput: false },
  { id: "gpt-realtime-mini", name: "GPT-Realtime Mini", tier: "Standard", nativeAudioInput: true, nativeAudioOutput: true },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", tier: "Standard", nativeAudioInput: false, nativeAudioOutput: false },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", tier: "Standard", nativeAudioInput: false, nativeAudioOutput: false },
  { id: "gpt-5-mini", name: "GPT-5 Mini", tier: "Standard", nativeAudioInput: false, nativeAudioOutput: false },
  { id: "gpt-5-nano", name: "GPT-5 Nano", tier: "Lite", nativeAudioInput: false, nativeAudioOutput: false },
  { id: "gpt-4.1-nano", name: "GPT-4.1 Nano", tier: "Lite", nativeAudioInput: false, nativeAudioOutput: false },
  { id: "phi4-mm-realtime", name: "Phi-4 Multimodal Realtime", tier: "Lite", nativeAudioInput: true, nativeAudioOutput: false },
  { id: "phi4-mini", name: "Phi-4 Mini", tier: "Lite", nativeAudioInput: false, nativeAudioOutput: false },
];

const LEGACY_MODEL_MAP: Record<string, string> = {
  "gpt-4o-realtime-preview": "gpt-realtime",
  "gpt-4o-mini-realtime-preview": "gpt-realtime-mini",
};

const LEGACY_NUMBER_QUERY_MAP: { queryKey: string; configKey: keyof Config }[] = [
  { queryKey: "dau", configKey: "dailyActiveUsers" },
  { queryKey: "turns", configKey: "averageTurnsPerUser" },
  { queryKey: "inputAudio", configKey: "averageInputAudioSeconds" },
  { queryKey: "outputAudio", configKey: "averageOutputAudioSeconds" },
  { queryKey: "inputText", configKey: "averageInputTextTokens" },
  { queryKey: "textCache", configKey: "textInputCacheRate" },
  { queryKey: "audioCache", configKey: "audioInputCacheRate" },
];

const PRICE_TABLE: Record<Tier, RateSet> = {
  Pro: {
    text: { input: 4.4, cachedInput: 1.375, output: 17.6 },
    audioStandard: { input: 17, cachedInput: 0.44, output: 38 },
    audioCustom: { input: 40, cachedInput: 0.44, output: 55 },
    nativeAudio: { input: 35.2, cachedInput: 0.44, output: 70.4 },
  },
  Standard: {
    text: { input: 0.66, cachedInput: 0.33, output: 2.64 },
    audioStandard: { input: 15, cachedInput: 0.33, output: 33 },
    audioCustom: { input: 39, cachedInput: 0.33, output: 50 },
    nativeAudio: { input: 11, cachedInput: 0.33, output: 22 },
  },
  Lite: {
    text: { input: 0.11, cachedInput: 0.04, output: 0.44 },
    audioStandard: { input: 15, cachedInput: 0.04, output: 33 },
    audioCustom: { input: null, cachedInput: 0.04, output: 50 },
    nativeAudio: { input: 4, cachedInput: 0.04, output: null },
  },
  BYO: {
    audioStandard: { input: 12.5, output: 30 },
    audioCustom: { input: 36, output: 47 },
  },
};

const OLD_RATES: Partial<Record<Tier, RateSet>> = {
  Pro: {
    text: { input: 5.5, cachedInput: 2.75, output: 22 },
    audioStandard: { input: 20, cachedInput: 2.75, output: 40 },
    audioCustom: { input: 45, cachedInput: 2.75, output: 60 },
    nativeAudio: { input: 55, cachedInput: 2.75, output: 110 },
  },
  Standard: {
    text: { input: 0.8, cachedInput: 0.4, output: 3.2 },
    audioStandard: { input: 18, cachedInput: 0.4, output: 36 },
    audioCustom: { input: 42, cachedInput: 0.4, output: 55 },
    nativeAudio: { input: 14, cachedInput: 0.4, output: 28 },
  },
  Lite: {
    text: { input: 0.15, cachedInput: 0.075, output: 0.6 },
    audioStandard: { input: 18, cachedInput: 0.075, output: 36 },
    nativeAudio: { input: 5, cachedInput: 0.075, output: 10 },
  },
};

const SCENARIOS: Scenario[] = [
  {
    id: "customer-service-agent",
    name: "Customer Service Agent",
    description: "Triage requests and guide resolution.",
    imageUrl: createScenarioImage("flow", "#246bfe", "#28c6ff"),
    config: { dailyActiveUsers: 2500, averageTurnsPerUser: 8, averageInputAudioSeconds: 12, averageOutputAudioSeconds: 18, averageInputTextTokens: 2800, selectedModel: "gpt-realtime-mini", audioInputType: "standard", audioOutputType: "standard", textInputCacheRate: 45, audioInputCacheRate: 6 },
  },
  {
    id: "in-car-assistant",
    name: "In-Car Assistant",
    description: "Handle voice commands and navigation.",
    imageUrl: createScenarioImage("signal", "#14a7a0", "#8be05d"),
    config: { dailyActiveUsers: 1_000_000, averageTurnsPerUser: 3, averageInputAudioSeconds: 4, averageOutputAudioSeconds: 5, averageInputTextTokens: 650, selectedModel: "gpt-5-nano", audioInputType: "standard", audioOutputType: "standard", textInputCacheRate: 20, audioInputCacheRate: 2 },
  },
  {
    id: "talent-interview-agent",
    name: "Talent Interview Agent",
    description: "Run structured prompts and follow-ups.",
    imageUrl: createScenarioImage("matrix", "#7657ff", "#ff7ab6"),
    config: { dailyActiveUsers: 200, averageTurnsPerUser: 18, averageInputAudioSeconds: 28, averageOutputAudioSeconds: 24, averageInputTextTokens: 5600, selectedModel: "gpt-realtime", audioInputType: "native", audioOutputType: "native", textInputCacheRate: 55, audioInputCacheRate: 12 },
  },
  {
    id: "learning-agent",
    name: "Learning Agent",
    description: "Guide lessons, practice, and explanations.",
    imageUrl: createScenarioImage("pulse", "#f5a524", "#ff6b4a"),
    config: { dailyActiveUsers: 1500, averageTurnsPerUser: 12, averageInputAudioSeconds: 18, averageOutputAudioSeconds: 30, averageInputTextTokens: 4200, selectedModel: "gpt-4o-mini", audioInputType: "standard", audioOutputType: "standard", textInputCacheRate: 50, audioInputCacheRate: 5 },
  },
];

const DEFAULT_CONFIG: Config = {
  dailyActiveUsers: 1000,
  averageTurnsPerUser: 5,
  averageInputAudioSeconds: 10,
  averageOutputAudioSeconds: 15,
  averageInputTextTokens: 2000,
  textInputCacheRate: 50,
  audioInputCacheRate: 5,
  serviceMode: "managed",
  selectedModel: "gpt-realtime-mini",
  audioInputType: "native",
  audioOutputType: "standard",
  avatarType: "none",
};

const CUSTOM_SPEECH_HOSTING_PER_HOUR = 1.40;
const CUSTOM_VOICE_HOSTING_PER_HOUR = 4.04;

function getInitialConfig(): Config {
  const params = new URLSearchParams(window.location.search);
  const next = { ...DEFAULT_CONFIG };

  for (const { queryKey, configKey } of LEGACY_NUMBER_QUERY_MAP) {
    const value = params.get(queryKey);
    if (value != null) next[configKey] = Number(value) as never;
  }

  const legacyModelParam = params.get("model");
  if (legacyModelParam) next.selectedModel = LEGACY_MODEL_MAP[legacyModelParam] ?? legacyModelParam;

  const legacyAvatar = params.get("avatar");
  if (legacyAvatar) next.avatarType = legacyAvatar === "none" ? "none" : "interactive";

  const legacyTts = params.get("tts");
  if (legacyTts) {
    if (legacyTts.includes("custom")) next.audioOutputType = "custom";
    else if (legacyTts.includes("openai") || legacyTts.includes("realtime") || legacyTts.includes("native")) next.audioOutputType = "native";
    else next.audioOutputType = "standard";
  }

  for (const key of Object.keys(next) as (keyof Config)[]) {
    const value = params.get(key);
    if (value == null) continue;
    if (typeof next[key] === "number") {
      next[key] = Number(value) as never;
    } else {
      next[key] = value as never;
    }
  }

  const legacyModel = LEGACY_MODEL_MAP[next.selectedModel];
  if (legacyModel) next.selectedModel = legacyModel;
  if (!MODELS.some((model) => model.id === next.selectedModel)) next.selectedModel = DEFAULT_CONFIG.selectedModel;
  return constrainConfig(next);
}

function constrainConfig(config: Config): Config {
  const model = getModel(config.selectedModel);
  return {
    ...config,
    dailyActiveUsers: clamp(config.dailyActiveUsers, 1, Number.MAX_SAFE_INTEGER),
    averageTurnsPerUser: clamp(config.averageTurnsPerUser, 1, Number.MAX_SAFE_INTEGER),
    averageInputAudioSeconds: clamp(config.averageInputAudioSeconds, 0, Number.MAX_SAFE_INTEGER),
    averageOutputAudioSeconds: clamp(config.averageOutputAudioSeconds, 0, Number.MAX_SAFE_INTEGER),
    averageInputTextTokens: clamp(config.averageInputTextTokens, 0, Number.MAX_SAFE_INTEGER),
    textInputCacheRate: clamp(config.textInputCacheRate, 0, 100),
    audioInputCacheRate: clamp(config.audioInputCacheRate, 0, 100),
    audioInputType: !model.nativeAudioInput && config.audioInputType === "native" ? "standard" : config.audioInputType,
    audioOutputType: !model.nativeAudioOutput && config.audioOutputType === "native" ? "standard" : config.audioOutputType,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function getModel(id: string): Model {
  return MODELS.find((model) => model.id === id) ?? MODELS[0];
}

function tokensPerSecond(audioType: AudioType, direction: "input" | "output"): number {
  if (direction === "input" && audioType === "native") return 20;
  if (direction === "output" && audioType === "native") return 40;
  return direction === "input" ? 10 : 20;
}

function toPerToken(pricePerMillion: number): number {
  return pricePerMillion / 1_000_000;
}

function calculate(config: Config) {
  const model = getModel(config.selectedModel);
  const turnsPerDay = config.dailyActiveUsers * config.averageTurnsPerUser;
  const inputAudioTokens = config.averageInputAudioSeconds * tokensPerSecond(config.audioInputType, "input");
  const outputAudioTokens = config.averageOutputAudioSeconds * tokensPerSecond(config.audioOutputType, "output");
  const textCachedTokens = config.averageInputTextTokens * (config.textInputCacheRate / 100);
  const textRegularTokens = config.averageInputTextTokens - textCachedTokens;
  const audioCachedTokens = inputAudioTokens * (config.audioInputCacheRate / 100);
  const audioRegularTokens = inputAudioTokens - audioCachedTokens;
  const errors: string[] = [];
  let tier: Tier = model.tier;
  let textCostPerTurn = 0;
  let audioInputCostPerTurn = 0;
  let audioOutputCostPerTurn = 0;

  if (config.serviceMode === "managed") {
    const rateSet = PRICE_TABLE[tier];
    const text = rateSet.text!;
    textCostPerTurn = textRegularTokens * toPerToken(text.input) + textCachedTokens * toPerToken(text.cachedInput);

    const inputCategory = config.audioInputType === "native" ? "nativeAudio" : config.audioInputType === "custom" ? "audioCustom" : "audioStandard";
    const outputCategory = config.audioOutputType === "native" ? "nativeAudio" : config.audioOutputType === "custom" ? "audioCustom" : "audioStandard";
    const inputRates = rateSet[inputCategory];
    const outputRates = rateSet[outputCategory];
    const inputPrice = inputRates?.input;
    const cachedInputPrice = inputRates?.cachedInput;
    const outputPrice = outputRates?.output;

    if (inputPrice == null) errors.push(`${labelForAudio(config.audioInputType)} input pricing is not listed for ${tier}.`);
    else audioInputCostPerTurn += audioRegularTokens * toPerToken(inputPrice);

    if (audioCachedTokens > 0) {
      if (cachedInputPrice == null) errors.push(`${labelForAudio(config.audioInputType)} cached input pricing is not listed for ${tier}.`);
      else audioInputCostPerTurn += audioCachedTokens * toPerToken(cachedInputPrice);
    }

    if (outputPrice == null) errors.push(`${labelForAudio(config.audioOutputType)} output pricing is not listed for ${tier}.`);
    else audioOutputCostPerTurn = outputAudioTokens * toPerToken(outputPrice);
  } else {
    tier = "BYO";
    const category = config.serviceMode === "byo-custom" ? "audioCustom" : "audioStandard";
    const rates = PRICE_TABLE.BYO[category]!;
    audioInputCostPerTurn = inputAudioTokens * toPerToken(rates.input ?? 0);
    audioOutputCostPerTurn = outputAudioTokens * toPerToken(rates.output ?? 0);
  }

  const usageCostPerTurn = textCostPerTurn + audioInputCostPerTurn + audioOutputCostPerTurn;
  const usageCostPerDay = usageCostPerTurn * turnsPerDay;
  const customSpeechHostingPerDay = config.serviceMode === "managed" && config.audioInputType === "custom" ? CUSTOM_SPEECH_HOSTING_PER_HOUR * 24 : 0;
  const customVoiceHostingPerDay = config.serviceMode === "managed" && config.audioOutputType === "custom" ? CUSTOM_VOICE_HOSTING_PER_HOUR * 24 : 0;
  const hostingPerDay = customSpeechHostingPerDay + customVoiceHostingPerDay;
  const totalPerDay = usageCostPerDay + hostingPerDay;

  return {
    model,
    tier,
    turnsPerDay,
    inputAudioTokens,
    outputAudioTokens,
    textCostPerTurn,
    audioInputCostPerTurn,
    audioOutputCostPerTurn,
    usageCostPerTurn,
    usageCostPerDay,
    hostingPerDay,
    totalPerDay,
    totalPerMonth: totalPerDay * 30,
    totalPerYear: totalPerDay * 365,
    errors,
  };
}

function labelForAudio(type: AudioType): string {
  return {
    standard: "Audio - Standard",
    custom: "Audio - Custom",
    native: "Native audio",
  }[type];
}

function audioCategoryFor(type: AudioType): keyof RateSet {
  if (type === "native") return "nativeAudio";
  if (type === "custom") return "audioCustom";
  return "audioStandard";
}

function nativeCapabilityLabel(model: Model): string {
  if (model.nativeAudioInput && model.nativeAudioOutput) return "Native input + output";
  if (model.nativeAudioInput) return "Native input only";
  if (model.nativeAudioOutput) return "Native output only";
  return "Text + audio";
}

function formatCurrency(value: number, digits = 2): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: digits }).format(value);
}

function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

function formatPrice(price: number | null | undefined): string {
  if (price == null) return "Not listed";
  return formatCurrency(price, price % 1 ? 3 : 2);
}

function isReduced(tier: Tier, category: keyof RateSet, key: string, price: number | null | undefined): boolean {
  const oldPrice = getOldPrice(tier, category, key);
  return typeof oldPrice === "number" && typeof price === "number" && price < oldPrice;
}

function getOldPrice(tier: Tier, category: keyof RateSet, key: string): number | undefined {
  const oldCategory = OLD_RATES[tier]?.[category] as Partial<Record<string, number | null>> | undefined;
  const oldPrice = oldCategory?.[key];
  return typeof oldPrice === "number" ? oldPrice : undefined;
}

function rateRows(tier: Tier): { label: string; category: keyof RateSet; values: (number | null | undefined)[] }[] {
  const rates = PRICE_TABLE[tier];
  if (tier === "BYO") {
    return [
      { label: "Audio - Standard", category: "audioStandard", values: [rates.audioStandard?.input, undefined, rates.audioStandard?.output] },
      { label: "Audio - Custom", category: "audioCustom", values: [rates.audioCustom?.input, undefined, rates.audioCustom?.output] },
    ];
  }
  return [
    { label: "Text", category: "text", values: [rates.text?.input, rates.text?.cachedInput, rates.text?.output] },
    { label: "Audio - Standard", category: "audioStandard", values: [rates.audioStandard?.input, rates.audioStandard?.cachedInput, rates.audioStandard?.output] },
    { label: "Audio - Custom", category: "audioCustom", values: [rates.audioCustom?.input, rates.audioCustom?.cachedInput, rates.audioCustom?.output] },
    { label: "Native audio", category: "nativeAudio", values: [rates.nativeAudio?.input, rates.nativeAudio?.cachedInput, rates.nativeAudio?.output] },
  ];
}

function comparisonRows(config: Config, estimate: ReturnType<typeof calculate>) {
  const textCachedTokens = config.averageInputTextTokens * (config.textInputCacheRate / 100);
  const textRegularTokens = config.averageInputTextTokens - textCachedTokens;
  const audioCachedTokens = estimate.inputAudioTokens * (config.audioInputCacheRate / 100);
  const audioRegularTokens = estimate.inputAudioTokens - audioCachedTokens;

  const azurePerTurn = estimate.errors.length ? null : estimate.usageCostPerTurn;
  const openAiPerTurn =
    textRegularTokens * toPerToken(OPENAI_GPT_REALTIME_RATES.text.input) +
    textCachedTokens * toPerToken(OPENAI_GPT_REALTIME_RATES.text.cachedInput) +
    audioRegularTokens * toPerToken(OPENAI_GPT_REALTIME_RATES.audio.input) +
    audioCachedTokens * toPerToken(OPENAI_GPT_REALTIME_RATES.audio.cachedInput) +
    estimate.outputAudioTokens * toPerToken(OPENAI_GPT_REALTIME_RATES.audio.output);

  return [
    {
      provider: "Azure Voice Live",
      model: config.serviceMode === "managed" ? estimate.model.name : "BYO audio",
      basis: "Current selected Voice Live configuration",
      sourceUrl: PRICING_SOURCE.pricingUrl,
      perTurn: azurePerTurn,
      turnsPerDay: estimate.turnsPerDay,
    },
    {
      provider: "OpenAI",
      model: OPENAI_GPT_REALTIME_RATES.model,
      basis: "Text + audio token rates, using this calculator's token approximation",
      sourceUrl: COMPETITOR_PRICING_SOURCE.openAiUrl,
      perTurn: openAiPerTurn,
      turnsPerDay: estimate.turnsPerDay,
    },
  ];
}

export function VoiceLiveCalculatorPlayground() {
  const [config, setConfig] = useState<Config>(() => getInitialConfig());
  const estimate = useMemo(() => calculate(config), [config]);

  useEffect(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(config)) params.set(key, String(value));
    const hash = window.location.hash || "#voice-live-calculator";
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}${hash}`);
  }, [config]);

  function update<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig((current) => constrainConfig({ ...current, [key]: value }));
  }

  function updateNumber(key: keyof Config, value: string) {
    update(key, Number(value) as never);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
  }

  const selectedModel = getModel(config.selectedModel);

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <div className="theme-page-header">
        <div className="theme-page-header__inner">
          <div>
            <h1 className="theme-page-title">Voice Live Calculator</h1>
            <p className="theme-page-subtitle">
              Estimate real-time voice conversation costs across managed, BYO, custom, native audio, and cache reuse scenarios.
            </p>
          </div>
          <div className="theme-page-header__actions">
            <PageDocsLink href={PRICING_SOURCE.docsUrl} />
            <button type="button" onClick={copyLink} className="theme-docs-link">
              Share
            </button>
          </div>
        </div>
      </div>

      <div className="voice-live-calculator flex-1 overflow-y-auto px-4 pb-6 sm:px-7">
        <div className="mx-auto grid w-full max-w-[1440px] gap-4 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">

      <section className="grid min-w-0 gap-3 p-4 xl:col-start-1 xl:row-start-1" aria-label="Quick Start Scenarios">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Quick Start Scenarios</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Select a predefined scenario to populate the form with typical usage patterns.</p>
        </div>
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              onClick={() => setConfig((current) => constrainConfig({ ...current, ...scenario.config }))}
              className="scenario-card group relative grid min-h-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-blue-500 hover:bg-white hover:shadow-lg"
            >
              <img
                src={scenario.imageUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover opacity-[0.42] transition duration-300 group-hover:scale-105 group-hover:opacity-[0.56]"
              />
              <span className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/72 to-white/10 dark:from-slate-950/94 dark:via-slate-950/70 dark:to-slate-950/12" />
              <span className="relative grid h-full grid-rows-[2rem_1fr] gap-1">
                <strong className="block max-w-[12rem] text-sm font-bold leading-5 text-slate-950">{scenario.name}</strong>
                <span className="block max-w-[12rem] text-xs leading-5 text-slate-500">{scenario.description}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

          <aside className="theme-side-panel p-4 xl:sticky xl:top-0 xl:col-start-2 xl:row-span-4 xl:row-start-1">
            <form className="grid gap-3.5" onSubmit={(event) => event.preventDefault()}>
              <div>
                <h2 className="text-lg font-bold text-slate-950">Usage Parameters</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Tune the workload assumptions used to calculate Voice Live API usage.</p>
              </div>

              <div className="grid gap-2.5">
                <NumberField label="Daily Active Users (DAU)" helper="Number of users using the service per day." value={config.dailyActiveUsers} min={1} step={1} onChange={(value) => updateNumber("dailyActiveUsers", value)} />
                <NumberField label="Average Turns per User" helper="Average conversation turns per user per day." value={config.averageTurnsPerUser} min={1} step={1} onChange={(value) => updateNumber("averageTurnsPerUser", value)} />
                <NumberField label="Average Input Audio (seconds)" helper="Average length of user speech per turn." value={config.averageInputAudioSeconds} min={0} step={0.5} onChange={(value) => updateNumber("averageInputAudioSeconds", value)} />
                <NumberField label="Average Output Audio (seconds)" helper="Average length of AI response per turn." value={config.averageOutputAudioSeconds} min={0} step={0.5} onChange={(value) => updateNumber("averageOutputAudioSeconds", value)} />
                <NumberField label="Average Input Text (tokens)" helper="Average text input, prompt, and context in tokens per turn." value={config.averageInputTextTokens} min={0} step={100} onChange={(value) => updateNumber("averageInputTextTokens", value)} />
                <NumberField label="Text Input Cache Rate (%)" helper="Percentage of text input that uses cached tokens." value={config.textInputCacheRate} min={0} max={100} step={1} onChange={(value) => updateNumber("textInputCacheRate", value)} />
                <NumberField label="Audio Input Cache Rate (%)" helper="Percentage of audio input that uses cached tokens." value={config.audioInputCacheRate} min={0} max={100} step={1} onChange={(value) => updateNumber("audioInputCacheRate", value)} />
              </div>

              <label className="field-label">
                Service mode
                <select className="form-control" value={config.serviceMode} onChange={(event) => update("serviceMode", event.target.value as ServiceMode)}>
                  <option value="managed">Managed Voice Live model</option>
                  <option value="byo-standard">BYO - Audio Standard</option>
                  <option value="byo-custom">BYO - Audio Custom</option>
                </select>
                <span className="text-xs font-normal leading-5 text-slate-500">Choose managed Voice Live pricing or BYO mode when the model layer is priced separately.</span>
              </label>

              {config.serviceMode === "managed" && (
                <>
                  <label className="field-label">
                    AI Model
                    <select className="form-control" value={config.selectedModel} onChange={(event) => update("selectedModel", event.target.value)}>
                      {(["Pro", "Standard", "Lite"] as const).map((tier) => (
                        <optgroup key={tier} label={`Voice Live ${tier}`}>
                          {MODELS.filter((model) => model.tier === tier).map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
                        </optgroup>
                      ))}
                    </select>
                    <span className="text-xs font-normal leading-5 text-slate-500">Select the AI model for cost calculation. Models are grouped by current Voice Live pricing tier.</span>
                  </label>

                  <label className="field-label">
                    Audio input
                    <select className="form-control" value={config.audioInputType} onChange={(event) => update("audioInputType", event.target.value as AudioType)}>
                      <option value="standard">Audio - Standard</option>
                      <option value="custom">Audio - Custom</option>
                      <option value="native" disabled={!selectedModel.nativeAudioInput}>Native audio</option>
                    </select>
                    <span className="text-xs font-normal leading-5 text-slate-500">Select standard speech, custom speech, or native audio input where the selected model supports it.</span>
                  </label>

                  <label className="field-label">
                    TTS Model Type
                    <select className="form-control" value={config.audioOutputType} onChange={(event) => update("audioOutputType", event.target.value as OutputType)}>
                      <option value="standard">Neural / HD Flash TTS</option>
                      <option value="custom">Custom Neural TTS</option>
                      <option value="native" disabled={!selectedModel.nativeAudioOutput}>OpenAI realtime audio</option>
                    </select>
                    <span className="text-xs font-normal leading-5 text-slate-500">Select TTS model type. Custom voice uses higher output token pricing; realtime audio is only available for supported realtime models.</span>
                  </label>
                </>
              )}

              <label className="field-label">
                Avatar Type
                <select className="form-control" value={config.avatarType} onChange={(event) => update("avatarType", event.target.value as AvatarType)}>
                  <option value="none">No avatar</option>
                  <option value="interactive">Interactive avatar (TTS Avatar pricing)</option>
                </select>
                <span className="text-xs font-normal leading-5 text-slate-500">Select avatar type for visual representation. Avatar usage and custom avatar hosting can add separate charges.</span>
              </label>
            </form>
          </aside>

      <section className="grid min-w-0 content-start gap-4 p-4 xl:col-start-1 xl:row-start-2" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-950">Estimate</h2>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">{PRICING_SOURCE.currency}</span>
          </div>

          <ModelSelectionSummary config={config} estimate={estimate} />

          {estimate.errors.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-medium leading-5 text-amber-900">
              {estimate.errors.map((error) => <p key={error}>{error}</p>)}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="Per turn" value={formatCurrency(estimate.usageCostPerTurn, 5)} helper="Usage only" />
            <Metric label="Per day" value={estimate.errors.length ? "N/A" : formatCurrency(estimate.totalPerDay)} helper={`${formatNumber(estimate.turnsPerDay)} turns`} />
            <Metric label="Per month" value={estimate.errors.length ? "N/A" : formatCurrency(estimate.totalPerMonth)} helper="30 day estimate" />
            <Metric label="Per year" value={estimate.errors.length ? "N/A" : formatCurrency(estimate.totalPerYear)} helper="365 day estimate" />
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <BreakdownRow label="Text input per turn" value={formatCurrency(estimate.textCostPerTurn, 5)} />
            <BreakdownRow label="Audio input per turn" value={formatCurrency(estimate.audioInputCostPerTurn, 5)} />
            <BreakdownRow label="Audio output per turn" value={formatCurrency(estimate.audioOutputCostPerTurn, 5)} />
            <BreakdownRow label="Usage per day" value={formatCurrency(estimate.usageCostPerDay)} />
            <BreakdownRow label="Custom hosting per day" value={formatCurrency(estimate.hostingPerDay)} />
          </div>

          <CompetitiveBenchmark rows={comparisonRows(config, estimate)} />

          {config.avatarType === "interactive" && (
            <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs font-medium leading-5 text-blue-900">Avatar output is charged separately through Text to Speech Avatar interactive avatar pricing.</p>
          )}
        </section>

            <div className="min-w-0 xl:col-start-1 xl:row-start-3">
              <FooterReference />
            </div>
        </div>
      </div>
    </div>
  );
}

function NumberField({ label, helper, value, min, max, step, onChange }: { label: string; helper: string; value: number; min: number; max?: number; step: number; onChange: (value: string) => void }) {
  return (
    <label className="field-label">
      {label}
      <input className="form-control" type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(event.target.value)} />
      <span className="text-xs font-normal leading-5 text-slate-500">{helper}</span>
    </label>
  );
}

function ModelSelectionSummary({ config, estimate }: { config: Config; estimate: ReturnType<typeof calculate> }) {
  const isManaged = config.serviceMode === "managed";
  const inputCategory = isManaged ? audioCategoryFor(config.audioInputType) : config.serviceMode === "byo-custom" ? "audioCustom" : "audioStandard";
  const outputCategory = isManaged ? audioCategoryFor(config.audioOutputType) : config.serviceMode === "byo-custom" ? "audioCustom" : "audioStandard";
  const rateSet = PRICE_TABLE[estimate.tier];
  const textRates = isManaged ? rateSet.text : undefined;
  const inputRates = rateSet[inputCategory];
  const outputRates = rateSet[outputCategory];
  const inputAudioType: AudioType = isManaged ? config.audioInputType : config.serviceMode === "byo-custom" ? "custom" : "standard";
  const outputAudioType: AudioType = isManaged ? config.audioOutputType : config.serviceMode === "byo-custom" ? "custom" : "standard";
  const modelName = isManaged ? estimate.model.name : "Bring Your Own Model";
  const serviceLabel = isManaged ? "Managed Voice Live model" : config.serviceMode === "byo-custom" ? "BYO - Audio Custom" : "BYO - Audio Standard";

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Model selection</p>
          <strong className="mt-1 block text-base text-slate-950">{modelName}</strong>
          <span className="text-xs leading-5 text-slate-500">Voice Live {estimate.tier} - {serviceLabel}</span>
        </div>
        <span className="chip">{isManaged ? nativeCapabilityLabel(estimate.model) : "Speech layer only"}</span>
      </div>

      <div className="mt-3 grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        <SelectionDetail label="Text pricing" value={textRates ? `${formatPrice(textRates.input)} input` : "Priced outside Voice Live"} helper={textRates ? `${formatPrice(textRates.cachedInput)} cached input / ${formatPrice(textRates.output)} output` : "BYO mode only includes speech layer pricing here."} />
        <SelectionDetail label="Audio input path" value={labelForAudio(inputAudioType)} helper={`${formatNumber(tokensPerSecond(inputAudioType, "input"))} tokens/sec - ${formatPrice(inputRates?.input)} regular${inputRates?.cachedInput != null ? ` / ${formatPrice(inputRates.cachedInput)} cached` : ""}`} />
        <SelectionDetail label="Audio output path" value={labelForAudio(outputAudioType)} helper={`${formatNumber(tokensPerSecond(outputAudioType, "output"))} tokens/sec - ${formatPrice(outputRates?.output)} output`} />
        <SelectionDetail label="Cache assumptions" value={`${formatNumber(config.textInputCacheRate)}% text / ${formatNumber(config.audioInputCacheRate)}% audio`} helper="Applied to input tokens before per-turn and monthly estimates." />
      </div>
    </section>
  );
}

function SelectionDetail({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="min-h-20 rounded-lg border border-slate-200 bg-white p-3">
      <span className="text-xs font-bold uppercase tracking-normal text-slate-500">{label}</span>
      <strong className="mt-1.5 block text-sm leading-5 text-slate-950">{value}</strong>
      <span className="mt-1 block text-xs leading-5 text-slate-500">{helper}</span>
    </div>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="min-h-24 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <strong className="mt-1.5 block text-xl leading-tight text-slate-950">{value}</strong>
      <small className="mt-1 block text-xs leading-5 text-slate-500">{helper}</small>
    </div>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-3.5 py-2.5 last:border-b-0">
      <span className="text-xs text-slate-600">{label}</span>
      <strong className="text-xs text-slate-950">{value}</strong>
    </div>
  );
}

function CompetitiveBenchmark({ rows }: { rows: ReturnType<typeof comparisonRows> }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-3.5 py-3">
        <h3 className="text-sm font-bold text-slate-800">Voice Live vs OpenAI GPT realtime</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">Uses the same turns, text input, audio seconds, and cache assumptions as the current estimate.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full border-collapse">
          <thead>
            <tr>
              <th className="table-cell bg-slate-50">Provider</th>
              <th className="table-cell bg-slate-50">Realtime model</th>
              <th className="table-cell bg-slate-50">Per turn</th>
              <th className="table-cell bg-slate-50">Per month</th>
              <th className="table-cell bg-slate-50">Pricing source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const monthly = row.perTurn == null ? null : row.perTurn * row.turnsPerDay * 30;
              return (
                <tr key={`${row.provider}-${row.model}`}>
                  <td className="table-cell font-semibold text-slate-950">{row.provider}</td>
                  <td className="table-cell">
                    <span className="block font-semibold text-slate-700">{row.model}</span>
                    <span className="mt-1 block text-xs text-slate-500">{row.basis}</span>
                  </td>
                  <td className="table-cell font-semibold text-slate-700">{row.perTurn == null ? "N/A" : formatCurrency(row.perTurn, 5)}</td>
                  <td className="table-cell font-semibold text-slate-700">{monthly == null ? "N/A" : formatCurrency(monthly)}</td>
                  <td className="table-cell"><a className="font-semibold text-blue-700 hover:underline" href={row.sourceUrl} target="_blank" rel="noreferrer">Official pricing</a></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="px-3.5 py-3 text-xs leading-5 text-slate-500">Comparison excludes enterprise discounts, free tiers, search/tool charges, and provider-specific tokenization differences.</p>
    </section>
  );
}

function VoiceLiveAdvantages({ items }: { items: string[] }) {
  return (
    <section className="rounded-lg border border-blue-200 bg-blue-50/70 p-4">
      <h3 className="font-bold text-blue-950">Voice Live value points for this scenario</h3>
      <ul className="mt-3 grid gap-2 text-sm text-blue-950 md:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-blue-700 ring-1 ring-blue-200">+</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FooterReference() {
  return (
    <footer className="mt-1 grid gap-2 border-t border-slate-300 pt-4 text-sm text-slate-500">
      <details className="group/regions border-t border-slate-200 py-3">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 italic text-slate-700 marker:hidden">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs font-bold not-italic text-slate-500 group-open/regions:hidden">+</span>
          <span className="hidden h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs font-bold not-italic text-slate-500 group-open/regions:inline-flex">-</span>
          <span>Microsoft may expand region deployment based on customer needs; check the</span>
          <a className="font-semibold not-italic text-blue-700 hover:underline" href={PRICING_SOURCE.regionsUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Azure Speech service regions for Voice Live document</a>
          <span>for the latest list.</span>
        </summary>
        <div className="mt-3 pl-7">
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_REGIONS.map((region) => <span className="chip" key={region}>{region}</span>)}
          </div>
        </div>
      </details>

      <details className="group/models border-t border-slate-200 py-3">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 italic text-slate-700 marker:hidden">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs font-bold not-italic text-slate-500 group-open/models:hidden">+</span>
          <span className="hidden h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs font-bold not-italic text-slate-500 group-open/models:inline-flex">-</span>
          <span>Model support may change as Voice Live evolves; check the</span>
          <a className="font-semibold not-italic text-blue-700 hover:underline" href={PRICING_SOURCE.docsUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Azure Voice Live models document</a>
          <span>for the latest list.</span>
        </summary>
        <div className="mt-4 grid gap-3 pl-7 lg:grid-cols-3">
          {(["Pro", "Standard", "Lite"] as const).map((tier) => (
            <div key={tier} className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
              <h3 className="font-bold text-slate-700">Voice Live {tier}</h3>
              <p className="mt-2 leading-6">{MODELS.filter((model) => model.tier === tier).map((model) => model.id).join(", ")}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50/70 p-3 font-medium text-blue-950">BYOM is required for gpt-5.4-mini and gpt-5.4-nano. Phi-4 Multimodal Realtime supports native audio input, but not native audio output.</p>
      </details>

      <details className="group/rates border-t border-slate-200 py-3">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 italic text-slate-700 marker:hidden">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs font-bold not-italic text-slate-500 group-open/rates:hidden">+</span>
          <span className="hidden h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs font-bold not-italic text-slate-500 group-open/rates:inline-flex">-</span>
          <span>Official pricing is the source of truth; check the</span>
          <a className="font-semibold not-italic text-blue-700 hover:underline" href={PRICING_SOURCE.pricingUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Azure Speech pricing page</a>
          <span>because calculator rates may lag.</span>
        </summary>
        <div className="pl-7">
          <p className="mt-2">After the May 1, 2026 price reduction, struck-through values show the previous public rates when available.</p>
          <section className="mt-4 grid gap-4 xl:grid-cols-2">
            {(["Pro", "Standard", "Lite", "BYO"] as const).map((tier) => (
              <div key={tier} className="overflow-hidden rounded-lg border border-slate-200 bg-white/70">
                <h3 className="border-b border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700">Voice Live {tier}</h3>
                <div>
                  <table className="w-full table-fixed border-collapse">
                    <colgroup>
                      <col className="w-[30%]" />
                      <col className="w-[23%]" />
                      <col className="w-[24%]" />
                      <col className="w-[23%]" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="price-table-cell bg-slate-50">Category</th>
                        <th className="price-table-cell bg-slate-50">Input</th>
                        <th className="price-table-cell bg-slate-50">Cached input</th>
                        <th className="price-table-cell bg-slate-50">Output</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rateRows(tier).map((row) => (
                        <tr key={row.label}>
                          <td className="price-table-cell font-semibold text-slate-950">{row.label}</td>
                          {row.values.map((price, index) => {
                            const keys = ["input", "cachedInput", "output"];
                            return <td className="price-table-cell" key={keys[index]}><PriceCell tier={tier} category={row.category} priceKey={keys[index]} price={price} /></td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>
        </div>
      </details>

      <p className="border-t border-slate-200 pt-3 italic">Prices are estimates and can vary by agreement and currency. Custom speech, custom voice, and custom avatar training or hosting can add separate charges.</p>
    </footer>
  );
}

function PriceCell({ tier, category, priceKey, price }: { tier: Tier; category: keyof RateSet; priceKey: string; price: number | null | undefined }) {
  if (price == null) return <span className="font-semibold text-amber-800">Not listed</span>;

  const oldPrice = getOldPrice(tier, category, priceKey);
  const reduced = isReduced(tier, category, priceKey, price);

  if (!reduced || oldPrice == null) return <span className="whitespace-nowrap font-semibold text-slate-700">{formatPrice(price)}</span>;

  return (
    <span className="grid gap-0.5">
      <span className="whitespace-nowrap text-slate-400 line-through decoration-slate-500">{formatPrice(oldPrice)}</span>
      <span className="whitespace-nowrap font-bold text-emerald-700">{formatPrice(price)}</span>
    </span>
  );
}
