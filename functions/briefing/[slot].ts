import type { PagesContext } from '../env.js';
import { serveBriefing } from '../content/columns.js';

export function onRequest(context: PagesContext): Promise<Response> {
  return serveBriefing(context);
}
