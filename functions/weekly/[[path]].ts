import type { PagesContext } from '../env.js';
import { serveWeekly } from '../content/publish.js';

export function onRequest(context: PagesContext): Promise<Response> {
  return serveWeekly(context);
}
