import { cjkChars, esc, safeHttp } from '../contentPage.js';

/** Thick-page floor from the chronicle brief. Below this the page stays noindex. */
export const CHRONICLE_MIN_CHARS = 1200;

export type CivLine = '能量' | '信息' | '制度' | '貨幣';

export interface ChronicleStage {
  n: number;
  /** Canonical stage name. Do not shorten on the cards or the long page. */
  name: string;
  /** Strip and jump-chip label. At most six characters. */
  short: string;
  era: string;
  milestones: string[];
  meaning: string;
  lines: CivLine[];
  prose: string;
  /** Stages 1–2 stay summaries and deep-link the origins long page. */
  origins?: boolean;
  sourceName: string;
  sourceUrl: string;
}

export interface ChronicleSource {
  stage: string;
  name: string;
  url: string;
}

const LINES: CivLine[] = ['能量', '信息', '制度', '貨幣'];

export const CHRONICLE_TITLE = '文明編年：從採集到智能工具';

export const CHRONICLE_LEDE = [
  '人類文明不是一夜之間出現的城市燈光，而是一條可被分段閱讀的長河。本頁以十個階段勾勒主流綜述中的粗線：從史前採集與用火，經農業、城市與文字，再到工業能量、全球金融與信息網絡。每一階段標出一至兩個界定性里程碑——沒有它們，其後的社會形態很難想像——並用「能量 · 信息 · 制度 · 貨幣」四線標籤，提示讀者該節點主要改寫了哪一類基礎設施。',
  '年代一律寫作「約」或「主流綜述」：考古測年、文獻與基因組證據持續更新，精確到年往往並無意義。階段一與階段二的深時間細節，另見本站人類起源時間線長頁；本頁只保留銜接所需的約略窗口。本頁只提供溫和的科技、經濟與文化史觀察，方便今日新聞切片掛回從前到今的連續故事。',
].join('\n');

export const CHRONICLE_HOW = '第一，先掃十階段標題，建立時間尺度感。第二，留意每節的四線標籤：例如工業革命同時拉高「能量」與「信息」速度，而紙幣與電子支付主要落在「貨幣」線。第三，需要核對時，翻至頁底來源表；博物館與國際組織的公共頁面是本站優先引用的入口。本地讀者亦可把香港科學館、太空館等地標，理解為城市向公眾講解自然史與技術史的溫和節點，而非替代學術年表。';

export const CHRONICLE_SUMMARY = '若把文明史壓縮成四條平行軌道：能量線從用火、畜力走到蒸汽與電力；信息線從語言、文字、印刷走到電報、互聯網與人工智能；制度線從聚落規範、城市行政走到跨區域國家組織與多邊金融安排；貨幣線從物物交換、金屬鑄幣、交子紙幣走到電子支付與數字形態。任一今日切片——通車、場館開幕、支付產品或科學發現——通常只觸及其中一至兩條線。編年頁的作用，是讓讀者在片刻間感到自己站在長河上，再決定要不要點進單一階段或起源長頁。';

export const CHRONICLE_BRIDGE = '本頁適合作為科技媒介、基建開幕、博物館展覽、支付與科普類懶人包的遠史與中史文明接續。遠鏈宜少而準；沒有匹配時不顯示空框。近史節點由編輯手填。新聞主線的導讀與懶人包產量不變，本頁不另開灌量網址。';

