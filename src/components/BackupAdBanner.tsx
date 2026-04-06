/**
 * BackupAdBanner.tsx — 備用廣告單元
 *
 * Taboola（審批最簡單，適合新聞類網站）
 * 安裝說明：https://www.taboola.com/publishers/start
 *
 * Taboola 優勢：
 * - 審批比 AdSense 容易（1-3天 vs 2-4週）
 * - 原生推薦廣告，CTR 更高
 * - 按點擊付費（CPC），新聞網站效果佳
 * - 自動與 AdSense 競價（兩者可同時運行）
 *
 * 安裝步驟：
 * 1. 前往 https://www.taboola.com/publishers/start 申請帳戶
 * 2. 審批後在 Dashboard → Properties → 取得你的 Publisher ID
 * 3. 替換下面的 'YOUR_TABOOLA_PUBLISHER_ID'
 * 4. 提交代碼，我幫你整合
 */

/**
 * Taboola 廣告單元
 * 放在新聞列表頂部或底部
 */
export function TaboolaBanner({ placement }: { placement: 'below-article' | 'bottom-of-page' | 'sidebar' }) {
  // ⚠️ 替換為你的 Taboola Publisher ID（審批後取得）
  const TABOOLA_PUBLISHER_ID = 'YOUR_TABOOLA_PUBLISHER_ID';

  return (
    <div
      className="taboola-container"
      data-publisher={TABOOLA_PUBLISHER_ID}
      data-unit={placement}
      style={{
        margin: '16px 0',
        minHeight: 250,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--ad-bg)',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      {/* Taboola 會自動在這裡注入廣告 */}
      <div id={`taboola-${placement}`} />
    </div>
  );
}

/**
 * 載入 Taboola SDK（只需呼叫一次）
 * 在 index.html 的 </body> 之前加入：
 *
 * <script type="text/javascript">
 *   window._taboola = window._taboola || [];
 *   _taboola.push({ article: 'auto' });
 *   _taboola.push({ url: location.href });
 *   (function() {
 *     var s = document.createElement('script');
 *     s.src = '//cdn.taboola.com/libtrc/YOUR_TABOOLA_PUBLISHER_ID/loader.js';
 *     s.async = true;
 *     document.head.appendChild(s);
 *   })();
 * </script>
 */

/**
 * PropellerAds（直接 CPM 廣告，審批極快）
 * 官網：https://propellerads.com
 * 優點：審批極快，反作弊強，支援POP/PUSH/BANNER
 */

/**
 * 接入代碼示例（在 index.html 加入）：
 *
 * <!-- PropellerAds Anti-AdBlock -->
 * <script src="// propellersp.com/..." ></script>
 */

/**
 * Ezoic（AI 廣告優化平台）
 * 官網：https://www.ezoic.com/publishers/
 * 優點：自動優化廣告位置，收益通常比 AdSense 高 30-50%
 * 缺點：需要網站有一定流量才能申請
 */

/**
 * InfoLinks（內文關鍵詞廣告）
 * 官網：https://www.infolinks.com
 * 優點：自動識別頁面關鍵詞，生成相關廣告
 */

// 預設導出空陣列（方便未來擴展多廣告源）
export const BACKUP_AD_PLATFORMS = [
  { name: 'Taboola', url: 'https://www.taboola.com/publishers/start', cpc: '$0.3–$2', approval: '1-3天', pros: '原生推薦，新聞網站最合適' },
  { name: 'Outbrain', url: 'https://www.outbrain.com/publishers', cpc: '$0.3–$1.5', approval: '1-3天', pros: '與Taboola類似，可同時運行' },
  { name: 'PropellerAds', url: 'https://propellerads.com', cpc: '$0.1–$0.5', approval: '數小時', pros: '審批極快，POP/PUSH廣告' },
  { name: 'Ezoic', url: 'https://www.ezoic.com/publishers', cpc: 'AI自動優化', approval: '3-7天', pros: '收益提升30-50%，AI優化' },
  { name: 'Media.net', url: 'https://www.media.net', cpc: '$0.3–$1', approval: '1-2週', pros: 'Yahoo/Bing系廣告，語言適配好' },
];
