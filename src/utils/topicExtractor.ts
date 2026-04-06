// Smart topic extraction with CONTEXT-BASED scoring
// ─── 原則：短單詞關鍵詞（如 'AI'、'US'）只有同時出現多個相關詞時才觸發 ───

// ─── Keyword pools ──────────────────────────────────────────────
const KW: Record<string, string[]> = {
  // 地緣政治
  '中美關係': [
    'China','US ','America','Washington','Beijing',
    'tariff','trade war','Xi Jinping','Biden','Trump',
    'TikTok','Huawei','South China Sea','Taiwan Strait',
    'G20 summit','APEC summit',' Pelosi',
  ],
  '俄烏戰爭': [
    'Ukraine','Russia','Putin','Zelenskyy','Zelensky',
    'Kyiv','Moscow','NATO','Donbas','Crimea',
    'ceasefire','peace talks','invasion','troops',
    'Zaporizhzhia','Kharkiv','Patriot','F-16',
    'Western weapon','Ukraine aid','blackout',
  ],
  '以巴衝突': [
    'Israel','Palestine','Gaza','Hamas','Netanyahu',
    'Ceasefire','Jerusalem','West Bank','Rafah',
    'IDF','Palestinian','Gaza Strip',
    'Benjamin Netanyahu','hostage','Gaza war',
  ],
  '中東局勢': [
    'Iran','Tehran','Saudi','Syria','Iraq',
    'Lebanon','Hezbollah','Yemen','Houthi',
    'OPEC','nuclear deal','Sanctions',
  ],

  // 科技
  '科技AI': [
    'ChatGPT','OpenAI','Apple Intelligence','Anthropic',
    'Gemini','Copilot','DeepSeek','Midjourney',
    'Tesla robot','AI model','large language','LLM',
    'NVIDIA','GPU','TSMC','semiconductor','chip ban',
    'AI regulation','AI safety','AI startup','artificial intelligence',
  ],
  '加密貨幣': [
    'Bitcoin','Ethereum','blockchain','Binance',
    'NFT','SBF','FTX','digital asset','stablecoin',
    'cryptocurrency','coinbase','SEC','ETF',
    'Solana','ripple','XRP','dogecoin','crypto rally',
  ],
  '晶片戰爭': [
    'chip','semiconductor','export control','ASML','TSMC',
    'Intel','NVIDIA','AMD','GPU','fabrication',
    'US chip ban','China chip','HBM','3nm','5nm',
    'chipmaker','microchip','Wafer',
  ],

  // 經濟
  '金融經濟': [
    'Federal Reserve','interest rate','stock market',
    'Dow','S&P','Nasdaq','FTSE','ECB','Bank of England',
    'BOJ','rate hike','rate cut','bond yield','forex',
    'recession','inflation','deflation','bear market',
  ],
  '貿易關稅': [
    'tariff','trade war','WTO','export ban','import ban',
    'retaliatory tariff','trade deal','G7','supply chain',
    'Trump tariff','trade deficit','trade surplus',
  ],

  // 環境
  '氣候環境': [
    'climate change','flood','earthquake','wildfire','hurricane',
    'typhoon','carbon','emissions','COP','net zero',
    'heatwave','drought','glacier','Arctic',
    'sea level','extreme weather','fossil fuel','climate summit',
  ],

  // 政治
  '選舉政治': [
    'election','ballot','poll','campaign',
    'president','parliament','congress','senate',
    'Democratic','Republican','Labour','Conservative',
    'electoral','voter','referendum','vote count',
  ],

  // 軍事
  '軍事國防': [
    'military','drill','troop','aircraft carrier',
    'submarine','naval','army','air force','missile test',
    'warplane','warship','bomber','fighter jet',
    'South China Sea','NATO','Indo-Pacific','military base',
    'defense minister','war games','amphibious',
  ],

  // 法律/社會
  '司法人權': [
    'court','trial','verdict','sentenc','arrest',
    'extradition','warrant','lawsuit','prosecutor',
    'Supreme Court','judge','human rights','civil rights',
    'death penalty','prison','prisoner',
  ],

  // 疫情/健康
  '疫情健康': [
    'COVID','pandemic','vaccine','outbreak','WHO',
    'CDC','Lockdown','quarantine','infection',
    'World Health Organization','booster','hospital',
    'respiratory','virus','epidemic','mask mandate',
  ],

  // 峰會外交
  '峰會外交': [
    'summit','G20','G7','APEC','forum','conference',
    'Belt and Road','ASEAN','NATO summit',
    'World Economic Forum','Davos','diplomatic','treaty',
    'bilateral meeting','foreign minister','embassy',
  ],

  // 體育
  '體育': [
    'World Cup','Olympics','Premier League','Champions League',
    'Wimbledon','F1','racing','Euro 2024','Copa America',
    'NBA Finals','Super Bowl','Grand Slam',
  ],

  // 科學太空
  '科學太空': [
    'NASA','space','Mars','Moon','rocket','satellite',
    'research','study','scientist','discovery',
    'spacecraft',' ISS ','Shenzhou','Tiangong',
    'spacewalk','telescope','space station','satellite launch',
  ],
};

