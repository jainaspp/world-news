import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AQHI_PAGE, HKO_PAGE, hkoIconEmoji, type HkNow } from '../../shared/hk';
import { hkInfoParts } from '../../shared/hkInfo';
import { HSI_QUOTE_URL, type HsiQuote } from '../../shared/hsi';
import type { MarketTick } from '../../shared/markets';
import {
  abroadRows,
  dayEmoji,
  districtRain,
  formatHkClock,
  formatLoose,
  formatRange,
  formatStamp,
  hkDetailRows,
  HKO_STATIONS,
  nearestAqhi,
  openMeteoUrl,
  parseOpenMeteo,
  readWxChoice,
  readWxOpen,
  resolveFocus,
  OPEN_METEO_PAGE,
  round2,
  serializeWxChoice,
  stationTemperature,
  territoryRain,
  wmoEmoji,
  WX_LOC_KEY,
  WX_OPEN_KEY,
  type AbroadWx,
  type WxChoice,
} from '../../shared/wx';

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

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

/** One row for weather and the Hang Seng. Extra weather stays behind a closed panel. */
export function HkInfoStrip() {
  const boot = readMarket();
  const [hk, setHk] = useState<HkNow | null>(boot.hk);
  const [hsi, setHsi] = useState<HsiQuote | null>(boot.hsi);
  const [ticks, setTicks] = useState<MarketTick[]>([]);
  const [choice, setChoice] = useState<WxChoice>(() => readWxChoice(storageGet(WX_LOC_KEY)));
  const [panelOpen, setPanelOpen] = useState(() => readWxOpen(storageGet(WX_OPEN_KEY)));
  const [menu, setMenu] = useState(false);
  const [note, setNote] = useState('');
  const [locating, setLocating] = useState(false);
  const [abroad, setAbroad] = useState<AbroadWx | null>(null);
  const [abroadFailed, setAbroadFailed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const panelId = useId();

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

  useEffect(() => {
    storageSet(WX_LOC_KEY, serializeWxChoice(choice));
  }, [choice]);

  useEffect(() => {
    storageSet(WX_OPEN_KEY, panelOpen ? '1' : '0');
  }, [panelOpen]);

  useEffect(() => {
    if (choice.mode !== 'geo') {
      setAbroad(null);
      setAbroadFailed(false);
      return;
    }
    const focusNow = resolveFocus(choice);
    if (!focusNow.outside || focusNow.lat == null || focusNow.lon == null) {
      setAbroad(null);
      setAbroadFailed(false);
      return;
    }
    let cancel = false;
    const load = () => {
      // Coordinates go to Open-Meteo only, never to world-news.xyz.
      void fetch(openMeteoUrl(focusNow.lat!, focusNow.lon!))
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((json: unknown) => {
          if (cancel) return;
          const parsed = parseOpenMeteo(json);
          if (!parsed || typeof parsed.temperature !== 'number') {
            setAbroad(null);
            setAbroadFailed(true);
            setNote('你所在位置嘅天氣暫時攞唔到，照顯示香港。');
            return;
          }
          setAbroad(parsed);
          setAbroadFailed(false);
          setNote('');
        })
        .catch(() => {
          if (cancel) return;
          setAbroad(null);
          setAbroadFailed(true);
          setNote('你所在位置嘅天氣暫時攞唔到，照顯示香港。');
        });
    };
    load();
    const timer = window.setInterval(load, 10 * 60 * 1000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, [choice]);

  useEffect(() => {
    if (!menu) return;
    function onPointer(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setMenu(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenu(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const focus = resolveFocus(choice);
  const fallbackHk = focus.outside && abroadFailed;
  const showAbroad = focus.outside && abroad != null && !abroadFailed;
  const showHk = Boolean(hk) && (!focus.outside || fallbackHk);
  const stationTemp = showHk && hk && focus.place && !fallbackHk ? stationTemperature(hk.stations, focus.place) : undefined;
  const temperature = !hk ? null : focus.place && !fallbackHk ? (stationTemp === undefined ? hk.temperature : stationTemp) : hk.temperature;
  const aqhi = showHk && hk
    ? (focus.place && !fallbackHk && focus.lat != null && focus.lon != null ? nearestAqhi(focus.lat, focus.lon, hk.aqhiStations) ?? hk.aqhi : hk.aqhi)
    : null;

  let summary = '';
  let emoji = '';
  if (showAbroad && abroad) {
    emoji = wmoEmoji(abroad.code);
    if (typeof abroad.temperature === 'number') summary = `${Math.round(abroad.temperature)}°C`;
  } else if (showHk && hk) {
    summary = hkInfoParts({ ...hk, temperature, aqhi }, null)?.weather ?? '';
    emoji = hkoIconEmoji(hk.icon);
  } else if (focus.outside && !abroadFailed) {
    summary = '載入中';
  }

  const chip = showAbroad || (focus.outside && !abroadFailed) ? '你所在位置' : fallbackHk ? '香港' : focus.label;
  const showCluster = Boolean(summary) || choice.mode !== 'territory';
  const market = hkInfoParts(null, hsi);
  const places = hk?.stations?.length ? hk.stations.map((row) => row.place) : HKO_STATIONS.map((row) => row.place);

  if (!showCluster && !market?.hsi && ticks.length === 0) return null;

  function togglePanel() {
    setMenu(false);
    setPanelOpen((open) => !open);
  }

  function pickTerritory() {
    setChoice({ mode: 'territory' });
    setNote('');
    setMenu(false);
  }

  function pickStation(place: string) {
    setChoice({ mode: 'station', place });
    setNote('');
    setMenu(false);
  }

  function useMyLocation() {
    setMenu(false);
    if (!navigator.geolocation) {
      setChoice({ mode: 'territory' });
      setNote('呢部機冇定位，照顯示香港。');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setNote('');
        setAbroadFailed(false);
        setChoice({ mode: 'geo', lat: round2(position.coords.latitude), lon: round2(position.coords.longitude) });
      },
      (error) => {
        setLocating(false);
        setAbroad(null);
        setChoice({ mode: 'territory' });
        setNote(error.code === 1 ? '你拒絕咗定位，照顯示香港。' : '定位唔到，照顯示香港。');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
    );
  }

  const bits: Array<{ key: string; node: ReactNode }> = [];
  if (showCluster) {
    bits.push({
      key: 'wx',
      node: (
        <div className="wx-cluster">
          <button
            type="button"
            className="wx-loc"
            aria-expanded={menu}
            aria-controls={menuId}
            aria-haspopup="menu"
            aria-label={`位置：${chip}`}
            onClick={() => setMenu((open) => !open)}
          >
            {chip} ▾
          </button>
          {summary && (
            <button
              type="button"
              className="wx-summary"
              aria-expanded={panelOpen}
              aria-controls={panelId}
              aria-label={`${summary}，天氣詳情`}
              onClick={togglePanel}
            >
              {emoji ? <span aria-hidden="true">{emoji} </span> : null}
              {summary}
            </button>
          )}
          <button type="button" className="wx-more" aria-expanded={panelOpen} aria-controls={panelId} onClick={togglePanel}>
            {panelOpen ? '詳情 ▴' : '詳情 ▾'}
          </button>
          <div id={menuId} className="wx-loc-menu" role="menu" aria-label="選擇位置" hidden={!menu}>
            <button type="button" role="menuitemradio" aria-checked={choice.mode === 'territory'} onClick={pickTerritory}>
              香港（全港）
            </button>
            {places.map((place) => (
              <button
                key={place}
                type="button"
                role="menuitemradio"
                aria-checked={choice.mode === 'station' ? choice.place === place : choice.mode === 'geo' && !focus.outside && focus.place === place}
                onClick={() => pickStation(place)}
              >
                {place}
              </button>
            ))}
            <button type="button" className="wx-here" role="menuitemradio" aria-checked={choice.mode === 'geo' && focus.outside} disabled={locating} onClick={useMyLocation}>
              {locating ? '定位中…' : '用我位置'}
            </button>
          </div>
        </div>
      ),
    });
  }
  if (market?.hsi) {
    bits.push({
      key: 'hsi',
      node: <a className={`hk-info-hsi hsi-${market.direction}`} href={HSI_QUOTE_URL} target="_blank" rel="noopener noreferrer">{market.hsi}</a>,
    });
  }
  for (const tick of ticks) {
    bits.push({
      key: tick.id,
      node: <a className={`hk-info-tick hsi-${tick.direction}`} href={tick.href} title={tick.title} target="_blank" rel="noopener noreferrer">{tick.text}</a>,
    });
  }

  const rain = showHk && hk
    ? (focus.district && !fallbackHk
      ? (() => {
          const row = districtRain(focus.district, hk.rainfall);
          return row ? { label: row.place, max: row.max } : null;
        })()
      : (() => {
          const row = territoryRain(hk.rainfall);
          return row ? { label: '各區最高', max: row.max } : null;
        })())
    : null;
  const detailRows = showHk && hk
    ? hkDetailRows({
        todayMin: hk.todayMin ?? null,
        todayMax: hk.todayMax ?? null,
        todayPsr: hk.todayPsr ?? '',
        uv: hk.uv,
        humidity: hk.humidity,
        aqhi,
        rain,
        warnings: hk.warnings,
      })
    : abroad && showAbroad
      ? abroadRows(abroad)
      : [];
  const updated = showHk && hk ? formatHkClock(hk.updated) : '';
  const forecast = showHk && hk ? (hk.forecast ?? '').trim() : '';
  const days = showHk && hk ? hk.days ?? [] : [];
  const abroadDays = showAbroad && abroad ? abroad.days : [];

  return (
    <div className="hk-info-wrap" ref={wrapRef}>
      <section className="hk-info" aria-label="香港天氣同恒生指數">
        {bits.map((bit, index) => (
          <div key={bit.key} className="hk-info-bit">
            {index > 0 && <span className="hk-info-sep" aria-hidden="true">|</span>}
            {bit.node}
          </div>
        ))}
      </section>
      {note && <p className="wx-note" role="status">{note}</p>}
      <div id={panelId} className="wx-panel" role="region" aria-label="天氣詳情" hidden={!panelOpen || !showCluster}>
        <p className="wx-panel-head">
          {emoji ? <span aria-hidden="true">{emoji} </span> : null}
          <span className="wx-panel-place">{chip}</span>
          {typeof temperature === 'number' && !showAbroad ? <span>{Math.round(temperature)}°C</span> : null}
          {showAbroad && abroad && typeof abroad.temperature === 'number' ? <span>{Math.round(abroad.temperature)}°C</span> : null}
        </p>
        {detailRows.length > 0 && (
          <dl className="wx-rows">
            {detailRows.map((row) => (
              <div key={row.label} className="wx-row">
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {forecast && <p className="wx-forecast">{forecast}</p>}
        {focus.place && !fallbackHk && (forecast || days.length > 0) && <p className="wx-kicker">以下係全港預測</p>}
        {days.length > 0 && (
          <div className="wx-days">
            {days.map((day) => (
              <div key={day.date} className="wx-day">
                <div className="wx-day-date">{formatStamp(day.date)}</div>
                <div className="wx-day-week">{day.weekday}</div>
                <div className="wx-day-icon" aria-hidden="true">{dayEmoji(day)}</div>
                <div>{formatRange(day.min, day.max)}</div>
                {day.psr ? <div className="wx-day-psr" title="降雨概率">{day.psr}</div> : null}
              </div>
            ))}
          </div>
        )}
        {abroadDays.length > 0 && (
          <div className="wx-days">
            {abroadDays.map((day) => (
              <div key={day.date} className="wx-day">
                <div className="wx-day-date">{formatStamp(day.date)}</div>
                <div className="wx-day-week">{day.weekday}</div>
                <div className="wx-day-icon" aria-hidden="true">{wmoEmoji(day.code)}</div>
                <div>{formatRange(day.min, day.max)}</div>
                {typeof day.pop === 'number' ? <div className="wx-day-psr" title="降雨概率">{Math.round(day.pop)}%</div> : null}
                {typeof day.uv === 'number' ? <div className="wx-day-uv">UV {formatLoose(day.uv)}</div> : null}
              </div>
            ))}
          </div>
        )}
        {!detailRows.length && !forecast && days.length === 0 && abroadDays.length === 0 && (
          <p className="wx-forecast">{focus.outside && !abroadFailed ? '載入中' : '暫時冇更多天氣資料。'}</p>
        )}
        {updated && <p className="wx-meta">更新時間 {updated}</p>}
        <p className="wx-meta">
          {showAbroad ? (
            <a href={OPEN_METEO_PAGE} target="_blank" rel="noopener noreferrer">資料來源 Open-Meteo</a>
          ) : (
            <>
              資料來源{' '}
              <a href={HKO_PAGE} target="_blank" rel="noopener noreferrer">香港天文台</a>
              {' · '}
              <a href={AQHI_PAGE} target="_blank" rel="noopener noreferrer">環境保護署</a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
