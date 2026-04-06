/**
 * /api/digest — 每日摘要生成器
 * 每天由 Vercel Cron 調用，生成當日新聞摘要靜態頁
 * Google 爬蟲看到完整內容，提升 SEO 收錄
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

interface NewsItem {
  id: number
  title: string
  summary: string
  source: string
  pubDate: string
  imageUrl?: string
  link: string
}

const WORKER_URL = 'https://world-news-api.jainaspp.workers.dev/?group=ALL'

function detectLanguage(text: string): string {
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh'
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko'
  if (/[\u3040-\u30FF]/.test(text)) return 'ja'
  return 'en'
}

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const h = Math.floor(diff / 3600000)
    if (h < 1) { const m = Math.floor(diff / 60000); return m < 1 ? '剛剛' : `${m} 分鐘前` }
    if (h < 24) return `${h} 小時前`
    return `${Math.floor(h / 24)} 天前`
  } catch { return '' }
}

function truncate(text: string, len = 200): string {
  return text.length > len ? text.slice(0, len) + '…' : text
}

async function getNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(WORKER_URL, { timeout: 8000 } as any)
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []
    return data.slice(0, 30) as NewsItem[]
  } catch { return [] }
}

function categoriseNews(news: NewsItem[]) {
  const cats: Record<string, NewsItem[]> = {
    '🌏 國際': [], '🤖 科技': [], '💰 經濟': [], '🔬 科學': [], '🏛️ 政治': [], '🌍 環境': []
  }
  const kw: Record<string, string[]> = {
    '🌏 國際': ['Ukraine','Russia','Israel','Gaza','China','US ','Taiwan','Iran','NATO','talks','summit'],
    '🤖 科技': ['AI','Apple','Google','Microsoft','Meta','Tesla','OpenAI','ChatGPT','chip','robot','Tech'],
    '💰 經濟': ['Federal Reserve','rate','inflation','stock','market','GDP','tariff','trade','economy'],
    '🔬 科學': ['NASA','Mars','Moon','space','study','research','discovery','vaccine','treatment'],
    '🏛️ 政治': ['election','vote','president','parliament','congress','senate','minister','deal'],
    '🌍 環境': ['climate','flood','earthquake','hurricane','wildfire','carbon','emissions','heatwave'],
  }
  for (const item of news) {
    const t = item.title.toUpperCase()
    const s = item.summary.toUpperCase()
    let placed = false
    for (const [cat, kws] of Object.entries(kw)) {
      if (kws.some(k => t.includes(k) || s.includes(k)) && cats[cat].length < 5) {
        cats[cat].push(item); placed = true; break
      }
    }
    if (!placed) cats['🌏 國際'].push(item)
  }
  return cats
}

function generateHTML(news: NewsItem[], cats: Record<string, NewsItem[]>) {
  const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
  const top = news.slice(0, 10)
  const topItems = top.map((n, i) => `
    <article class="top-item">
      ${n.imageUrl ? `<img src="${n.imageUrl}" alt="${n.title}" loading="lazy" onerror="this.style.display='none'"/>` : '<div class="top-no-img">🌏</div>'}
      <div class="top-content">
        <span class="top-rank">${i + 1}</span>
        <div>
          <h2><a href="${n.link}" target="_blank" rel="noopener">${n.title}</a></h2>
          <p>${truncate(n.summary)}</p>
          <span class="source">${n.source} · ${timeAgo(n.pubDate)}</span>
        </div>
      </div>
    </article>`).join('')

  const catItems = Object.entries(cats)
    .filter(([, items]) => items.length > 0)
    .map(([cat, items]) => `
    <section class="cat-section">
      <h3 class="cat-title">${cat}</h3>
      <div class="cat-grid">
        ${items.slice(0, 4).map(n => `
        <article class="cat-card">
          ${n.imageUrl ? `<img src="${n.imageUrl}" alt="${n.title}" loading="lazy" onerror="this.style.display='none'"/>` : ''}
          <div class="cat-card-body">
            <h4><a href="${n.link}" target="_blank" rel="noopener">${n.title}</a></h4>
            <span class="source">${n.source} · ${timeAgo(n.pubDate)}</span>
          </div>
        </article>`).join('')}
      </div>
    </section>`).join('')

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>🌏 世界頭條 每日摘要 ${today} — 即時全球新聞</title>
  <meta name="description" content="${today} 世界頭條精選：${top.slice(0,3).map(n=>n.title).join('、')}。涵蓋國際、科技、經濟要聞，多語言翻譯。"/>
  <meta name="keywords" content="世界頭條,每日摘要,即時新聞,國際新聞,科技新聞,翻譯"/>
  <meta property="og:title" content="🌏 世界頭條 每日摘要 ${today}"/>
  <meta property="og:description" content="${top.slice(0,3).map(n=>n.title).join('、')}"/>
  <meta property="og:type" content="website"/>
  <meta property="og:url" content="https://world-news.xyz/digest"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <link rel="canonical" href="https://world-news.xyz/digest"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,'PingFang HK','Microsoft JhengHei',sans-serif;background:#f5f6fa;color:#222;line-height:1.6}
    header{background:#1a1a2e;color:#fff;padding:24px 16px;text-align:center}
    header h1{font-size:1.6em;margin-bottom:4px}
    header p{opacity:0.7;font-size:0.85em}
    .hero{background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460);color:#fff;padding:32px 16px;border-radius:0}
    .hero h2{font-size:1.1em;margin-bottom:12px;opacity:0.9}
    .hero p{font-size:0.8em;opacity:0.7;margin-top:8px}
    main{max-width:900px;margin:0 auto;padding:0 12px 40px}
    .top-list{display:flex;flex-direction:column;gap:0}
    .top-item{display:flex;gap:12px;padding:16px 0;border-bottom:1px solid #eee;align-items:flex-start}
    .top-rank{font-size:1.6em;font-weight:700;color:#ccc;flex-shrink:0;width:32px;text-align:center;line-height:1}
    .top-content{display:flex;gap:12px;flex:1}
    .top-content h2{font-size:0.95em;margin-bottom:4px;line-height:1.4}
    .top-content a{text-decoration:none;color:#1a1a2e}
    .top-content a:hover{color:#3b82f6}
    .top-content p{font-size:0.8em;color:#666;margin-bottom:4px}
    .source{font-size:0.72em;color:#999}
    .top-content img{width:80px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0}
    .top-no-img{width:80px;height:60px;background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.5em;flex-shrink:0}
    .cat-section{margin-top:32px}
    .cat-title{font-size:1em;font-weight:700;color:#1a1a2e;padding-bottom:8px;border-bottom:2px solid #1a1a2e;margin-bottom:12px}
    .cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
    .cat-card{background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.07)}
    .cat-card img{width:100%;height:120px;object-fit:cover}
    .cat-card-body{padding:10px}
    .cat-card h4{font-size:0.85em;margin-bottom:4px;line-height:1.4}
    .cat-card a{text-decoration:none;color:#222}
    .cat-card a:hover{color:#3b82f6}
    footer{text-align:center;padding:24px;background:#1a1a2e;color:rgba(255,255,255,0.5);font-size:0.75em}
    footer a{color:rgba(255,255,255,0.7);text-decoration:none}
    @media(max-width:480px){.cat-grid{grid-template-columns:1fr 1fr}.top-item{flex-direction:column}.top-rank{width:auto;text-align:left}}
  </style>
</head>
<body>
  <header>
    <h1>🌏 世界頭條 — 每日摘要</h1>
    <p>${today}</p>
  </header>
  <div class="hero">
    <h2>📰 今日頭條精選</h2>
    <p>共 ${news.length} 條資訊 · 自動更新</p>
  </div>
  <main>
    <div class="top-list">${topItems}</div>
    ${catItems}
  </main>
  <footer>
    <p>🌏 <a href="https://world-news.xyz">世界頭條</a> — 數據來源：BBC·Reuters·CNN·NPR·AlJazeera·Bloomberg</p>
    <p style="margin-top:4px">© ${new Date().getFullYear()} 世界頭條 · <a href="https://world-news.xyz/sitemap.xml">Sitemap</a></p>
  </footer>
</body>
</html>`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  if (req.method === 'OPTIONS') { res.status(200).end(); return }

  const news = await getNews()
  const cats = categoriseNews(news)
  const html = generateHTML(news, cats)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.status(200).send(html)
}
