/// <reference types="vite/client" />
/**
 * analytics.ts — Google Analytics 事件追蹤
 * 僅在生產環境（Vercel / GitHub Pages）生效，本地開發不打點
 */
const isProd = import.meta.env.PROD;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function gtag(event: string, params?: Record<string, unknown>) {
  if (!isProd) {
    console.log('[Analytics]', event, params);
    return;
  }
  window.gtag?.('event', event, params);
}

export const analytics = {
  // 新聞
  newsView(itemTitle: string, source: string, region: string) {
    gtag('news_view', { news_title: itemTitle.slice(0, 60), source, region });
  },

  newsClick(itemTitle: string, source: string, link: string) {
    gtag('news_click', { news_title: itemTitle.slice(0, 60), source, url: link });
  },

  // 導航
  regionChange(region: string) {
    gtag('region_change', { region });
  },

  sourceChange(source: string) {
    gtag('source_change', { source });
  },

  // 互動
  bookmarkAdd(itemTitle: string) {
    gtag('bookmark_add', { news_title: itemTitle.slice(0, 60) });
  },

  bookmarkRemove(itemTitle: string) {
    gtag('bookmark_remove', { news_title: itemTitle.slice(0, 60) });
  },

  search(query: string, resultCount: number) {
    gtag('search', { search_term: query, result_count: resultCount });
  },

  // 系統
  refresh() {
    gtag('refresh');
  },

  translate(lang: string, itemCount: number) {
    gtag('translate', { target_lang: lang, item_count: itemCount });
  },

  pwaInstall() {
    gtag('pwa_install');
  },

  pageView(title: string, location: string) {
    gtag('page_view', { page_title: title, page_location: location });
  },
};
