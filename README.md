# Azure Voice Playground

A feature-rich web application showcasing Microsoft Azure's voice and speech AI capabilities. Built with React, TypeScript, and Tailwind CSS.

**Live Demo**: [https://szhaomsft.github.io/AzureVoicePlayground/](https://szhaomsft.github.io/AzureVoicePlayground/)

## Features

### Content Generation

| Feature | Description |
|---------|-------------|
| **Voice Creation** | Create custom AI voices from audio samples. Record consent and voice samples, train personal voice models (DragonLatestNeural, PhoenixLatestNeural). Supports 10 locales |
| **Text to Speech** | Convert text to speech with 400+ premium Azure voices. Word highlighting, SSML support, voice styles, adjustable rate/pitch/volume, voice filtering by language/gender/type, MP3 export. 90+ locales |
| **Multi Talker** | Generate multi-speaker conversations with automatic SSML generation and turn-taking. 9 languages with pre-built presets. Uses DragonHDLatestNeural model |
| **Voice Changer** | Transform audio to different voices using 28+ conversion targets including Turbo Multilingual models. Supports audio upload and download |
| **Speech to Text** | Transcribe audio with 4 models: Realtime (145 locales), Fast Transcription (95 languages), LLM Speech, and Whisper. Speaker diarization, word-level timestamps, WER testing, export to TXT/SRT/VTT |
| **Video Translation** | Translate video content with voice dubbing and lip-sync. Subtitle generation, speaker count configuration, iteration support for refinement |
| **Podcast Agent** | AI-powered podcast generation from text, URLs, or files. OneHost/TwoHosts modes, 3 styles, 5 length options, multi-talker voice pairs. Supports 14 locales. Video generation with Bing wallpaper backgrounds |

### Voice Agent

| Feature | Description |
|---------|-------------|
| **Voice Live Chat** | Real-time voice conversation with AI via WebRTC. Avatar support (video/photo with lip-sync), client-side VAD, accurate response latency tracking, function calling, 14+ languages |
| **Voice Live Translator** | Real-time voice translation with metrics dashboard tracking latency, tokens, and cost per conversation |

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite 6, Tailwind CSS
- **Azure SDKs**:
  - `@azure/ai-voicelive` - Real-time voice chat and translation via WebRTC
  - `microsoft-cognitiveservices-speech-sdk` - TTS, STT, multi-talker, voice conversion, personal voice
- **AI Libraries**:
  - `@ricky0123/vad-web` - Client-side Voice Activity Detection (ONNX v5 model)
- **Other**: PDF.js for document extraction, gh-pages for deployment

## Azure Services Used

- **Azure Speech Services** - TTS (400+ voices), STT (4 models), Voice Conversion, Multi-talker, Personal Voice
- **Azure Voice Live** - Real-time voice chat, Translation, Avatars via WebRTC
- **Azure Podcast API** (2026-01-01-preview) - AI podcast generation with multi-speaker synthesis
- **Azure Video Translation API** (2024-05-20-preview) - Video dubbing with lip-sync
- **Azure OpenAI** (Optional) - Podcast script generation from documents
- **Azure Blob Storage** (Optional) - Voice changer audio storage

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## Configuration

Configure in the sidebar settings panel:

**Content Generation:**
- Azure Speech API Key
- Region (35+ regions supported including China North 3)

**Voice Agent:**
- Voice Live Endpoint
- Voice Live API Key

**Optional:**
- Azure OpenAI endpoint/key (for podcast AI script generation)
- Azure Blob Storage connection (for voice changer)

## Supported Regions

| Area | Regions |
|------|---------|
| **Americas** | Brazil South, Canada Central/East, Central US, East US, East US 2, North/South/West Central US, West US/2/3 |
| **Europe** | France Central, Germany West Central, Italy North, North Europe, Norway East, Sweden Central, Switzerland North/West, UK South/West, West Europe |
| **Asia Pacific** | Australia East, Central India, East Asia, Japan East/West, Korea Central, Southeast Asia |
| **Middle East & Africa** | Qatar Central, South Africa North, UAE North |
| **China** | China North 3 |

**Podcast Agent regions**: eastus, westeurope, southeastasia

## Performance Metrics

### Response Latency Tracking

Voice Live Chat playground features accurate response latency measurement with client-side VAD:

**Components of Total Latency:**
1. **VAD Delay** (~500ms): Time from user's last speech to VAD detecting speech end
2. **Service Latency**: Time from VAD detection to audio playback start
3. **Total User-Perceived Latency**: VAD delay + service latency

**VAD Configuration:**
- Model: v5 (ONNX Runtime with WASM backend)
- Silence threshold: 500ms (`redemptionMs`)
- Speech detection threshold: 0.8 (`positiveSpeechThreshold`)
- Pre-speech padding: 100ms
- Minimum speech duration: 250ms
- Initial audio buffer: 50ms for smooth playback

**Measurement Accuracy:**
- Uses Web Audio API's audio context timing for precise scheduling
- Tracks actual playback start time, not just when audio chunks arrive
- VAD pauses during assistant playback to prevent false detection
- Latency displayed in message format: `Xms (service) + Yms (VAD) = Zms (total)`

Enable in settings: **Show response latency**

## Multi-Talker Voice Names

The Podcast Agent uses the following multi-talker voices:

| Voice Name | Speakers | Language |
|------------|----------|----------|
| `en-Multitalker-1:DragonHDLatestNeural` (Default) | ava, ada, emma, jane, andrew, brian, davis, steffan | English |
| `zh-CN-Multitalker-Xiaochen-Yunhan:DragonHDLatestNeural` | xiaochen, yunhan | Chinese |

## URL Routing

Direct links to playgrounds via URL hash:

- `#voice-creation`
- `#text-to-speech`
- `#multi-talker`
- `#voice-changer`
- `#speech-to-text`
- `#video-translation`
- `#podcast-agent`
- `#voice-live-chat`
- `#voice-live-translator`

## Project Structure

```
src/
├── components/              # React components
│   ├── VoiceCreationPlayground.tsx
│   ├── TextToSpeechPlayground.tsx
│   ├── MultiTalkerPlayground.tsx
│   ├── VoiceChangerPlayground.tsx
│   ├── SpeechToTextPlayground.tsx
│   ├── VideoTranslationPlayground.tsx
│   ├── PodcastAgentPlayground.tsx
│   ├── VoiceLiveChatPlayground.tsx
│   ├── VoiceLiveTranslatorPlayground.tsx
│   ├── NavigationSidebar.tsx
│   └── ...                  # Shared UI components
├── hooks/                   # Custom React hooks
│   ├── useAzureTTS.ts
│   ├── useRealtimeSTT.ts
│   ├── useFastTranscription.ts
│   ├── useWhisperTranscription.ts
│   ├── useLLMSpeech.ts
│   ├── useMultiTalkerTTS.ts
│   ├── useVoiceConversion.ts
│   ├── usePodcastGeneration.ts
│   ├── useVideoTranslation.ts
│   ├── useSynthesizerPool.ts
│   ├── useSettings.ts
│   ├── useHistoryStorage.ts
│   └── ...                  # History & feature hooks
├── lib/                     # API clients and utilities
│   ├── voiceLive/           # Voice Live WebRTC client + audio
│   │   ├── chatClient.ts
│   │   ├── interpreter.ts
│   │   ├── metrics.ts
│   │   └── audio/           # PCM player, mic capture, audio handler
│   ├── podcast/             # Podcast API client + video renderer
│   ├── videoTranslation/    # Video translation client
│   ├── personalVoice/       # Personal voice API client
│   └── tts/                 # Synthesizer pool for efficient TTS
├── types/                   # TypeScript type definitions
│   ├── azure.ts
│   ├── podcast.ts
│   ├── multiTalker.ts
│   ├── stt.ts
│   ├── videoTranslation.ts
│   ├── voiceConversion.ts
│   ├── personalVoice.ts
│   └── history.ts
├── utils/                   # Utilities
│   ├── voiceList.ts         # Voice fetching and filtering
│   ├── sttLanguages.ts      # STT language definitions
│   ├── podcastPresets.ts    # Multi-language podcast presets
│   ├── audioConversion.ts   # Audio format conversion
│   ├── blobStorage.ts       # Azure Blob Storage helpers
│   ├── azureOpenAI.ts       # Azure OpenAI integration
│   ├── werCalculation.ts    # Word Error Rate calculation
│   ├── sttExport.ts         # Transcript export (TXT/SRT/VTT)
│   └── ...
└── App.tsx                  # Main app with routing
```

## License

MIT
