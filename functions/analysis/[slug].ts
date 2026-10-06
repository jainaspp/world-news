import type { PagesContext } from '../env.js';
import { serveAnalysis } from '../content/publish.js';

export function onRequest(context: PagesContext): Promise<Response> {
  return serveAnalysis(context);
}
