import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem('install_shown')) return;
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!prompt) return null;

  function dismiss() {
    sessionStorage.setItem('install_shown', '1');
    setPrompt(null);
  }

  return (
    <div className="install-banner" role="region" aria-label="安裝提示">
      <p>可以將世界頭條加到主畫面。</p>
      <div className="install-actions">
        <button
          type="button"
          className="primary"
          onClick={() => {
            void prompt?.prompt().then(() => dismiss());
          }}
        >
          加入
        </button>
        <button type="button" onClick={dismiss}>
          關閉
        </button>
      </div>
    </div>
  );
}