// ─── High-confidence phrase pairs (both must appear) ────────────
const PHRASE_PAIRS: Array<[string[], string]> = [
  [['Ukraine','Russia'], '俄烏戰爭'],
  [['Ukraine','Putin'], '俄烏戰爭'],
  [['Ukraine','NATO'], '俄烏戰爭'],
  [['Gaza','Israel'], '以巴衝突'],
  [['Gaza','Hamas'], '以巴衝突'],
  [['Taiwan','China'], '中美關係'],
  [['Taiwan','US '], '中美關係'],
  [['TikTok','ban'], '中美關係'],
  [['tariff','China'], '中美關係'],
  [['tariff','trade war'], '中美關係'],
  [['AI','Microsoft'], '科技AI'],
  [['AI','Google'], '科技AI'],
  [['AI','OpenAI'], '科技AI'],
  [['AI','ChatGPT'], '科技AI'],
  [['AI','Anthropic'], '科技AI'],
  [['AI','model'], '科技AI'],
  [['chip','ban'], '晶片戰爭'],
  [['semiconductor','China'], '晶片戰爭'],
  [['Federal Reserve','rate'], '金融經濟'],
  [['stock market','drop'], '金融經濟'],
  [['stock market','surge'], '金融經濟'],
  [['election','vote'], '選舉政治'],
  [['military','drill'], '軍事國防'],
  [['military','NATO'], '軍事國防'],
  [['climate','COP'], '氣候環境'],
  [['wildfire','Australia'], '氣候環境'],
];

export interface TopicMatch { topic: string; score: number; }

export function extractTopics(title: string): TopicMatch[] {
  const upper = title.toUpperCase();
  const scoreMap: Record<string, number> = {};

  for (const [phrases, topic] of PHRASE_PAIRS) {
    if (phrases.every(p => upper.includes(p.toUpperCase()))) {
      scoreMap[topic] = Math.max(scoreMap[topic] || 0, 3);
    }
  }

  for (const [topic, keywords] of Object.entries(KW)) {
    const matched = keywords.filter(kw => upper.includes(kw.toUpperCase()));
    if (matched.length >= 2) {
      // 至少2個關鍵詞才觸發，短單詞詞不會因1次匹配就觸發
      scoreMap[topic] = Math.max(scoreMap[topic] || 0, matched.length >= 3 ? 3 : 2);
    }
  }

  return Object.entries(scoreMap)
    .map(([topic, score]) => ({ topic, score }))
    .sort((a, b) => b.score - a.score);
}

export function extractTopicsHighConf(title: string): string[] {
  return extractTopics(title)
    .filter(m => m.score >= 2)
    .map(m => m.topic);
}

export function countTopics(news: Array<{ title: string }>): Array<{ topic: string; score: number; count: number }> {
  const map: Record<string, { score: number; count: number }> = {};
  for (const item of news) {
    const matches = extractTopics(item.title);
    for (const { topic, score } of matches) {
      if (!map[topic]) map[topic] = { score: 0, count: 0 };
      map[topic].count++;
      map[topic].score += score;
    }
  }
  return Object.entries(map)
    .map(([topic, v]) => ({ topic, ...v }))
    .sort((a, b) => b.score - a.score);
}

export const TOPIC_ICONS: Record<string, string> = {
  '中美關係': '🇺🇸🇨🇳',
  '俄烏戰爭': '🇺🇦🇷🇺',
  '以巴衝突': '🇮🇱🇵🇸',
  '中東局勢': '🏜️',
  '科技AI':   '🤖',
  '加密貨幣': '₿',
  '晶片戰爭': '💻',
  '金融經濟': '📉',
  '貿易關稅': '⚠️',
  '氣候環境': '🌍',
  '選舉政治': '🗳️',
  '軍事國防': '🚀',
  '司法人權': '⚖️',
  '疫情健康': '🦠',
  '峰會外交': '🏛️',
  '體育':     '⚽',
  '科學太空': '🔬',
};
