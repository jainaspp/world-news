/**
 * News explainers are multi-outlet events. A package or API name is not one.
 * Han count, points, and the public floor do not override this gate.
 */

export interface OutletRef {
  source?: string;
  url?: string;
  title?: string;
}

/** `minimatch：…`, `array.prototype.find：…`, `@scope/pkg：…`. ASCII colon counts the same. */
const PACKAGE_TITLE_RE = /^[a-z0-9@._/-]+[：:]/;

const TOOL_SOURCE_NAMES = new Set([
  'npm',
  'npmjs',
  'npm registry',
  'npm package page',
  'github',
  'package.json',
]);

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function toolHost(host: string): boolean {
  if (!host) return false;
  if (host === 'npmjs.com' || host.endsWith('.npmjs.com')) return true;
  if (host === 'npmjs.org' || host.endsWith('.npmjs.org')) return true;
  if (host === 'github.com' || host.endsWith('.github.com')) return true;
  return false;
}

/** Title is only a package or API token plus a colon. */
export function packageToolTitle(title: string): boolean {
  return PACKAGE_TITLE_RE.test(title.trim());
}

/** npm registry, a package page, package.json, or the GitHub repo that mirrors them. */
export function toolOutlet(ref: OutletRef): boolean {
  const name = (ref.source || '').trim().toLowerCase();
  if (name && (TOOL_SOURCE_NAMES.has(name) || /npm registry|package\.json|npm package/.test(name))) return true;
  return toolHost(hostOf(ref.url || ''));
}

export function newsEventOutlets(refs: OutletRef[]): string[] {
  const keys = new Set<string>();
  for (const ref of refs) {
    if (toolOutlet(ref)) continue;
    const name = (ref.source || '').trim();
    if (name) {
      keys.add(name.toLowerCase());
      continue;
    }
    const host = hostOf(ref.url || '');
    if (host) keys.add(host);
  }
  return [...keys];
}

function listedOutlets(refs: OutletRef[]): OutletRef[] {
  return refs.filter((ref) => (ref.source || '').trim() || (ref.url || '').trim());
}

/**
 * Hard fail for the explainer pipeline.
 * A pure package title fails even when the body is long.
 * Tool-only outlets (npm / GitHub / package page) are not a news event.
 */
export function rejectPackageExplainer(doc: { title: string; blocks?: { sources?: OutletRef[] }[] }): boolean {
  const refs = listedOutlets((doc.blocks ?? []).flatMap((block) => block.sources ?? []));
  // Package-shaped titles fail even when the body is long enough to publish.
  // npm / GitHub / package-page outlets are not a multi-source news event.
  if (packageToolTitle(doc.title)) return true;
  return refs.length > 0 && refs.every((ref) => toolOutlet(ref));
}

export function rejectPackageCluster(cluster: {
  lead: { title: string };
  items: { source: string; link: string; title?: string }[];
}): boolean {
  return rejectPackageExplainer({
    title: cluster.lead.title,
    blocks: [{
      sources: cluster.items.map((item) => ({
        source: item.source,
        url: item.link,
        ...(item.title ? { title: item.title } : {}),
      })),
    }],
  });
}

export function omitPackageExplainerEntries<T extends { title: string }>(entries: T[]): T[] {
  return entries.filter((entry) => !packageToolTitle(entry.title));
}
