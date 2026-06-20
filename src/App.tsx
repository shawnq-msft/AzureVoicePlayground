import React, { useState, useEffect } from 'react';
import { useSettings } from './hooks/useSettings';
import { useHistoryStorage } from './hooks/useHistoryStorage';
import { useConversionHistoryStorage } from './hooks/useConversionHistoryStorage';
import { useMultiTalkerHistoryStorage } from './hooks/useMultiTalkerHistoryStorage';
import { useSTTHistoryStorage } from './hooks/useSTTHistoryStorage';
import { PlaygroundMode } from './types/azure';
import { NavigationSidebar } from './components/NavigationSidebar';
import { TextToSpeechPlayground } from './components/TextToSpeechPlayground';
import { SpeechToTextPlayground } from './components/SpeechToTextPlayground';
import { VoiceChangerPlayground } from './components/VoiceChangerPlayground';
import { MultiTalkerPlayground } from './components/MultiTalkerPlayground';
import { VoiceLiveTranslatorPlayground } from './components/VoiceLiveTranslatorPlayground';
import { VoiceLiveChatPlayground } from './components/VoiceLiveChatPlayground';
import { VoiceCreationPlayground } from './components/VoiceCreationPlayground';
import { VideoTranslationPlayground } from './components/VideoTranslationPlayground';
import { GeminiLivePlayground } from './components/GeminiLivePlayground';

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

function App() {
  const { settings, updateSettings, isConfigured } = useSettings();
  const [activePlayground, setActivePlayground] = useState<PlaygroundMode>(getInitialModeFromHash);

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

  // Lift history state to App level so it persists when switching playgrounds
  const ttsHistory = useHistoryStorage();
  const conversionHistory = useConversionHistoryStorage();
  const multiTalkerHistory = useMultiTalkerHistoryStorage();
  const sttHistory = useSTTHistoryStorage();

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
      case 'gemini-live':
        return <GeminiLivePlayground />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-white">
      {/* Left Navigation Sidebar */}
      <NavigationSidebar
        activeMode={activePlayground}
        onModeChange={setActivePlayground}
        settings={settings}
        onSettingsChange={updateSettings}
        geminiLiveEnabled={geminiLiveEnabled}
      />

      {/* Main Playground Area */}
      {renderPlayground()}
    </div>
  );
}

export default App;
