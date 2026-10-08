import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import { renderQuizPage } from '../../shared/readerPages.js';
import { quizReadKeys, type QuizDoc } from '../../shared/quiz.js';
import type { PagesContext } from '../env.js';
import { readValue, type ContentEnv } from '../content/store.js';

function parseQuizDoc(raw: string | null): QuizDoc | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as QuizDoc;
    if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length < 3) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = context.env as ContentEnv;
  let doc: QuizDoc | null = null;
  for (const key of quizReadKeys()) {
    const saved = parseQuizDoc(await readValue(env, key).catch(() => null));
    if (saved) {
      doc = saved;
      break;
    }
  }
  return new Response(renderQuizPage(doc), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=120, s-maxage=300',
    },
  });
}
