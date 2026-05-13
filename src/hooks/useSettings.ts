import { useState, useEffect } from 'react';
import { AzureSettings } from '../types/azure';

const STORAGE_KEY = 'azure-tts-settings';
const API_KEYS_STORAGE_KEY = 'azure-tts-api-keys';
const VOICE_LIVE_STORAGE_KEY = 'azure-voice-live-settings';

const DEFAULT_SETTINGS: AzureSettings = {
  apiKey: '',
  region: 'eastus',
  selectedVoice: 'en-US-JennyNeural',
  voiceLiveEndpoint: '',
  voiceLiveApiKey: '',
};

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

// Load Voice Live settings from localStorage
function loadVoiceLiveSettings(): { endpoint: string; apiKey: string } {
  try {
    const stored = localStorage.getItem(VOICE_LIVE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as { endpoint?: string; apiKey?: string };
      return {
        endpoint: parsed.endpoint || '',
        apiKey: parsed.apiKey && !looksLikeUrl(parsed.apiKey) ? parsed.apiKey : '',
      };
    }
  } catch (error) {
    console.error('Failed to load Voice Live settings from localStorage:', error);
  }
  return { endpoint: '', apiKey: '' };
}

// Save Voice Live settings to localStorage
function saveVoiceLiveSettings(endpoint: string, apiKey: string) {
  try {
    localStorage.setItem(VOICE_LIVE_STORAGE_KEY, JSON.stringify({ endpoint, apiKey: looksLikeUrl(apiKey) ? '' : apiKey }));
  } catch (error) {
    console.error('Failed to save Voice Live settings to localStorage:', error);
  }
}

