import { useEffect, useRef } from 'react';
import { adsRuntimeEnabled } from '../../shared/adPolicy';
import { validAdSlot } from '../../shared/adSlot';
import { AD_CLIENT } from '../config';

type Variant = 'banner' | 'feed' | 'sidebar';

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

const PAGEAD = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

function ensureAdScript(): void {
  if (document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) return;
  const ads = document.createElement('script');
  ads.async = true;
  ads.crossOrigin = 'anonymous';
  ads.src = `${PAGEAD}?client=${encodeURIComponent(AD_CLIENT)}`;
  document.head.appendChild(ads);
}

/** Renders nothing unless the slot id is a real AdSense unit. Empty env vars must not leave a box or load pagead. */
export function AdSlot({ slot, variant }: { slot: string; variant: Variant }) {
  const id = validAdSlot(slot);
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    const ins = insRef.current;
    if (!id || !ins || pushed.current) return;
    if (ins.getAttribute('data-adsbygoogle-status')) {
      pushed.current = true;
      return;
    }
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // The loader fills each <ins> once. A second push on refresh throws.
    }
    ensureAdScript();
  }, [id]);

  if (!adsRuntimeEnabled() || !id) return null;

  const feed = variant === 'feed';
  const sidebar = variant === 'sidebar';
  const className = sidebar ? 'ad-slot ad-slot-sidebar' : feed ? 'ad-slot ad-slot-feed' : 'ad-slot ad-slot-banner';
  return (
    <div className={className} aria-label="廣告">
      <span className="ad-label">廣告</span>
      <ins
        ref={insRef}
        className="adsbygoogle"
        data-ad-client={AD_CLIENT}
        data-ad-slot={id}
        data-ad-format={feed ? 'fluid' : 'auto'}
        data-full-width-responsive={feed || sidebar ? undefined : 'true'}
        data-ad-layout={feed ? 'in-article' : undefined}
      />
    </div>
  );
}
