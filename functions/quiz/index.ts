import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import { renderQuizPage } from '../../shared/readerPages.js';
import { quizReadKeys, readyQuiz } from '../../shared/quiz.js';
import type { PagesContext } from '../env.js';
import { readValue, type ContentEnv } from '../content/store.js';

export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = context.env as ContentEnv;
  let doc = null;
  for (const key of quizReadKeys()) {
    const saved = readyQuiz(await readValue(env, key).catch(() => null));
    if (saved) {
      doc = saved;
      break;
    }
  }
  return new Response(renderQuizPage(doc), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=120, s-maxage=300',
      ...(doc ? {} : { 'x-robots-tag': 'noindex, follow' }),
    },
  });
}
