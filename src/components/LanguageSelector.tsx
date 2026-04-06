import { useState } from 'react';
import { LANGUAGES } from '../data/sources';

interface Props { value: string; onChange: (code: string) => void; }

export function LanguageSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find(l => l.code === value) || LANGUAGES[0];

  return (
    <div className="lang-wrap">
      <button className="lang-btn" onClick={() => setOpen(!open)}>
        {current.flag} {current.label} ▾
      </button>
      {open && (
        <div className="lang-dropdown">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              className={`lang-option${lang.code === value ? ' active' : ''}`}
              onClick={() => { onChange(lang.code); setOpen(false); }}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
              {lang.code === value && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
