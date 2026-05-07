import React, { useEffect, useState } from 'react';
import { AzureSettings, PlaygroundMode } from '../types/azure';
import { BUILD_TIMESTAMP } from '../buildTimestamp';
import { SIDEBAR_CONFIG_ATTENTION_EVENT } from '../utils/sidebarConfigAttention';

interface NavigationSidebarProps {
  activeMode: PlaygroundMode;
  onModeChange: (mode: PlaygroundMode) => void;
  settings: AzureSettings;
  onSettingsChange: (settings: Partial<AzureSettings>) => void;
  geminiLiveEnabled?: boolean;
  themeMode: 'light' | 'dark';
  onThemeToggle: () => void;
}

export const ALL_TTS_REGIONS = [
  // Americas
  { value: 'brazilsouth', label: 'Brazil South' },
  { value: 'canadacentral', label: 'Canada Central' },
  { value: 'canadaeast', label: 'Canada East' },
  { value: 'centralus', label: 'Central US' },
  { value: 'eastus', label: 'East US' },
  { value: 'eastus2', label: 'East US 2' },
  { value: 'northcentralus', label: 'North Central US' },
  { value: 'southcentralus', label: 'South Central US' },
  { value: 'westcentralus', label: 'West Central US' },
  { value: 'westus', label: 'West US' },
  { value: 'westus2', label: 'West US 2' },
  { value: 'westus3', label: 'West US 3' },

  // Europe
  { value: 'francecentral', label: 'France Central' },
  { value: 'germanywestcentral', label: 'Germany West Central' },
  { value: 'italynorth', label: 'Italy North' },
  { value: 'northeurope', label: 'North Europe' },
  { value: 'norwayeast', label: 'Norway East' },
  { value: 'swedencentral', label: 'Sweden Central' },
  { value: 'switzerlandnorth', label: 'Switzerland North' },
  { value: 'switzerlandwest', label: 'Switzerland West' },
  { value: 'uksouth', label: 'UK South' },
  { value: 'ukwest', label: 'UK West' },
  { value: 'westeurope', label: 'West Europe' },

  // Asia Pacific
  { value: 'australiaeast', label: 'Australia East' },
  { value: 'centralindia', label: 'Central India' },
  { value: 'eastasia', label: 'East Asia' },
  { value: 'japaneast', label: 'Japan East' },
  { value: 'japanwest', label: 'Japan West' },
  { value: 'koreacentral', label: 'Korea Central' },
  { value: 'southeastasia', label: 'Southeast Asia' },

  // Middle East & Africa
  { value: 'qatarcentral', label: 'Qatar Central' },
  { value: 'southafricanorth', label: 'South Africa North' },
  { value: 'uaenorth', label: 'UAE North' },

  // China
  { value: 'chinanorth3', label: 'China North 3' },
];

