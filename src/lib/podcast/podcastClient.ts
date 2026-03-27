/**
 * Azure Podcast API Client
 * Based on the Podcast API 2026-01-01-preview
 */

import {
  Generation,
  CreateGenerationParams,
  OperationResponse,
  OperationStatus,
  PodcastApiConfig,
  PodcastContentSource,
  PodcastContent,
  TempFile,
  Voice,
  MAX_PLAIN_TEXT_LENGTH,
  MAX_BASE64_TEXT_LENGTH,
  MAX_CONTENT_FILE_SIZE,
} from '../../types/podcast';

const API_VERSION = '2026-01-01-preview';

function getBaseUrl(region: string): string {
  // Check if region is a custom URL (for local debugging)
  if (region.startsWith('http://') || region.startsWith('https://')) {
    // Remove trailing slash if present
    const baseUrl = region.endsWith('/') ? region.slice(0, -1) : region;
    // Append /podcast to the custom URL
    return `${baseUrl}/podcast`;
  }
  
  // Standard Azure region format
  return `https://${region}.api.cognitive.microsoft.com/podcast`;
}

function getHeaders(apiKey: string, operationId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Ocp-Apim-Subscription-Key': apiKey,
    'Content-Type': 'application/json',
  };
  if (operationId) {
    headers['Operation-Id'] = operationId;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
      // Try to read response as text first
      const responseText = await response.text();
      
      if (!responseText) {
        // Empty response body, use default error message
        throw new Error(errorMessage);
      }
      
      // Special handling for 400 Bad Request - parse and show error.innererror.message
      if (response.status === 400) {
        try {
          const errorBody = JSON.parse(responseText);
          console.error('Podcast API 400 Error Response:', errorBody);
          
          // Try to extract error.innererror.message
          if (errorBody.error?.innererror?.message) {
            errorMessage = errorBody.error.innererror.message;
          } else if (errorBody.error?.message) {
            errorMessage = errorBody.error.message;
          } else if (errorBody.message) {
            errorMessage = errorBody.message;
          } else {
            // Show full JSON if we can't find a specific message
            errorMessage = responseText;
          }
        } catch {
          // Not JSON, use the raw text
          console.error('Podcast API 400 Error Response (text):', responseText);
          errorMessage = responseText;
        }
      } else {
        // For other status codes, show the full response text without parsing
        console.error(`Podcast API ${response.status} Error Response:`, responseText);
        errorMessage = responseText;
      }
    } catch (readError) {
      console.error('Failed to read error response:', readError);
      // Use default error message if we can't read the response
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/**
 * Convert a File object to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      // Remove data URL prefix (e.g., "data:application/pdf;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Prepare content payload based on source type
 * Strategy:
 * - Text <= 1MB: uses 'text' property (inline)
 * - Text > 1MB: uploads as temp file, uses 'tempFileId' property
 * - File: converts to base64, if base64 size <= 8MB: uses 'base64Text' property
 * - File: if base64 > 8MB but file size <= 50MB: uploads as temp file, uses 'tempFileId' property
 * - URL: uses 'url' property with detected file format
 * Note: base64Text is only for file uploads (especially PDFs), not for text input
 */
export async function prepareContentPayload(
  config: PodcastApiConfig,
  source: PodcastContentSource,
  onProgress?: (message: string) => void
): Promise<PodcastContent> {
  console.log('Preparing content payload...');

  if (source.text) {
    const textLength = (source.text || '').length;
    const textBytes = new Blob([source.text || '']).size;

    console.log(`Text content: ${textLength} chars, ${textBytes} bytes`);

    if (textLength <= MAX_PLAIN_TEXT_LENGTH) {
      // Use text directly for content <= 1MB
      console.log('Using inline text (<=1MB)');
      return {
        text: source.text,
        fileFormat: 'Txt',
      };
    } else if (textBytes <= MAX_CONTENT_FILE_SIZE) {
      // For text > 1MB, use temp file upload (base64 is only for PDF format)
      console.log(`Uploading as temp file (${textBytes} bytes, >1MB, <=50MB)`);
      if (onProgress) {
        onProgress(`Uploading content (${(textBytes / 1024).toFixed(0)} KB)...`);
      }
      const textBlob = new Blob([source.text || ''], { type: 'text/plain' });
      const textFile = new File([textBlob], 'content.txt', { type: 'text/plain' });
      const tempFileId = createTempFileId();
      await uploadTempFile(config, textFile, tempFileId, 120); // 2 hour expiry
      return {
        tempFileId,
        fileFormat: 'Txt',
      };
    } else {
      throw new Error(`Text content is too large (${(textBytes / 1024 / 1024).toFixed(1)}MB). Maximum allowed size is ${(MAX_CONTENT_FILE_SIZE / 1024 / 1024).toFixed(0)}MB.`);
    }
  }

  if (source.url) {
    // Detect file format from URL
    const urlLower = source.url!.toLowerCase();
    const isPdf = urlLower.endsWith('.pdf') || urlLower.includes('.pdf?');

    console.log(`Using URL: ${source.url}, Format: ${isPdf ? 'Pdf' : 'Txt'}`);
    return {
      url: source.url,
      fileFormat: isPdf ? 'Pdf' : 'Txt',
    };
  }

  if (source.file) {
    const isPdf = source.file.type === 'application/pdf' || source.file.name.toLowerCase().endsWith('.pdf');
    const fileFormat = isPdf ? 'Pdf' : 'Txt';

    console.log(`File upload: ${source.file.name}, Size: ${source.file.size} bytes, Format: ${fileFormat}`);

    // Convert to base64 first to check actual encoded size
    const base64Text = await fileToBase64(source.file);
    
    if (base64Text.length <= MAX_BASE64_TEXT_LENGTH) {
      // Use base64 for files where base64 size <= 8MB
      console.log(`Using base64Text for file (base64 size: ${base64Text.length} bytes, <=8MB)`);
      return {
        base64Text,
        fileFormat,
      };
    } else if (source.file.size <= MAX_CONTENT_FILE_SIZE) {
      // Upload as temp file for files where base64 > 8MB but file size <= 50MB
      console.log(`Uploading file as temp file (file size: ${source.file.size} bytes, >8MB base64, <=50MB)`);
      if (onProgress) {
        onProgress(`Uploading file ${source.file.name} (${(source.file.size / 1024 / 1024).toFixed(1)} MB)...`);
      }
      const tempFileId = createTempFileId();
      await uploadTempFile(config, source.file, tempFileId, 120); // 2 hour expiry
      return {
        tempFileId,
        fileFormat,
      };
    } else {
      throw new Error(`File size exceeds maximum limit of ${(MAX_CONTENT_FILE_SIZE / 1024 / 1024).toFixed(0)}MB`);
    }
  }

  throw new Error('Invalid content source');
}

/**
 * Upload a temporary file using multipart/form-data
 * API: POST /api/podcast/tempfiles/{tempFileId}
 * Content-Type: multipart/form-data
 */
export async function uploadTempFile(
  config: PodcastApiConfig,
  file: File,
  tempFileId: string,
  expiresAfterInMins: number = 60
): Promise<TempFile> {
  const url = `${getBaseUrl(config.region)}/tempfiles/${tempFileId}?api-version=${API_VERSION}`;

  const formData = new FormData();
  formData.append('file', file);
  // Backend expects ExpiresAfterInMins (PascalCase) as form field
  formData.append('ExpiresAfterInMins', expiresAfterInMins.toString());

  console.log(`Uploading temp file: ${file.name} (${(file.size / 1024).toFixed(2)} KB), ID: ${tempFileId}, Expires: ${expiresAfterInMins} mins`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': config.apiKey,
      // Note: Do NOT set Content-Type header - browser will set it automatically with boundary
    },
    body: formData,
  });

  const tempFile = await handleResponse<TempFile>(response);
  console.log(`Temp file uploaded successfully. ID: ${tempFile.id}, Expires: ${tempFile.expiresDateTime}`);
  return tempFile;
}