// Load API keys from localStorage
function loadApiKeys(): Record<string, string> {
  try {
    const stored = localStorage.getItem(API_KEYS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load API keys from localStorage:', error);
  }
  return {};
}

// Save API keys to localStorage
function saveApiKeys(apiKeys: Record<string, string>) {
  try {
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(apiKeys));
  } catch (error) {
    console.error('Failed to save API keys to localStorage:', error);
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<AzureSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const apiKeys = loadApiKeys();
      const voiceLiveSettings = loadVoiceLiveSettings();

      console.log('=== LOADING SETTINGS ===');

      // Mask all API keys before logging
      const maskedKeys: Record<string, string> = {};
      Object.keys(apiKeys).forEach(region => {
        const key = apiKeys[region];
        maskedKeys[region] = key.length > 8
          ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}`
          : '****';
      });
      console.log('Stored API keys by region:', maskedKeys);

      if (stored) {
        const parsedSettings = JSON.parse(stored);
        const region = parsedSettings.region || DEFAULT_SETTINGS.region;
        const apiKey = apiKeys[region] || parsedSettings.apiKey || '';

        // Mask API key for display
        const maskedKey = apiKey.length > 8
          ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`
          : '****';

        console.log('Loading settings for region:', region);
        console.log('Loaded API key:', maskedKey);
        console.log('========================');

        return {
          ...DEFAULT_SETTINGS,
          ...parsedSettings,
          apiKey,
          voiceLiveEndpoint: voiceLiveSettings.endpoint,
          voiceLiveApiKey: voiceLiveSettings.apiKey,
        };
      }

      // Return defaults with Voice Live settings
      return {
        ...DEFAULT_SETTINGS,
        voiceLiveEndpoint: voiceLiveSettings.endpoint,
        voiceLiveApiKey: voiceLiveSettings.apiKey,
      };
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    try {
      // Mask API key for display
      const maskedKey = settings.apiKey.length > 8
        ? `${settings.apiKey.substring(0, 4)}...${settings.apiKey.substring(settings.apiKey.length - 4)}`
        : '****';

      console.log('=== SAVING SETTINGS (useEffect) ===');
      console.log('Region:', settings.region);
      console.log('API Key being saved:', maskedKey);
      console.log('This key will be saved FOR region:', settings.region);
      console.log('===================================');

      // Save settings without API keys
      const { apiKey, voiceLiveEndpoint, voiceLiveApiKey, ...settingsWithoutKeys } = settings;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsWithoutKeys));

      // Save API key by region
      if (apiKey) {
        const apiKeys = loadApiKeys();
        apiKeys[settings.region] = apiKey;
        saveApiKeys(apiKeys);
        console.log(`✅ API key ${maskedKey} saved for region: ${settings.region}`);
      }

      // Save Voice Live settings
      if (voiceLiveEndpoint || voiceLiveApiKey) {
        saveVoiceLiveSettings(voiceLiveEndpoint || '', voiceLiveApiKey || '');
      }
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }
  }, [settings]);

  const updateSettings = (partial: Partial<AzureSettings>) => {
    const sanitizedPartial = { ...partial };
    if (sanitizedPartial.voiceLiveApiKey && looksLikeUrl(sanitizedPartial.voiceLiveApiKey)) {
      console.warn('Ignoring Voice Live API key update because the value looks like a URL.');
      sanitizedPartial.voiceLiveApiKey = '';
    }

    // Log stack trace to see who's calling this
    console.log('=== UPDATE SETTINGS CALLED ===');
    console.trace('Called from:');

    setSettings((prev) => {
      const maskedPrevKey = prev.apiKey.length > 8
        ? `${prev.apiKey.substring(0, 4)}...${prev.apiKey.substring(prev.apiKey.length - 4)}`
        : '****';

      console.log('Previous settings:', { region: prev.region, apiKey: maskedPrevKey });

      // Mask the partial update if it contains an API key
      const maskedPartial = { ...sanitizedPartial };
      if (sanitizedPartial.apiKey) {
        const key = sanitizedPartial.apiKey;
        maskedPartial.apiKey = key.length > 8
          ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}`
          : '****';
      }
      console.log('Partial update:', maskedPartial);

      const newSettings = { ...prev, ...sanitizedPartial };

      // If region is changing, load the API key for the new region
      // BUT only if apiKey is not being explicitly updated in this call
      if (sanitizedPartial.region && sanitizedPartial.region !== prev.region && !sanitizedPartial.apiKey) {
        const apiKeys = loadApiKeys();
        const regionKey = apiKeys[sanitizedPartial.region] || '';
        newSettings.apiKey = regionKey;

        const maskedOldKey = prev.apiKey.length > 8
          ? `${prev.apiKey.substring(0, 4)}...${prev.apiKey.substring(prev.apiKey.length - 4)}`
          : '****';
        const maskedNewKey = regionKey.length > 8
          ? `${regionKey.substring(0, 4)}...${regionKey.substring(regionKey.length - 4)}`
          : '****';

        console.log(`🔄 Region changed from "${prev.region}" to "${sanitizedPartial.region}"`);
        console.log(`🔑 Loading saved API key for "${sanitizedPartial.region}": ${maskedOldKey} → ${maskedNewKey}`);
        if (!regionKey) {
          console.warn(`⚠️ No API key found for region "${sanitizedPartial.region}" - you'll need to enter one`);
        }
      }

      console.log('New settings:', {
        region: newSettings.region,
        apiKey: newSettings.apiKey.length > 8
          ? `${newSettings.apiKey.substring(0, 4)}...${newSettings.apiKey.substring(newSettings.apiKey.length - 4)}`
          : '****'
      });
      console.log('==============================');

      return newSettings;
    });
  };

  const isConfigured = settings.apiKey.length > 0 && settings.region.length > 0;

  // Debug helper - expose localStorage management
  const clearRegionKey = (region: string) => {
    const apiKeys = loadApiKeys();
    delete apiKeys[region];
    saveApiKeys(apiKeys);
    console.log(`🗑️ Cleared API key for region: ${region}`);
    console.log('Remaining keys:', apiKeys);
  };

  const clearAllKeys = () => {
    localStorage.removeItem(API_KEYS_STORAGE_KEY);
    console.log('🗑️ Cleared all API keys from localStorage');
  };

  // Make these available globally for debugging
  if (typeof window !== 'undefined') {
    (window as any).debugSettings = {
      clearRegionKey,
      clearAllKeys,
      viewKeys: () => {
        console.log('Current API keys in localStorage:', loadApiKeys());
      }
    };
  }

  return {
    settings,
    updateSettings,
    isConfigured,
  };
}
