const STORYLAND_AGENT_URL = 'https://ai-audiobook-278t0pjfe-lqy123s-projects.vercel.app/';

export function StoryLandAgentPlayground() {
  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <div className="theme-page-header">
        <div className="theme-page-header__inner">
          <div>
            <h1 className="theme-page-title">StoryLand Agent</h1>
            <p className="theme-page-subtitle">Create personalized AI audiobooks for kids with generated stories, scenes, and narration.</p>
          </div>
          <div className="theme-page-header__actions">
            <a className="theme-docs-link" href={STORYLAND_AGENT_URL} target="_blank" rel="noreferrer">
              Open App
            </a>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 px-4 pb-6 sm:px-7">
        <div className="mx-auto flex min-h-0 w-full max-w-[1440px] overflow-hidden rounded-[1.15rem] border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
          <iframe
            title="StoryLand Agent"
            src={STORYLAND_AGENT_URL}
            className="h-full min-h-[720px] w-full border-0 bg-white"
            allow="autoplay; clipboard-read; clipboard-write; fullscreen; microphone"
          />
        </div>
      </div>
    </div>
  );
}