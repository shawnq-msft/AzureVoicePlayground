export const AZURE_SPEECH_DOCS = {
  overview: 'https://learn.microsoft.com/en-us/azure/ai-services/speech-service/',
  textToSpeech: 'https://learn.microsoft.com/en-us/azure/ai-services/speech-service/index-text-to-speech',
  speechToText: 'https://learn.microsoft.com/en-us/azure/ai-services/speech-service/index-speech-to-text',
  customVoice: 'https://learn.microsoft.com/en-us/azure/ai-services/speech-service/custom-neural-voice',
  voiceLive: 'https://learn.microsoft.com/en-us/azure/ai-services/speech-service/voice-live',
  speechTranslation: 'https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-translation',
} as const;

interface PageDocsLinkProps {
  href: string;
}

export function PageDocsLink({ href }: PageDocsLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="theme-docs-link ml-4"
      title="Open Azure Speech API documentation"
    >
      <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
      <span className="text-sm font-medium">API Docs</span>
    </a>
  );
}