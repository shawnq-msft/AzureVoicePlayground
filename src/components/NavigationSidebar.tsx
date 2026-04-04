import React, { useState } from 'react';
import { AzureSettings, PlaygroundMode } from '../types/azure';
import { BUILD_TIMESTAMP, BUILD_COMMIT } from '../buildTimestamp';

interface NavigationSidebarProps {
  activeMode: PlaygroundMode;
  onModeChange: (mode: PlaygroundMode) => void;
  settings: AzureSettings;
  onSettingsChange: (settings: Partial<AzureSettings>) => void;
  geminiLiveEnabled?: boolean;
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
    category: 'content',
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
}: NavigationSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSecurityNotice, setShowSecurityNotice] = useState(false);

  // Determine if current mode is a Voice Agent mode (has its own config panel)
  const isAgentMode = activeMode === 'voice-live-chat' || activeMode === 'voice-live-translator' || activeMode === 'gemini-live';

  return (
    <div
      className={`h-full bg-gray-900 text-white flex flex-col flex-shrink-0 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo / Title with Toggle */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        {!isCollapsed && (
          <div>
            <h1 className="text-lg font-bold text-white">Azure Voice</h1>
            <p className="text-xs text-gray-400">Playground</p>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-1.5 rounded-lg hover:bg-gray-800 transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Content Generation Navigation */}
      <div className="p-3">
        {!isCollapsed && (
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-2">Content Generation</p>
        )}
        <nav className="space-y-1">
          {playgroundModes.filter(m => m.category === 'content').map(({ mode, label, icon }) => (
            <div key={mode} className="flex items-center gap-1">
              <button
                onClick={() => onModeChange(mode)}
                title={isCollapsed ? label : undefined}
                className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                {icon}
                {!isCollapsed && <span>{label}</span>}
              </button>
              {!isCollapsed && (
                <a
                  href={`${window.location.origin}${window.location.pathname}#${mode}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const url = `${window.location.origin}${window.location.pathname}#${mode}`;
                    navigator.clipboard.writeText(url);
                  }}
                  className="p-1.5 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
                  title="Click to copy link"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </a>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Voice Agent Navigation */}
      <div className="p-3 pt-0">
        {!isCollapsed && (
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-2">Voice Agent</p>
        )}
        <nav className="space-y-1">
          {playgroundModes.filter(m => m.category === 'agent' && (m.mode !== 'gemini-live' || geminiLiveEnabled)).map(({ mode, label, icon }) => (
            <div key={mode} className="flex items-center gap-1">
              <button
                onClick={() => onModeChange(mode)}
                title={isCollapsed ? label : undefined}
                className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                {icon}
                {!isCollapsed && <span>{label}</span>}
              </button>
              {!isCollapsed && (
                <a
                  href={`${window.location.origin}${window.location.pathname}#${mode}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const url = `${window.location.origin}${window.location.pathname}#${mode}`;
                    navigator.clipboard.writeText(url);
                  }}
                  className="p-1.5 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
                  title="Click to copy link"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </a>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-700 mx-3 my-2" />

      {/* Azure Configuration - Different for Content vs Agent modes */}
      <div className={`flex-1 overflow-y-auto p-3 ${isCollapsed ? 'hidden' : ''}`}>
        {isAgentMode ? (
          <>
            {/* Voice Agent Config */}
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 px-2">Voice Live Config</p>

            {/* Endpoint */}
            <div className="space-y-2 px-2 mb-4">
              <label className="block text-xs font-medium text-gray-400">Endpoint</label>
              <input
                type="text"
                value={settings.voiceLiveEndpoint || ''}
                onChange={(e) => {
                  const newValue = e.target.value;
                  onSettingsChange({ voiceLiveEndpoint: newValue });
                }}
                placeholder="https://{resource}.cognitiveservices.azure.com/"
                autoComplete="off"
                className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* API Key */}
            <div className="space-y-2 px-2 mb-4">
              <label className="block text-xs font-medium text-gray-400">API Key</label>
              <input
                type="password"
                value={settings.voiceLiveApiKey || ''}
                onChange={(e) => {
                  const newValue = e.target.value;
                  onSettingsChange({ voiceLiveApiKey: newValue });
                }}
                placeholder="Enter API key"
                autoComplete="new-password"
                data-lpignore="true"
                data-form-type="other"
                className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <a
                href="https://ai.azure.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Get credentials
              </a>
            </div>

            {/* Security Warning */}
            <div className="mt-4 bg-yellow-900/30 border border-yellow-700/50 rounded-md overflow-hidden">
              <button
                onClick={() => setShowSecurityNotice(!showSecurityNotice)}
                className="w-full p-3 flex items-center justify-between hover:bg-yellow-900/50 transition-colors"
              >
                <h3 className="text-xs font-semibold text-yellow-400">
                  Security Notice
                </h3>
                <svg
                  className={`w-4 h-4 text-yellow-400 transition-transform ${showSecurityNotice ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showSecurityNotice && (
                <div className="px-3 pb-3">
                  <p className="text-xs text-yellow-200/70">
                    Your credentials are stored in browser localStorage. Never share your key or use on untrusted devices.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Content Generation Config */}
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 px-2">Azure Speech Config</p>

            {/* API Key */}
            <div className="space-y-2 px-2 mb-4">
              <label className="block text-xs font-medium text-gray-400">API Key</label>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => {
                  const newValue = e.target.value;
                  if (newValue !== settings.apiKey) {
                    onSettingsChange({ apiKey: newValue });
                  }
                }}
                placeholder="Enter API key"
                autoComplete="new-password"
                data-lpignore="true"
                data-form-type="other"
                className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <a
                href="https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/~/SpeechServices"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Get API key
              </a>
            </div>

            {/* Region */}
            <div className="space-y-2 px-2">
              <label className="block text-xs font-medium text-gray-400">Region</label>
              <select
                value={ALL_TTS_REGIONS.some(r => r.value === settings.region) ? settings.region : 'custom'}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'custom') {
                    // Set to empty string or a custom placeholder to trigger the input field
                    onSettingsChange({ region: '' });
                  } else {
                    onSettingsChange({ region: value });
                  }
                }}
                className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                {ALL_TTS_REGIONS.map((region) => (
                  <option key={region.value} value={region.value}>
                    {region.label}
                  </option>
                ))}
                <option value="custom">Custom...</option>
              </select>
              {!ALL_TTS_REGIONS.some(r => r.value === settings.region) && (
                <input
                  type="text"
                  value={settings.region}
                  onChange={(e) => onSettingsChange({ region: e.target.value })}
                  placeholder="e.g., eastus, westeurope, etc."
                  autoFocus
                  className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              )}
            </div>

            {/* Security Warning */}
            <div className="mt-6 bg-yellow-900/30 border border-yellow-700/50 rounded-md overflow-hidden">
              <button
                onClick={() => setShowSecurityNotice(!showSecurityNotice)}
                className="w-full p-3 flex items-center justify-between hover:bg-yellow-900/50 transition-colors"
              >
                <h3 className="text-xs font-semibold text-yellow-400">
                  Security Notice
                </h3>
                <svg
                  className={`w-4 h-4 text-yellow-400 transition-transform ${showSecurityNotice ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showSecurityNotice && (
                <div className="px-3 pb-3">
                  <p className="text-xs text-yellow-200/70">
                    Your API key is stored in browser localStorage. Never share your key or use on untrusted devices.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Collapsed state: show config icon */}
      {isCollapsed && (
        <div className="flex-1 flex flex-col items-center pt-2">
          <div
            className="p-2 text-gray-500"
            title="Expand to configure Azure settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-3 border-t border-gray-700">
        {!isCollapsed && (
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>API key stored locally</p>
            <p className="text-gray-600">
              Build: <a
                href={`https://github.com/szhaomsft/AzureVoicePlayground/commit/${BUILD_COMMIT}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >{BUILD_COMMIT}</a>
            </p>
            <p className="text-gray-600">
              {new Date(BUILD_TIMESTAMP).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
