import { useCallback, useEffect, useRef, useState } from 'react';
import { AzureKeyCredential } from '@azure/core-auth';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { AzureSettings } from '../types/azure';
import { createSTTSpeechConfig } from '../utils/azureSpeechConfig';

export type PronunciationAssessmentState = 'idle' | 'processing' | 'completed' | 'error';

export interface PronunciationAssessmentSession {
  pushAudio: (chunk: Uint8Array) => void;
  stop: () => Promise<PronunciationAssessmentResult | null>;
  cancel: () => void;
}

export interface StartStreamOptions {
  referenceText: string;
  language: string;
  enableProsodyAssessment: boolean;
  enableMiscue: boolean;
  sampleRate: number;
  /** Silence duration (ms) that ends a recognized segment. Maps to Speech_SegmentationSilenceTimeoutMs. */
  silenceTimeoutMs?: number;
}

export interface PronunciationWordScore {
  word: string;
  accuracyScore: number;
  errorType: string;
  phonemes: string[];
}

export interface PronunciationAssessmentScores {
  pronunciation: number;
  accuracy: number;
  fluency: number;
  completeness: number;
  prosody?: number;
}

export interface PronunciationAssessmentResult {
  referenceText: string;
  recognizedText: string;
  durationSeconds: number;
  scores: PronunciationAssessmentScores;
  words: PronunciationWordScore[];
  rawJson: string;
}

interface WordDetail {
  Word?: string;
  PronunciationAssessment?: {
    AccuracyScore?: number;
    ErrorType?: string;
  };
  Phonemes?: Array<{
    Phoneme?: string;
    PronunciationAssessment?: {
      NBestPhonemes?: Array<{ Phoneme?: string }>;
    };
  }>;
}

function normalizeScore(score: number | undefined): number {
  return Number.isFinite(score) ? Math.round(score as number) : 0;
}

function extractPhonemes(word: WordDetail): string[] {
  return (word.Phonemes ?? [])
    .map((phoneme) => phoneme.Phoneme ?? phoneme.PronunciationAssessment?.NBestPhonemes?.[0]?.Phoneme)
    .filter((phoneme): phoneme is string => Boolean(phoneme));
}

function createPronunciationSpeechConfig(settings: AzureSettings): SpeechSDK.SpeechConfig {
  const voiceLiveEndpoint = settings.voiceLiveEndpoint?.trim();
  const voiceLiveApiKey = settings.voiceLiveApiKey?.trim();

  if (voiceLiveEndpoint && voiceLiveApiKey) {
    return SpeechSDK.SpeechConfig.fromEndpoint(new URL(voiceLiveEndpoint), new AzureKeyCredential(voiceLiveApiKey));
  }

  if (settings.apiKey.trim() && settings.region.trim()) {
    return createSTTSpeechConfig(settings.apiKey, settings.region);
  }

  throw new Error('Missing credentials for pronunciation assessment. Configure Voice Live endpoint and API key.');
}

