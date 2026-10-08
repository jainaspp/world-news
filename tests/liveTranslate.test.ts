import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { onRequest } from '../functions/api/translate';
import { head } from '../shared/contentPage';
import { t } from '../shared/i18n';
import {
  TRANSLATE_MODEL,
  acceptModelOutput,
  chunksForModel,
  numbersOf,
  planTranslation,
  resetLiveTranslateCache,
  translateAll,
} from '../shared/liveTranslate';
import { renderPrivacyPage } from '../shared/sitePages';
import { toCN, toHK } from '../shared/zh';
import type { PagesContext } from '../functions/env';

beforeEach(() => {
  resetLiveTranslateCache();
});

function memoryCache() {
  const box = new Map<string, string>();
  const cache = {
    async match(request: Request) {
      const hit = box.get(request.url);
      return hit == null ? undefined : new Response(hit);
    },
    async put(request: Request, response: Response) {
      box.set(request.url, await response.text());
    },
  } as unknown as Cache;
  return cache;
}

describe('what gets translated', () => {
  it('leaves text that is already in the selected language', () => {
    expect(planTranslation('港鐵宣布加價', 'zh-HK')).toEqual({ kind: 'keep', text: '港鐵宣布加價' });
    expect(planTranslation('Paramount buys Warner', 'en')).toEqual({ kind: 'keep', text: 'Paramount buys Warner' });
    expect(planTranslation('Cards', 'en').kind).toBe('keep');
    expect(planTranslation('List', 'en').kind).toBe('keep');
    expect(planTranslation('https://example.com/a', 'zh-CN').kind).toBe('keep');
    expect(planTranslation('3.2%', 'en').kind).toBe('keep');
    expect(planTranslation('RSS', 'zh-HK').kind).toBe('keep');
    expect(planTranslation('Telegram', 'en').kind).toBe('keep');
  });

  it('converts Chinese script without a model and sends the other language to Workers AI', () => {
    const simplified = planTranslation('港鐵宣布加價', 'zh-CN');
    expect(simplified.kind).toBe('script');
    if (simplified.kind === 'script') expect(simplified.text).toContain('价');
    expect(planTranslation('地铁宣布加价', 'zh-HK').kind).toBe('script');
    expect(planTranslation('港鐵宣布加價', 'en')).toMatchObject({ kind: 'model', source: 'zh', target: 'en' });
    expect(planTranslation('MTR raises fares', 'zh-HK')).toMatchObject({ kind: 'model', source: 'en', target: 'zh' });
    expect(planTranslation('MTR raises fares', 'zh-CN')).toMatchObject({ kind: 'model', source: 'en', target: 'zh' });
  });

  it('keeps the card and list labels, and converts the digest labels with the script map', () => {
    for (const key of ['layoutCards', 'layoutList'] as const) {
      expect(planTranslation(t(key, 'zh-HK'), 'zh-HK').kind).toBe('keep');
      expect(planTranslation(t(key, 'zh-CN'), 'zh-CN').kind).toBe('keep');
      expect(planTranslation(t(key, 'en'), 'en').kind).toBe('keep');
    }
    for (const key of ['todayPicks', 'hkBriefing', 'multiCompare', 'topicPack'] as const) {
      expect(planTranslation(t(key, 'zh-HK'), 'zh-HK').kind).toBe('keep');
      const simplified = planTranslation(t(key, 'zh-HK'), 'zh-CN');
      expect(simplified.kind).not.toBe('model');
      expect(simplified.text).toBe(t(key, 'zh-CN'));
      expect(planTranslation(t(key, 'en'), 'en').kind).toBe('keep');
      expect(planTranslation(t(key, 'zh-HK'), 'en').kind).toBe('model');
    }
  });

  it('rejects a translation that drops a number or adds a disclaimer', () => {
    expect(acceptModelOutput('加價 3.2%', 'Fare increase', 'en')).toBeNull();
    expect(acceptModelOutput('加價 3.2%', 'Fare increase of 3.2%', 'en')).toBe('Fare increase of 3.2%');
    expect(acceptModelOutput('港鐵加價', 'Translation: hello', 'en')).toBeNull();
    expect(acceptModelOutput('港鐵加價', 'As an AI I rewrote this', 'en')).toBeNull();
    expect(acceptModelOutput('MTR fares', '地铁加价', 'zh')).toBe('地铁加价');
  });

  it('does not split a number across chunks', () => {
    const text = `${'甲'.repeat(500)}42${'乙'.repeat(500)}`;
    const chunks = chunksForModel(text);
    expect(chunks.join('')).toBe(text);
    expect(chunks.length).toBeGreaterThan(1);
    for (const number of numbersOf(text)) {
      expect(chunks.some((part) => part.includes(number))).toBe(true);
    }
  });
});

