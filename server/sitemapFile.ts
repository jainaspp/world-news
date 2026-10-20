import { writeFileSync } from 'node:fs';
import { renderPublishedSitemap } from '../functions/content/sitemapPublish.js';
import type { ContentEnv } from '../functions/content/store.js';

/**
 * Node publisher only. Pages Functions must not import this file:
 * `node:fs` is not part of the Worker bundle, and a static import here
 * used to be pulled in through `store.ts` and failed the production isolate.
 */
export async function writePublishedSitemap(env: ContentEnv, file: string, todayPaths: string[] = []): Promise<void> {
  const xml = await renderPublishedSitemap(env, todayPaths);
  writeFileSync(file, xml);
}