/**
 * Get temp file info
 */
export async function getTempFile(
  config: PodcastApiConfig,
  tempFileId: string
): Promise<TempFile> {
  const url = `${getBaseUrl(config.region)}/tempfiles/${tempFileId}?api-version=${API_VERSION}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(config.apiKey),
  });

  return handleResponse<TempFile>(response);
}

/**
 * Delete temp file
 */
export async function deleteTempFile(
  config: PodcastApiConfig,
  tempFileId: string
): Promise<void> {
  const url = `${getBaseUrl(config.region)}/tempfiles/${tempFileId}?api-version=${API_VERSION}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders(config.apiKey),
  });

  await handleResponse<void>(response);
}

/**
 * Create a podcast generation
 * API: PUT /api/podcast/generations/{generationId}
 * Content-Type: application/json
 */
export async function createGeneration(
  config: PodcastApiConfig,
  params: CreateGenerationParams
): Promise<{ generation: Generation; operationLocation: string }> {
  const url = `${getBaseUrl(config.region)}/generations/${params.generationId}?api-version=${API_VERSION}`;

  const operationId = crypto.randomUUID();

  // Build request body matching backend PodcastGeneration DTO structure
  const body: Record<string, unknown> = {
    locale: params.locale,
    host: params.host,
    content: params.content,
  };

  if (params.displayName !== undefined) {
    body.displayName = params.displayName;
  }

  if (params.description !== undefined) {
    body.description = params.description;
  }

  if (params.scriptGeneration !== undefined) {
    body.scriptGeneration = params.scriptGeneration;
  }

  if (params.tts !== undefined) {
    body.tts = params.tts;
  }

  if (params.advancedConfig !== undefined) {
    body.advancedConfig = params.advancedConfig;
  }

  console.log('Creating podcast generation:', params.generationId);
  console.log('Request body:', JSON.stringify(body, null, 2));

  const response = await fetch(url, {
    method: 'PUT',
    headers: getHeaders(config.apiKey, operationId),
    body: JSON.stringify(body),
  });

  const generation = await handleResponse<Generation>(response);

  // Get operation location from header
  const operationLocation = response.headers.get('Operation-Location') || '';

  console.log(`Generation created: ${generation.id}, Status: ${generation.status}`);
  return { generation, operationLocation };
}

