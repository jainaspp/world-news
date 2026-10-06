import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readCache, storeNews } from '../server/supabase';

let server: Server | null = null;

afterEach(async () => {
  vi.unstubAllEnvs();
  if (!server) return;
  server.closeAllConnections();
  await new Promise<void>((resolve) => server?.close(() => resolve()));
  server = null;
});

function listen(respond: boolean): Promise<number> {
  return new Promise((resolve) => {
    server = createServer((_req, res) => {
      if (!respond) return;
      res.statusCode = 401;
      res.end('Invalid API key');
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server?.address();
      resolve(typeof address === 'object' && address ? address.port : 0);
    });
  });
}

describe('supabase cache', () => {
  it('skips a missing or non-http url', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'placeholder');
    expect(await readCache(false)).toBeNull();

    vi.stubEnv('SUPABASE_URL', 'not a url');
    expect(await readCache(false)).toBeNull();

    vi.stubEnv('SUPABASE_URL', 'ftp://files.example/news');
    expect(await readCache(false)).toBeNull();
  });

  it('returns null when the configured project rejects the key', async () => {
    const port = await listen(true);
    vi.stubEnv('SUPABASE_URL', `http://127.0.0.1:${port}`);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'rotated-placeholder');
    expect(await readCache(false)).toBeNull();
    const saved = await storeNews([]);
    expect(saved).toEqual({ stored: 0, error: 'supabase_401' });
  });

  it('returns null quickly when the configured host never answers', async () => {
    const port = await listen(false);
    vi.stubEnv('SUPABASE_URL', `http://127.0.0.1:${port}`);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'rotated-placeholder');
    const started = Date.now();
    expect(await readCache(false)).toBeNull();
    expect(Date.now() - started).toBeLessThan(2000);
  });
});
