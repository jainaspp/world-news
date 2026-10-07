import { useEffect, useState, type ReactNode } from 'react';
import { hkInfoParts } from '../../shared/hkInfo';
import { HSI_QUOTE_URL, type HsiQuote } from '../../shared/hsi';
import type { MarketTick } from '../../shared/markets';
import type { HkNow } from '../../shared/hk';

const HKO_URL = 'https://www.hko.gov.hk/tc/wxinfo/currwx/current.htm';

function readMarket(): { hk: HkNow | null; hsi: HsiQuote | null } {
  try {
    const node = document.getElementById('wn-market');
    if (!node?.textContent) return { hk: null, hsi: null };
    const parsed = JSON.parse(node.textContent) as { hk?: HkNow | null; hsi?: HsiQuote | null };
    const hk = parsed.hk && (typeof parsed.hk.temperature === 'number' || parsed.hk.aqhi) ? parsed.hk : null;
    const hsi = parsed.hsi && typeof parsed.hsi.price === 'number' && typeof parsed.hsi.change === 'number' && typeof parsed.hsi.changePercent === 'number'
      ? parsed.hsi
      : null;
    return { hk, hsi };
  } catch {
    return { hk: null, hsi: null };
  }
}

/** One row for weather and the Hang Seng. A missing side is omitted; both missing unmounts the row. */
export function HkInfoStrip() {
  const boot = readMarket();
  const [hk, setHk] = useState<HkNow | null>(boot.hk);
  const [hsi, setHsi] = useState<HsiQuote | null>(boot.hsi);
  const [ticks, setTicks] = useState<MarketTick[]>([]);

  useEffect(() => {
    let cancel = false;
    const load = () => {
      void fetch('/api/hk').then((response) => (response.ok ? response.json() : Promise.reject())).then((json: HkNow) => {
        if (cancel) return;
        if (json && (typeof json.temperature === 'number' || json.aqhi)) setHk(json);
        else setHk(null);
      }).catch(() => {
        if (!cancel) setHk((current) => current);
      });
      void fetch('/api/hsi').then((response) => (response.ok ? response.json() : Promise.reject())).then((json: Partial<HsiQuote> | null) => {
        if (cancel) return;
        if (!json || typeof json.price !== 'number' || typeof json.change !== 'number' || typeof json.changePercent !== 'number') {
          setHsi(null);
          return;
        }
        setHsi({
          price: json.price,
          change: json.change,
          changePercent: json.changePercent,
          updated: typeof json.updated === 'string' ? json.updated : '',
          currency: typeof json.currency === 'string' ? json.currency : 'HKD',
          symbol: typeof json.symbol === 'string' ? json.symbol : '^HSI',
        });
      }).catch(() => {
        if (!cancel) setHsi((current) => current);
      });
      void fetch('/api/markets').then((response) => (response.ok ? response.json() : Promise.reject())).then((json: { ticks?: MarketTick[] } | null) => {
        if (cancel) return;
        const rows = Array.isArray(json?.ticks) ? json.ticks.filter((tick) => tick && tick.text && tick.href) : [];
        setTicks(rows);
      }).catch(() => {
        if (!cancel) setTicks([]);
      });
    };
    load();
    const timer = window.setInterval(load, 10 * 60 * 1000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, []);

  const parts = hkInfoParts(hk, hsi);
  if (!parts && ticks.length === 0) return null;
  const bits: Array<{ key: string; node: ReactNode }> = [];
  if (parts?.weather) {
    bits.push({
      key: 'wx',
      node: <a className="hk-info-wx" href={HKO_URL} target="_blank" rel="noopener noreferrer">{parts.weather}</a>,
    });
  }
  if (parts?.hsi) {
    bits.push({
      key: 'hsi',
      node: <a className={`hk-info-hsi hsi-${parts.direction}`} href={HSI_QUOTE_URL} target="_blank" rel="noopener noreferrer">{parts.hsi}</a>,
    });
  }
  for (const tick of ticks) {
    bits.push({
      key: tick.id,
      node: <a className={`hk-info-tick hsi-${tick.direction}`} href={tick.href} title={tick.title} target="_blank" rel="noopener noreferrer">{tick.text}</a>,
    });
  }
  return (
    <section className="hk-info" aria-label="香港天氣同恒生指數">
      {bits.map((bit, index) => (
        <span key={bit.key} className="hk-info-bit">
          {index > 0 && <span className="hk-info-sep" aria-hidden="true">|</span>}
          {bit.node}
        </span>
      ))}
    </section>
  );
}
