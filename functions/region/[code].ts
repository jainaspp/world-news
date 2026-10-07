import { serveFocusHome } from '../focus/page.js';
import type { PagesContext } from '../env.js';

export function onRequest(context: PagesContext): Promise<Response> {
  const code = decodeURIComponent(new URL(context.request.url).pathname.split('/').filter(Boolean)[1] || '').toLowerCase();
  return serveFocusHome(context, { scope: 'region', id: code, label: code });
}
