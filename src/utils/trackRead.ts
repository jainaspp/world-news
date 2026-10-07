/** Private click beacon. Bots and repeat clicks are dropped by /api/reads. */
export function trackRead(id: string): void {
  if (!/^[0-9a-f]{6,16}$/.test(id)) return;
  const body = JSON.stringify({ id });
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon('/api/reads', blob)) return;
    }
  } catch {
    /* fall through to fetch */
  }
  void fetch('/api/reads', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
