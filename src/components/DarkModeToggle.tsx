import { useEffect, useState } from 'react';

export function DarkModeToggle() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // 與 App.tsx 保持一致：使用 classList
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.removeAttribute('data-theme'); // 清除衝突
    localStorage.setItem('darkMode', String(dark));
  }, [dark]);

  return (
    <button className="dark-toggle" onClick={() => setDark(d=>!d)} title={dark ? '切換亮色模式' : '切換深色模式'}>
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
