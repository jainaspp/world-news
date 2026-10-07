import { useEffect, useState } from 'react';
import type { LiveAlert } from '../../shared/alerts';

/** Shown only while an HKO warning or an MTR disruption is active. */
export function AlertRow() {
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);

  useEffect(() => {
    let cancel = false;
    const load = () => {
      void fetch('/api/alerts')
        .then((response) => (response.ok ? response.json() : null))
        .then((json: { alerts?: LiveAlert[] } | null) => {
          if (cancel) return;
          const rows = Array.isArray(json?.alerts) ? json.alerts.filter((row) => row && row.name && row.href) : [];
          setAlerts(rows);
        })
        .catch(() => {
          if (!cancel) setAlerts([]);
        });
    };
    load();
    const timer = window.setInterval(load, 5 * 60 * 1000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, []);

  if (!alerts.length) return null;
  return (
    <section className="alert-row" aria-label="天氣及交通警告">
      {alerts.map((alert) => (
        <a key={alert.id} className="alert-pill" href={alert.href} target="_blank" rel="noopener noreferrer">
          {alert.name}
        </a>
      ))}
    </section>
  );
}
