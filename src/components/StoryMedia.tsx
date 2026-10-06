import { useState } from 'react';
import { regionByCode } from '../../shared/feeds';
import { categoryLabel } from '../../shared/categories';
import type { NewsItem } from '../../shared/types';
import { safeUrl } from '../utils/url';

export function StoryMedia({ item, eager = false }: { item: NewsItem; eager?: boolean }) {
  const image = safeUrl(item.image ?? '');
  const [failed, setFailed] = useState(false);
  const region = regionByCode(item.regions[0] ?? 'ALL');
  if (!image || failed) {
    return (
      <div className="thumb thumb-fallback" style={{ background: region.color }} aria-hidden="true">
        <span>{categoryLabel(item.category ?? 'world')}</span>
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
