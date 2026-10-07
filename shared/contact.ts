/** Contact form stored in KV under `contact:` for about 90 days. */
export const CONTACT_TTL_SECONDS = 90 * 24 * 60 * 60;
export const CONTACT_RATE_LIMIT = 5;
export const CONTACT_RATE_WINDOW_SECONDS = 60 * 60;
export const CONTACT_MAX_MESSAGE = 2000;
export const CONTACT_MAX_NAME = 80;

export const CONTACT_THANKS = '收到，多謝你。留言只供世界頭條閱讀，大約九十日後會刪除。';
export const CONTACT_NEED_MESSAGE = '請寫低你想講的內容。';
export const CONTACT_TOO_LONG = '內容太長，請收短到二千字以內。';
export const CONTACT_RATE = '太快連續送出，請一個鐘後再試。';
export const CONTACT_UNAVAILABLE = '暫時儲存唔到，請遲啲再試。';

export interface ContactFields {
  name?: string;
  message?: string;
  company?: string;
}

export interface ContactKv {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface StoredContact {
  name: string;
  message: string;
  at: string;
}

export interface ContactResult {
  status: number;
  code: 'ok' | 'honeypot' | 'invalid' | 'rate' | 'unavailable';
  notice: string;
}

export function normalizeContact(fields: ContactFields): { name: string; message: string; company: string } {
  return {
    name: String(fields.name ?? '').replace(/\s+/g, ' ').trim().slice(0, CONTACT_MAX_NAME),
    message: String(fields.message ?? '').split(String.fromCharCode(0)).join('').trim(),
    company: String(fields.company ?? '').trim(),
  };
}

export function sameOrigin(requestUrl: string, origin: string | null): boolean {
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(requestUrl).host;
  } catch {
    return false;
  }
}

/**
 * Store one message. A filled honeypot looks like success and writes nothing.
 * The IP hash is only the rate-limit key, not part of the stored message.
 */
export async function acceptContact(kv: ContactKv | undefined, ipHash: string, fields: ContactFields, now = Date.now()): Promise<ContactResult> {
  const input = normalizeContact(fields);
  if (input.company) return { status: 200, code: 'honeypot', notice: CONTACT_THANKS };
  if (input.message.length < 2) return { status: 400, code: 'invalid', notice: CONTACT_NEED_MESSAGE };
  if (input.message.length > CONTACT_MAX_MESSAGE) return { status: 400, code: 'invalid', notice: CONTACT_TOO_LONG };
  if (!kv || !ipHash) return { status: 503, code: 'unavailable', notice: CONTACT_UNAVAILABLE };

  const rateKey = `contact:rl:${ipHash}`;
  let used = 0;
  try {
    used = Number(await kv.get(rateKey) || '0') || 0;
  } catch {
    return { status: 503, code: 'unavailable', notice: CONTACT_UNAVAILABLE };
  }
  if (used >= CONTACT_RATE_LIMIT) return { status: 429, code: 'rate', notice: CONTACT_RATE };

  const stored: StoredContact = {
    name: input.name,
    message: input.message,
    at: new Date(now).toISOString(),
  };
  const key = `contact:${now.toString(36)}-${ipHash.slice(0, 6) || 'anon'}`;
  try {
    await kv.put(key, JSON.stringify(stored), { expirationTtl: CONTACT_TTL_SECONDS });
    await kv.put(rateKey, String(used + 1), { expirationTtl: CONTACT_RATE_WINDOW_SECONDS });
  } catch {
    return { status: 503, code: 'unavailable', notice: CONTACT_UNAVAILABLE };
  }
  return { status: 200, code: 'ok', notice: CONTACT_THANKS };
}
