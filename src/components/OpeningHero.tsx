import { useLayoutEffect, useRef } from 'react';
import { renderOpeningHero } from '../../shared/civilization/openingHero';
import { mountOpeningHero } from '../opening/mountOpeningHero';

/** Same markup the homepage SSR string uses. The effect only starts the plate. */
export function OpeningHero() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    return mountOpeningHero(node);
  }, []);
  return <div ref={ref} className="bbt-hero-mount" dangerouslySetInnerHTML={{ __html: renderOpeningHero() }} />;
}
