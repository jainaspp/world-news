import type { PagesContext } from '../env.js';
import { serveCompare } from '../content/columns.js';

export function onRequest(context: PagesContext): Promise<Response> {
  return serveCompare(context);
}