describe('translate batch', () => {
  it('uses m2m100 once, caches the result, and keeps order', async () => {
    const seen: { model: string; input: Record<string, unknown> }[] = [];
    const run = async (model: string, input: Record<string, unknown>) => {
      seen.push({ model, input });
      const text = String(input.text);
      return { translated_text: text === '甲甲' ? 'Alpha story' : 'Beta story' };
    };
    const first = await translateAll(['甲甲', '乙乙', '甲甲'], 'en', { run });
    expect(first.translations).toEqual(['Alpha story', 'Beta story', 'Alpha story']);
    expect(first.final).toEqual([true, true, true]);
    expect(seen.map((call) => call.model)).toEqual([TRANSLATE_MODEL, TRANSLATE_MODEL]);
    expect(seen.map((call) => call.input.text).sort()).toEqual(['乙乙', '甲甲']);
    expect(seen.every((call) => call.input.source_lang === 'zh' && call.input.target_lang === 'en')).toBe(true);
    const again = await translateAll(['甲甲'], 'en', { run });
    expect(again.translations).toEqual(['Alpha story']);
    expect(seen).toHaveLength(2);
  });

  it('does not call the model for script conversion or English that is already English', async () => {
    let calls = 0;
    const run = async () => {
      calls += 1;
      return { translated_text: 'nope' };
    };
    const simplified = await translateAll(['港鐵宣布加價'], 'zh-CN', { run });
    expect(calls).toBe(0);
    expect(simplified.translations[0]).toContain('价');
    expect(simplified.final).toEqual([true]);
    const english = await translateAll(['Paramount buys Warner'], 'en', { run });
    expect(english.translations[0]).toBe('Paramount buys Warner');
    expect(calls).toBe(0);
    const intoChinese = await translateAll(['Paramount buys Warner'], 'zh-HK', { run });
    expect(calls).toBe(1);
    expect(intoChinese.final[0]).toBe(false);
  });

  it('turns English into Traditional or Simplified from one model call', async () => {
    let calls = 0;
    const run = async () => {
      calls += 1;
      return { translated_text: '地铁加价' };
    };
    const traditional = await translateAll(['MTR raises fares'], 'zh-HK', { run });
    const simplified = await translateAll(['MTR raises fares'], 'zh-CN', { run });
    expect(calls).toBe(1);
    expect(traditional.translations[0]).toBe(toHK('地铁加价'));
    expect(simplified.translations[0]).toBe(toCN('地铁加价'));
    expect(traditional.translations[0]).not.toBe(simplified.translations[0]);
  });

  it('returns the original when the model drops a fact, and does not cache that failure as a success', async () => {
    let calls = 0;
    const run = async () => {
      calls += 1;
      return { translated_text: 'Fare increase' };
    };
    const failed = await translateAll(['加價 3.2%'], 'en', { run });
    expect(failed.translations[0]).toBe('加價 3.2%');
    expect(failed.final[0]).toBe(false);
    await translateAll(['加價 3.2%'], 'en', { run });
    expect(calls).toBe(1);
  });

  it('reads a warm edge cache after the isolate memory is cleared', async () => {
    const cache = memoryCache();
    let calls = 0;
    const run = async () => {
      calls += 1;
      return { translated_text: 'MTR raises fares' };
    };
    await translateAll(['港鐵加價'], 'en', { run, cache });
    resetLiveTranslateCache();
    const again = await translateAll(['港鐵加價'], 'en', { run, cache });
    expect(again.translations[0]).toBe('MTR raises fares');
    expect(calls).toBe(1);
  });

  it('stops calling the model after the daily allowance', async () => {
    let calls = 0;
    const run = async () => {
      calls += 1;
      return { translated_text: 'Hello there' };
    };
    const first = await translateAll(['港鐵加價'], 'en', { run, dailyLimit: 1 });
    const second = await translateAll(['立法會復會'], 'en', { run, dailyLimit: 1 });
    expect(first.final[0]).toBe(true);
    expect(second.translations[0]).toBe('立法會復會');
    expect(second.final[0]).toBe(false);
    expect(calls).toBe(1);
  });

  it('keeps numbers when a long string is translated in pieces', async () => {
    const text = `${'甲'.repeat(300)}。`.repeat(2) + '數字 42。';
    let calls = 0;
    const run = async (_model: string, input: Record<string, unknown>) => {
      calls += 1;
      const number = String(input.text).match(/\d+/)?.[0];
      return { translated_text: number ? `Count ${number}` : 'A sentence here' };
    };
    const result = await translateAll([text], 'en', { run });
    expect(calls).toBeGreaterThan(1);
    expect(result.final[0]).toBe(true);
    expect(result.translations[0]).toContain('42');
    expect(result.translations[0]).not.toContain('甲');
  });
});

