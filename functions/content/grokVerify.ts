import type { ContentDoc } from '../../shared/content.js';

/** Grok's final pass over a MiniMax piece: the non-reasoning variant (same token prices as grok-4.3, no reasoning tokens). */
export const VERIFY_MODEL = 'grok-4.20-0309-non-reasoning';
/** Source text sent to the verifier, shared across sources, so one pass stays near US$0.005. */
export const VERIFY_SOURCE_CHARS = 10_000;
export const VERIFY_MAX_TOKENS = 2_000;
/** One source's share; the MiniMax writer saw up to 2,500. */
export const VERIFY_PER_SOURCE = 2_000;

const VERIFY_SYSTEM = [
  '你是香港新聞編輯部的事實核對員。你會收到一篇由另一個模型撰寫的繁體中文稿件（每句有編號）和英文或中文的來源原文。',
  '逐句對照來源：凡來源沒有寫明的內容都要改正或刪除，包括額外加上的形容詞（例如「自殺式」）、性別、數字、倍數（例如把「數千」寫成「數萬」）、因果或動機、比較和排名（例如「最多」「最大」「創新高」）、評論和預測，以及把「據報」「指控」寫成既定事實。',
  '來源原文是今天的真實報道，即使內容與你的既有認知不同（例如新產品、新事件、新任官員），也一律以來源為準，不可因此刪改；刪除前必須確認所有來源都沒有提及。能夠改正就只改有問題的字詞，其餘保留；整句沒有根據就刪除（回傳空字串）。不要加入來源沒有的新事實。已經正確的句子、標題、摘要和重點一律不要輸出，也不要潤飾或縮短；來源原文只是節錄，節錄沒有寫但不構成新事實的措辭可以保留。',
  '人名和地名用香港通用譯名（例如特朗普、普京、諾定咸）；沒有香港通用中文譯名的外國人名，第一次出現時寫中文音譯並在括號附英文原名一次，例如「沙特爾沃思（Catherine Shuttleworth）」，之後只寫中文；公司和品牌名稱保留英文原文。',
  '用香港書面語和全形標點，分句用「，」連接。改正時保留中文翻譯，不要把已翻譯的詞句或引述改回英文原文；直接引述保留「」和說話者。',
  '來源沒有的強度形容詞和副詞（例如激烈、強烈、大規模、嚴重、猛烈、極度）一律刪除，或改成來源原本的說法（例如來源寫 divided 就寫「意見分歧」，不要寫「激烈爭論」）。',
  '逐句檢查時特別留意數量級（thousands 是數千，不是數萬）、「最多」「最大」「首次」等排名字眼、性別，以及來源沒有寫的身分描述。',
  '只回傳 JSON：{"title":"ok 或改正後標題","description":"ok 或改正後摘要","points":{"p0":"ok"},"fix":{"b0s0":"ok","b0s1":"改正後句子","b0s2":""}}。points 和 fix 必須列出每一個編號：完全有根據寫 "ok"，需要改正就寫改正後的完整句子，沒有根據就寫空字串。',
].join('');

export interface VerifySource { n: number; source: string; title: string; text: string }

