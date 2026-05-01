import { useState, useRef, useCallback, useEffect } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { AzureSettings, WordBoundary, SynthesisState } from '../types/azure';
import { buildPersonalVoiceSsml } from '../lib/personalVoice/personalVoiceClient';
import { createSpeechConfig } from '../utils/azureSpeechConfig';
import { useSynthesizerPool } from './useSynthesizerPool';

function logSynthesisLatencies(result: SpeechSDK.SpeechSynthesisResult): void {
  console.log('=== SDK Synthesis Result ===');
  console.log('Result ID:', result.resultId);
  console.log('Reason:', result.reason);
  console.log('Audio duration (ticks):', result.audioDuration);
  console.log('Audio data size:', result.audioData?.byteLength, 'bytes');
  console.log('Error details:', result.errorDetails || '(none)');
  if (result.properties) {
    const props = result.properties;
    // These are available in the Python SDK but may not be populated in JS SDK
    const keys = [
      'SpeechServiceResponse_SynthesisFirstByteLatencyMs',
      'SpeechServiceResponse_SynthesisFinishLatencyMs',
      'SpeechServiceResponse_SynthesisNetworkLatencyMs',
      'SpeechServiceResponse_SynthesisServiceLatencyMs',
    ];
    for (const key of keys) {
      const val = props.getProperty(key);
      console.log(`  ${key}: ${val || '(not available in JS SDK)'}`);
    }
  } else {
    console.log('properties: not available (JS SDK does not populate for synthesis results)');
  }
  console.log('============================');
}

