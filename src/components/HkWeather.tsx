import { useEffect, useState } from 'react';
import { hkoIconUrl, type HkNow } from '../../shared/hk';

/** Slim HKO/EPD strip: temperature, humidity, AQHI and any warning in force. Space is reserved to avoid layout shift. */
export function HkWeather() {
  const [data, setData] = useState<HkNow | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancel = false;
    const load = () => fetch('/api/hk').then((r) => (r.ok ? r.json() : Promise.reject())).then((json: HkNow) => {
      if (!cancel) setData(json);
    }).catch(() => {
      if (!cancel) setFailed(true);
    });
    void load();
    const timer = window.setInterval(load, 10 * 60 * 1000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, []);

  if (failed && !data) return null;
  const icon = hkoIconUrl(data?.icon ?? null);
  return (
    <section className="hk-weather" aria-label="香港天氣" aria-busy={!data}>
      <a className="hk-now" href="https://www.hko.gov.hk/tc/wxinfo/currwx/current.htm" target="_blank" rel="noopener noreferrer">
        {icon ? <img src={icon} alt="" width={28} height={28} loading="lazy" decoding="async" /> : <span className="hk-icon-ph" aria-hidden="true" />}
        <span className="hk-temp">{data?.temperature ?? '—'}°C</span>
        {data?.humidity != null && <span className="hk-meta">濕度 {data.humidity}%</span>}
      </a>
      {data?.aqhi && (
        <a className={`hk-aqhi aqhi-${data.aqhi.value >= 7 ? 'high' : data.aqhi.value >= 4 ? 'mid' : 'low'}`} href="https://www.aqhi.gov.hk/tc.html" target="_blank" rel="noopener noreferrer" title={`最高：${data.aqhi.station}`}>
          AQHI {Math.floor(data.aqhi.value)} {data.aqhi.risk}
        </a>
      )}
      {data && data.rainMax > 0 && <span className="hk-meta">最高雨量 {data.rainMax} 毫米</span>}
      <span className="hk-warnings">
        {(data?.warnings ?? []).map((warning) => (
          <a key={warning.code || warning.name} className="hk-warning" href="https://www.hko.gov.hk/tc/wxinfo/dailywx/wxwarntoday.htm" target="_blank" rel="noopener noreferrer">
            {warning.name}
          </a>
        ))}
        {data && data.warnings.length === 0 && <span className="hk-meta">現時無天氣警告</span>}
      </span>
      <span className="hk-credit">天文台 · 環保署</span>
    </section>
  );
}
