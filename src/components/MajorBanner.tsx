import { useEffect, useState } from 'react';
import type { MajorEntry } from '../../shared/angles';

const DISMISS = 'wn-major-dismiss';

function readBoot(): MajorEntry | null {
  try {
    const node = document.getElementById('wn-major');
    if (!node?.textContent) return null;
    const parsed = JSON.parse(node.textContent) as { banner?: MajorEntry | null };
    const banner = parsed.banner;
    if (!banner || typeof banner.title !== 'string' || typeof banner.href !== 'string' || typeof banner.id !== 'string') return null;
    return banner;
  } catch {
    return null;
  }
}

function dismissed(id: string): boolean {
  try {
    return localStorage.getItem(DISMISS) === id;
  } catch {
    return false;
  }
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** In-flow red banner. Not sticky, so it does not add to the mobile chrome budget. */
export function MajorBanner() {
  const boot = readBoot();
  const [entry, setEntry] = useState<MajorEntry | null>(boot);
  const [hidden, setHidden] = useState(() => (boot ? dismissed(boot.id) : false));
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let cancel = false;
    const load = () => {
      void fetch('/api/major')
        .then((response) => (response.ok ? response.json() : null))
        .then((json: { banner?: MajorEntry | null } | null) => {
          if (cancel) return;
          const banner = json?.banner && typeof json.banner.title === 'string' ? json.banner : null;
          setEntry(banner);
          setHidden(banner ? dismissed(banner.id) : false);
        })
        .catch(() => undefined);
    };
    load();
    const timer = window.setInterval(load, 3 * 60 * 1000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => {
      setHidden(true);
      setLeaving(false);
    }, 420);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  if (!entry || (hidden && !leaving)) return null;
  return (
    <section
      className={leaving ? 'major-banner is-leaving' : 'major-banner'}
      data-major-id={entry.id}
      role="region"
      aria-label="重大更新"
      onAnimationEnd={(event) => {
        if (leaving && event.animationName === 'banner-out' && event.target === event.currentTarget) {
          setHidden(true);
          setLeaving(false);
        }
      }}
    >
      <span className="major-kicker">重大更新</span>
      <a href={entry.href}>{entry.title}</a>
      <button
        type="button"
        className="major-dismiss"
        aria-label="關閉"
        onClick={() => {
          try {
            localStorage.setItem(DISMISS, entry.id);
          } catch {
            /* private mode */
          }
          if (prefersReducedMotion()) {
            setHidden(true);
            return;
          }
          setLeaving(true);
        }}
      >
        ×
      </button>
    </section>
  );
}
