import { useEffect, useState } from 'react';
import { regionByCode } from '../../shared/feeds';

export function RegionIcon({ code }: { code: string }) {
  const region = regionByCode(code);
  const url = `/icons/${region.icon}.svg`;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const image = new Image();
    image.onload = () => setReady(true);
    image.onerror = () => setReady(false);
    image.src = url;
  }, [url]);

  if (!ready) return null;
  return (
    <span
      className="region-icon"
      aria-hidden="true"
      style={{
        maskImage: `url(${url})`,
        WebkitMaskImage: `url(${url})`,
      }}
    />
  );
}
