import { acceptContact, sameOrigin, type ContactFields, type ContactKv } from '../../shared/contact.js';
import { clientIp, hashIp } from '../../shared/reads.js';
import { renderContactPage } from '../../shared/sitePages.js';
import type { ContentEnv } from '../content/store.js';
import type { PagesContext } from '../env.js';

const NO_STORE = { 'cache-control': 'no-store' };

function kvOf(env: ContentEnv): ContactKv | undefined {
  const content = env.CONTENT;
  if (!content?.get || !content.put) return undefined;
  return {
    get: (key) => content.get(key),
    put: (key, value, options) => content.put(key, value, options),
  };
}

async function readFields(request: Request): Promise<ContactFields | null> {
  const type = request.headers.get('content-type') || '';
  const length = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(length) && length > 16_000) return null;
  try {
    if (type.includes('application/json')) {
      const text = await request.text();
      if (text.length > 16_000) return null;
      const body = JSON.parse(text) as ContactFields;
      return { name: body.name, message: body.message, company: body.company };
    }
    const form = await request.formData();
    return {
      name: String(form.get('name') ?? ''),
      message: String(form.get('message') ?? ''),
      company: String(form.get('company') ?? ''),
    };
  } catch {
    return null;
  }
}

function wantsHtml(request: Request): boolean {
  const type = request.headers.get('content-type') || '';
  return !type.includes('application/json');
}

/** POST /api/contact. Messages go to CONTENT under contact: with a 90-day TTL. */
export async function onRequest(context: PagesContext): Promise<Response> {
  if (context.request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { ...NO_STORE, allow: 'POST' } });
  }
  if (!sameOrigin(context.request.url, context.request.headers.get('origin'))) {
    return new Response(null, { status: 403, headers: NO_STORE });
  }
  const fields = await readFields(context.request);
  if (!fields) return new Response(null, { status: 400, headers: NO_STORE });

  const hour = String(Math.floor(Date.now() / 3_600_000));
  const ipHash = await hashIp(clientIp(context.request.headers), `contact-${hour}`);
  const result = await acceptContact(kvOf(context.env as ContentEnv), ipHash, fields);
  if (!wantsHtml(context.request)) {
    return Response.json({ ok: result.status < 300, notice: result.notice }, { status: result.status, headers: NO_STORE });
  }
  const html = renderContactPage({ notice: result.notice, alert: result.status >= 400 });
  return new Response(html, {
    status: result.status,
    headers: { ...NO_STORE, 'content-type': 'text/html; charset=utf-8' },
  });
}
