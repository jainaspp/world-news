import { useEffect, useId, useRef, useState } from 'react';
import type { UiLang } from '../../shared/zh';

const LANGUAGES: { code: UiLang; label: string; short: string }[] = [
  { code: 'zh-HK', label: '繁體中文', short: '繁' },
  { code: 'zh-CN', label: '简体中文', short: '简' },
  { code: 'en', label: 'English', short: 'EN' },
];

interface Props {
  value: UiLang;
  onChange: (code: UiLang) => void;
}

export function LanguageSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = LANGUAGES.find((lang) => lang.code === value) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="lang-wrap" ref={wrapRef}>
      <button
        type="button"
        className="icon-btn"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-label={`Language: ${current.label}`}
        onClick={() => setOpen((valueOpen) => !valueOpen)}
      >
        {current.short}
      </button>
      {open && (
        <ul className="lang-menu" id={listId} role="listbox" aria-label="Display language">
          {LANGUAGES.map((lang) => (
            <li key={lang.code} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={lang.code === value}
                className={lang.code === value ? 'active' : ''}
                onClick={() => {
                  onChange(lang.code);
                  setOpen(false);
                }}
              >
                {lang.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
