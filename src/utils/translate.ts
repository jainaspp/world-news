import { NewsItem } from '../types';

// ─── 翻譯持久化緩存（localStorage，跨刷新存活）─────────────────────
const TL_CACHE_KEY = 'wn_tl_cache';
const CACHE_MAX = 1000;

function loadTlCache(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(TL_CACHE_KEY) || '{}'); }
  catch { return {}; }
}

function saveTlCache(cache: Record<string, string>) {
  try {
    const keys = Object.keys(cache);
    if (keys.length > CACHE_MAX) {
      const trimmed: Record<string, string> = {};
      keys.slice(-CACHE_MAX).forEach(k => { trimmed[k] = cache[k]; });
      localStorage.setItem(TL_CACHE_KEY, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(TL_CACHE_KEY, JSON.stringify(cache));
    }
  } catch { /* localStorage full */ }
}

function getTlCache(lang: string, key: string): string | null {
  return loadTlCache()[`${lang}:${key}`] ?? null;
}

function setTlCache(lang: string, key: string, val: string) {
  const cache = loadTlCache();
  cache[`${lang}:${key}`] = val;
  saveTlCache(cache);
}

// ─── 內存級 LRU 緩存（session 內快速查找）────────────────────────
const memCache = new Map<string, string>();

function memGet(key: string): string | undefined { return memCache.get(key); }
function memSet(key: string, val: string) {
  memCache.set(key, val);
  if (memCache.size > 500) {
    const firstKey = memCache.keys().next().value;
    if (firstKey !== undefined) memCache.delete(firstKey);
  }
}

// ─── 語言檢測 ────────────────────────────────────────────────────
function detectLang(text: string): string {
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
  if (/[\u3040-\u30FF]/.test(text)) return 'ja';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  return 'en';
}

// ─── 單條翻譯 ────────────────────────────────────────────────────
export async function doTranslate(text: string, targetLang: string): Promise<string> {
  if (!text.trim() || targetLang === 'en') return text;
  const srcLang = detectLang(text);
  if (srcLang === targetLang) return text;

  const key = `${srcLang}|${targetLang}:${text.slice(0, 40)}`;
  if (memGet(key)) return memGet(key)!;
  const persisted = getTlCache(targetLang, text.slice(0, 60));
  if (persisted) { memSet(key, persisted); return persisted; }

  let result = '';

  // Primary: Google Translate
  try {
    const TL_MAP: Record<string, string> = {
    'zh-TW': 'zh-TW', 'zh-CN': 'zh-CN', 'zh': 'zh-CN',
    'ko': 'ko', 'ja': 'ja', 'fr': 'fr', 'es': 'es',
    'en': 'en', 'de': 'de', 'it': 'it', 'pt': 'pt',
    'ar': 'ar', 'ru': 'ru', 'hi': 'hi',
  };
  const sl = TL_MAP[srcLang] || srcLang;
  const tl = TL_MAP[targetLang] || targetLang;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (data?.[0]?.[0]?.[0]) result = data[0][0][0];
    }
  } catch (e) { console.error('[translate] Google Translate 失敗:', e); }

  // Fallback: MyMemory
  if (!result) {
    try {
      const pair = `${sl}|${tl}`;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (data?.responseStatus === 200 && data?.responseData?.translatedText) {
          result = data.responseData.translatedText;
        }
      }
    } catch (e) { console.error('[translate] MyMemory fallback 失敗:', e); }
  }

  if (result) {
    memSet(key, result);
    setTlCache(targetLang, text.slice(0, 60), result);
  }
  return result || text;
}

// ─── 批量翻譯（只翻未翻的條目）───────────────────────────────────
export async function translateBatch(items: NewsItem[], lang: string): Promise<NewsItem[]> {
  if (lang === 'en' || !items.length) return items;
  const untranslated = items.filter(n => !n.titleTL[lang]);
  if (untranslated.length === 0) return items;

  const results = await Promise.all(
    untranslated.map(async item => {
      try {
        const [titleTL, summaryTL] = await Promise.all([
          doTranslate(item.title, lang),
          doTranslate(item.summary, lang),
        ]);
        return {
          ...item,
          titleTL: { ...item.titleTL, [lang]: titleTL },
          summaryTL: { ...item.summaryTL, [lang]: summaryTL },
        };
      } catch (e) { console.error('[translate] 單條翻譯失敗:', e); return item; }
    })
  );
  const translatedMap = new Map(results.map(r => [r.id, r]));
  return items.map(n => translatedMap.get(n.id) || n);
}

// ─── 日期格式化 ──────────────────────────────────────────────────
export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    if (diffH < 1) {
      const mins = Math.floor(diffMs / 60000);
      return mins < 1 ? '剛剛' : `${mins} 分鐘前`;
    }
    if (diffH < 24) return `${diffH} 小時前`;
    if (diffH < 48) return '昨天';
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  } catch { return ''; }
}

// ─── 書籤 helpers ────────────────────────────────────────────────
const BM_KEY = 'wn_bookmarks';

export function getBookmarks(): string[] {
  try { return JSON.parse(localStorage.getItem(BM_KEY) || '[]'); } catch { return []; }
}

export function toggleBookmark(id: string): boolean {
  const bm = getBookmarks();
  const idx = bm.indexOf(id);
  if (idx >= 0) { bm.splice(idx, 1); localStorage.setItem(BM_KEY, JSON.stringify(bm)); return false; }
  bm.unshift(id);
  if (bm.length > 50) bm.pop();
  localStorage.setItem(BM_KEY, JSON.stringify(bm));
  return true;
}



// LANGUAGES 已移至 data/sources.ts
