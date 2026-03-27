import { useState, useCallback, useRef } from 'react';
import {
  Generation,
  GenerationProgress,
  GenerationStatus,
  PodcastConfig,
  PodcastContentSource,
  PodcastApiConfig,
  PodcastHistoryEntry,
} from '../types/podcast';
import {
  createGeneration,
  waitForGenerationComplete,
  prepareContentWithTracking,
  safeDeleteTempFile,
  createGenerationId,
  hasFeature,
} from '../lib/podcast/podcastClient';

export interface UsePodcastGenerationOptions {
  apiKey: string;
  region: string;
}

export function usePodcastGeneration({ apiKey, region }: UsePodcastGenerationOptions) {
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [progress, setProgress] = useState<GenerationProgress>({
    step: 0,
    totalSteps: 5,
    message: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [currentGeneration, setCurrentGeneration] = useState<Generation | null>(null);

  const cancelRef = useRef(false);

  const getApiConfig = useCallback((): PodcastApiConfig => ({
    region,
    apiKey,
  }), [region, apiKey]);

  const startGeneration = useCallback(async (
    contentSource: PodcastContentSource,
    config: PodcastConfig,
    voiceName?: string,
    speakerNames?: string,
    genderPreference?: 'Male' | 'Female',
    addToHistory?: (entry: Omit<PodcastHistoryEntry, 'id'>) => void
  ) => {
    let tempFileId: string | undefined;

    try {
      // Reset state
      setError(null);
      setStatus('creating');
      setProgress({ step: 1, totalSteps: 5, message: 'Preparing content...' });
      cancelRef.current = false;

      console.log('Starting podcast generation with config:', config);

      const apiConfig = getApiConfig();
      const generationId = createGenerationId();

      // Step 1: Prepare content payload with temp file tracking
      const { content, tempFileId: createdTempFileId } = await prepareContentWithTracking(
        apiConfig, 
        contentSource,
        (message) => setProgress({ step: 1, totalSteps: 5, message })
      );
      tempFileId = createdTempFileId;

      if (tempFileId) {
        console.log(`Temp file created: ${tempFileId}`);
      }

      if (cancelRef.current) {
        setStatus('cancelled');
        // Cleanup temp file if created
        await safeDeleteTempFile(apiConfig, tempFileId);
        return;
      }

      // Step 2: Create generation
      setProgress({ step: 2, totalSteps: 5, message: 'Creating generation...' });
      setStatus('creating');

      // Check if PodcastIntermediateZip feature is available
      const hasPodcastIntermediateZip = await hasFeature(apiConfig, 'PodcastIntermediateZip');
      console.log('PodcastIntermediateZip feature available:', hasPodcastIntermediateZip);

      const createParams = {
        generationId,
        locale: config.locale,
        host: config.hostType,
        displayName: `Podcast ${new Date().toLocaleString()}`,
        content,
        scriptGeneration: {
          style: config.style,
          length: config.length,
          additionalInstructions: config.additionalInstructions || undefined,
          template: config.template || undefined,
        },
        tts: (config.hostType === 'TwoHosts' && speakerNames) || 
             (config.hostType === 'OneHost' && (voiceName || genderPreference))
          ? {
              voiceName: voiceName || undefined,
              multiTalkerVoiceSpeakerNames: speakerNames,
              genderPreference,
            }
          : undefined,
        advancedConfig: hasPodcastIntermediateZip
          ? {
              keepIntermediateZipFile: true,
            }
          : undefined,
      };

      console.log('Creating generation with params:', createParams);
      console.log('Voice name passed to API:', voiceName);
      console.log('Speaker names passed to API:', speakerNames);
      console.log('Gender preference passed to API:', genderPreference);

      const { generation, operationLocation } = await createGeneration(apiConfig, createParams);

      console.log('Generation created, operationLocation:', operationLocation);

      if (cancelRef.current) {
        setStatus('cancelled');
        // Cleanup temp file if created
        await safeDeleteTempFile(apiConfig, tempFileId);
        return;
      }

      // Step 3-4: Poll for completion using operation status
      setProgress({ step: 3, totalSteps: 5, message: 'Generating script...' });
      setStatus('processing');

      const completedGeneration = await waitForGenerationComplete(
        apiConfig,
        generationId,
        operationLocation,
        (gen) => {
          if (cancelRef.current) {
            throw new Error('Cancelled by user');
          }

          // Update progress based on generation status
          if (gen.status === 'NotStarted') {
            setProgress({ step: 3, totalSteps: 5, message: 'Waiting for generation to start...' });
          } else if (gen.status === 'Running') {
            setProgress({ step: 4, totalSteps: 5, message: 'Processing and generating audio...' });
          }

          setCurrentGeneration(gen);
        },
        30 * 60 * 1000, // 30 min max
        10000 // 10 second intervals
      );

      if (cancelRef.current) {
        setStatus('cancelled');
        // Cleanup temp file if created
        await safeDeleteTempFile(apiConfig, tempFileId);
        return;
      }

      // Step 5: Complete - Clean up temp file after successful generation
      await safeDeleteTempFile(apiConfig, tempFileId);

      setProgress({ step: 5, totalSteps: 5, message: 'Completed!' });
      setStatus('completed');
      setCurrentGeneration(completedGeneration);

      // Add to history if callback provided
      if (addToHistory && completedGeneration.output?.audioFileUrl) {
        const contentPreview = contentSource.text
          ? contentSource.text.substring(0, 100)
          : contentSource.url
            ? contentSource.url
            : contentSource.file?.name || '';

        addToHistory({
          generationId: completedGeneration.id,
          timestamp: Date.now(),
          displayName: completedGeneration.displayName || 'Podcast',
          locale: completedGeneration.locale,
          hostType: completedGeneration.host,
          voiceName,
          style: config.style,
          length: config.length,
          status: completedGeneration.status,
          audioUrl: completedGeneration.output.audioFileUrl,
          contentPreview,
        });
      }

      return completedGeneration;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Podcast generation failed:', err);

      // Cleanup temp file on error
      const apiConfig = getApiConfig();
      await safeDeleteTempFile(apiConfig, tempFileId);

      if (errorMessage.includes('Cancelled')) {
        setStatus('cancelled');
        setError('Generation cancelled');
      } else {
        setStatus('error');
        setError(errorMessage);
      }

      throw err;
    }
  }, [getApiConfig]);

  const cancelGeneration = useCallback(() => {
    console.log('Cancelling podcast generation');
    cancelRef.current = true;
    setStatus('cancelled');
    setProgress({ step: 0, totalSteps: 5, message: 'Cancelled' });
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress({ step: 0, totalSteps: 5, message: '' });
    setError(null);
    setCurrentGeneration(null);
    cancelRef.current = false;
  }, []);

  return {
    status,
    progress,
    error,
    currentGeneration,
    startGeneration,
    cancelGeneration,
    reset,
  };
}
