import { useEffect, useRef } from 'react';

interface Props {
  slot: string;
  format?: 'horiz' | 'rect' | 'auto';
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Google AdSense 廣告單元組件
 * 使用說明：確保 index.html 已載入 adsbygoogle.js
 * 若廣告未顯示，是因為 AdSense 尚未核准該廣告位，屬於正常等待期
 */
export function NewsAdBanner({ slot, format = 'auto', className = '', style }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    // 延後執行，確保 DOM 已渲染且 adsbygoogle 已就緒
    const timer = setTimeout(() => {
      if (window.adsbygoogle && ref.current) {
        try {
          (window.adsbygoogle = (window.adsbygoogle || [])).push({});
        } catch (e) {
          // 若有錯誤（如廣告位未核准），靜默忽略
        }
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [slot]);

  return (
    <div
      ref={ref}
      className={`ad-unit ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: 10,
        marginBottom: 12,
        minHeight: format === 'horiz' ? 90 : 250,
        background: 'var(--ad-bg)',
        border: '1px solid var(--border)',
        ...style,
      }}
    >
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          width: '100%',
          height: format === 'horiz' ? 90 : 250,
        }}
        data-ad-client="ca-pub-8392975944327076"
        data-ad-slot={slot}
        data-ad-format={format === 'auto' ? 'fluid' : 'rectangular'}
        data-full-width-responsive="true"
      />
    </div>
  );
}

// ─── 間隔插入廣告（傳入當前列表位置，自動計算是否顯示）──────────────
interface InFeedAdProps { position: number; every?: number; }
export function InFeedAdBanner({ position, every = 4 }: InFeedAdProps) {
  // 從第 3 條開始，每 N 條顯示一個廣告（避開第一屏直接看到廣告）
  const shouldShow = position > 0 && position % every === 0;
  if (!shouldShow) return null;
  return <NewsAdBanner slot="YOUR_FEED_SLOT_ID" format="rect" />;
}

// 聲明 adsbygoogle 類型（避免 TypeScript 報錯）
declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}
