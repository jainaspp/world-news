import { useEffect, useState } from 'react';
import type { PopularRow } from '../../shared/reads';

export function usePopular(enabled = true): PopularRow[] {
  const [rows, setRows] = useState<PopularRow[]>([]);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancel = false;
    const load = () => {
      void fetch('/api/popular')
        .then((response) => (response.ok ? response.json() : null))
        .then((json: { items?: PopularRow[] } | null) => {
          if (!cancel) setRows(Array.isArray(json?.items) ? json.items : []);
        })
        .catch(() => undefined);
    };
    load();
    const timer = window.setInterval(load, 60 * 1000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, [enabled]);

  return rows;
}