export const CHRONICLE_STAGES: ChronicleStage[] = [
  {
    n: 1,
    name: '史前／採集狩獵',
    short: '史前',
    era: '約 300 萬年前至約 1.2 萬年前',
    milestones: ['控制用火', '複雜語言與虛構協作'],
    meaning: '生物演化轉向文化演化，為其後農業與城市奠基。',
    lines: ['能量', '信息'],
    origins: true,
    sourceName: '亞利桑那州立大學人類起源研究所',
    sourceUrl: 'https://iho.asu.edu/',
    prose: '早期人族在非洲與歐亞長期分化。控制用火擴大可食資源、延長夜間活動，並改變群體圍繞火堆協作的方式；複雜語言與虛構故事則讓彼此陌生的個體能夠共享規範與計劃。這是生物演化向文化演化傾斜的關鍵轉折。年代均為約數，詳情與里程碑表見起源長頁。',
  },
  {
    n: 2,
    name: '農業革命',
    short: '農業革命',
    era: '約 1.2 萬年前至約 5000 年前',
    milestones: ['定居農耕', '動物馴化'],
    meaning: '剩餘與人口增長，為城市與國家組織奠基。',
    lines: ['能量', '制度'],
    origins: true,
    sourceName: '聯合國教科文組織世界遺產「恰塔霍裕克新石器遺址」',
    sourceUrl: 'https://whc.unesco.org/en/list/1405/',
    prose: '全新世氣候相對穩定後，多地先後出現定居農耕與動物馴化。剩餘糧食支撐人口增長與專門分工，為後來的城市與國家組織奠基。恰塔霍裕克等新石器遺址，被聯合國教科文組織列為理解早期定居農業生活的關鍵見證。路徑因地而異，時間宜標「約」。',
  },
  {
    n: 3,
    name: '城市與文字',
    short: '城市與文字',
    era: '約公元前 4000–2000 年',
    milestones: ['城市出現', '文字發明'],
    meaning: '記錄、行政與法律使「史前」與「有史」分界。',
    lines: ['信息', '制度'],
    sourceName: '聯合國教科文組織世界遺產「伊拉克南部濕地」',
    sourceUrl: 'https://whc.unesco.org/en/list/1481/',
    prose: '大型聚落集中倉儲、神廟與工匠，形成早期城市。泥板等文字最初多服務計數、清單與行政，使債務、契約與知識可跨代保存。史前與有史的分界，往往由此劃開。美索不達米亞古城遺址群提供可公眾核對的物質證據。',
  },
  {
    n: 4,
    name: '古典帝國與軸心時代',
    short: '古典帝國',
    era: '約公元前 800–公元 200 年',
    milestones: ['大型國家／帝國組織', '軸心時代思想突破', '金屬貨幣普及'],
    meaning: '制度、倫理與跨區貿易在更大尺度上穩定下來。',
    lines: ['制度', '貨幣'],
    sourceName: '中國錢幣博物館《中國貨幣通史陳列》',
    sourceUrl: 'http://www.cnm.com.cn/zgqbbwg/132792/156205/index.html',
    prose: '跨區域的行政、稅收與道路網絡，使大型國家組織得以維持；多地同時出現系統性的倫理與行政思想，史稱軸心時代的知識突破。金屬貨幣普及降低遠距交易摩擦。中國錢幣博物館的貨幣通史陳列，展示自先秦至後世金屬鑄幣形制的演變，可作溫和制度與經濟史入口。',
  },
  {
    n: 5,
    name: '中世紀與跨區域交流',
    short: '跨區交流',
    era: '約公元 600–1500 年',
    milestones: ['造紙／印刷傳播', '紙幣（交子）', '海上絲路與知識網絡'],
    meaning: '知識複製成本下降，遠距貿易更趨制度化。',
    lines: ['信息', '貨幣'],
    sourceName: '中國錢幣博物館《紀念紙幣誕生千年專題展》',
    sourceUrl: 'http://www.cnm.com.cn/zgqbbwg/132796/155980/index.html',
    prose: '造紙與印刷降低知識複製成本。北宋於約 1024 年設立益州交子務、發行官交子，被中國錢幣博物館公共展覽敘述為世界最早的官方紙幣之一。陸海商路同時傳遞香料、紡織、曆算與工匠技法，知識網絡與遠距貿易相互強化。',
  },
  {
    n: 6,
    name: '科學革命與啟蒙',
    short: '科學啟蒙',
    era: '約公元 1500–1800 年',
    milestones: ['印刷普及', '科學方法', '啟蒙思想'],
    meaning: '知識權威逐漸讓位於實驗、觀察與理性辯論。',
    lines: ['信息', '制度'],
    sourceName: '北京市大興區｜中國印刷博物館介紹',
    sourceUrl: 'https://www.bjdx.gov.cn/bjsdxqrmzf/zjdx/yjdx/you/2105437/index.html',
    prose: '印刷進一步普及教科書與科學通訊。觀測、實驗與同行驗證逐漸成為公共規範，知識權威部分讓位於可重複的證據。啟蒙時期對理性與教育的討論，改變了歐洲及受其影響地區的知識制度。本站只記述知識生產方式的轉變。',
  },
  {
    n: 7,
    name: '工業革命',
    short: '工業革命',
    era: '約公元 1760–1914 年',
    milestones: ['蒸汽機與工廠', '鐵路與電報'],
    meaning: '能量釋放與信息傳輸速度同時躍升。',
    lines: ['能量', '信息'],
    sourceName: '英國國家鐵路博物館｜史蒂芬森火箭號與鐵路興起',
    sourceUrl: 'https://www.railwaymuseum.org.uk/objects-and-stories/stephensons-rocket-rainhill-and-rise-locomotive',
    prose: '蒸汽機與工廠把化石燃料能量大規模導入生產；鐵路與電報同時壓縮貨物與訊息的傳遞時間。史蒂芬森「火箭號」等機車，在公共博物館敘事中常被用作鐵路時代開端的物質象徵。能量與信息速度的雙重躍升，重塑城市與勞動節奏。',
  },
  {
    n: 8,
    name: '現代金融與全球體系',
    short: '現代金融',
    era: '約公元 1870–2000 年',
    milestones: ['金本位', '布雷頓森林體系', '電子支付'],
    meaning: '貨幣與信用在全球尺度上被重新編排。',
    lines: ['貨幣', '制度'],
    sourceName: '國際貨幣基金組織｜機構年表',
    sourceUrl: 'https://www.imf.org/external/about/timeline/index.htm',
    prose: '金本位、戰後布雷頓森林安排，以及其後的銀行卡與電子支付，把貨幣與信用編排到全球尺度。國際貨幣基金組織等機構的公開年表，可核對多邊匯率與合作框架的演進節點。此節只作文具與制度說明，不作投資建議。',
  },
  {
    n: 9,
    name: '信息革命',
    short: '信息革命',
    era: '約公元 1960 年代至今',
    milestones: ['互聯網', '移動支付', '人工智能'],
    meaning: '信息處理與遠距協作成本驟降。',
    lines: ['信息', '貨幣'],
    sourceName: '歐洲核子研究組織｜萬維網簡史',
    sourceUrl: 'https://home.cern/science/computing/the-birth-of-the-web/short-history-web/',
    prose: '分組交換網絡與互聯網，尤其是約 1990 年前後公開的萬維網，使知識與服務近乎即時可達。移動支付把結算嵌進日常終端。人工智能作為通用工具，改變檢索、翻譯與內容生產。歐洲核子研究組織保存的萬維網簡史，是可核對的技術史入口。',
  },
  {
    n: 10,
    name: '當代／近未來',
    short: '近未來',
    era: '約公元 2000 年代至今',
    milestones: ['數字貨幣形態', '生命科學工具', 'AI 通用化'],
    meaning: '貨幣、生命與智能的技術形態同時改寫（溫和科技敘事）。',
    lines: ['貨幣', '信息'],
    sourceName: '中國錢幣博物館｜官網公共教育入口',
    sourceUrl: 'http://www.cnm.com.cn/',
    prose: '數字貨幣形態（含電子錢包與央行相關實驗）、生命科學工具（測序與編輯等實驗方法），以及人工智能的通用化，使貨幣、生命與智能的技術形態同時改寫。敘事保持溫和：只寫工具與形態，不做投資建議。今日新聞中的科技、基建與民生切片，可掛回本軸末端。',
  },
];

