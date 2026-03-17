/**
 * Personal Voice API Client for Azure Custom Voice
 *
 * API Reference: https://learn.microsoft.com/rest/api/aiservices/speechapi/operation-groups
 */

import type {
  PersonalVoiceProject,
  Consent,
  PersonalVoice,
  CreateConsentParams,
  CreatePersonalVoiceParams,
  BaseModel,
  DesignVoiceResponse,
} from '../../types/personalVoice';

const API_VERSION = '2024-02-01-preview';

export interface PersonalVoiceClientConfig {
  apiKey: string;
  region: string;
}

function getBaseUrl(region: string): string {
  return `https://${region}.api.cognitive.microsoft.com/customvoice`;
}

function getHeaders(apiKey: string): HeadersInit {
  return {
    'Ocp-Apim-Subscription-Key': apiKey,
  };
}

function getJsonHeaders(apiKey: string): HeadersInit {
  return {
    'Ocp-Apim-Subscription-Key': apiKey,
    'Content-Type': 'application/json',
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API error: ${response.status} ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error?.message) {
        errorMessage = errorJson.error.message;
      } else if (errorJson.message) {
        errorMessage = errorJson.message;
      }
    } catch {
      if (errorText) {
        errorMessage = errorText;
      }
    }
    throw new Error(errorMessage);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

// ============ Base Models ============

export async function listBaseModels(config: PersonalVoiceClientConfig): Promise<BaseModel[]> {
  const url = `${getBaseUrl(config.region)}/basemodels?api-version=${API_VERSION}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(config.apiKey),
  });
  const data = await handleResponse<{ value: BaseModel[] } | BaseModel[]>(response);
  console.log('[PersonalVoice] Raw base models response:', data);
  // Handle both array and object with value property
  const models = Array.isArray(data) ? data : (data.value || []);
  // Filter to only models with PersonalVoice capability
  return models.filter((m) => m.capabilities?.includes('PersonalVoice'));
}

// ============ Projects ============

export async function listProjects(config: PersonalVoiceClientConfig): Promise<PersonalVoiceProject[]> {
  const url = `${getBaseUrl(config.region)}/projects?api-version=${API_VERSION}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(config.apiKey),
  });
  const data = await handleResponse<{ value: PersonalVoiceProject[] }>(response);
  // Filter to only PersonalVoice projects
  return data.value.filter((p) => p.kind === 'PersonalVoice');
}

export async function getProject(
  config: PersonalVoiceClientConfig,
  projectId: string
): Promise<PersonalVoiceProject | null> {
  const url = `${getBaseUrl(config.region)}/projects/${projectId}?api-version=${API_VERSION}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(config.apiKey),
    });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      // For other errors, just return null to trigger project creation
      console.warn(`getProject returned ${response.status}, will create new project`);
      return null;
    }
    return await response.json() as PersonalVoiceProject;
  } catch (error) {
    // Network errors - return null to trigger project creation
    console.warn('getProject failed, will create new project:', error);
    return null;
  }
}

export async function createProject(
  config: PersonalVoiceClientConfig,
  projectId: string,
  description?: string
): Promise<PersonalVoiceProject> {
  const url = `${getBaseUrl(config.region)}/projects/${projectId}?api-version=${API_VERSION}`;
  const body = {
    kind: 'PersonalVoice',
    description: description || 'Personal Voice Playground Project',
  };
  const response = await fetch(url, {
    method: 'PUT',
    headers: getJsonHeaders(config.apiKey),
    body: JSON.stringify(body),
  });
  return handleResponse<PersonalVoiceProject>(response);
}

export async function deleteProject(
  config: PersonalVoiceClientConfig,
  projectId: string,
  forceDelete = false
): Promise<void> {
  let url = `${getBaseUrl(config.region)}/projects/${projectId}?api-version=${API_VERSION}`;
  if (forceDelete) {
    url += '&forceDelete=true';
  }
  const response = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders(config.apiKey),
  });
  await handleResponse<void>(response);
}

// ============ Consents ============

export async function listConsents(
  config: PersonalVoiceClientConfig,
  projectId?: string
): Promise<Consent[]> {
  let url = `${getBaseUrl(config.region)}/consents?api-version=${API_VERSION}`;
  if (projectId) {
    url += `&filter=projectId eq '${projectId}'`;
  }
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(config.apiKey),
  });
  const data = await handleResponse<{ value: Consent[] }>(response);
  return data.value;
}

export async function getConsent(
  config: PersonalVoiceClientConfig,
  consentId: string
): Promise<Consent> {
  const url = `${getBaseUrl(config.region)}/consents/${consentId}?api-version=${API_VERSION}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(config.apiKey),
  });
  return handleResponse<Consent>(response);
}

export async function createConsent(
  config: PersonalVoiceClientConfig,
  params: CreateConsentParams
): Promise<Consent> {
  const url = `${getBaseUrl(config.region)}/consents/${params.consentId}?api-version=${API_VERSION}`;

  const formData = new FormData();
  formData.append('projectId', params.projectId);
  formData.append('voiceTalentName', params.voiceTalentName);
  formData.append('companyName', params.companyName);
  formData.append('locale', params.locale);
  if (params.description) {
    formData.append('description', params.description);
  }
  formData.append('audiodata', params.audioFile, 'consent.wav');

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(config.apiKey),
    body: formData,
  });
  return handleResponse<Consent>(response);
}

