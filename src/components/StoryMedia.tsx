import { useState } from 'react';
import { CATEGORY_TILE, isCategoryId } from '../../shared/categories';
import type { NewsItem } from '../../shared/types';
import { safeUrl } from '../utils/url';
import { RegionIcon } from './RegionIcon';

export function StoryMedia({ item, eager = false }: { item: NewsItem; eager?: boolean }) {
  const image = safeUrl(item.image ?? '');
  const [failed, setFailed] = useState(false);
  const category = item.category && isCategoryId(item.category) ? item.category : 'world';
  const tile = CATEGORY_TILE[category];
  if (!image || failed) {
    return (
      <div className="thumb thumb-fallback" style={{ '--ph': tile.color } as React.CSSProperties} aria-hidden="true">
        <RegionIcon code={item.regions[0] ?? 'ALL'} icon={tile.icon} large />
        <span className="thumb-source">{item.source}</span>
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
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