/** Sources that sit in the table but are not a stage's primary cite. */
export const CHRONICLE_EXTRA_SOURCES: ChronicleSource[] = [
  { stage: '1 輔', name: '倫敦自然史博物館「人類演化」綜述', url: 'https://www.nhm.ac.uk/discover/human-evolution.html' },
  { stage: '1 本地', name: '香港科學館古生物展', url: 'https://hk.science.museum/en/web/scm/exhibition/pg.html' },
];

export function chronicleStageHref(stage: number): string {
  return `/civilization/chronicle/#stage-${stage}`;
}

export function chronicleCardMilestones(stage: ChronicleStage): string[] {
  return stage.milestones.slice(0, 2);
}

export function chronicleCardProse(): string {
  return CHRONICLE_STAGES.map((stage) => [
    stage.name,
    stage.era,
    ...chronicleCardMilestones(stage),
    stage.meaning,
    ...stage.lines,
  ].join('')).join('');
}

/** Essay counted for the index floor. Source URLs and chrome stay out. */
export function chronicleProse(): string {
  return [
    CHRONICLE_TITLE,
    CHRONICLE_LEDE,
    CHRONICLE_HOW,
    ...CHRONICLE_STAGES.flatMap((stage) => [stage.name, stage.era, ...stage.milestones, stage.meaning, stage.prose, ...stage.lines]),
    CHRONICLE_SUMMARY,
    CHRONICLE_BRIDGE,
    ...LINES,
  ].join('\n');
}

