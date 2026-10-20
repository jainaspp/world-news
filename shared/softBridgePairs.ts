/**
 * Same-topic pairs for the soft bridge. Weekly ops append one object.
 * The renderer in jdToolCard.ts reads this list and does not need a code fork.
 * Slugs for the week of 2026-10-19 are locked. Do not retarget them.
 * Automation explainers with no published JD workflow page stay unmapped.
 * P1 appends three live pairs. verify-firecrawl-perplexity-myth shares the
 * Firecrawl explainer with read-web-firecrawl-copilot. One page, one card:
 * the later pair is rendered. The earlier object's URLs stay put.
 * reread-llamaparse-notebooklm keeps its tool-page jdUrl and adds one follow
 * block: the NotebookLM 90-second card, with the reel as a second link.
 * Do not copy that block onto another pair.
 */

/** Second link on a 90-second card. Same Concept B query, its own term. */
export interface SoftBridgeLink {
  /** Link text. Formal written Chinese. */
  label: string;
  /** JD Tech tool or reel URL, without a query string. */
  jdUrl: string;
  /** Concept B utm_term. */
  utmTerm: string;
}

/**
 * Optional 90-second body for one pair.
 * The pair's jdUrl, utmTerm, and cta stay the primary link.
 */
export interface SoftBridgeFollow {
  /** First line inside the card. Does not repeat the steps. */
  receipt: string;
  /** Card heading. Formal written Chinese. */
  title: string;
  /** Ordered steps. Formal written Chinese. No numbering; the list supplies it. */
  steps: readonly string[];
  /** Reel or other second link. */
  secondary: SoftBridgeLink;
}

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
  /** Primary link text. Formal written Chinese. */
  cta: string;
  /** Disclosure under the links. Formal written Chinese. */
  disclosure: string;
  /** Absent on every pair except the one 90-second card. */
  follow?: SoftBridgeFollow;
}

export const SOFT_BRIDGE_PAIRS: readonly SoftBridgePair[] = [
  {
    slug: 'reread-llamaparse-notebooklm',
    explainerKey: '2026-10-19-llamaparse-per-product-mcp-c15c091b4276',
    lazyPackUrl: 'https://world-news.xyz/explainer/2026-10-19-llamaparse-per-product-mcp-c15c091b4276/',
    jdUrl: 'https://jainaspp.github.io/jd-tech-landing/tools/notebooklm/',
    utmTerm: 'notebooklm',
    cta: '打開工具說明',
    disclosure: '披露：教學：JD Tech｜本卡為教學深鏈；聯盟連結批核前不替換。',
    follow: {
      receipt: '跟住做：厚文件 → 可重聽摘要（JD Tech · NotebookLM）',
      title: '【跟住做｜90 秒｜NotebookLM】',
      steps: [
        '開啟 NotebookLM，新建筆記本，上傳要重讀的 PDF／長文件。',
        '待索引完成後，選音訊概覽（或同等語音摘要）並生成。',
        '用耳機重聽重點；需逐步操作見粵語 Reel／工具說明頁。',
      ],
      secondary: {
        label: '粵語 3 步示範',
        jdUrl: 'https://jainaspp.github.io/jd-tech-landing/reels/notebooklm-pdf-podcast/',
        utmTerm: 'notebooklm-pdf-podcast',
      },
    },
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
  {
    slug: 'read-web-firecrawl-copilot',
    explainerKey: '2026-10-19-firecrawl-mcp-hosted-oauth-keyless-e245baec4022',
    lazyPackUrl: 'https://world-news.xyz/explainer/2026-10-19-firecrawl-mcp-hosted-oauth-keyless-e245baec4022/',
    jdUrl: 'https://jainaspp.github.io/jd-tech-landing/tools/copilot/',
    utmTerm: 'copilot',
    cta: '工具：Copilot——把長文網頁收成可以核對的重點。',
    disclosure: '教學落地為粵語三步短片與工具說明頁，不是新聞正文。本卡為教學深鏈；若日後改為聯盟連結，將另行標示。',
  },
  {
    slug: 'remember-cognee-notebooklm',
    explainerKey: '2026-10-19-cognee-mcp-memory-server-9cf986969ef6',
    lazyPackUrl: 'https://world-news.xyz/explainer/2026-10-19-cognee-mcp-memory-server-9cf986969ef6/',
    jdUrl: 'https://jainaspp.github.io/jd-tech-landing/tools/notebooklm/',
    utmTerm: 'notebooklm',
    cta: '工具：NotebookLM——把一疊文件收成可以再問的筆記與語音摘要。',
    disclosure: '教學落地為粵語三步短片與工具說明頁，不是新聞正文。本卡為教學深鏈；若日後改為聯盟連結，將另行標示。',
  },
  {
    slug: 'agreements-docusign-gemini',
    explainerKey: '2026-10-19-docusign-mcp-server-ga-a0cb3575b879',
    lazyPackUrl: 'https://world-news.xyz/explainer/2026-10-19-docusign-mcp-server-ga-a0cb3575b879/',
    jdUrl: 'https://jainaspp.github.io/jd-tech-landing/tools/gemini/',
    utmTerm: 'gemini',
    cta: '工具：Gemini——從協議與長文件列出關鍵日期與條款，再回原文核對。',
    disclosure: '教學落地為粵語短片與工具說明頁。本卡為教學深鏈；聯盟連結批核之前不替換。',
  },
  {
    slug: 'verify-firecrawl-perplexity-myth',
    explainerKey: '2026-10-19-firecrawl-mcp-hosted-oauth-keyless-e245baec4022',
    lazyPackUrl: 'https://world-news.xyz/explainer/2026-10-19-firecrawl-mcp-hosted-oauth-keyless-e245baec4022/',
    jdUrl: 'https://jainaspp.github.io/jd-tech-landing/tools/perplexity/',
    utmTerm: 'perplexity-myth-check',
    cta: '工具：Perplexity——網頁抓取之後核對謠言，先帶出處再下結論。',
    disclosure: '教學落地為粵語短片「出處查資料」與工具說明頁。本卡為教學深鏈；聯盟連結批核之前不替換。',
  },
  {
    slug: 'memory-mem0-copilot-summary',
    explainerKey: '2026-10-19-mem0-hosted-mcp-00290c292710',
    lazyPackUrl: 'https://world-news.xyz/explainer/2026-10-19-mem0-hosted-mcp-00290c292710/',
    jdUrl: 'https://jainaspp.github.io/jd-tech-landing/tools/copilot/',
    utmTerm: 'copilot-summary',
    cta: '工具：Copilot——把長文與會議內容整理成可以執行的摘要。',
    disclosure: '教學落地為粵語三步短片與工具說明頁，不是新聞正文。本卡為教學深鏈；若日後改為聯盟連結，將另行標示。',
  },
  {
    slug: 'cms-strapi-claude-rewrite',
    explainerKey: '2026-10-19-strapi-mcp-server-ga-cee6301eb39f',
    lazyPackUrl: 'https://world-news.xyz/explainer/2026-10-19-strapi-mcp-server-ga-cee6301eb39f/',
    jdUrl: 'https://jainaspp.github.io/jd-tech-landing/tools/claude/',
    utmTerm: 'claude-rewrite',
    cta: '工具：Claude——把內容草稿改成可以發布的語氣。',
    disclosure: '教學落地為粵語短片與工具說明頁。本卡為教學深鏈；聯盟連結批核之前不替換。',
  },
];