export function useAzureTTS(settings: AzureSettings) {
  const [state, setState] = useState<SynthesisState>('idle');
  const [error, setError] = useState<string>('');
  const [wordBoundaries, setWordBoundaries] = useState<WordBoundary[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(-1);
  const [audioData, setAudioData] = useState<ArrayBuffer | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);

  // Use a ref to always have the latest settings
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const synthesizerRef = useRef<SpeechSDK.SpeechSynthesizer | null>(null);
  const playerRef = useRef<SpeechSDK.SpeakerAudioDestination | null>(null);
  const audioChunksRef = useRef<Uint8Array[]>([]);
  const playbackStartTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const boundariesRef = useRef<WordBoundary[]>([]);
  const trackingStartedRef = useRef<boolean>(false);
  const synthesisCompleteRef = useRef<boolean>(false);
  const useFallbackPlaybackRef = useRef<boolean>(false);
  const inputTextRef = useRef<string>('');
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const synthesisStartTimeRef = useRef<number>(0);

  const { acquireAsync } = useSynthesizerPool(settings);

  const initializeSynthesizer = useCallback(async () => {
    if (synthesizerRef.current) {
      synthesizerRef.current.close();
    }

    // Use settingsRef to get the latest settings value
    const currentSettings = settingsRef.current;
    const isPersonalVoice = currentSettings.personalVoiceInfo?.isPersonalVoice && currentSettings.personalVoiceInfo?.speakerProfileId;

    console.log('Initializing synthesizer with voice:', currentSettings.selectedVoice, 'isPersonalVoice:', isPersonalVoice);
    console.log('personalVoiceInfo:', currentSettings.personalVoiceInfo);

    // Try to acquire a pre-connected synthesizer from the pool (waits up to 3s)
    const poolEntry = await acquireAsync();
    if (poolEntry) {
      console.log('[TTS] Using pre-connected synthesizer from pool');
      synthesizerRef.current = poolEntry.synthesizer;
      playerRef.current = poolEntry.player;
      return poolEntry.synthesizer;
    }

    // Fallback: create fresh synthesizer
    console.log('[TTS] Pool empty, creating fresh synthesizer');

    // Determine the correct endpoint based on region
    const speechConfig = createSpeechConfig(currentSettings.apiKey, currentSettings.region);

    // For personal voices, don't set the voice name - let SSML handle it
    // For regular voices, set the voice name
    if (!isPersonalVoice) {
      speechConfig.speechSynthesisVoiceName = currentSettings.selectedVoice;
    }

    speechConfig.speechSynthesisOutputFormat =
      SpeechSDK.SpeechSynthesisOutputFormat.Audio24Khz160KBitRateMonoMp3;

    // Use speaker output for streaming playback
    const player = new SpeechSDK.SpeakerAudioDestination();
    playerRef.current = player;

    const audioConfig = SpeechSDK.AudioConfig.fromSpeakerOutput(player);
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);
    synthesizerRef.current = synthesizer;

    return synthesizer;
  }, [acquireAsync]);

  const trackWordPosition = useCallback(() => {
    if (!isPlayingRef.current) {
      console.log('Stopped tracking - not playing');
      return;
    }

    // Get current playback time from the actual player if available
    let currentPlaybackTime = Date.now() - playbackStartTimeRef.current;
    if (playerRef.current && playerRef.current.currentTime) {
      try {
        const playerTime = playerRef.current.currentTime;
        if (playerTime > 0) {
          currentPlaybackTime = playerTime * 1000; // Convert to milliseconds
        }
      } catch (e) {
        // Fall back to calculated time
      }
    }

    // Find the current word - use negative lookahead to highlight slightly before audio
    let currentIndex = -1;
    for (let i = 0; i < boundariesRef.current.length; i++) {
      // Highlight 300ms BEFORE the word is spoken to compensate for word boundary delays
      if (boundariesRef.current[i].audioOffset <= currentPlaybackTime + 300) {
        currentIndex = i;
      } else {
        break;
      }
    }

    // Update current word index immediately
    if (currentIndex !== -1) {
      setCurrentWordIndex(currentIndex);
    }

    // Log less frequently to reduce console spam (every 500ms)
    if (Math.floor(currentPlaybackTime / 500) !== Math.floor((currentPlaybackTime - 16) / 500)) {
      const currentWord = currentIndex >= 0 ? boundariesRef.current[currentIndex] : null;
      console.log(
        `⏱️ ${currentPlaybackTime.toFixed(0)}ms | Word [${currentIndex}]: "${currentWord?.text}" @ ${currentWord?.audioOffset}ms | Total: ${boundariesRef.current.length} | Complete: ${synthesisCompleteRef.current}`
      );
    }

    // Continue tracking every frame for smooth highlighting
    if (isPlayingRef.current) {
      animationFrameRef.current = requestAnimationFrame(trackWordPosition);
    }
  }, []);

  const synthesize = useCallback(
    async (text: string, locale?: string, ssml?: string) => {
      if (!text.trim() && !ssml?.trim()) {
        setError('Please enter some text to synthesize');
        return;
      }

      setState('synthesizing');
      setError('');
      setWordBoundaries([]);
      setCurrentWordIndex(-1);
      audioChunksRef.current = [];
      boundariesRef.current = [];
      isPlayingRef.current = false;
      trackingStartedRef.current = false;
      synthesisCompleteRef.current = false;
      useFallbackPlaybackRef.current = false;
      inputTextRef.current = text;
      setLatencyMs(null);
      setResultId(null);

      const synthesizer = await initializeSynthesizer();

      // Set a timeout - after 1 second, if no word boundary, use fallback mode
      const fallbackTimeout = setTimeout(() => {
        if (boundariesRef.current.length === 0) {
          console.log('⚠️ No word boundary received within 1 second - will start playback when audio arrives');
          useFallbackPlaybackRef.current = true;
        }
      }, 1000);

      // Listen to word boundary events
      synthesizer.wordBoundary = (_s, e) => {
        // For SSML synthesis, textOffset is relative to SSML, not plain text
        // We need to find the word position in the original plain text
        let textOffset = e.textOffset;

        // If using personal voice (SSML), find the word in the original text
        const isPersonalVoice = settingsRef.current.personalVoiceInfo?.isPersonalVoice;
        if (isPersonalVoice && e.text) {
          // Find this word in the input text, starting after the last found word
          const lastBoundary = boundariesRef.current[boundariesRef.current.length - 1];
          const searchStart = lastBoundary ? lastBoundary.offset + lastBoundary.length : 0;
          const foundIndex = inputTextRef.current.indexOf(e.text, searchStart);
          if (foundIndex !== -1) {
            textOffset = foundIndex;
          }
        }

        const boundary: WordBoundary = {
          text: e.text,
          offset: textOffset,
          length: e.wordLength,
          audioOffset: e.audioOffset / 10000, // Convert to milliseconds
        };
        boundariesRef.current.push(boundary);
        setWordBoundaries([...boundariesRef.current]);

        console.log(`📍 Word boundary: "${boundary.text}" at ${boundary.audioOffset}ms (text offset: ${boundary.offset})`);

        if (boundariesRef.current.length === 1) {
          // First word boundary - clear the fallback timeout and disable fallback mode
          clearTimeout(fallbackTimeout);
          useFallbackPlaybackRef.current = false;

          const currentTime = Date.now();
          const adjustedStartTime = currentTime - boundary.audioOffset;
          playbackStartTimeRef.current = adjustedStartTime;
          console.log('📍 FIRST word boundary - starting playback. Word:', boundary.text, 'offset:', boundary.audioOffset, 'ms. Playback start:', adjustedStartTime, 'Current time:', currentTime);

          // Start playing and tracking if we haven't already started
          if (!isPlayingRef.current) {
            isPlayingRef.current = true;
            setState('playing');
            trackWordPosition();
          } else {
            // Already playing in fallback mode - just start tracking now with corrected timing
            console.log('🔄 Switching from fallback mode to word boundary mode - restarting tracking');
            trackWordPosition();
          }
        }
      };

      // Listen to synthesis events - collect audio for download
      synthesizer.synthesizing = (_s, e) => {
        if (e.result.audioData) {
          audioChunksRef.current.push(new Uint8Array(e.result.audioData));

          // Measure latency on first audio chunk (time to first byte)
          if (audioChunksRef.current.length === 1) {
            const latency = Date.now() - synthesisStartTimeRef.current;
            setLatencyMs(latency);
            console.log(`⏱️ Time to first audio byte: ${latency}ms`);
          }

          // Start playback on first audio chunk if using fallback mode
          if (useFallbackPlaybackRef.current && !isPlayingRef.current && audioChunksRef.current.length === 1) {
            console.log('🎵 First audio chunk received (fallback mode) - starting playback');
            playbackStartTimeRef.current = Date.now();
            isPlayingRef.current = true;
            setState('playing');
          }
        }
      };

      synthesizer.synthesisStarted = () => {
        setState('synthesizing');
        console.log('Synthesis started');
      };

      synthesizer.synthesisCompleted = (_s, e) => {
        // Combine all audio chunks for download
        const totalLength = audioChunksRef.current.reduce(
          (sum, chunk) => sum + chunk.length,
          0
        );
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of audioChunksRef.current) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        setAudioData(combined.buffer);

        // Mark synthesis as complete
        synthesisCompleteRef.current = true;
        console.log('✅ Synthesis completed - now have all', boundariesRef.current.length, 'word boundaries');

        // Calculate audio duration from file size
        // For MP3 at 192kbps, approximate duration: bytes * 8 / bitrate (in seconds)
        const estimatedDurationMs = (totalLength * 8 / 192000) * 1000;

        // Use duration-based stop for all voices
        const currentPlaybackTime = Date.now() - playbackStartTimeRef.current;
        const remainingTime = Math.max(100, estimatedDurationMs - currentPlaybackTime + 300); // Add 300ms buffer

        console.log(`🕐 Estimated audio duration: ${estimatedDurationMs}ms, current playback: ${currentPlaybackTime}ms, will stop in: ${remainingTime}ms`);

        // Start playback now if not already started
        if (!isPlayingRef.current) {
          playbackStartTimeRef.current = Date.now();
          isPlayingRef.current = true;
          setState('playing');
        }

        // Clear any existing timeout
        if (stopTimeoutRef.current) {
          clearTimeout(stopTimeoutRef.current);
        }

        // Set timeout to stop playback when audio ends
        stopTimeoutRef.current = setTimeout(() => {
          console.log('🎵 Audio playback ended (duration timeout)');
          isPlayingRef.current = false;
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          setState('idle');
          setCurrentWordIndex(-1);
          stopTimeoutRef.current = null;
        }, remainingTime);
      };

      synthesizer.SynthesisCanceled = (_s: any, e: any) => {
        console.error('Synthesis canceled:', e.errorDetails);
        setError(e.errorDetails || 'Synthesis was canceled');
        setState('error');
        setCurrentWordIndex(-1);
        isPlayingRef.current = false;
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      // Start synthesis - use user-provided SSML if given, else SSML for personal voices, else plain text
      // Use settingsRef.current to get the latest settings value
      const currentSettings = settingsRef.current;
      const isPersonalVoice = currentSettings.personalVoiceInfo?.isPersonalVoice && currentSettings.personalVoiceInfo?.speakerProfileId;

      console.log('=== SYNTHESIS DEBUG ===');
      console.log('currentSettings.personalVoiceInfo:', currentSettings.personalVoiceInfo);
      console.log('isPersonalVoice:', isPersonalVoice);
      console.log('selectedVoice:', currentSettings.selectedVoice);
      console.log('locale:', locale);
      console.log('userSSML:', ssml ? 'yes' : 'no');
      console.log('=======================');

      // Record start time for latency measurement (time to first audio byte)
      synthesisStartTimeRef.current = Date.now();

      if (ssml) {
        // User-edited SSML mode
        console.log('Using user-provided SSML');
        console.log('SSML:', ssml);

        synthesizer.speakSsmlAsync(
          ssml,
          (result) => {
            logSynthesisLatencies(result);
            if (result.resultId) {
              setResultId(result.resultId);
            }
            if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
              console.log('SSML synthesis completed successfully');
            } else {
              console.error('SSML synthesis failed:', result.errorDetails);
              setError(result.errorDetails || 'Synthesis failed');
              setState('error');
            }
          },
          (error) => {
            console.error('SSML synthesis error:', error);
            setError(error);
            setState('error');
          }
        );
      } else if (isPersonalVoice) {
        const model = currentSettings.personalVoiceInfo!.model || 'DragonLatestNeural';
        const ssmlLocale = locale || 'en-US';
        const ssml = buildPersonalVoiceSsml(
          text,
          currentSettings.personalVoiceInfo!.speakerProfileId!,
          ssmlLocale,
          model
        );
        console.log('Using personal voice SSML with model:', model);
        console.log('SSML:', ssml);

        synthesizer.speakSsmlAsync(
          ssml,
          (result) => {
            logSynthesisLatencies(result);
            if (result.resultId) {
              setResultId(result.resultId);
            }
            if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
              console.log('Personal voice synthesis completed successfully');
            } else {
              console.error('Personal voice synthesis failed:', result.errorDetails);
              setError(result.errorDetails || 'Synthesis failed');
              setState('error');
            }
          },
          (error) => {
            console.error('Personal voice synthesis error:', error);
            setError(error);
            setState('error');
          }
        );
      } else {
        synthesizer.speakTextAsync(
          text,
          (result) => {
            logSynthesisLatencies(result);
            if (result.resultId) {
              setResultId(result.resultId);
            }
            if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
              console.log('Synthesis completed successfully');
            } else {
              console.error('Synthesis failed:', result.errorDetails);
              setError(result.errorDetails || 'Synthesis failed');
              setState('error');
            }
          },
          (error) => {
            console.error('Synthesis error:', error);
            setError(error);
            setState('error');
          }
        );
      }
    },
    [initializeSynthesizer, trackWordPosition]
  );

  const pause = useCallback(() => {
    if (playerRef.current && state === 'playing') {
      playerRef.current.pause();
      setState('paused');
      isPlayingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [state]);

  const resume = useCallback(() => {
    if (playerRef.current && state === 'paused') {
      playerRef.current.resume();
      setState('playing');
      isPlayingRef.current = true;
      trackWordPosition();
    }
  }, [state, trackWordPosition]);

  const stop = useCallback(() => {
    console.log('⏹️ Stop called - cleaning up');
    isPlayingRef.current = false;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.pause();
    }
    if (synthesizerRef.current) {
      synthesizerRef.current.close();
      synthesizerRef.current = null;
    }
    setState('idle');
    setCurrentWordIndex(-1);
  }, []);

  return {
    state,
    error,
    wordBoundaries,
    currentWordIndex,
    audioData,
    latencyMs,
    resultId,
    synthesize,
    pause,
    resume,
    stop,
  };
}
