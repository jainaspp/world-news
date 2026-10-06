import { displayTitle, normalizeLang, type UiLang } from '../../shared/zh';

export type { UiLang };
export { displayTitle, normalizeLang };

/** @deprecated Google Translate removed — titles use the local OpenCC-style map / original RSS text. */
export async function translateTitles(
  items: { id: string; title: string }[],
  targetLang: string,
): Promise<Record<string, string>> {
  const lang = normalizeLang(targetLang);
  const out: Record<string, string> = {};
  for (const item of items) {
    const next = displayTitle(item.title, lang);
    if (next !== item.title) out[item.id] = next;
  }
  return out;
}
