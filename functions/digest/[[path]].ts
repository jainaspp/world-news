import type { PagesContext } from '../env.js';
import { serveDigest } from '../content/publish.js';

export function onRequest(context: PagesContext): Promise<Response> {
  return serveDigest(context);
}
