import { writeFileSync } from 'node:fs';
import { renderSitemap, sitemapUrls } from '../../shared/sitemap.js';
import { indexableEntries } from './mustRead.js';
import { publicTopicPaths } from './topics.js';
import { readIndex, type ContentEnv } from './store.js';

/**
 * Sitemap XML from the indexes a publish just wrote.
 * This is not a Pages route. /sitemap.xml stays the static file in public/.
 * Dated /today/ lists are left to the caller: building them reads the news board.
 */
export async function renderPublishedSitemap(env: ContentEnv, todayPaths: string[] = []): Promise<string> {
  const [analysis, digest, weekly, briefing, compare, topics] = await Promise.all([
    readIndex(env, 'analysis').catch(() => []),
    readIndex(env, 'digest').catch(() => []),
    readIndex(env, 'weekly').catch(() => []),
    readIndex(env, 'briefing').catch(() => []),
    readIndex(env, 'compare').catch(() => []),
    publicTopicPaths(env).catch(() => []),
  ]);
  const [analysisPub, digestPub, weeklyPub, briefings, explainers] = await Promise.all([
    indexableEntries(env, 'analysis', analysis),
    indexableEntries(env, 'digest', digest),
    indexableEntries(env, 'weekly', weekly),
    indexableEntries(env, 'briefing', briefing),
    indexableEntries(env, 'compare', compare),
  ]);
  return renderSitemap(sitemapUrls({
    analyses: analysisPub.map((row) => ({ key: row.key, publishedAt: row.publishedAt })),
    digests: digestPub.map((row) => ({ key: row.key, publishedAt: row.publishedAt })),
    weeklies: weeklyPub.map((row) => ({ key: row.key, publishedAt: row.publishedAt })),
    briefings: briefings.map((row) => ({ key: row.key, publishedAt: row.publishedAt })),
    explainers: explainers.map((row) => ({ key: row.key, publishedAt: row.publishedAt })),
    topics,
    todayPaths,
  }));
}

/** Write the publish-time sitemap. `file` is a path on a Node publisher, not a Pages binding. */
export async function writePublishedSitemap(env: ContentEnv, file: string, todayPaths: string[] = []): Promise<void> {
  const xml = await renderPublishedSitemap(env, todayPaths);
  writeFileSync(file, xml);
}
