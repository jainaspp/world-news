import { serveFocusHome } from '../focus/page.js';
import type { PagesContext } from '../env.js';

export function onRequest(context: PagesContext): Promise<Response> {
  const slug = decodeURIComponent(new URL(context.request.url).pathname.split('/').filter(Boolean)[1] || '').toLowerCase();
  return serveFocusHome(context, { scope: 'category', id: slug, label: slug });
}
