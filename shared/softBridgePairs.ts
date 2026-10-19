/**
 * Same-topic pairs for the soft bridge. Weekly ops append one object.
 * The renderer in jdToolCard.ts reads this list and does not need a code fork.
 * Slugs reread-llamaparse-notebooklm and verify-redisdocs-perplexity are locked
 * for the week of 2026-10-19. Do not retarget them.
 */

export interface SoftBridgePair {
  /** Stable pair id. Also the ops key. Not the UTM term. */
  slug: string;
  /** Explainer key under /explainer/<key>/. */
  explainerKey: string;
  /** Public lazy-pack URL on world-news.xyz. */
  lazyPackUrl: string;
  /** JD Tech tool or reel URL, without a query string. */
  jdUrl: string;
  /** Concept B utm_term. */
  utmTerm: string;
  /** Link text. Formal written Chinese. */
  cta: string;
  /** Disclosure under the link. Formal written Chinese. */
  disclosure: string;
}

export const SOFT_BRIDGE_PAIRS: readonly SoftBridgePair[] = [
  {
    slug: 'reread-llamaparse-notebooklm',
    explainerKey: '2026-10-19-llamaparse-per-product-mcp-c15c091b4276',
    lazyPackUrl: 'https://world-news.xyz/explainer/2026-10-19-llamaparse-per-product-mcp-c15c091b4276/',
    jdUrl: 'https://jainaspp.github.io/jd-tech-landing/tools/notebooklm/',
    utmTerm: 'notebooklm',
    cta: '工具：NotebookLM——把厚 PDF 與長文件變成可以重聽的語音式摘要。',
    disclosure: '教學落地為粵語三步短片與工具說明頁，不是新聞正文。本卡為教學深鏈；若日後改為聯盟連結，將另行標示。',
  },
  {
    slug: 'verify-redisdocs-perplexity',
    explainerKey: '2026-10-19-redis-docs-mcp-b586a7879bc8',
    lazyPackUrl: 'https://world-news.xyz/explainer/2026-10-19-redis-docs-mcp-b586a7879bc8/',
    jdUrl: 'https://jainaspp.github.io/jd-tech-landing/tools/perplexity/',
    utmTerm: 'perplexity',
    cta: '工具：Perplexity——帶出處搜尋，查新聞與傳言之前先核對來源。',
    disclosure: '教學落地為粵語短片「出處查資料」與工具說明頁。本卡為教學深鏈；聯盟連結批核之前不替換。',
  },
  {
    slug: 'verify-temporal-kb-perplexity',
    explainerKey: '2026-10-19-temporal-kb-mcp-server-967e3442e229',
    lazyPackUrl: 'https://world-news.xyz/explainer/2026-10-19-temporal-kb-mcp-server-967e3442e229/',
    jdUrl: 'https://jainaspp.github.io/jd-tech-landing/tools/perplexity/',
    utmTerm: 'perplexity',
    cta: '工具：Perplexity——查官方文件與社群知識時，先帶出處核對來源。',
    disclosure: '教學落地為粵語短片「出處查資料」與工具說明頁。本卡為教學深鏈；聯盟連結批核之前不替換。',
  },
];