export function usePronunciationAssessment(settings: AzureSettings) {
  const [state, setState] = useState<PronunciationAssessmentState>('idle');
  const [result, setResult] = useState<PronunciationAssessmentResult | null>(null);
  const [error, setError] = useState('');
  const recognizerRef = useRef<SpeechSDK.SpeechRecognizer | null>(null);

  useEffect(() => {
    return () => {
      recognizerRef.current?.close();
    };
  }, []);

  const reset = useCallback(() => {
    recognizerRef.current?.close();
    recognizerRef.current = null;
    setState('idle');
    setResult(null);
    setError('');
  }, []);

  const startStream = useCallback((options: StartStreamOptions): PronunciationAssessmentSession => {
    const trimmedReference = options.referenceText.trim();

    recognizerRef.current?.close();
    recognizerRef.current = null;

    setState('processing');
    setError('');
    setResult(null);

    const speechConfig = createPronunciationSpeechConfig(settings);
    speechConfig.outputFormat = SpeechSDK.OutputFormat.Detailed;
    speechConfig.speechRecognitionLanguage = options.language;
    if (options.silenceTimeoutMs != null) {
      speechConfig.setProperty(
        SpeechSDK.PropertyId.Speech_SegmentationSilenceTimeoutMs,
        options.silenceTimeoutMs.toString(),
      );
    }

    const format = SpeechSDK.AudioStreamFormat.getWaveFormatPCM(options.sampleRate, 16, 1);
    const pushStream = SpeechSDK.AudioInputStream.createPushStream(format);
    const audioConfig = SpeechSDK.AudioConfig.fromStreamInput(pushStream);
    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
    recognizerRef.current = recognizer;

    const assessmentConfig = new SpeechSDK.PronunciationAssessmentConfig(
      trimmedReference,
      SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
      SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
      options.enableMiscue && trimmedReference.length > 0,
    );
    assessmentConfig.phonemeAlphabet = 'IPA';
    assessmentConfig.enableProsodyAssessment = options.enableProsodyAssessment;
    assessmentConfig.applyTo(recognizer);

    let canceled = false;
    let stopped = false;
    const recognitionPromise = new Promise<SpeechSDK.SpeechRecognitionResult>((resolve, reject) => {
      recognizer.recognizeOnceAsync(resolve, reject);
    });

    const releaseRecognizer = () => {
      try { recognizer.close(); } catch { /* ignore */ }
      if (recognizerRef.current === recognizer) recognizerRef.current = null;
    };

    return {
      pushAudio(chunk) {
        if (canceled || stopped) return;
        try {
          const buffer = new ArrayBuffer(chunk.byteLength);
          new Uint8Array(buffer).set(chunk);
          pushStream.write(buffer);
        } catch (err) {
          console.warn('[PA] pushAudio failed:', err);
        }
      },
      cancel() {
        if (canceled || stopped) return;
        canceled = true;
        stopped = true;
        try { pushStream.close(); } catch { /* ignore */ }
        releaseRecognizer();
        setState('idle');
      },
      async stop() {
        if (canceled || stopped) return null;
        stopped = true;
        try { pushStream.close(); } catch { /* ignore */ }

        try {
          const recognitionResult = await recognitionPromise;

          if (recognitionResult.reason === SpeechSDK.ResultReason.Canceled) {
            const cancellation = SpeechSDK.CancellationDetails.fromResult(recognitionResult);
            throw new Error(cancellation.errorDetails || 'Pronunciation assessment was canceled.');
          }

          if (recognitionResult.reason !== SpeechSDK.ResultReason.RecognizedSpeech) {
            throw new Error('No speech could be recognized. Try a clearer recording or a shorter practice sentence.');
          }

          const rawJson = recognitionResult.properties.getProperty(
            SpeechSDK.PropertyId.SpeechServiceResponse_JsonResult,
          );
          const pronunciationResult = SpeechSDK.PronunciationAssessmentResult.fromResult(recognitionResult);
          const detailResult = pronunciationResult.detailResult;

          const nextResult: PronunciationAssessmentResult = {
            referenceText: trimmedReference,
            recognizedText: recognitionResult.text,
            durationSeconds: 0,
            scores: {
              pronunciation: normalizeScore(pronunciationResult.pronunciationScore),
              accuracy: normalizeScore(pronunciationResult.accuracyScore),
              fluency: normalizeScore(pronunciationResult.fluencyScore),
              completeness: normalizeScore(pronunciationResult.completenessScore),
              prosody: options.enableProsodyAssessment ? normalizeScore(pronunciationResult.prosodyScore) : undefined,
            },
            words: (detailResult.Words ?? []).map((word) => ({
              word: word.Word ?? '',
              accuracyScore: normalizeScore(word.PronunciationAssessment?.AccuracyScore),
              errorType: word.PronunciationAssessment?.ErrorType ?? 'None',
              phonemes: extractPhonemes(word),
            })).filter((word) => word.word),
            rawJson,
          };
          setResult(nextResult);
          setState('completed');
          return nextResult;
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to run pronunciation assessment.');
          setState('error');
          return null;
        } finally {
          releaseRecognizer();
        }
      },
    };
  }, [settings.apiKey, settings.region, settings.voiceLiveApiKey, settings.voiceLiveEndpoint]);

  return {
    state,
    result,
    error,
    startStream,
    reset,
  };
}