import { useEffect, useState } from 'react';

/** Grok-written weekly intro for one region or category list. Renders nothing when KV has no copy. */
export function WeekFocus({ scope, id }: { scope: 'region' | 'category'; id: string }) {
  const [text, setText] = useState('');

  useEffect(() => {
    let cancel = false;
    const params = new URLSearchParams({ scope, id });
    fetch(`/api/focus?${params.toString()}`)
      .then((response) => (response.ok ? response.json() as Promise<{ text?: unknown }> : { text: '' }))
      .then((data) => {
        if (!cancel) setText(typeof data.text === 'string' ? data.text : '');
      })
      .catch(() => {
        if (!cancel) setText('');
      });
    return () => {
      cancel = true;
    };
  }, [scope, id]);

  if (!text) return null;
  return (
    <section className="week-focus" aria-label="本週重點">
      <div className="story-kicker">
        <span className="badge">AI 整合</span>
        <span className="kicker-region">本週重點</span>
      </div>
      <p>{text}</p>
    </section>
  );
}
