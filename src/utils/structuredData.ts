/**
 * JSON-LD 結構化資料生成器（Google News SEO 必備）
 * 插入到 <head>，讓 Google 能正確索引為新聞網站
 */

const SITE_URL = 'https://world-news-jainaspp.vercel.app';
const SITE_NAME = '世界頭條 — 即時新聞';
const SITE_DESC = '聚合全球BBC·CNN·NPR，即時更新，多語言翻譯';

// 生成首頁 JSON-LD
export function getHomeJsonLd() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESC,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: '世界頭條',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/favicon.svg`,
      },
    },
  });
}

// NewsArticle schema（每篇新聞卡可用，但新聞內容由外部來源提供，這裡用網站首頁代替）
export function getNewsHomeJsonLd() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESC,
    inLanguage: 'zh-TW',
    about: [
      { '@type': 'Thing', name: 'World News', alternateName: '世界新聞' },
      { '@type': 'Thing', name: 'International Relations', alternateName: '國際關係' },
      { '@type': 'Thing', name: 'Technology', alternateName: '科技' },
    ],
    genre: 'News',
    operatingSystem: 'Any',
    applicationCategory: 'NewsApplication',
  });
}
