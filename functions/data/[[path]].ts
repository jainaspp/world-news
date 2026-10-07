import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import { allDataIds, collectSeries } from '../../server/dataSnapshot.js';
import { renderDataHub, renderDataMissing, renderDataPage } from '../../shared/dataPage.js';
import { pageBySlug, type DataPageId } from '../../shared/dataSeries.js';
import type { AdConfig } from '../../shared/contentPage.js';
import type { ContentEnv } from '../content/store.js';
import type { PagesContext } from '../env.js';

const HTML = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'public, max-age=300, s-maxage=600',
};

function adsFrom(env: ContentEnv): AdConfig {
  const pick = (...names: string[]) => {
    for (const name of names) {
      const value = env[name];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
  };
  const top = pick('AD_SLOT_TOP', 'VITE_AD_SLOT_TOP');
  return {
    client: pick('VITE_GOOGLE_AD_CLIENT', 'GOOGLE_AD_CLIENT') || 'ca-pub-8392975944327076',
    top,
    mid: pick('AD_SLOT_MID', 'VITE_AD_SLOT_FEED', 'AD_SLOT_FEED'),
    bottom: pick('AD_SLOT_BOTTOM', 'VITE_AD_SLOT_BOTTOM') || top,
  };
}

function slugOf(pathname: string): string {
  return pathname.replace(/\/+$/, '').replace(/^\/data\/?/, '');
}

/** /data/ and /data/:slug/. One KV snapshot per series per Hong Kong day, on the first request. */
export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = context.env as ContentEnv;
  const slug = slugOf(new URL(context.request.url).pathname);
  const spec = slug ? pageBySlug(slug) : null;
  if (slug && !spec) {
    return new Response(renderDataMissing(), {
      status: 404,
      headers: { 'content-type': HTML['content-type'], 'cache-control': 'no-store' },
    });
  }
  const ids: DataPageId[] = spec ? [spec.id] : allDataIds();
  const series = await collectSeries(env, ids);
  const ads = adsFrom(env);
  const html = spec ? renderDataPage(spec, series[0] ?? { id: spec.id, days: [] }, ads) : renderDataHub(series, ads);
  return new Response(html, { headers: HTML });
}
