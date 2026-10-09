import { explainerCurrent, type ContentDoc, type IndexEntry } from '../../shared/content.js';
import { columnIndexable } from '../../shared/contentPage.js';
import { mustReadLink, type MustReadLink } from '../../shared/mustRead.js';
import { latestBriefingLinks } from '../../shared/writers.js';
import { docKey, readDoc, readIndex, type ContentEnv } from './store.js';

/** Drop fail shells. Digest, weekly and analysis need a real AI body; briefings and explainers use their public floors. */
export async function indexableEntries(env: ContentEnv, kind: ContentDoc['kind'], rows: IndexEntry[]): Promise<IndexEntry[]> {
  const saved = await Promise.all(rows.map((row) => readDoc(env, docKey(kind, row.key)).catch(() => null)));
  return rows.filter((_row, index) => Boolean(saved[index]?.doc && columnIndexable(saved[index]!.doc)));
}

/** Up to five public lazy-packs, newest first. Fail and thin shells are left out. */
export async function loadMustRead(env: ContentEnv): Promise<MustReadLink[]> {
  const rows = await readIndex(env, 'compare').catch(() => []);
  const saved = await Promise.all(rows.slice(0, 20).map((row) => readDoc(env, docKey('compare', row.key)).catch(() => null)));
  const links: MustReadLink[] = [];
  rows.slice(0, 20).forEach((row, index) => {
    const doc = saved[index]?.doc;
    if (!doc || !explainerCurrent(doc) || links.length >= 5) return;
    links.push(mustReadLink({ ...row, title: doc.title, description: doc.description || row.description, category: row.category || doc.blocks[0]?.category }));
  });
  return links;
}

/** Briefing strip links only when the saved piece is public. */
export async function loadBriefingLinks(env: ContentEnv): Promise<{ href: string; label: string }[]> {
  const rows = await readIndex(env, 'briefing').catch(() => []);
  const visible = await indexableEntries(env, 'briefing', rows.slice(0, 24));
  return latestBriefingLinks(visible);
}
