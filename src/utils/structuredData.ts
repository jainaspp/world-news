/**
 * JSON-LD 結構化資料生成器（Google News SEO + WebSite SEO）
 */
const SITE_URL    = 'https://world-news.xyz';
const SITE_NAME  = '世界頭條 — 即時全球新聞';
const SITE_DESC  = '聚合 BBC·Reuters·Al Jazeera·NHK 等 30+ 優質來源，即時翻譯，多地區及來源分類';

/** 首頁 WebSite + Organization */
export function getHomeJsonLd() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESC,
    inLanguage: 'zh-TW',
    isAccessibleForFree: true,
    about: { '@type': 'NewsMediaOrganization', name: '世界頭條' },
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: '世界頭條',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.svg`, width: 200, height: 200 },
      sameAs: [],
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/?search={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  });
}

/** Google News 網站層級 */
export function getNewsOrgJsonLd() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: '世界頭條',
    url: SITE_URL,
    description: SITE_DESC,
    inLanguage: 'zh-TW',
    isAccessibleForFree: true,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.svg` },
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: `${SITE_URL}/#contact`,
    },
  });
}
