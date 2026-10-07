import { beforeEach, describe, expect, it } from 'vitest';
import { kvWritesBlocked, readValue, resetKvWriteState, writeValue, type ContentEnv } from '../functions/content/store.js';
import { flushUsage, monthUsage, resetUsageState, saveUsage, withUsageBatch } from '../functions/content/usage.js';
import { withTokens } from '../shared/grok.js';

function kvEnv(fail = false) {
  const store = new Map<string, string>();
  let puts = 0;
  const env = {
    CONTENT: {
      get: async (key: string) => store.get(key) ?? null,
      put: async (key: string, value: string) => {
        puts += 1;
        if (fail) throw new Error('KV PUT failed: 429 Too Many Requests (daily limit exceeded)');
        store.set(key, value);
      },
      list: async ({ prefix }: { prefix: string }) => ({
        keys: [...store.keys()].filter((key) => key.startsWith(prefix)).map((name) => ({ name, metadata: JSON.parse(store.get(name)!) })),
        list_complete: true,
      }),
    },
  } as unknown as ContentEnv;
  return { env, store, puts: () => puts };
}

describe('KV write budget', () => {
  beforeEach(() => {
    resetKvWriteState();
    resetUsageState();
  });

  it('keeps caches out of KV and skips unchanged values', async () => {
    const { env, store, puts } = kvEnv();
    await writeValue(env, 'article3:abc', 'text', 3600);
    await writeValue(env, 'rejected:k', 'draft', 3600);
    expect(store.size).toBe(0);
    expect(await readValue(env, 'article3:abc')).toBe('text');
    await writeValue(env, 'index:compare', '[1]');
    await writeValue(env, 'index:compare', '[1]');
    expect(puts()).toBe(1);
  });

  it('logs and continues on the daily put limit, then skips later puts', async () => {
    const { env, puts } = kvEnv(true);
    expect(await writeValue(env, 'index:compare', '[1]')).toBe(false);
    expect(await kvWritesBlocked()).toBe(true);
    expect(await writeValue(env, 'index:briefing', '[2]')).toBe(false);
    expect(puts()).toBe(1);
    expect(await readValue(env, 'index:compare')).toBe('[1]');
  });

  it('a batch writes one usage record and the cap still sums it', async () => {
    const { env, puts } = kvEnv();
    const now = new Date();
    await withUsageBatch(env, async () => {
      for (let i = 0; i < 5; i += 1) await saveUsage(env, withTokens(await monthUsage(env, now), 1000, 100, 1, 0));
    });
    expect(puts()).toBe(1);
    const total = await monthUsage(env, now);
    expect(total.inputTokens).toBe(5000);
    expect(total.requests).toBe(5);
  });

  it('usage that cannot be stored still counts toward the cap', async () => {
    const { env } = kvEnv(true);
    const now = new Date();
    await saveUsage(env, withTokens(await monthUsage(env, now), 2000, 200, 1, 0));
    await flushUsage(env);
    const total = await monthUsage(env, now);
    expect(total.inputTokens).toBe(2000);
  });
});
