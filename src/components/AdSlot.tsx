import { useEffect, useRef } from 'react';
import { AD_CLIENT } from '../config';

type Variant = 'banner' | 'feed';

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

export function AdSlot({ slot, variant }: { slot: string; variant: Variant }) {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    const ins = insRef.current;
    if (!slot || !ins || pushed.current) return;
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
  }, [slot]);

  if (!slot) return null;

  const feed = variant === 'feed';
  return (
    <div className={feed ? 'ad-slot ad-slot-feed' : 'ad-slot ad-slot-banner'} aria-label="廣告">
      <ins
        ref={insRef}
        className="adsbygoogle"
        data-ad-client={AD_CLIENT}
        data-ad-slot={slot}
        data-ad-format={feed ? 'fluid' : 'auto'}
        data-full-width-responsive={feed ? undefined : 'true'}
        data-ad-layout={feed ? 'in-article' : undefined}
      />
    </div>
  );
}
