import { slotId } from './content.js';
import { cantoneseLeft } from './prose.js';
import type { NewsItem } from './types.js';

export interface QuizSource {
  title: string;
  summary: string;
  url: string;
}

export interface QuizQuestion {
  prompt: string;
  choices: string[];
  answer: string;
  sourceTitle: string;
  sourceUrl: string;
}

export interface QuizDoc {
  edition: string;
  generatedAt: string;
  questions: QuizQuestion[];
}

export const QUIZ_MIN = 3;
export const QUIZ_MAX = 5;

export function quizEdition(now = new Date()): string {
  return slotId(now);
}

export function quizKey(edition: string): string {
  return `quiz:${edition}`;
}

/** Current edition first, then the other half of the Hong Kong day. Reads only. */
export function quizReadKeys(now = new Date()): string[] {
  const current = slotId(now);
  const other = slotId(new Date(now.getTime() - 12 * 60 * 60 * 1000));
  return current === other ? [quizKey(current)] : [quizKey(current), quizKey(other)];
}

export function sourceBlob(source: QuizSource): string {
  return `${source.title}\n${source.summary}`.replace(/\s+/g, ' ').trim();
}

function compact(value: string): string {
  return value.replace(/\s+/g, '').replace(/[，。、；：！？「」『』（）()［］[\]\-—–·,.'"]/g, '').toLowerCase();
}

/**
 * The correct answer must be copied from the headline or summary.
 * A shorter phrase is accepted when every Chinese run in the answer appears in the source.
 */
export function answerSupported(answer: string, source: string): boolean {
  const needle = compact(answer);
  const hay = compact(source);
  if (needle.length < 1 || hay.length < 1) return false;
  if (hay.includes(needle)) return true;
  const parts = answer.match(/[\u3400-\u9fff]{2,}/g) ?? [];
  if (parts.length === 0) return false;
  return parts.every((part) => hay.includes(compact(part)));
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

export function pickQuizSources(items: NewsItem[], now = Date.now(), limit = 8): QuizSource[] {
  const cutoff = now - 36 * 3600 * 1000;
  const ranked = items.filter((item) => {
    const at = Date.parse(item.pubDate);
    if (Number.isFinite(at) && at < cutoff) return false;
    return /[\u3400-\u9fff]/.test(item.title) && /^https?:\/\//i.test(item.link);
  }).sort((a, b) => Number(Boolean(b.excerpt && b.excerpt.length > 12)) - Number(Boolean(a.excerpt && a.excerpt.length > 12)));
  const picked: QuizSource[] = [];
  const seen = new Set<string>();
  for (const item of ranked) {
    const title = item.title.replace(/\s+/g, ' ').trim();
    if (!title || seen.has(title)) continue;
    seen.add(title);
    picked.push({ title, summary: (item.excerpt || '').replace(/\s+/g, ' ').trim().slice(0, 280), url: item.link });
    if (picked.length >= limit) break;
  }
  return picked;
}

export function quizPrompt(sources: QuizSource[]): { system: string; user: string } {
  const rows = sources.map((source, index) => (
    `${index + 1}. 標題：${source.title}\n短述：${source.summary || '（無）'}`
  )).join('\n');
  return {
    system: '你是世界頭條的編輯，只用正式書面中文。只可使用提供的標題與短述，不可補充標題沒有的人名、數字、地點或情節。不要使用粵語口語。',
    user: `根據下列標題與短述，出 ${QUIZ_MAX} 題單選題。只輸出 JSON，不要解釋。
格式：{"questions":[{"prompt":"問題","choices":["選項一","選項二","選項三","選項四"],"answer":"與其中一個選項完全相同","sourceTitle":"與某一則標題完全相同"}]}
規則：
- 每題四個互不相同的選項。
- answer 必須是該則標題或短述裡連續出現的字句，不要改寫。
- 問題必須能只靠該則標題或短述答對。
- sourceTitle 必須與某一則標題完全相同。
- 不要輸出來源以外的事實。

${rows}`,
  };
}

function extractJson(text: string): unknown {
  const stripped = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const fenced = stripped.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced?.[1] ?? stripped).trim();
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

function formal(text: string): boolean {
  return /[\u3400-\u9fff]/.test(text) && !cantoneseLeft(text);
}

/** Drop any question whose answer is not in the cited headline or summary. */
export function acceptQuiz(payload: unknown, sources: QuizSource[]): QuizQuestion[] {
  if (!payload || typeof payload !== 'object') return [];
  const rows = (payload as { questions?: unknown }).questions;
  if (!Array.isArray(rows)) return [];
  const byTitle = new Map(sources.map((source) => [source.title, source]));
  const kept: QuizQuestion[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const prompt = clean(record.prompt);
    const sourceTitle = clean(record.sourceTitle);
    const source = byTitle.get(sourceTitle);
    const choices = Array.isArray(record.choices) ? record.choices.map(clean).filter(Boolean) : [];
    const answer = clean(record.answer);
    if (!source || !prompt || choices.length !== 4) continue;
    if (new Set(choices).size !== 4 || !choices.includes(answer)) continue;
    if (!formal(prompt) || choices.some((choice) => !formal(choice))) continue;
    if (compact(prompt).includes(compact(answer))) continue;
    if (!answerSupported(answer, sourceBlob(source))) continue;
    if (seen.has(prompt)) continue;
    seen.add(prompt);
    kept.push({ prompt, choices, answer, sourceTitle: source.title, sourceUrl: source.url });
    if (kept.length >= QUIZ_MAX) break;
  }
  return kept.length >= QUIZ_MIN ? kept : [];
}

export function parseQuiz(text: string, sources: QuizSource[]): QuizQuestion[] {
  return acceptQuiz(extractJson(text), sources);
}
