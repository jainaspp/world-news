import { useState } from 'react';
import { regionByCode } from '../../shared/feeds';
import type { NewsItem } from '../../shared/types';
import { safeUrl } from '../utils/url';
import { RegionIcon } from './RegionIcon';

export function StoryMedia({ item, eager = false }: { item: NewsItem; eager?: boolean }) {
  const image = safeUrl(item.image ?? '');
  const [failed, setFailed] = useState(false);
  const code = item.regions[0] ?? 'ALL';
  const region = regionByCode(code);
  if (!image || failed) {
    return (
      <div className="thumb thumb-fallback" style={{ '--ph': region.color } as React.CSSProperties} aria-hidden="true">
        <RegionIcon code={code} large />
      </div>
    );
  }
  return (
    <img
      className="thumb"
      src={image}
      alt=""
      width={640}
      height={360}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={eager ? 'high' : 'low'}
      onError={() => setFailed(true)}
    />
  );
}