/** Page CSS or script that leaked into an extract is never evidence; drop it before the pass. */
export function cleanExtract(excerpt: string): string {
  return excerpt.split(/(?<=[.!?。！？”"])\s+/).filter((sentence) => !/[{}]|@media|@charset|function\s*\(|=>|document\./.test(sentence)).join(' ');
}

/** The cited sources of a piece with their relevant extract text, sharing VERIFY_SOURCE_CHARS. */
export function verifySources(doc: ContentDoc, budget = VERIFY_SOURCE_CHARS): VerifySource[] {
  const seen = new Set<string>();
  const refs: { source: string; title: string; excerpt: string }[] = [];
  for (const block of doc.blocks) {
    for (const ref of block.sources) {
      const excerpt = (ref.excerpt || '').trim();
      if (seen.has(ref.url) || !excerpt || !cleanExtract(excerpt).trim()) continue;
      seen.add(ref.url);
      refs.push({ source: ref.source, title: ref.title, excerpt: cleanExtract(excerpt).slice(0, VERIFY_PER_SOURCE) });
    }
  }
  if (!refs.length) return [];
  // Short extracts give their unused share to the longer ones.
  const caps = new Map<number, number>();
  let left = budget;
  const sorted = refs.map((ref, index) => ({ ref, index })).sort((a, b) => a.ref.excerpt.length - b.ref.excerpt.length);
  sorted.forEach(({ ref, index }, position) => {
    const take = Math.min(ref.excerpt.length, Math.floor(left / (sorted.length - position)));
    caps.set(index, take);
    left -= take;
  });
  return refs.map((ref, index) => ({ n: index + 1, source: ref.source, title: ref.title, text: ref.excerpt.slice(0, caps.get(index) ?? 0) }));
}

export function verifyPrompt(doc: ContentDoc): { system: string; user: string } | null {
  const sources = verifySources(doc);
  if (!sources.length) return null;
  const piece = {
    title: doc.title,
    description: doc.description,
    points: Object.fromEntries((doc.points ?? []).map((text, index) => [`p${index}`, text])),
    sections: doc.blocks.map((block, b) => (block.title === '事件時間線'
      ? null
      : { heading: block.title, sentences: Object.fromEntries(block.sentences.map((text, s) => [`b${b}s${s}`, text])) })).filter(Boolean),
  };
  return { system: VERIFY_SYSTEM, user: `稿件：${JSON.stringify(piece)}\n來源原文：${JSON.stringify(sources)}` };
}

export interface VerifyResult { title?: string; description?: string; points?: Record<string, string>; fix: Record<string, string> }

/** "ok" marks a checked item that needs no change. */
function isOk(value: string): boolean {
  return /^\s*ok\s*$/i.test(value);
}

export function parseVerify(text: string): VerifyResult | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as Partial<VerifyResult>;
    const strings = (value: unknown): Record<string, string> => (value && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, v]) => typeof v === 'string' && !isOk(v)) as [string, string][])
      : {});
    return {
      ...(typeof parsed.title === 'string' && parsed.title.trim() && !isOk(parsed.title) ? { title: parsed.title.trim() } : {}),
      ...(typeof parsed.description === 'string' && parsed.description.trim() && !isOk(parsed.description) ? { description: parsed.description.trim() } : {}),
      points: strings(parsed.points),
      fix: strings(parsed.fix),
    };
  } catch {
    return null;
  }
}

/** Applies Grok's corrections: a string replaces the sentence, an empty string deletes it. */
export function applyVerify(doc: ContentDoc, result: VerifyResult): { doc: ContentDoc; changed: number } {
  let changed = 0;
  const blocks = doc.blocks.map((block, b) => {
    if (block.title === '事件時間線') return block;
    const sentences: string[] = [];
    block.sentences.forEach((text, s) => {
      const id = `b${b}s${s}`;
      if (!(id in result.fix)) {
        sentences.push(text);
        return;
      }
      changed += 1;
      const next = result.fix[id]!.trim();
      if (next) sentences.push(next);
    });
    return { ...block, sentences };
  }).filter((block) => block.title === '事件時間線' || block.sentences.length > 0);
  const points: string[] = [];
  (doc.points ?? []).forEach((text, index) => {
    const id = `p${index}`;
    if (!(id in (result.points ?? {}))) {
      points.push(text);
      return;
    }
    changed += 1;
    const next = result.points![id]!.trim();
    if (next) points.push(next);
  });
  if (result.title) changed += 1;
  if (result.description) changed += 1;
  return {
    doc: { ...doc, title: result.title ?? doc.title, description: result.description ?? doc.description, blocks, points },
    changed,
  };
}
