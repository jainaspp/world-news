import { regionByCode } from '../../shared/feeds';

export function RegionIcon({ code, icon, large = false }: { code: string; icon?: string; large?: boolean }) {
  const region = regionByCode(code);
  const url = `/icons/${icon ?? region.icon}.svg`;
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