export function chronicleIndexable(): boolean {
  return CHRONICLE_STAGES.length === 10 && cjkChars(chronicleProse()) >= CHRONICLE_MIN_CHARS;
}

function ordinal(n: number): string {
  return String(n).padStart(2, '0');
}

function lineChips(lines: readonly string[]): string {
  return `<p class="line-chips">${lines.map((line) => `<span class="line-chip">${esc(line)}</span>`).join('')}</p>`;
}

const CIV = '/static/civilization';

/** Paper ordinal. Stays visible when the cover file is missing. */
function paperSeal(n: number): string {
  return `<span class="stage-seal">${ordinal(n)}</span>`;
}

/** 640×400 stage cover. onerror hides a missing file so the paper seal remains. */
function stageCoverImg(stage: ChronicleStage, eager: boolean): string {
  const base = `${CIV}/civ-stage-${stage.n}-cover`;
  const loading = eager ? 'eager' : 'lazy';
  const priority = eager ? ' fetchpriority="high"' : '';
  const alt = `${stage.name}：溫和示意，年代為約數`;
  return `<img src="${base}-640w.webp" srcset="${base}-400w.webp 400w, ${base}-640w.webp 640w" sizes="(max-width: 640px) 100vw, 400px" width="640" height="400" alt="${esc(alt)}" loading="${loading}"${priority} decoding="async" onerror="this.hidden=true" />`;
}

export function renderChronicleStrip(): string {
  const items = CHRONICLE_STAGES.map((stage) => `<li><a class="stage-dot" href="${chronicleStageHref(stage.n)}"><span class="thumb" data-stage="${stage.n}">${paperSeal(stage.n)}</span><span class="name">${esc(stage.short)}</span></a></li>`).join('');
  return `<nav class="chronicle-strip" aria-label="文明編年"><ol class="chronicle-track">${items}</ol></nav>`;
}

export function renderStageGrid(): string {
  const cards = CHRONICLE_STAGES.map((stage) => {
    const href = chronicleStageHref(stage.n);
    const points = chronicleCardMilestones(stage).map((item) => `<li>${esc(item)}</li>`).join('');
    const origins = stage.origins ? '<a href="/civilization/origins/">詳見起源</a>' : '';
    return `<article class="stage-card" data-stage="${stage.n}">
      <a class="stage-cover" href="${href}" aria-label="${esc(`${ordinal(stage.n)} ${stage.name}`)}">${stageCoverImg(stage, stage.n <= 2)}${paperSeal(stage.n)}</a>
      <div class="stage-body">
        <p class="era">${esc(ordinal(stage.n))} · ${esc(stage.era)}</p>
        <h3><a href="${href}">${esc(stage.name)}</a></h3>
        <ul class="stage-milestones">${points}</ul>
        <p class="stage-meaning">${esc(stage.meaning)}</p>
        ${lineChips(stage.lines)}
        <p class="stage-links"><a href="${href}">閱讀本階段</a>${origins}</p>
      </div>
    </article>`;
  }).join('');
  return `<section class="chronicle-board" aria-label="文明編年">
    <div class="chronicle-board-head">
      <h2>文明編年</h2>
      <a href="/civilization/chronicle/">打開完整編年</a>
    </div>
    <p class="chronicle-board-note">十個階段。每張卡片只標一至兩個界定里程碑、一句意義，以及能量、信息、制度、貨幣中的一至兩條線。</p>
    <div class="stage-grid">${cards}</div>
  </section>`;
}

