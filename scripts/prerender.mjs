import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const outfile = '/tmp/wn-prerender-feeds.mjs';

async function topStories() {
  await build({
    entryPoints: ['server/loadFeeds.ts'],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    logLevel: 'silent',
  });
  const { loadFeeds } = await import(pathToFileURL(outfile).href);
  const result = await Promise.race([
    loadFeeds(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('prerender timeout')), 12000)),
  ]);
  return result.items.slice(0, 8);
}

function itemList(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '世界頭條',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.title,
      url: item.link,
      ...(item.image ? { image: item.image } : {}),
    })),
  };
}

try {
  const items = await topStories();
  const htmlPath = 'dist/index.html';
  let html = readFileSync(htmlPath, 'utf8');
  const json = JSON.stringify(itemList(items)).replace(/</g, '\\u003c');
  html = html.replace(
    /<script id="ld-stories" type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script id="ld-stories" type="application/ld+json">${json}</script>`,
  );
  writeFileSync(htmlPath, html);
  console.log(`prerendered ${items.length} stories into dist/index.html`);
} catch (error) {
  console.warn(`prerender skipped: ${error instanceof Error ? error.message : error}`);
}