function context(request: Request, env: PagesContext['env'] = {}): PagesContext {
  return { request, env, waitUntil() {}, next: async () => new Response() };
}

function post(body: unknown, origin = 'https://world-news.xyz'): Request {
  return new Request('https://world-news.xyz/api/translate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify(body),
  });
}

describe('translate route', () => {
  it('rejects the wrong method, origin, and language', async () => {
    expect((await onRequest(context(new Request('https://world-news.xyz/api/translate')))).status).toBe(405);
    expect((await onRequest(context(post({ target: 'en', texts: ['港鐵'] }, 'https://evil.example')))).status).toBe(403);
    expect((await onRequest(context(post({ target: 'ja', texts: ['港鐵'] })))).status).toBe(400);
    expect((await onRequest(context(post({ target: 'en', texts: Array.from({ length: 41 }, () => '甲') })))).status).toBe(400);
  });

  it('translates with Workers AI and skips the model when script conversion is enough', async () => {
    let model = '';
    const env = {
      AI: {
        async run(next: string) {
          model = next;
          return { translated_text: 'MTR raises fares' };
        },
      },
    };
    const translated = await onRequest(context(post({ target: 'en', texts: ['港鐵加價'] }), env));
    expect(translated.status).toBe(200);
    await expect(translated.json()).resolves.toEqual({ translations: ['MTR raises fares'], final: [true] });
    expect(model).toBe(TRANSLATE_MODEL);
    const scripted = await onRequest(context(post({ target: 'zh-CN', texts: ['港鐵宣布加價'] }), env));
    const body = await scripted.json() as { translations: string[] };
    expect(body.translations[0]).toContain('价');
    expect(model).toBe(TRANSLATE_MODEL);
  });
});

describe('page wiring', () => {
  it('loads the translator on the homepage and on article pages without touching the template switch', () => {
    const home = readFileSync('index.html', 'utf8');
    const client = readFileSync('public/live-translate.js', 'utf8');
    expect(home).toContain('src="/live-translate.js"');
    expect(home).toContain("localStorage.getItem('wn_lang')");
    expect(home).toContain("get('view') === 'list'");
    expect(home).toContain("classList.add('wn-list')");
    expect(home).toContain('data-wn-template-switch');
    expect(home).not.toContain('wn-home-template');
    expect(client).toContain('/api/translate');
    expect(client).toContain('wn_lang');
    expect(client).toContain('zh-HK');
    expect(client).toContain('zh-CN');
    expect(client).toContain("'en'");
    expect(client).not.toContain('innerHTML');
    expect(client).not.toContain('/api/generate');
    expect(client).not.toContain('api.telegram');
    expect(client).not.toContain('Translated line');
    expect(client).not.toContain('data-wn-template-switch');
    expect(client).not.toContain('wn-home-template');
    expect(client).not.toContain('view=list');
    const app = readFileSync('src/App.tsx', 'utf8');
    expect(app.indexOf('<DigestStrip lang={lang} />')).toBeLessThan(app.indexOf('listMode ?'));
    expect(app).toContain("t('layoutCards', lang)");
    expect(app).toContain("t('layoutList', lang)");
    expect(app).not.toContain('data-wn-template-switch');
    const route = readFileSync('functions/api/translate.ts', 'utf8');
    expect(route).toContain('context.env.AI');
    expect(route).not.toContain('Translated line');
    expect(route).not.toContain('WN_TRANSLATE_STUB');
    expect(head('標題', '說明', 'https://world-news.xyz/story/x/', '', 'article', '', '')).toContain('src="/live-translate.js"');
    expect(renderPrivacyPage()).toContain('wn_tr_v1');
    const selector = readFileSync('src/components/LanguageSelector.tsx', 'utf8');
    expect(selector).toContain("code: 'zh-HK'");
    expect(selector).toContain("code: 'zh-CN'");
    expect(selector).toContain("code: 'en'");
    expect(selector).not.toMatch(/code: '(ja|fr|ko|es)'/);
  });

  it('does not call the paid writer, Telegram, or the regional feed list', () => {
    const source = [
      readFileSync('functions/api/translate.ts', 'utf8'),
      readFileSync('shared/liveTranslate.ts', 'utf8'),
      readFileSync('public/live-translate.js', 'utf8'),
    ].join('\n');
    expect(source).not.toMatch(/\/api\/generate|api\.telegram|XAI_|grok|minimax|TELEGRAM_|from ['"].*feeds/i);
  });
});