function sourceHref(url: string): string {
  const safe = safeHttp(url);
  return safe ? esc(safe) : '';
}

function stageSection(stage: ChronicleStage): string {
  const points = stage.milestones.map((item) => `<li>${esc(item)}</li>`).join('');
  const href = sourceHref(stage.sourceUrl);
  const source = href ? `<p class="stage-source">來源：<a href="${href}">${esc(stage.sourceName)}</a></p>` : '';
  const origins = stage.origins ? '<p class="stage-links"><a href="/civilization/origins/">詳見人類起源時間線</a></p>' : '';
  return `<section class="chronicle-stage" id="stage-${stage.n}" data-stage="${stage.n}">
    <p class="era">${esc(ordinal(stage.n))} · ${esc(stage.era)}</p>
    <h2>${esc(stage.name)}</h2>
    <figure class="civ-figure" data-stage="${stage.n}"><div class="stage-frame">${stageCoverImg(stage, stage.n === 1)}${paperSeal(stage.n)}</div><figcaption>${esc(stage.name)} · 示意 · 約數</figcaption></figure>
    <ul class="stage-milestones">${points}</ul>
    <p>${esc(stage.prose)}</p>
    <p class="stage-meaning">${esc(stage.meaning)}</p>
    ${lineChips(stage.lines)}
    ${source}
    ${origins}
  </section>`;
}

function sourceTable(): string {
  const rows: ChronicleSource[] = [
    ...CHRONICLE_STAGES.map((stage) => ({ stage: String(stage.n), name: stage.sourceName, url: stage.sourceUrl })),
    ...CHRONICLE_EXTRA_SOURCES,
  ];
  const body = rows.map((row) => {
    const href = sourceHref(row.url);
    const link = href ? `<a href="${href}">${esc(row.url)}</a>` : esc(row.url);
    return `<tr><td>${esc(row.stage)}</td><td>${esc(row.name)}</td><td>${link}</td></tr>`;
  }).join('');
  return `<table class="civ-table"><thead><tr><th>階段</th><th>來源機構</th><th>網址</th></tr></thead><tbody>${body}</tbody></table>`;
}

export function renderChronicleArticle(): string {
  const nav = CHRONICLE_STAGES.map((stage) => `<a class="chip" href="#stage-${stage.n}">${ordinal(stage.n)} ${esc(stage.short)}</a>`).join('');
  const lede = CHRONICLE_LEDE.split('\n').map((paragraph) => `<p>${esc(paragraph)}</p>`).join('');
  return `<article class="civ-article chronicle-page">
    <h1 class="column-title civ-page-title">${esc(CHRONICLE_TITLE)}</h1>
    ${lede}
    ${lineChips(LINES)}
    <h2>如何閱讀本編年</h2>
    <p>${esc(CHRONICLE_HOW)}</p>
    <nav class="chronicle-nav" aria-label="跳到階段">${nav}</nav>
    ${CHRONICLE_STAGES.map(stageSection).join('')}
    <h2>四線總結</h2>
    <p>${esc(CHRONICLE_SUMMARY)}</p>
    <h2>與今日新聞的銜接</h2>
    <p>${esc(CHRONICLE_BRIDGE)}</p>
    <p class="stage-links"><a href="/civilization/">返回文明總覽</a><a href="/civilization/origins/">人類起源時間線</a><a href="/#slice">今日切片</a></p>
    <h2>來源</h2>
    ${sourceTable()}
    <p class="civ-ai"><span class="badge">AI 整合</span> 本頁由公開博物館與國際組織頁面整合，僅供研究與編輯對照；年代均為約數。</p>
  </article>`;
}
