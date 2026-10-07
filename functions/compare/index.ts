import type { PagesContext } from '../env.js';
import { serveCompareIndex } from '../content/columns.js';

export function onRequest(context: PagesContext): Promise<Response> {
  return serveCompareIndex(context);
}