/**
 * Get generation status
 */
export async function getGeneration(
  config: PodcastApiConfig,
  generationId: string
): Promise<Generation> {
  const url = `${getBaseUrl(config.region)}/generations/${generationId}?api-version=${API_VERSION}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(config.apiKey),
  });

  return handleResponse<Generation>(response);
}

/**
 * Poll operation status
 */
export async function pollOperation(
  operationUrl: string,
  apiKey: string
): Promise<OperationResponse> {
  const response = await fetch(operationUrl, {
    method: 'GET',
    headers: getHeaders(apiKey),
  });

  return handleResponse<OperationResponse>(response);
}

/**
 * Delete generation
 */
export async function deleteGeneration(
  config: PodcastApiConfig,
  generationId: string
): Promise<void> {
  const url = `${getBaseUrl(config.region)}/generations/${generationId}?api-version=${API_VERSION}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders(config.apiKey),
  });

  await handleResponse<void>(response);
}

/**
 * Wait for generation to complete with polling using operation status
 * New workflow:
 * 1. Poll operation status using the operation URL
 * 2. When operation is terminated (Succeeded or Failed), query the generation by ID for full details
 */
export async function waitForGenerationComplete(
  config: PodcastApiConfig,
  generationId: string,
  operationLocation: string,
  onProgress?: (generation: Generation) => void,
  maxWaitMs: number = 30 * 60 * 1000, // 30 minutes
  pollIntervalMs: number = 10000 // 10 seconds
): Promise<Generation> {
  const startTime = Date.now();

  console.log(`Starting operation polling for generation ${generationId}`);
  console.log(`Operation URL: ${operationLocation}`);

  while (Date.now() - startTime < maxWaitMs) {
    // Poll operation status
    const operation = await pollOperation(operationLocation, config.apiKey);

    console.log(`Operation ${operation.id} status: ${operation.status}`);

    // Check if operation is terminated
    if (operation.status === 'Succeeded' || operation.status === 'Failed') {
      console.log(`Operation terminated with status: ${operation.status}`);
      
      // Fetch full generation details now that operation is complete
      const generation = await getGeneration(config, generationId);

      // Call progress callback with final generation state
      if (onProgress) {
        onProgress(generation);
      }

      // Check generation status
      if (generation.status === 'Succeeded') {
        console.log('Generation succeeded:', generationId);
        return generation;
      }

      if (generation.status === 'Failed') {
        const errorMsg = generation.failureReason || operation.error?.message || 'Generation failed';
        console.error('Generation failed:', errorMsg);
        console.error('Full generation object:', generation);
        throw new Error(errorMsg);
      }

      // If operation succeeded but generation status is not terminal, continue polling
      console.log(`Operation succeeded but generation status is ${generation.status}, continuing to poll...`);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Generation timed out after ${maxWaitMs / 1000} seconds`);
}

/**
 * Helper to create a generation ID
 */
export function createGenerationId(): string {
  return crypto.randomUUID();
}

/**
 * Helper to create a temp file ID
 */
export function createTempFileId(): string {
  return crypto.randomUUID();
}

/**
 * Enhanced content preparation with temp file tracking
 * Returns both the content payload and the temp file ID if one was created
 */
export async function prepareContentWithTracking(
  config: PodcastApiConfig,
  source: PodcastContentSource,
  onProgress?: (message: string) => void
): Promise<{ content: PodcastContent; tempFileId?: string }> {
  const content = await prepareContentPayload(config, source, onProgress);
  return {
    content,
    tempFileId: content.tempFileId,
  };
}

/**
 * Safely delete temp file with error handling
 */
export async function safeDeleteTempFile(
  config: PodcastApiConfig,
  tempFileId: string | undefined
): Promise<void> {
  if (!tempFileId) {
    return;
  }

  try {
    console.log(`Cleaning up temp file: ${tempFileId}`);
    await deleteTempFile(config, tempFileId);
    console.log(`Temp file deleted successfully: ${tempFileId}`);
  } catch (error) {
    // Log but don't throw - temp file cleanup is best-effort
    console.warn(`Failed to delete temp file ${tempFileId}:`, error);
  }
}

/**
 * Get TTS base URL for voice queries
 */
function getTtsBaseUrl(region: string): string {
  // Check if region is a custom URL (for local debugging)
  if (region.startsWith('http://') || region.startsWith('https://')) {
    // Remove trailing slash if present
    const baseUrl = region.endsWith('/') ? region.slice(0, -1) : region;
    // Append /texttospeech path for local
    return `${baseUrl}/texttospeech/v3.0-beta1/vcg/voices`;
  }
  
  // Standard Azure region format
  return `https://${region}.api.cognitive.microsoft.com/texttospeech/acc/v3.0-beta1/vcg/voices`;
}

/**
 * Get base URL for ACC versions API
 */
function getAccVersionsUrl(region: string): string {
  // Handle custom URL (for local debugging)
  if (region.startsWith('http://') || region.startsWith('https://')) {
    const baseUrl = region.endsWith('/') ? region.slice(0, -1) : region;
    return `${baseUrl}/texttospeech/acc/v3.0-beta1/VoiceGeneralTask/versions`;
  }
  
  // Standard Azure region format
  return `https://${region}.api.cognitive.microsoft.com/texttospeech/acc/v3.0-beta1/VoiceGeneralTask/versions`;
}

/**
 * Query ACC API version
 * Returns version string like "1.3.7" or null if unavailable
 */
async function queryAccVersion(
  config: PodcastApiConfig
): Promise<string | null> {
  try {
    const url = getAccVersionsUrl(config.region);
    console.log('Querying ACC API version from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': config.apiKey,
      },
    });

    if (!response.ok) {
      console.warn(`ACC version query failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log('[queryAccVersion] Response data:', data);
    
    // Extract version from apiVersion property
    const version = data?.apiVersion;
    console.log('[queryAccVersion] Extracted version:', version);
    
    if (!version) {
      console.warn('[queryAccVersion] apiVersion not found in response');
    }
    
    return version || null;
  } catch (error) {
    console.warn('Failed to query ACC API version:', error);
    return null;
  }
}

/**
 * Compare version strings (e.g., "1.3.7" >= "1.3.7")
 * Returns true if version1 >= version2
 */
function compareVersions(version1: string, version2: string): boolean {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);
  
  console.log(`[compareVersions] Comparing ${version1} (${v1Parts}) >= ${version2} (${v2Parts})`);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1 = v1Parts[i] || 0;
    const v2 = v2Parts[i] || 0;
    
    console.log(`[compareVersions] Part ${i}: ${v1} vs ${v2}`);
    
    if (v1 > v2) {
      console.log(`[compareVersions] Result: true (${v1} > ${v2})`);
      return true;
    }
    if (v1 < v2) {
      console.log(`[compareVersions] Result: false (${v1} < ${v2})`);
      return false;
    }
  }
  
  console.log(`[compareVersions] Result: true (equal)`);
  return true; // Equal
}

/**
 * Query supported voices for podcast generation
 * Filters by ApiScenarioKind=Podcast
 * Voices with "multitalker" (case insensitive) in name are for TwoHosts
 * Other voices are for OneHost
 * 
 * Note: MultiTalker voices support ALL TwoHosts-compatible target languages.
 * The locale in a multitalker voice name (e.g., "en-US-multitalker") indicates
 * the speaker's origin locale, not the synthesis target language.
 * Therefore, multitalker voices are NOT filtered by the locale parameter.
 * 
 * Version Check: This API requires ACC version >= 1.3.7
 */
export async function queryVoices(
  config: PodcastApiConfig,
  locale?: string
): Promise<Voice[]> {
  // Check ACC API version first
  const REQUIRED_VERSION = '1.3.7';
  const currentVersion = await queryAccVersion(config);
  
  console.log('[queryVoices] Version check:', { currentVersion, REQUIRED_VERSION });
  
  if (!currentVersion) {
    console.warn('Could not determine ACC API version. Voice list may not be available. Returning empty array to allow Auto mode or manual input.');
    return [];
  }
  
  const versionSufficient = compareVersions(currentVersion, REQUIRED_VERSION);
  console.log(`[queryVoices] Version comparison: ${currentVersion} >= ${REQUIRED_VERSION} = ${versionSufficient}`);
  
  if (!versionSufficient) {
    // Voice list API not available in this region/environment yet
    // Return empty array to allow Auto mode or manual voice input
    const warnMsg = `Voice list API requires ACC version ${REQUIRED_VERSION} or higher. Current version: ${currentVersion}. Voice dropdown will be empty, but you can still use Auto mode or enter voice names manually.`;
    console.warn(warnMsg);
    return [];
  }
  
  console.log(`ACC version check passed: ${currentVersion} >= ${REQUIRED_VERSION}`);
  
  const url = getTtsBaseUrl(config.region);
  
  const headers: Record<string, string> = {
    'Ocp-Apim-Subscription-Key': config.apiKey,
    'Content-Type': 'application/json',
  };

  const body = {
    ApiScenarioKind: 'Podcast',
  };

  console.log('Querying voices with scenario: Podcast', locale ? `for locale: ${locale}` : '');

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const voices = await handleResponse<Voice[]>(response);
  
  // Filter by locale if provided
  // Note: MultiTalker voices are NOT filtered by locale because they support
  // all TwoHosts-compatible target languages. The locale in their name indicates
  // the speaker's origin, not the synthesis target language.
  if (locale) {
    return voices.filter(v => {
      const isMultiTalker = isTwoHostsVoice(v);
      // Include voice if it's a multitalker (supports all locales) OR matches the requested locale
      return isMultiTalker || v.locale === locale;
    });
  }
  
  return voices;
}

/**
 * Query available features for the speech resource
 * API: GET https://{region}.api.cognitive.microsoft.com/texttospeech/v3.0-beta1/features
 */
export async function queryFeatures(
  config: PodcastApiConfig
): Promise<string[]> {
  // Build the features API URL
  let featuresUrl: string;
  
  if (config.region.startsWith('http://') || config.region.startsWith('https://')) {
    // Custom URL (for local debugging)
    const baseUrl = config.region.endsWith('/') ? config.region.slice(0, -1) : config.region;
    featuresUrl = `${baseUrl}/texttospeech/v3.0-beta1/features`;
  } else {
    // Standard Azure region format
    featuresUrl = `https://${config.region}.api.cognitive.microsoft.com/texttospeech/v3.0-beta1/features`;
  }

  console.log('Querying features from:', featuresUrl);

  const response = await fetch(featuresUrl, {
    method: 'GET',
    headers: {
      'Ocp-Apim-Subscription-Key': config.apiKey,
    },
  });

  const features = await handleResponse<string[]>(response);
  console.log('Available features:', features);
  
  return features;
}

/**
 * Check if a specific feature is enabled for the speech resource
 */
export async function hasFeature(
  config: PodcastApiConfig,
  featureName: string
): Promise<boolean> {
  try {
    const features = await queryFeatures(config);
    return features.includes(featureName);
  } catch (error) {
    console.warn(`Failed to check feature ${featureName}:`, error);
    return false;
  }
}

/**
 * Check if a voice is for TwoHosts mode (contains "multitalker" case-insensitive)
 * MultiTalker voices support ALL TwoHosts-compatible target languages.
 * The locale in the voice name indicates the speaker's origin locale, not the synthesis target.
 */
export function isTwoHostsVoice(voice: Voice): boolean {
  return voice.name.toLowerCase().includes('multitalker') || 
         voice.shortName.toLowerCase().includes('multitalker');
}

/**
 * Check if voice should be hidden from ACC portal
 */
function isVoiceHidden(voice: Voice): boolean {
  // Check if isHiddenFromAccPortal property is set to true
  return voice.properties.isHiddenFromAccPortal === true;
}

/**
 * Check if voice is in private preview
 */
function isPrivatePreview(voice: Voice): boolean {
  return voice.properties.ReleaseScope === 'PrivatePreview';
}

/**
 * Check if voice has speaker tags (femaleSpeakers or maleSpeakers)
 */
function hasSpeakerTags(voice: Voice): boolean {
  if (!voice.voiceTags || voice.voiceTags.length === 0) {
    return false;
  }
  
  return voice.voiceTags.some(tag => 
    tag.name === 'femaleSpeakers' || tag.name === 'maleSpeakers'
  );
}

/**
 * Filter voices for OneHost mode
 * Excludes multitalker voices, hidden voices, and private preview voices
 */
export function getOneHostVoices(voices: Voice[]): Voice[] {
  return voices.filter(v => !isTwoHostsVoice(v) && !isVoiceHidden(v) && !isPrivatePreview(v));
}

/**
 * Filter voices for TwoHosts mode
 * Includes only multitalker voices that are not hidden, not private preview, and have speaker tags
 * Note: MultiTalker voices support ALL TwoHosts-compatible target languages regardless of their name's locale prefix
 */
export function getTwoHostsVoices(voices: Voice[]): Voice[] {
  return voices.filter(v => isTwoHostsVoice(v) && !isVoiceHidden(v) && !isPrivatePreview(v) && hasSpeakerTags(v));
}