export async function deleteConsent(
  config: PersonalVoiceClientConfig,
  consentId: string
): Promise<void> {
  const url = `${getBaseUrl(config.region)}/consents/${consentId}?api-version=${API_VERSION}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders(config.apiKey),
  });
  await handleResponse<void>(response);
}

// ============ Personal Voices ============

export async function listPersonalVoices(
  config: PersonalVoiceClientConfig,
  projectId?: string
): Promise<PersonalVoice[]> {
  let url = `${getBaseUrl(config.region)}/personalvoices?api-version=${API_VERSION}`;
  if (projectId) {
    url += `&filter=projectId eq '${projectId}'`;
  }
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(config.apiKey),
  });
  const data = await handleResponse<{ value: PersonalVoice[] }>(response);
  return data.value;
}

export async function getPersonalVoice(
  config: PersonalVoiceClientConfig,
  personalVoiceId: string
): Promise<PersonalVoice> {
  const url = `${getBaseUrl(config.region)}/personalvoices/${personalVoiceId}?api-version=${API_VERSION}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(config.apiKey),
  });
  return handleResponse<PersonalVoice>(response);
}

export async function createPersonalVoice(
  config: PersonalVoiceClientConfig,
  params: CreatePersonalVoiceParams
): Promise<PersonalVoice> {
  const url = `${getBaseUrl(config.region)}/personalvoices/${params.personalVoiceId}?api-version=${API_VERSION}`;

  const formData = new FormData();
  formData.append('projectId', params.projectId);
  formData.append('consentId', params.consentId);
  if (params.description) {
    formData.append('description', params.description);
  }

  // Append all audio files
  params.audioFiles.forEach((file, index) => {
    formData.append('audiodata', file, `audio_${index}.wav`);
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(config.apiKey),
    body: formData,
  });
  return handleResponse<PersonalVoice>(response);
}

export async function deletePersonalVoice(
  config: PersonalVoiceClientConfig,
  personalVoiceId: string
): Promise<void> {
  const url = `${getBaseUrl(config.region)}/personalvoices/${personalVoiceId}?api-version=${API_VERSION}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders(config.apiKey),
  });
  await handleResponse<void>(response);
}

// ============ Text-Prompt Voice Design ============

export async function designVoice(
  config: PersonalVoiceClientConfig,
  voicePrompt: string,
  sampleText: string,
): Promise<DesignVoiceResponse> {
  const url = `${getBaseUrl(config.region)}/personalvoices:design?api-version=${API_VERSION}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: getJsonHeaders(config.apiKey),
    body: JSON.stringify({
      VoicePrompt: voicePrompt,
      SampleText: sampleText,
      candidateCount: 3,
    }),
  });
  return handleResponse<DesignVoiceResponse>(response);
}

export async function createPersonalVoiceFromCandidate(
  config: PersonalVoiceClientConfig,
  personalVoiceId: string,
  projectId: string,
  candidateId: string,
  displayName: string,
): Promise<PersonalVoice> {
  const url = `${getBaseUrl(config.region)}/personalvoices/${personalVoiceId}?api-version=${API_VERSION}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: getJsonHeaders(config.apiKey),
    body: JSON.stringify({
      projectId,
      candidateId,
      displayName,
    }),
  });
  return handleResponse<PersonalVoice>(response);
}

// ============ Polling Helpers ============

export async function waitForConsentReady(
  config: PersonalVoiceClientConfig,
  consentId: string,
  maxWaitMs = 30000,
  pollIntervalMs = 1000
): Promise<Consent> {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const consent = await getConsent(config, consentId);
    if (consent.status === 'Succeeded' || consent.status === 'Failed') {
      return consent;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  throw new Error('Consent creation timed out');
}

export async function waitForPersonalVoiceReady(
  config: PersonalVoiceClientConfig,
  personalVoiceId: string,
  maxWaitMs = 60000,
  pollIntervalMs = 2000
): Promise<PersonalVoice> {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const voice = await getPersonalVoice(config, personalVoiceId);
    if (voice.status === 'Succeeded' || voice.status === 'Failed') {
      return voice;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  throw new Error('Personal voice creation timed out');
}

// ============ TTS with Personal Voice ============

export function buildPersonalVoiceSsml(
  text: string,
  speakerProfileId: string,
  locale = 'en-US',
  model = 'DragonLatestNeural'
): string {
  return `<speak version='1.0' xml:lang='${locale}' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='http://www.w3.org/2001/mstts'>
  <voice name='${model}'>
    <mstts:ttsembedding speakerProfileId='${speakerProfileId}'/>
    <mstts:express-as style='Prompt'>
      ${text}
    </mstts:express-as>
  </voice>
</speak>`;
}

export async function synthesizeWithPersonalVoice(
  config: PersonalVoiceClientConfig,
  text: string,
  speakerProfileId: string,
  locale = 'en-US',
  model = 'DragonLatestNeural'
): Promise<ArrayBuffer> {
  const ssml = buildPersonalVoiceSsml(text, speakerProfileId, locale, model);
  const url = `https://${config.region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': config.apiKey,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
    },
    body: ssml,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TTS synthesis failed: ${response.status} ${errorText}`);
  }

  return response.arrayBuffer();
}
