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
      const errorBody = await response.json();
      console.error('Podcast API Error Response:', errorBody);
      if (errorBody.error?.message) {
        errorMessage = errorBody.error.message;
      } else if (errorBody.message) {
        errorMessage = errorBody.message;
      } else if (errorBody.error?.code) {
        errorMessage = `${errorBody.error.code}: ${JSON.stringify(errorBody.error)}`;
      }
    } catch {
      // Use default error message
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
  source: PodcastContentSource
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
 * Wait for generation to complete with polling
 */
export async function waitForGenerationComplete(
  config: PodcastApiConfig,
  generationId: string,
  onProgress?: (generation: Generation) => void,
  maxWaitMs: number = 30 * 60 * 1000, // 30 minutes
  pollIntervalMs: number = 3000 // 3 seconds
): Promise<Generation> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    // Fetch current generation status
    const generation = await getGeneration(config, generationId);

    // Call progress callback if provided
    if (onProgress) {
      onProgress(generation);
    }

    // Check for terminal states
    if (generation.status === 'Succeeded') {
      console.log('Generation succeeded:', generationId);
      return generation;
    }

    if (generation.status === 'Failed') {
      const errorMsg = generation.failureReason || 'Generation failed';
      console.error('Generation failed:', errorMsg);
      throw new Error(errorMsg);
    }

    // Log progress
    console.log(`Generation ${generationId} status: ${generation.status}`);

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
  source: PodcastContentSource
): Promise<{ content: PodcastContent; tempFileId?: string }> {
  const content = await prepareContentPayload(config, source);
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
 * Query supported voices for podcast generation
 * Filters by ApiScenarioKind=Podcast
 * Voices with "multitalker" (case insensitive) in name are for TwoHosts
 * Other voices are for OneHost
 */
export async function queryVoices(
  config: PodcastApiConfig,
  locale?: string
): Promise<Voice[]> {
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
  if (locale) {
    return voices.filter(v => v.locale === locale);
  }
  
  return voices;
}

/**
 * Check if a voice is for TwoHosts mode (contains "multitalker" case-insensitive)
 */
export function isTwoHostsVoice(voice: Voice): boolean {
  return voice.name.toLowerCase().includes('multitalker') || 
         voice.shortName.toLowerCase().includes('multitalker');
}

/**
 * Filter voices for OneHost mode
 */
export function getOneHostVoices(voices: Voice[]): Voice[] {
  return voices.filter(v => !isTwoHostsVoice(v));
}

/**
 * Filter voices for TwoHosts mode
 */
export function getTwoHostsVoices(voices: Voice[]): Voice[] {
  return voices.filter(v => isTwoHostsVoice(v));
}
