import { useRef, useEffect, useMemo, useCallback } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { AzureSettings } from '../types/azure';
import { SynthesizerPool, PoolConfigKey, PoolEntry } from '../lib/tts/synthesizerPool';

function deriveConfigKey(settings: AzureSettings): PoolConfigKey | null {
  if (!settings.apiKey || !settings.region) return null;

  const isPersonalVoice =
    settings.personalVoiceInfo?.isPersonalVoice &&
    settings.personalVoiceInfo?.speakerProfileId;

  return {
    apiKey: settings.apiKey,
    region: settings.region,
    voiceName: isPersonalVoice ? null : (settings.selectedVoice || null),
    outputFormat: SpeechSDK.SpeechSynthesisOutputFormat.Audio24Khz160KBitRateMonoMp3,
  };
}

export function useSynthesizerPool(settings: AzureSettings) {
  const poolRef = useRef<SynthesizerPool | null>(null);

  // Lazily create the pool instance and immediately configure it
  if (!poolRef.current) {
    const pool = new SynthesizerPool({ poolSize: 2 });
    const configKey = deriveConfigKey(settings);
    if (configKey) {
      pool.configure(configKey);
    }
    poolRef.current = pool;
  }

  // Derive the config key from current settings (for change detection)
  const configKey = useMemo(
    () => deriveConfigKey(settings),
    [
      settings.apiKey,
      settings.region,
      settings.selectedVoice,
      settings.personalVoiceInfo?.isPersonalVoice,
      settings.personalVoiceInfo?.speakerProfileId,
    ]
  );

  // Reconfigure pool when config key changes
  useEffect(() => {
    if (configKey && poolRef.current) {
      poolRef.current.configure(configKey);
    }
  }, [configKey]);

  // Cleanup on unmount — only dispose, don't null the ref
  // (React strict mode will remount and the lazy init recreates)
  useEffect(() => {
    return () => {
      if (poolRef.current) {
        poolRef.current.dispose();
        poolRef.current = null;
      }
    };
  }, []);

  const acquireAsync = useCallback((timeoutMs?: number): Promise<PoolEntry | null> => {
    return poolRef.current?.acquireAsync(timeoutMs) ?? Promise.resolve(null);
  }, []);

  return { acquireAsync };
}
