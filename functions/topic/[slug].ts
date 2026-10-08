import type { PagesContext } from '../env.js';
import { serveTopic } from '../content/topics.js';

export function onRequest(context: PagesContext): Promise<Response> {
  return serveTopic(context);
}
