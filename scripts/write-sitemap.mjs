import { existsSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const outfile = '/tmp/wn-sitemap.mjs';

await build({
  entryPoints: ['shared/sitemap.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile,
  logLevel: 'silent',
});

const { staticSitemapXml } = await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
const xml = staticSitemapXml();
writeFileSync('public/sitemap.xml', xml);
if (existsSync('dist')) writeFileSync('dist/sitemap.xml', xml);
const count = xml.match(/<loc>/g)?.length ?? 0;
console.log(`wrote sitemap.xml (${count} urls)`);
