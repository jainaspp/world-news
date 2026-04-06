// Re-export region/topic definitions from newsApi.ts
export { RSS_FEEDS, REGIONS, TOPICS, SOURCE_INFO } from '../utils/newsApi';

// ─── LANGUAGES (needed by LanguageSelector) ─────────────────────
export const LANGUAGES = [
  { code: 'zh-TW', label: '繁體中文', flag: '🇭🇰', nativeLabel: '繁體中文' },
  { code: 'zh-CN', label: '簡體中文', flag: '🇨🇳', nativeLabel: '简体中文' },
  { code: 'en',    label: 'English',  flag: '🇬🇧', nativeLabel: 'English' },
  { code: 'ja',    label: '日本語',   flag: '🇯🇵', nativeLabel: '日本語' },
  { code: 'ko',    label: '한국어',   flag: '🇰🇷', nativeLabel: '한국어' },
  { code: 'es',    label: 'Español', flag: '🇪🇸', nativeLabel: 'Español' },
  { code: 'fr',    label: 'Français', flag: '🇫🇷', nativeLabel: 'Français' },
];

// ─── Legacy alias for backward compatibility ─────────────────────
export { RSS_FEEDS as SOURCE_FEEDS } from '../utils/newsApi';
