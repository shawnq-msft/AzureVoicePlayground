/**
 * Hook for WER (Word Error Rate) testing
 * Synthesizes text via TTS, transcribes via ASR, and calculates WER
 */

import { useState, useCallback, useRef } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { AzureSettings } from '../types/azure';
import { calculateWER, WERResult } from '../utils/werCalculation';
import { convertToWav16kHz } from '../utils/audioConversion';
import { buildPersonalVoiceSsml } from '../lib/personalVoice/personalVoiceClient';
import { createSpeechConfig } from '../utils/azureSpeechConfig';

export type WERTestState = 'idle' | 'synthesizing' | 'transcribing' | 'completed' | 'error';

export interface WERTestResult extends WERResult {
  synthesisTimeMs: number;
  transcriptionTimeMs: number;
  totalTimeMs: number;
  // isCJK and metricName are inherited from WERResult
}

interface UseWERTestReturn {
  state: WERTestState;
  result: WERTestResult | null;
  error: string;
  progress: number;
  runTest: (text: string, language?: string) => Promise<void>;
  reset: () => void;
}

/**
 * Hook for running WER tests - synthesizes audio and transcribes it
 */
export function useWERTest(settings: AzureSettings): UseWERTestReturn {
  const [state, setState] = useState<WERTestState>('idle');
  const [result, setResult] = useState<WERTestResult | null>(null);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const synthesizerRef = useRef<SpeechSDK.SpeechSynthesizer | null>(null);

  const runTest = useCallback(async (text: string, language: string = 'en-US') => {
    const startTime = Date.now();

    try {
      setState('synthesizing');
      setError('');
      setResult(null);
      setProgress(5);

      if (!text.trim()) {
        throw new Error('Please enter text to test');
      }

      // Step 1: Synthesize audio
      const audioData = await new Promise<ArrayBuffer>((resolve, reject) => {
        const speechConfig = createSpeechConfig(settings.apiKey, settings.region);

        const isPersonalVoice = settings.personalVoiceInfo?.isPersonalVoice &&
                                settings.personalVoiceInfo?.speakerProfileId;

        if (!isPersonalVoice) {
          speechConfig.speechSynthesisVoiceName = settings.selectedVoice;
        }

        speechConfig.speechSynthesisOutputFormat =
          SpeechSDK.SpeechSynthesisOutputFormat.Audio24Khz160KBitRateMonoMp3;

        // Use null audio config to get audio data without playback
        const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, null as any);
        synthesizerRef.current = synthesizer;

        const audioChunks: Uint8Array[] = [];

        synthesizer.synthesizing = (_s, e) => {
          if (e.result.audioData) {
            audioChunks.push(new Uint8Array(e.result.audioData));
          }
        };

        const onComplete = (result: SpeechSDK.SpeechSynthesisResult) => {
          if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
            // Combine all audio chunks
            const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const combined = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of audioChunks) {
              combined.set(chunk, offset);
              offset += chunk.length;
            }
            synthesizer.close();
            resolve(combined.buffer);
          } else {
            synthesizer.close();
            reject(new Error(result.errorDetails || 'Synthesis failed'));
          }
        };

        const onError = (err: string) => {
          synthesizer.close();
          reject(new Error(err));
        };

        // Use SSML for personal voice, plain text for regular voices
        if (isPersonalVoice) {
          const model = settings.personalVoiceInfo!.model || 'DragonLatestNeural';
          const ssml = buildPersonalVoiceSsml(
            text,
            settings.personalVoiceInfo!.speakerProfileId!,
            language,
            model
          );
          synthesizer.speakSsmlAsync(ssml, onComplete, onError);
        } else {
          synthesizer.speakTextAsync(text, onComplete, onError);
        }
      });

      const synthesisEndTime = Date.now();
      setProgress(30);
      setState('transcribing');

      // Step 2: Convert to WAV for ASR
      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });

      if (audioBlob.size > 25 * 1024 * 1024) {
        throw new Error('Audio file must be less than 25 MB');
      }

      setProgress(40);

      const wavBlob = await convertToWav16kHz(audioBlob);
      setProgress(50);

      // Step 3: Transcribe with Fast Transcription API
      const endpoint = `https://${settings.region}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2024-11-15`;

      const definition = {
        locales: [language]
      };

      const formData = new FormData();
      formData.append('audio', wavBlob, 'audio.wav');
      formData.append('definition', JSON.stringify(definition));

      setProgress(60);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': settings.apiKey,
        },
        body: formData
      });

      setProgress(75);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Transcription failed (${response.status}): ${errorText}`);
      }

      const transcriptionResult = await response.json();
      const transcriptionEndTime = Date.now();

      setProgress(85);

      // Extract transcribed text
      let transcribedText = '';
      if (transcriptionResult.combinedPhrases && transcriptionResult.combinedPhrases.length > 0) {
        transcribedText = transcriptionResult.combinedPhrases[0].text || '';
      } else if (transcriptionResult.combinedRecognizedPhrases && transcriptionResult.combinedRecognizedPhrases.length > 0) {
        transcribedText = transcriptionResult.combinedRecognizedPhrases[0].display || '';
      }

      setProgress(92);

      // Step 4: Calculate WER
      const werResult = calculateWER(text, transcribedText);

      const totalEndTime = Date.now();

      const fullResult: WERTestResult = {
        ...werResult,
        synthesisTimeMs: synthesisEndTime - startTime,
        transcriptionTimeMs: transcriptionEndTime - synthesisEndTime,
        totalTimeMs: totalEndTime - startTime
      };

      setResult(fullResult);
      setProgress(100);
      setState('completed');

    } catch (err: any) {
      console.error('WER test failed:', err);
      setError(err.message || 'WER test failed');
      setState('error');
      setProgress(0);
    }
  }, [settings]);

  const reset = useCallback(() => {
    setState('idle');
    setResult(null);
    setError('');
    setProgress(0);
    if (synthesizerRef.current) {
      try {
        synthesizerRef.current.close();
      } catch (e) {
        // Ignore
      }
      synthesizerRef.current = null;
    }
  }, []);

  return {
    state,
    result,
    error,
    progress,
    runTest,
    reset
  };
}
