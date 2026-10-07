import type { PagesContext } from '../env.js';
import { serveBriefingIndex } from '../content/columns.js';

export function onRequest(context: PagesContext): Promise<Response> {
  return serveBriefingIndex(context);
}