const playgroundModes: { mode: PlaygroundMode; label: string; icon: React.ReactNode; category: 'content' | 'agent' }[] = [
  {
    mode: 'voice-creation',
    label: 'Voice Creation',
    category: 'content',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
  },
  {
    mode: 'text-to-speech',
    label: 'Text to Speech',
    category: 'content',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  {
    mode: 'multi-talker',
    label: 'Multi Talker',
    category: 'content',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    mode: 'voice-changer',
    label: 'Voice Changer',
    category: 'content',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    mode: 'speech-to-text',
    label: 'Speech to Text',
    category: 'content',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      </svg>
    ),
  },
  {
    mode: 'video-translation',
    label: 'Video Translation',
    category: 'content',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    mode: 'podcast-agent',
    label: 'Podcast Agent',
    category: 'agent',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  {
    mode: 'voice-live-chat',
    label: 'Voice Live Chat',
    category: 'agent',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    mode: 'voice-live-translator',
    label: 'Voice Live Translator',
    category: 'agent',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
    ),
  },
  {
    mode: 'storyland-agent',
    label: 'StoryLand Agent',
    category: 'agent',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18s-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    mode: 'gemini-live',
    label: 'Gemini Live',
    category: 'agent',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

export function NavigationSidebar({
  activeMode,
  onModeChange,
  settings,
  onSettingsChange,
  geminiLiveEnabled = false,
  themeMode,
  onThemeToggle,
}: NavigationSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const logoSrc = `${import.meta.env.BASE_URL}azure-logo.png`;
  const buildDateLabel = BUILD_TIMESTAMP.split('T')[0];

  const isVoiceLiveMode = activeMode === 'voice-live-chat' || activeMode === 'voice-live-translator';
  const supportsSidebarConfig = activeMode !== 'gemini-live' && activeMode !== 'voice-live-calculator' && activeMode !== 'storyland-agent';
  const hasSpeechConfig = settings.apiKey.trim() !== '' && settings.region.trim() !== '';
  const hasVoiceLiveConfig = (settings.voiceLiveEndpoint || '').trim() !== '' && (settings.voiceLiveApiKey || '').trim() !== '';
  const needsConfigAttention = supportsSidebarConfig && (isVoiceLiveMode ? !hasVoiceLiveConfig : !hasSpeechConfig);
  const configSectionLabel = isVoiceLiveMode ? 'Voice Live Config' : 'Azure Speech Config';
  const configSectionDescription = isVoiceLiveMode ? 'Endpoint and key for real-time voice agents.' : 'API key and region for Speech Service features.';
  const isFooterConfigOpen = supportsSidebarConfig && isConfigExpanded && !isCollapsed;

  const contentModes = playgroundModes.filter((item) => item.category === 'content');
  const agentModes = playgroundModes.filter(
    (item) => item.category === 'agent' && (item.mode !== 'gemini-live' || geminiLiveEnabled),
  ).sort((left, right) => {
    if (left.mode === 'podcast-agent') return 1;
    if (right.mode === 'podcast-agent') return -1;
    return 0;
  });

  useEffect(() => {
    if (!supportsSidebarConfig) {
      setIsConfigExpanded(false);
      return;
    }

    if (needsConfigAttention) {
      setIsCollapsed(false);
      setIsConfigExpanded(true);
    }
  }, [needsConfigAttention, supportsSidebarConfig]);

  useEffect(() => {
    const handleSidebarAttention = () => {
      if (!supportsSidebarConfig) {
        return;
      }

      setIsCollapsed(false);
      setIsConfigExpanded(true);
    };

    window.addEventListener(SIDEBAR_CONFIG_ATTENTION_EVENT, handleSidebarAttention);
    return () => window.removeEventListener(SIDEBAR_CONFIG_ATTENTION_EVENT, handleSidebarAttention);
  }, [supportsSidebarConfig]);

  const copyPlaygroundLink = (mode: PlaygroundMode) => {
    const url = `${window.location.origin}${window.location.pathname}#${mode}`;

    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url);
      return;
    }

    window.location.hash = mode;
  };

  const handleConfigToggle = () => {
    if (!supportsSidebarConfig) {
      return;
    }

    if (isCollapsed) {
      setIsCollapsed(false);
      setIsConfigExpanded(true);
      return;
    }

    setIsConfigExpanded((expanded) => !expanded);
  };

  return (
    <div
      className={`theme-sidebar w-full transition-[max-height,width] duration-500 ease-out lg:h-full lg:flex-shrink-0 ${
        isCollapsed
          ? 'theme-sidebar--collapsed max-h-[5.75rem] lg:max-h-none lg:w-[5.75rem]'
          : 'theme-sidebar--expanded max-h-[40dvh] lg:max-h-none lg:w-[20rem]'
      }`}
    >
      <div className="theme-sidebar__rail" />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <div className={`border-b border-gray-200 ${isCollapsed ? 'px-3 py-3' : 'px-4 py-4'}`}>
          <div className={`flex ${isCollapsed ? 'flex-col items-center gap-2' : 'items-start gap-3'}`}>
            <div className={`flex flex-shrink-0 items-center justify-center ${isCollapsed ? '' : 'pt-0.5'}`}>
              <img
                src={logoSrc}
                alt="Azure"
                className={`${isCollapsed ? 'h-9 w-9' : 'h-10 w-10'} object-contain`}
              />
            </div>

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="theme-section-label text-[0.62rem] !text-[var(--text-soft)]">AI Voice Lab</p>
                <h1 className="mt-1 text-xl font-bold tracking-tight text-[var(--text-strong)]">Azure Voice Playground</h1>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Production-ready Speech Service and Voice Agent
                </p>
              </div>
            )}

            {!isCollapsed ? (
              <div className="ml-auto flex items-center gap-2 lg:flex-col">
                <button
                  onClick={onThemeToggle}
                  className="theme-icon-button"
                  title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {themeMode === 'dark' ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 3v2.25M12 18.75V21m9-9h-2.25M5.25 12H3m15.114 6.364l-1.591-1.59M7.477 7.477L5.886 5.886m12.228 0l-1.591 1.591M7.477 16.523l-1.591 1.591M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                      />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21.752 15.002A9.718 9.718 0 0112 21c-5.385 0-9.75-4.365-9.75-9.75 0-4.14 2.578-7.678 6.214-9.084a.75.75 0 01.98.94A7.5 7.5 0 0019.894 13.556a.75.75 0 01.94.98 9.72 9.72 0 01-.082.466z"
                      />
                    </svg>
                  )}
                </button>

                <button
                  onClick={() => {
                    if (!isCollapsed) {
                      setIsConfigExpanded(false);
                    }

                    setIsCollapsed((collapsed) => !collapsed);
                  }}
                  className="theme-icon-button"
                  title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  <svg
                    className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsCollapsed((collapsed) => !collapsed)}
                className="theme-icon-button theme-icon-button--compact"
                title="Expand sidebar"
              >
                <svg className="h-4 w-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pb-4">
          <div className="theme-sidebar__section">
            {!isCollapsed && <p className="theme-section-label px-1">Content Generation</p>}
            <nav className="mt-3 space-y-2">
              {contentModes.map(({ mode, label, icon }) => (
                <div
                  key={mode}
                  className={`theme-sidebar__nav-button text-sm ${
                    activeMode === mode ? 'theme-sidebar__nav-button--active' : ''
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <button
                    onClick={() => onModeChange(mode)}
                    title={isCollapsed ? label : undefined}
                    className={`theme-sidebar__nav-action ${isCollapsed ? 'justify-center' : ''}`}
                  >
                    {icon}
                    {!isCollapsed && <span className="truncate">{label}</span>}
                  </button>

                  {!isCollapsed && (
                    <a
                      href={`${window.location.origin}${window.location.pathname}#${mode}`}
                      onClick={(event) => {
                        event.preventDefault();
                        copyPlaygroundLink(mode);
                      }}
                      className="theme-sidebar__copy-link theme-sidebar__copy-link--inline"
                      title="Copy direct link"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </a>
                  )}
                </div>
              ))}
            </nav>
          </div>

          <div className="theme-sidebar__section pt-4">
            {!isCollapsed && <p className="theme-section-label px-1">Voice Agents</p>}
            <nav className="mt-3 space-y-2">
              {agentModes.map(({ mode, label, icon }) => (
                <div
                  key={mode}
                  className={`theme-sidebar__nav-button text-sm ${
                    activeMode === mode ? 'theme-sidebar__nav-button--active' : ''
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <button
                    onClick={() => onModeChange(mode)}
                    title={isCollapsed ? label : undefined}
                    className={`theme-sidebar__nav-action ${isCollapsed ? 'justify-center' : ''}`}
                  >
                    {icon}
                    {!isCollapsed && <span className="truncate">{label}</span>}
                  </button>

                  {!isCollapsed && (
                    <div className="ml-auto flex items-center">
                      {mode === 'voice-live-chat' && (
                        <a
                          href={`${window.location.origin}${window.location.pathname}#voice-live-calculator`}
                          className="theme-sidebar__copy-link theme-sidebar__copy-link--inline"
                          title="Open Voice Live price calculator"
                          aria-label="Open Voice Live price calculator"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-6 4h.01M12 11h.01M15 11h.01M9 15h.01M12 15h.01M15 15h.01M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
                          </svg>
                        </a>
                      )}

                      <a
                        href={`${window.location.origin}${window.location.pathname}#${mode}`}
                        onClick={(event) => {
                          event.preventDefault();
                          copyPlaygroundLink(mode);
                        }}
                        className="theme-sidebar__copy-link theme-sidebar__copy-link--inline"
                        title="Copy direct link"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>

        <div className="theme-footer">
          {supportsSidebarConfig && (
            <div className="theme-footer__config-shell">
              <div
                id="sidebar-configuration-panel"
                aria-hidden={!isFooterConfigOpen}
                className={`theme-footer__config-popover ${isFooterConfigOpen ? 'theme-footer__config-popover--open' : ''}`}
              >
                <div className="theme-footer__config-panel">
                  <p className="theme-section-label px-1">{configSectionLabel}</p>

                  {isVoiceLiveMode ? (
                    <>
                      <div className="mt-4 space-y-2 px-1">
                        <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Endpoint</label>
                        <input
                          type="text"
                          value={settings.voiceLiveEndpoint || ''}
                          onChange={(event) => {
                            onSettingsChange({ voiceLiveEndpoint: event.target.value });
                          }}
                          placeholder="https://{resource}.cognitiveservices.azure.com/"
                          autoComplete="off"
                          className="theme-control theme-control--sm"
                        />
                      </div>

                      <div className="mt-4 space-y-2 px-1">
                        <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">API Key</label>
                        <input
                          type="password"
                          value={settings.voiceLiveApiKey || ''}
                          onChange={(event) => {
                            onSettingsChange({ voiceLiveApiKey: event.target.value });
                          }}
                          placeholder="Enter API key"
                          autoComplete="new-password"
                          data-lpignore="true"
                          data-form-type="other"
                          className="theme-control theme-control--sm"
                        />
                        <a
                          href="https://ai.azure.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="theme-link text-xs"
                        >
                          Get credentials
                        </a>
                      </div>

                      <div className="theme-alert theme-alert--warning mt-5 px-4 py-3">
                        <h3 className="theme-alert__title text-xs font-semibold uppercase tracking-[0.18em]">Security Notice</h3>
                        <p className="theme-alert__body mt-2 text-xs leading-6">
                          Stored in browser localStorage. Don&apos;t use shared or untrusted devices.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mt-4 space-y-2 px-1">
                        <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">API Key</label>
                        <input
                          type="password"
                          value={settings.apiKey}
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            if (nextValue !== settings.apiKey) {
                              onSettingsChange({ apiKey: nextValue });
                            }
                          }}
                          placeholder="Enter API key"
                          autoComplete="new-password"
                          data-lpignore="true"
                          data-form-type="other"
                          className="theme-control theme-control--sm"
                        />
                        <a
                          href="https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/~/SpeechServices"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="theme-link text-xs"
                        >
                          Get API key
                        </a>
                      </div>

                      <div className="mt-4 space-y-2 px-1">
                        <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Region</label>
                        <select
                          value={ALL_TTS_REGIONS.some((region) => region.value === settings.region) ? settings.region : 'custom'}
                          onChange={(event) => {
                            const selectedRegion = event.target.value;
                            if (selectedRegion === 'custom') {
                              onSettingsChange({ region: '' });
                            } else {
                              onSettingsChange({ region: selectedRegion });
                            }
                          }}
                          className="theme-control theme-control--sm"
                        >
                          {ALL_TTS_REGIONS.map((region) => (
                            <option key={region.value} value={region.value}>
                              {region.label}
                            </option>
                          ))}
                          <option value="custom">Custom...</option>
                        </select>

                        {!ALL_TTS_REGIONS.some((region) => region.value === settings.region) && (
                          <input
                            type="text"
                            value={settings.region}
                            onChange={(event) => onSettingsChange({ region: event.target.value })}
                            placeholder="e.g., eastus, westeurope"
                            autoFocus
                            className="theme-control theme-control--sm"
                          />
                        )}
                      </div>

                      <div className="theme-alert theme-alert--warning mt-5 px-4 py-3">
                        <h3 className="theme-alert__title text-xs font-semibold uppercase tracking-[0.18em]">Security Notice</h3>
                        <p className="theme-alert__body mt-2 text-xs leading-6">
                          Stored in browser localStorage. Don&apos;t use shared or untrusted devices.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={handleConfigToggle}
                title={isCollapsed ? 'Open configuration' : undefined}
                aria-expanded={isFooterConfigOpen}
                aria-controls="sidebar-configuration-panel"
                className={`theme-footer__config-trigger ${needsConfigAttention ? 'theme-footer__config-trigger--attention' : ''} ${isFooterConfigOpen ? 'theme-footer__config-trigger--open' : ''} ${isCollapsed ? 'theme-footer__config-trigger--compact' : ''}`}
              >
                <div className={`theme-footer__config-content ${isCollapsed ? 'justify-center' : ''}`}>
                  <span className="theme-footer__config-gear" aria-hidden="true">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>

                  {!isCollapsed && (
                    <div className="min-w-0 text-left">
                      <p className="text-sm font-semibold text-[var(--text-strong)]">Configuration</p>
                    </div>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="flex items-center gap-2">
                    {needsConfigAttention && <span className="theme-footer__config-badge">Required</span>}
                    <svg
                      className={`h-4 w-4 text-[var(--text-muted)] transition-transform duration-300 ${isFooterConfigOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          )}

          {!isCollapsed ? (
            <p className="theme-footer__meta text-center text-[11px] font-medium tracking-[0.08em] text-[var(--text-muted)]">
              Version Date {buildDateLabel}
            </p>
          ) : (
            <div className="theme-footer__meta flex justify-center">
              <span className="text-[10px] font-medium tracking-[0.08em] text-[var(--text-soft)]">{buildDateLabel.slice(5)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
