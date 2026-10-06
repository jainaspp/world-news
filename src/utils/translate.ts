const CACHE_KEY = 'wn_tl_cache';
const CACHE_MAX = 800;

const LANG: Record<string, string> = {
  'zh-TW': 'zh-TW',
  'zh-CN': 'zh-CN',
  zh: 'zh-CN',
  en: 'en',
  ja: 'ja',
  ko: 'ko',
  es: 'es',
  fr: 'fr',
};

function loadCache(): Record<string, string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, string>) {
  const keys = Object.keys(cache);
  const trimmed =
    keys.length <= CACHE_MAX
      ? cache
      : Object.fromEntries(keys.slice(-CACHE_MAX).map((key) => [key, cache[key]]));
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
  } catch {
    /* storage full */
  }
}

function detectLang(text: string): string {
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
  if (/[\u3040-\u30FF]/.test(text)) return 'ja';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  return 'en';
}

async function googleTranslate(text: string, source: string, target: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) return '';
  const data = (await response.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0]) || !Array.isArray(data[0][0])) return '';
  const line = data[0][0][0];
  return typeof line === 'string' ? line : '';
}

async function myMemoryTranslate(text: string, source: string, target: string): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${target}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) return '';
  const data = (await response.json()) as { responseStatus?: number; responseData?: { translatedText?: string } };
  if (data.responseStatus === 200 && data.responseData?.translatedText) return data.responseData.translatedText;
  return '';
}

export async function translateText(text: string, targetLang: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed || targetLang === 'en') return trimmed;
  const sourceLang = detectLang(trimmed);
  const source = LANG[sourceLang] ?? sourceLang;
  const target = LANG[targetLang] ?? targetLang;
  if (source === target) return trimmed;

  const cache = loadCache();
  const key = `${source}|${target}:${trimmed.slice(0, 80)}`;
  if (cache[key]) return cache[key];

  let result = '';
  try {
    result = await googleTranslate(trimmed, source, target);
  } catch {
    result = '';
  }
  if (!result) {
    try {
      result = await myMemoryTranslate(trimmed, source, target);
    } catch {
      result = '';
    }
  }
  if (result) {
    cache[key] = result;
    saveCache(cache);
    return result;
  }
  return trimmed;
}

export async function translateTitles(
  items: { id: string; title: string }[],
  targetLang: string,
): Promise<Record<string, string>> {
  if (targetLang === 'en' || items.length === 0) return {};
  const out: Record<string, string> = {};
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      const translated = await translateText(item.title, targetLang);
      if (translated && translated !== item.title) out[item.id] = translated;
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, items.length) }, () => worker()));
  return out;
}
