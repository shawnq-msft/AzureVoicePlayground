// Podcast script presets for Multi Talker
// Format: Each line is "speaker: text"

export interface PodcastPreset {
  locale: string;
  language: string;
  speakers: string[];
  script: string;
}

// Tier 1 languages: English, Chinese, Japanese, German, French, Spanish, Portuguese, Italian, Korean
export const PODCAST_PRESETS: PodcastPreset[] = [
  {
    locale: 'zh-CN',
    language: 'Chinese (Simplified)',
    speakers: ['xiaochen', 'yunhan'],
    script: `xiaochen: 大家好!我是小晨,今天要和大家聊一篇关于语音合成的技术报告。
yunhan: 嗨小晨!我是云涵。今天的主题是什么?
xiaochen: 我们要介绍最新的语音合成技术,这是一个非常有趣的领域。
yunhan: 听起来很有趣!能给我们简单介绍一下吗?
xiaochen: 当然可以。现代语音合成技术使用深度学习模型,可以生成非常自然的语音。
yunhan: 嗯,这确实很棒。那这项技术有什么实际应用呢?
xiaochen: 应用场景非常丰富!比如有声读物、虚拟助手、视频配音等等。
yunhan: 太棒了!谢谢小晨的分享!
xiaochen: 不客气云涵!我们下次见!
yunhan: 下次见!`,
  },
  {
    locale: 'en-US',
    language: 'English (US)',
    speakers: ['speaker1', 'speaker2'],
    script: `speaker1: Welcome back! We're talking about making voice a "first-class citizen" for AI agents—it's, uh, way more than just adding a microphone button.
speaker2: Exactly. It has to be easy to enable and, um, truly enterprise-ready. If it doesn't perform at scale—like handling thousands of calls—it's just a toy.
speaker1: So what are the, uh, the pillars for making that happen?
speaker2: There are five. First is Platform Enablement—the "plumbing." Then Latency, because even a tiny lag kills the vibe. You need it to feel… instantaneous.
speaker1: And the "human" side of it?
speaker2: That's Model Quality. Top-tier STT, TTS, and Avatars. If the voice sounds robotic or the face doesn't match the words, you lose the user.
speaker1: What about the folks building it?
speaker2: Developer Experience (DX) is huge. It has to be seamless to deploy. And finally, COGS. The economics have to work at scale, or it's just not sustainable for a real business.
speaker1: It's a lot to balance, but that's how you get from a "demo" to something, uh, actually magic.
speaker2: ha ha ha, Precisely. It's all about being… um, reliable every single day.`,
  },
  {
    locale: 'ja-JP',
    language: 'Japanese',
    speakers: ['speaker1', 'speaker2'],
    script: `speaker1: 皆さん、こんにちは!テックトークへようこそ。今日は人工知能について話しましょう。
speaker2: お招きいただきありがとうございます!AIは本当に興味深いトピックですね。
speaker1: そうですね!現代のAIがなぜこれほど強力なのか説明していただけますか?
speaker2: もちろんです!鍵となるのはディープラーニングで、コンピューターが大量のデータからパターンを学習できます。
speaker1: すごいですね。実用的な応用例にはどのようなものがありますか?
speaker2: 今やAIはどこにでもあります。音声アシスタント、レコメンデーションシステム、自動運転車など。
speaker1: 素晴らしい!AIの未来についてどう思いますか?
speaker2: 日常生活へのさらなる統合が進み、テクノロジーがより直感的で役立つものになると思います。
speaker1: 貴重なご意見をありがとうございました!
speaker2: こちらこそ、番組に呼んでいただきありがとうございました。`,
  },
  {
    locale: 'de-DE',
    language: 'German',
    speakers: ['speaker1', 'speaker2'],
    script: `speaker1: Willkommen bei Tech Talk! Heute sprechen wir über künstliche Intelligenz.
speaker2: Danke für die Einladung! KI ist wirklich ein faszinierendes Thema.
speaker1: Absolut! Können Sie erklären, was moderne KI so leistungsfähig macht?
speaker2: Natürlich! Der Schlüssel ist Deep Learning, das es Computern ermöglicht, Muster aus riesigen Datenmengen zu lernen.
speaker1: Das klingt unglaublich. Welche praktischen Anwendungen gibt es?
speaker2: Wir sehen KI überall - Sprachassistenten, Empfehlungssysteme, autonome Fahrzeuge und mehr.
speaker1: Erstaunlich! Was denken Sie, wie die Zukunft der KI aussieht?
speaker2: Ich glaube, wir werden noch mehr Integration in den Alltag sehen.
speaker1: Vielen Dank für Ihre Einblicke!
speaker2: Gern geschehen! Danke für die Einladung zur Sendung.`,
  },
  {
    locale: 'fr-FR',
    language: 'French',
    speakers: ['speaker1', 'speaker2'],
    script: `speaker1: Bienvenue sur Tech Talk! Aujourd'hui, nous parlons d'intelligence artificielle.
speaker2: Merci de m'avoir invité! L'IA est un sujet vraiment fascinant.
speaker1: Absolument! Pouvez-vous expliquer ce qui rend l'IA moderne si puissante?
speaker2: Bien sûr! La clé est l'apprentissage profond, qui permet aux ordinateurs d'apprendre des modèles à partir de grandes quantités de données.
speaker1: C'est incroyable. Quelles sont les applications pratiques?
speaker2: L'IA est partout maintenant - assistants vocaux, systèmes de recommandation, véhicules autonomes et plus encore.
speaker1: Incroyable! Que pensez-vous de l'avenir de l'IA?
speaker2: Je pense que nous verrons encore plus d'intégration dans la vie quotidienne.
speaker1: Merci pour vos perspectives!
speaker2: Avec plaisir! Merci de m'avoir reçu dans l'émission.`,
  },
  {
    locale: 'es-ES',
    language: 'Spanish',
    speakers: ['speaker1', 'speaker2'],
    script: `speaker1: ¡Bienvenidos a Tech Talk! Hoy hablamos sobre inteligencia artificial.
speaker2: ¡Gracias por invitarme! La IA es un tema realmente fascinante.
speaker1: ¡Absolutamente! ¿Puede explicar qué hace que la IA moderna sea tan poderosa?
speaker2: ¡Por supuesto! La clave es el aprendizaje profundo, que permite a las computadoras aprender patrones de grandes cantidades de datos.
speaker1: Eso suena increíble. ¿Cuáles son las aplicaciones prácticas?
speaker2: La IA está en todas partes ahora: asistentes de voz, sistemas de recomendación, vehículos autónomos y más.
speaker1: ¡Increíble! ¿Qué piensa sobre el futuro de la IA?
speaker2: Creo que veremos aún más integración en la vida diaria.
speaker1: ¡Gracias por compartir sus conocimientos!
speaker2: ¡Con mucho gusto! Gracias por invitarme al programa.`,
  },
  {
    locale: 'pt-BR',
    language: 'Portuguese (Brazil)',
    speakers: ['speaker1', 'speaker2'],
    script: `speaker1: Bem-vindos ao Tech Talk! Hoje vamos falar sobre inteligência artificial.
speaker2: Obrigado pelo convite! IA é um tema realmente fascinante.
speaker1: Com certeza! Você pode explicar o que torna a IA moderna tão poderosa?
speaker2: Claro! A chave é o aprendizado profundo, que permite aos computadores aprender padrões de grandes quantidades de dados.
speaker1: Isso parece incrível. Quais são as aplicações práticas?
speaker2: A IA está em toda parte agora - assistentes de voz, sistemas de recomendação, veículos autônomos e muito mais.
speaker1: Incrível! O que você acha sobre o futuro da IA?
speaker2: Acredito que veremos ainda mais integração na vida cotidiana.
speaker1: Obrigado por compartilhar seus conhecimentos!
speaker2: Foi um prazer! Obrigado por me receber no programa.`,
  },
  {
    locale: 'it-IT',
    language: 'Italian',
    speakers: ['speaker1', 'speaker2'],
    script: `speaker1: Benvenuti a Tech Talk! Oggi parliamo di intelligenza artificiale.
speaker2: Grazie per l'invito! L'IA è un argomento davvero affascinante.
speaker1: Assolutamente! Può spiegare cosa rende l'IA moderna così potente?
speaker2: Certo! La chiave è il deep learning, che permette ai computer di imparare modelli da grandi quantità di dati.
speaker1: Sembra incredibile. Quali sono le applicazioni pratiche?
speaker2: L'IA è ovunque ora - assistenti vocali, sistemi di raccomandazione, veicoli autonomi e altro ancora.
speaker1: Fantastico! Cosa pensa del futuro dell'IA?
speaker2: Credo che vedremo ancora più integrazione nella vita quotidiana.
speaker1: Grazie per aver condiviso le sue intuizioni!
speaker2: È stato un piacere! Grazie per avermi invitato al programma.`,
  },
  {
    locale: 'ko-KR',
    language: 'Korean',
    speakers: ['speaker1', 'speaker2'],
    script: `speaker1: 테크 토크에 오신 것을 환영합니다! 오늘은 인공지능에 대해 이야기해 보겠습니다.
speaker2: 초대해 주셔서 감사합니다! AI는 정말 매력적인 주제입니다.
speaker1: 그렇죠! 현대 AI가 왜 그렇게 강력한지 설명해 주시겠어요?
speaker2: 물론이죠! 핵심은 딥러닝입니다. 컴퓨터가 방대한 양의 데이터에서 패턴을 학습할 수 있게 해줍니다.
speaker1: 정말 대단하네요. 실용적인 응용 분야는 어떤 것들이 있나요?
speaker2: AI는 이제 어디에나 있습니다. 음성 비서, 추천 시스템, 자율주행 차량 등이 있죠.
speaker1: 놀랍습니다! AI의 미래에 대해 어떻게 생각하시나요?
speaker2: 일상생활에 더욱 통합되어 기술이 더 직관적이고 유용해질 것이라고 생각합니다.
speaker1: 통찰력을 공유해 주셔서 감사합니다!
speaker2: 제 기쁨입니다! 프로그램에 초대해 주셔서 감사합니다.`,
  },
];

