import { useMemo } from 'react';
import { mustReadForSurface, type MustReadLink } from '../../shared/mustRead';

function readMustRead(): MustReadLink[] {
  const node = document.getElementById('wn-must-read');
  if (!node?.textContent) return [];
  try {
    const parsed = JSON.parse(node.textContent) as MustReadLink[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row) => row && typeof row.href === 'string' && typeof row.title === 'string').slice(0, 5);
  } catch {
    return [];
  }
}

/** Same links the server painted, so hydration does not drop the review block. */
export function MustRead({ category }: { category: string }) {
  const links = useMemo(() => mustReadForSurface(readMustRead(), category), [category]);
  if (!links.length) return null;
  return (
    <section className="must-read" aria-label="今日必讀">
      <h2 className="section-title">今日必讀</h2>
      <div className="news-grid">
        {links.map((link) => (
          <article className="story" key={link.href}>
            <div className="story-body">
              <div className="story-kicker"><span className="badge ai-badge">AI 整合</span><span className="kicker-region">新聞懶人包</span></div>
              <h2 className="story-title"><a href={link.href}>{link.title}</a></h2>
              {link.description ? <p className="dek">{link.description}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
