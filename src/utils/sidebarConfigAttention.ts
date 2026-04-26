export const SIDEBAR_CONFIG_ATTENTION_EVENT = 'azure-voice-sidebar-config-attention';

export function notifySidebarConfigAttention() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(SIDEBAR_CONFIG_ATTENTION_EVENT));
}