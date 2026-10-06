import type { PagesContext } from '../env.js';
import { serveAnalysisIndex } from '../content/publish.js';

export function onRequest(context: PagesContext): Promise<Response> {
  return serveAnalysisIndex(context);
}
