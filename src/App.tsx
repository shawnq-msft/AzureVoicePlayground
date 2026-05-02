import React, { useState, useEffect } from 'react';
import { useSettings } from './hooks/useSettings';
import { useHistoryStorage } from './hooks/useHistoryStorage';
import { useConversionHistoryStorage } from './hooks/useConversionHistoryStorage';
import { useMultiTalkerHistoryStorage } from './hooks/useMultiTalkerHistoryStorage';
import { useSTTHistoryStorage } from './hooks/useSTTHistoryStorage';
import { usePodcastHistoryStorage } from './hooks/usePodcastHistoryStorage';
import { PlaygroundMode } from './types/azure';
import { NavigationSidebar } from './components/NavigationSidebar';
import { TextToSpeechPlayground } from './components/TextToSpeechPlayground';
import { SpeechToTextPlayground } from './components/SpeechToTextPlayground';
import { VoiceChangerPlayground } from './components/VoiceChangerPlayground';
import { MultiTalkerPlayground } from './components/MultiTalkerPlayground';
import { VoiceLiveTranslatorPlayground } from './components/VoiceLiveTranslatorPlayground';
import { VoiceLiveChatPlayground } from './components/VoiceLiveChatPlayground';
import { VoiceLiveCalculatorPlayground } from './components/VoiceLiveCalculatorPlayground';
import { VoiceCreationPlayground } from './components/VoiceCreationPlayground';
import { VideoTranslationPlayground } from './components/VideoTranslationPlayground';
import { PodcastAgentPlayground } from './components/PodcastAgentPlayground';
import { GeminiLivePlayground } from './components/GeminiLivePlayground';

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'azure-voice-theme';

// Valid playground modes for URL hash routing
const VALID_MODES: PlaygroundMode[] = [
  'text-to-speech',
  'speech-to-text',
  'voice-changer',
  'multi-talker',
  'voice-creation',
  'video-translation',
  'voice-live-chat',
  'voice-live-translator',
  'voice-live-calculator',
  'podcast-agent',
  'gemini-live',
];

// Get initial playground mode from URL hash
function getInitialModeFromHash(): PlaygroundMode {
  const hash = window.location.hash.slice(1); // Remove the '#'
  if (hash && VALID_MODES.includes(hash as PlaygroundMode)) {
    return hash as PlaygroundMode;
  }
  return 'text-to-speech';
}

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }
  } catch {
    // Ignore localStorage access errors and fall back to system preference.
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function App() {
  const { settings, updateSettings, isConfigured } = useSettings();
  const [activePlayground, setActivePlayground] = useState<PlaygroundMode>(getInitialModeFromHash);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme);

  // Check for geminiLive feature flag in URL
  const urlParams = new URLSearchParams(window.location.search);
  const geminiLiveEnabled = urlParams.has('geminilive');

  // Update URL hash when playground changes
  useEffect(() => {
    window.location.hash = activePlayground;
  }, [activePlayground]);

  // Listen for hash changes (browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && VALID_MODES.includes(hash as PlaygroundMode)) {
        setActivePlayground(hash as PlaygroundMode);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    root.dataset.theme = themeMode;
    root.classList.toggle('dark', themeMode === 'dark');

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      // Ignore localStorage write errors.
    }
  }, [themeMode]);

  // Lift history state to App level so it persists when switching playgrounds
  const ttsHistory = useHistoryStorage();
  const conversionHistory = useConversionHistoryStorage();
  const multiTalkerHistory = useMultiTalkerHistoryStorage();
  const sttHistory = useSTTHistoryStorage();
  const podcastHistory = usePodcastHistoryStorage();

  const handleThemeToggle = () => {
    setThemeMode((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  const renderPlayground = () => {
    switch (activePlayground) {
      case 'text-to-speech':
        return (
          <TextToSpeechPlayground
            settings={settings}
            onSettingsChange={updateSettings}
            isConfigured={isConfigured}
            history={ttsHistory.history}
            addToHistory={ttsHistory.addToHistory}
            removeFromHistory={ttsHistory.removeFromHistory}
            clearHistory={ttsHistory.clearHistory}
          />
        );
      case 'speech-to-text':
        return (
          <SpeechToTextPlayground
            settings={settings}
            onSettingsChange={updateSettings}
            isConfigured={isConfigured}
            history={sttHistory.history}
            addToHistory={sttHistory.addToHistory}
            removeFromHistory={sttHistory.removeFromHistory}
            clearHistory={sttHistory.clearHistory}
          />
        );
      case 'voice-changer':
        return (
          <VoiceChangerPlayground
            settings={settings}
            onSettingsChange={updateSettings}
            isConfigured={isConfigured}
            history={conversionHistory.history}
            addToHistory={conversionHistory.addToHistory}
            removeFromHistory={conversionHistory.removeFromHistory}
            clearHistory={conversionHistory.clearHistory}
          />
        );
      case 'multi-talker':
        return (
          <MultiTalkerPlayground
            settings={settings}
            onSettingsChange={updateSettings}
            isConfigured={isConfigured}
            history={multiTalkerHistory.history}
            addToHistory={multiTalkerHistory.addToHistory}
            removeFromHistory={multiTalkerHistory.removeFromHistory}
            clearHistory={multiTalkerHistory.clearHistory}
          />
        );
      case 'voice-creation':
        return (
          <VoiceCreationPlayground
            settings={settings}
          />
        );
      case 'video-translation':
        return (
          <VideoTranslationPlayground
            settings={settings}
            isConfigured={isConfigured}
          />
        );
      case 'voice-live-chat':
        return (
          <VoiceLiveChatPlayground
            endpoint={settings.voiceLiveEndpoint || ''}
            apiKey={settings.voiceLiveApiKey || ''}
          />
        );
      case 'voice-live-translator':
        return (
          <VoiceLiveTranslatorPlayground
            endpoint={settings.voiceLiveEndpoint || ''}
            apiKey={settings.voiceLiveApiKey || ''}
          />
        );
      case 'voice-live-calculator':
        return <VoiceLiveCalculatorPlayground />;
      case 'podcast-agent':
        return (
          <PodcastAgentPlayground
            settings={settings}
            isConfigured={isConfigured}
            history={podcastHistory.history}
            addToHistory={podcastHistory.addToHistory}
            removeFromHistory={podcastHistory.removeFromHistory}
            clearHistory={podcastHistory.clearHistory}
          />
        );
      case 'gemini-live':
        return <GeminiLivePlayground />;
      default:
        return null;
    }
  };

  return (
    <div className="theme-shell">
      <div className="theme-shell__halo theme-shell__halo--primary" />
      <div className="theme-shell__halo theme-shell__halo--secondary" />
      <div className="theme-shell__halo theme-shell__halo--tertiary" />
      <div className="theme-shell__noise" />

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-3 p-3 md:gap-4 md:p-4 lg:flex-row lg:p-5">
        <NavigationSidebar
          activeMode={activePlayground}
          onModeChange={setActivePlayground}
          settings={settings}
          onSettingsChange={updateSettings}
          geminiLiveEnabled={geminiLiveEnabled}
          themeMode={themeMode}
          onThemeToggle={handleThemeToggle}
        />

        <main className="theme-stage min-h-0 flex-1">
          <div className="theme-stage__inner">{renderPlayground()}</div>
        </main>
      </div>
    </div>
  );
}

export default App;
