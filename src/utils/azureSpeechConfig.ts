import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

/**
 * Determines if a region is a China region that requires .azure.cn domain
 */
export function isChinaRegion(region: string): boolean {
  const r = region.toLowerCase();
  return r.startsWith('china') || r === 'chinaeast2' || r === 'chinanorth2' || r === 'chinanorth3';
}

/**
 * Gets the TTS WebSocket endpoint for a given region
 */
export function getTTSEndpoint(region: string): string {
  const r = region.toLowerCase();
  if (isChinaRegion(r)) {
    return `wss://${r}.tts.speech.azure.cn/cognitiveservices/websocket/v1`;
  }
  return `wss://${r}.tts.speech.microsoft.com/cognitiveservices/websocket/v1`;
}

/**
 * Gets the TTS REST endpoint for a given region
 */
export function getTTSRestEndpoint(region: string): string {
  const r = region.toLowerCase();
  if (isChinaRegion(r)) {
    return `https://${r}.tts.speech.azure.cn/cognitiveservices/v1`;
  }
  return `https://${r}.tts.speech.microsoft.com/cognitiveservices/v1`;
}

/**
 * Gets the STT WebSocket endpoint for a given region
 */
export function getSTTEndpoint(region: string): string {
  const r = region.toLowerCase();
  if (isChinaRegion(r)) {
    return `wss://${r}.stt.speech.azure.cn/speech/recognition/conversation/cognitiveservices/v1`;
  }
  return `wss://${r}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`;
}

/**
 * Creates a SpeechConfig with the correct endpoint for the given region
 */
export function createSpeechConfig(apiKey: string, region: string): SpeechSDK.SpeechConfig {
  if (isChinaRegion(region)) {
    const endpoint = getTTSEndpoint(region);
    console.log('Using China endpoint:', endpoint);
    return SpeechSDK.SpeechConfig.fromEndpoint(new URL(endpoint), apiKey);
  }
  return SpeechSDK.SpeechConfig.fromSubscription(apiKey, region);
}

/**
 * Creates a SpeechConfig for STT with the correct endpoint for the given region
 */
export function createSTTSpeechConfig(apiKey: string, region: string): SpeechSDK.SpeechConfig {
  if (isChinaRegion(region)) {
    const endpoint = getSTTEndpoint(region);
    console.log('Using China STT endpoint:', endpoint);
    return SpeechSDK.SpeechConfig.fromEndpoint(new URL(endpoint), apiKey);
  }
  return SpeechSDK.SpeechConfig.fromSubscription(apiKey, region);
}
