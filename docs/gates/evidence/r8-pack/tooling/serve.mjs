/**
 * Production-build server for the R8 evidence pack.
 *
 * Serves `dist/` and renders HTML with the same functions the Pages
 * deploy uses: `injectHomeShell`, `renderCivilizationHub`,
 * `renderChroniclePage`, `renderLearnPath`, `renderStoryPage`.
 * Not the Vite dev server. Port 4173, matching the R3/R7 method.
 *
 * Measurement-only route: GET /__r8/meta (story ids chosen for page A).
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = new URL('../../../../../', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 4173);
const HOST = '127.0.0.1';

const entry = join('/tmp', 'wn-r8-render-entry.mjs');
const outfile = join('/tmp', 'wn-r8-render.mjs');

await build({
  stdin: {
    contents: `
      export { injectHomeShell } from ${JSON.stringify(join(ROOT, 'shared/homePage.ts'))};
      export { renderCivilizationHub, renderChroniclePage, renderCivilizationMiss, renderCosmosPage, renderEarthPage, renderOriginsPage, renderTechPage, renderCityPage } from ${JSON.stringify(join(ROOT, 'shared/civilizationPage.ts'))};
      export { renderLearnPath } from ${JSON.stringify(join(ROOT, 'shared/learnPage.ts'))};
      export { renderStoryPage } from ${JSON.stringify(join(ROOT, 'shared/storyPage.ts'))};
      export { loadFeeds } from ${JSON.stringify(join(ROOT, 'server/loadFeeds.ts'))};
    `,
    resolveDir: ROOT,
    sourcefile: 'r8-entry.mjs',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile,
  logLevel: 'silent',
});
void entry;

const render = await import(pathToFileURL(outfile).href);

const shell = readFileSync(join(DIST, 'index.html'), 'utf8');

let items = [];
let feedErrors = 0;
try {
  const loaded = await Promise.race([
    render.loadFeeds(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('loadFeeds timeout')), 20000)),
  ]);
  items = loaded.items || [];
  feedErrors = loaded.errors || 0;
  console.log(`loadFeeds ${items.length} items, errors ${feedErrors}`);
} catch (error) {
  console.warn(`loadFeeds failed: ${error instanceof Error ? error.message : error}`);
}

const homeItems = items.slice(0, 16);
const byLength = [...items].filter((item) => item && item.title && item.id).sort((a, b) => b.title.length - a.title.length);
const longest = byLength[0] || null;
const general = byLength.length > 2 ? byLength[Math.floor(byLength.length / 2)] : byLength[1] || longest;

function storyHref(item) {
  return item ? `/story/${encodeURIComponent(item.id)}/` : '';
}

const payload = {
  items: homeItems,
  fetchedAt: new Date().toISOString(),
  source: 'rss',
  feedErrors,
  stale: false,
};

function htmlResponse(body, status = 200) {
  return {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
    body,
  };
}

function jsonResponse(value, status = 200) {
  return {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
    body: JSON.stringify(value),
  };
}

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

function readStatic(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^(\.\.(\/|\\|$))+/, '');
  const file = join(DIST, clean);
  if (!file.startsWith(DIST)) return null;
  if (!existsSync(file) || !statSync(file).isFile()) return null;
  const type = TYPES[extname(file)] || 'application/octet-stream';
  return { status: 200, headers: { 'content-type': type, 'cache-control': 'no-store' }, body: readFileSync(file) };
}

function civPage(name) {
  const pages = {
    '': render.renderCivilizationHub,
    cosmos: render.renderCosmosPage,
    earth: render.renderEarthPage,
    origins: render.renderOriginsPage,
    tech: render.renderTechPage,
    city: render.renderCityPage,
    chronicle: render.renderChroniclePage,
  };
  const fn = Object.prototype.hasOwnProperty.call(pages, name) ? pages[name] : null;
  return fn ? fn() : render.renderCivilizationMiss();
}

function handle(req) {
  const url = new URL(req.url || '/', `http://${HOST}`);
  const path = url.pathname;

  if (path === '/__r8/meta') {
    return jsonResponse({
      feedCount: items.length,
      homeCount: homeItems.length,
      feedErrors,
      longest: longest ? { id: longest.id, title: longest.title, href: storyHref(longest), chars: longest.title.length } : null,
      general: general ? { id: general.id, title: general.title, href: storyHref(general), chars: general.title.length } : null,
    });
  }

  if (path === '/api/news') return jsonResponse(payload);
  if (path === '/api/popular') return jsonResponse({ items: [] });
  if (path === '/api/major') return jsonResponse({ banner: null });
  if (path === '/api/alerts') return jsonResponse({ alerts: [] });
  if (path === '/api/subscribe') return jsonResponse({ telegram: null });
  if (path === '/api/hk') return jsonResponse({});
  if (path === '/api/hsi') return jsonResponse({});
  if (path === '/api/markets') return jsonResponse({ ticks: [] });
  if (path === '/api/translate') return jsonResponse({ translations: [], final: [] });
  if (path === '/api/reads') return { status: 204, headers: { 'cache-control': 'no-store' }, body: '' };

  if (path === '/' || path === '/index.html') {
    const html = render.injectHomeShell(shell, homeItems, new Map(), null, '', null, '', [], [], true);
    return htmlResponse(html);
  }

  if (path === '/civilization' || path.startsWith('/civilization/')) {
    const rest = decodeURIComponent(path.replace(/\/+$/, '').replace(/^\/civilization\/?/, ''));
    const page = civPage(rest);
    return htmlResponse(page.html, page.status);
  }

  if (path === '/learn' || path.startsWith('/learn/')) {
    const rest = decodeURIComponent(path.replace(/\/+$/, '').replace(/^\/learn\/?/, ''));
    const page = render.renderLearnPath(rest);
    return htmlResponse(page.html, page.status);
  }

  if (path.startsWith('/story/')) {
    const id = decodeURIComponent(path.split('/').filter(Boolean)[1] || '');
    const item = items.find((row) => row.id === id);
    if (!item) return htmlResponse('<!doctype html><title>missing</title><p>missing story</p>', 404);
    const related = items.filter((row) => row.id !== id).slice(0, 6);
    const html = render.renderStoryPage(item, null, related, `https://world-news.xyz/story/${encodeURIComponent(id)}/`);
    return htmlResponse(html);
  }

  const file = readStatic(path);
  if (file) return file;
  return htmlResponse('<!doctype html><title>404</title><p>not found</p>', 404);
}

const server = createServer((req, res) => {
  try {
    const result = handle(req);
    res.writeHead(result.status, result.headers);
    res.end(result.body);
  } catch (error) {
    console.error(error);
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(error instanceof Error ? error.stack : String(error));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`r8 evidence server http://${HOST}:${PORT}`);
  console.log(`longest ${longest ? `${longest.id} (${longest.title.length})` : 'none'}`);
  console.log(`general ${general ? `${general.id} (${general.title.length})` : 'none'}`);
});
