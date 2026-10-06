import { useEffect, useState } from 'react';
import { formatIndex, formatSigned, hsiDirection, HSI_QUOTE_URL, type HsiQuote } from '../../shared/hsi';

/** Compact 恒生指數 quote beside the weather strip. Hidden when the upstream quote is missing. */
export function HsiStrip() {
  const [quote, setQuote] = useState<HsiQuote | null>(null);

  useEffect(() => {
    let cancel = false;
    const load = () => fetch('/api/hsi').then((response) => (response.ok ? response.json() : Promise.reject())).then((json: Partial<HsiQuote> | null) => {
      if (cancel) return;
      if (!json || typeof json.price !== 'number' || typeof json.change !== 'number' || typeof json.changePercent !== 'number') {
        setQuote(null);
        return;
      }
      setQuote({
        price: json.price,
        change: json.change,
        changePercent: json.changePercent,
        updated: typeof json.updated === 'string' ? json.updated : '',
        currency: typeof json.currency === 'string' ? json.currency : 'HKD',
        symbol: typeof json.symbol === 'string' ? json.symbol : '^HSI',
      });
    }).catch(() => {
      if (!cancel) setQuote(null);
    });
    void load();
    const timer = window.setInterval(load, 10 * 60 * 1000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, []);

  if (!quote) return null;
  const direction = hsiDirection(quote.change);
  return (
    <section className={`hsi-strip hsi-${direction}`} aria-label="恒生指數">
      <a href={HSI_QUOTE_URL} target="_blank" rel="noopener noreferrer">
        <span className="hsi-label">恒生指數</span>
        <span className="hsi-price">{formatIndex(quote.price)}</span>
        <span className="hsi-change">
          {formatSigned(quote.change)} ({formatSigned(quote.changePercent)}%)
        </span>
      </a>
    </section>
  );
}
