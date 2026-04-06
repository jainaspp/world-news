import { useState, useEffect } from 'react';
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const shown = sessionStorage.getItem('install_shown');
    if (shown) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    sessionStorage.setItem('install_shown', '1');
    setVisible(false);
  }

  return (
    <div className="install-banner" role="banner" aria-label="安裝提示">
      <span>📱 將應用加入主畫面，離線也能瀏覽頭條</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleInstall} className="install-yes">安裝</button>
        <button onClick={() => { setVisible(false); sessionStorage.setItem('install_shown', '1'); }} className="install-no">稍後</button>
      </div>
    </div>
  );
}
