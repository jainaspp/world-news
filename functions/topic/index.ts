import type { PagesContext } from '../env.js';
import { serveTopicIndex } from '../content/topics.js';

export function onRequest(context: PagesContext): Promise<Response> {
  return serveTopicIndex(context);
}
