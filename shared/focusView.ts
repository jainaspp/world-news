/** Which list page should show a weekly focus intro. The homepage and filtered views do not. Today is the default preset, not an extra filter. */
export function focusTarget(view: {
  region: string;
  category: string;
  source: string;
  q: string;
  time: string;
  bookmarks: boolean;
  following: boolean;
}): { scope: 'region' | 'category'; id: string } | null {
  if (view.bookmarks || view.following || view.q.trim() || view.source.trim() || view.time !== 'today') return null;
  if (view.region !== 'ALL' && view.category === 'all') return { scope: 'region', id: view.region.toLowerCase() };
  if (view.category !== 'all' && view.region === 'ALL') return { scope: 'category', id: view.category };
  return null;
}