/**
 * Get a preset by locale
 */
export function getPresetByLocale(locale: string): PodcastPreset | undefined {
  return PODCAST_PRESETS.find(p => p.locale.toLowerCase() === locale.toLowerCase());
}

/**
 * Get the best matching preset for a given voice locale
 */
export function getBestPresetForLocale(locale: string): PodcastPreset {
  // Try exact match
  const exact = getPresetByLocale(locale);
  if (exact) return exact;

  // Try language match (e.g., 'zh-TW' -> 'zh-CN')
  const langCode = locale.split('-')[0].toLowerCase();
  const langMatch = PODCAST_PRESETS.find(p => p.locale.toLowerCase().startsWith(langCode));
  if (langMatch) return langMatch;

  // Default to English
  return PODCAST_PRESETS.find(p => p.locale === 'en-US')!;
}

/**
 * Adapt a preset script to use the actual speaker names from a voice
 */
export function adaptPresetToSpeakers(preset: PodcastPreset, actualSpeakers: string[]): string {
  const script = preset.script;
  const lines = script.split('\n');

  const adaptedLines = lines.map(line => {
    // Check each preset speaker and replace with the corresponding actual speaker
    for (let index = 0; index < preset.speakers.length; index++) {
      const presetSpeaker = preset.speakers[index];
      const regex = new RegExp(`^${presetSpeaker}:`, 'i');
      if (regex.test(line) && index < actualSpeakers.length) {
        return line.replace(regex, `${actualSpeakers[index]}:`);
      }
    }
    return line;
  });

  return adaptedLines.join('\n');
}
