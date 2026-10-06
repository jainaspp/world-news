import { regionByCode } from '../../shared/feeds';

export function RegionIcon({ code, large = false }: { code: string; large?: boolean }) {
  const region = regionByCode(code);
  const url = `/icons/${region.icon}.svg`;
  return (
    <span
      className={large ? 'region-icon region-icon-lg' : 'region-icon'}
      aria-hidden="true"
      style={{
        maskImage: `url("${url}")`,
        WebkitMaskImage: `url("${url}")`,
      }}
    />
  );
}
