import type { HomeColumnLinks } from '../../shared/homePage.js';
import { quizReadKeys, readyQuiz } from '../../shared/quiz.js';
import { indexableEntries } from './mustRead.js';
import { readIndex, readValue, type ContentEnv } from './store.js';
import { publicTopicPaths } from './topics.js';

/** Homepage chips. The newest digest and weekly must clear columnIndexable; analysis, quiz and topics need a public body. */
export async function loadHomeColumns(env: ContentEnv): Promise<HomeColumnLinks> {
  const [digestRows, weeklyRows, analysisRows, topics, quiz] = await Promise.all([
    readIndex(env, 'digest').catch(() => []),
    readIndex(env, 'weekly').catch(() => []),
    readIndex(env, 'analysis').catch(() => []),
    publicTopicPaths(env).catch(() => []),
    quizOpen(env),
  ]);
  const [digest, weekly, analysis] = await Promise.all([
    indexableEntries(env, 'digest', digestRows.slice(0, 1)),
    indexableEntries(env, 'weekly', weeklyRows.slice(0, 1)),
    indexableEntries(env, 'analysis', analysisRows.slice(0, 12)),
  ]);
  const digestKey = digest[0]?.key;
  const weeklyKey = weekly[0]?.key;
  return {
    ...(digestKey ? { digestHref: `/digest/${digestKey}` } : {}),
    ...(weeklyKey ? { weeklyHref: `/weekly/${weeklyKey}` } : {}),
    analysis: analysis.length > 0,
    quiz,
    topic: topics.length > 0,
  };
}

async function quizOpen(env: ContentEnv): Promise<boolean> {
  for (const key of quizReadKeys()) {
    if (readyQuiz(await readValue(env, key).catch(() => null))) return true;
  }
  return false;
}
