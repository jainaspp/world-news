import { cjkChars, esc, safeHttp } from '../contentPage.js';
import { caseSourceRows, renderCaseNav, renderCasesBeside } from './cases.js';
import { renderSliceReturns } from './renderSlice.js';

/** Thick-page floor. Below this the page stays noindex. */
export const TECH_MIN_CHARS = 1200;

export type TechLine = '工具' | '能源' | '媒介' | '知識';

export interface TechStage {
  n: number;
  /** Canonical stage name. Discovery arc, not a copy of the chronicle. */
  name: string;
  /** Jump-chip label. At most six characters. */
  short: string;
  era: string;
  milestones: string[];
  meaning: string;
  lines: TechLine[];
  prose: string;
  /** Deep-time tools stay a summary and point at the origins long page. */
  origins?: boolean;
  /** Chronicle stage to cross-link. The long chronicle is not repeated. */
  chronicle?: number;
}

export interface TechSource {
  name: string;
  note: string;
  url: string;
}

const LINES: TechLine[] = ['工具', '能源', '媒介', '知識'];

export const TECH_TITLE = '科技與發現';

const LEDE_BEFORE = '人類把身體以外的能力一層層做出來：先是石器與用火，再是可以傳給下一代的口傳與文字，其後是把觀察固定下來的科學儀器、把熱與電引入生產的工業能量，以及把消息送到遠處的印刷、電波與網絡。本頁以十階段勾勒這條發現弧，標以「工具 · 能源 · 媒介 · 知識」。年代一律寫作「約」或「主流綜述」。文明編年用能量、信息、制度與貨幣重讀同一條長河；本頁不重寫那十個階段，只沿工具、能源、媒介與知識把節點收緊，並在末端交回';
const LEDE_LINK = '今日的新聞切片';
const LEDE_AFTER = '。';
export const TECH_LEDE = `${LEDE_BEFORE}${LEDE_LINK}${LEDE_AFTER}`;

const HANDOFF_A = '石器以前的深時間化石與譜系，請讀';
const HANDOFF_B = '。若要改以能量、信息、制度與貨幣重讀同一條長河，請讀';
const HANDOFF_C = '；本頁不重寫那十個階段。技術如何落到街道、場館與日常往來，請讀';
const HANDOFF_D = '。今日的標題在';
const HANDOFF_E = '。';
export const TECH_HANDOFF = `${HANDOFF_A}人類起源時間線${HANDOFF_B}文明編年${HANDOFF_C}城市・基建・民生${HANDOFF_D}今日切片${HANDOFF_E}`;

export const TECH_SOURCE_NOTE = '年代與事件表述均採「約／主流綜述」；上表僅列可公眾核對的科普入口，不作絕對精準年表。';

export const TECH_STAGES: TechStage[] = [
  {
    n: 1,
    name: '石器與手工具',
    short: '石器',
    era: '約 330 萬年前至約 30 萬年前',
    milestones: ['打製石器', '手斧與可傳遞的製法'],
    meaning: '技術第一次可以離開身體，並交給下一代。',
    lines: ['工具'],
    origins: true,
    prose: '主流綜述把打製石器放在人族技術史的開端。石片、石核與後來的手斧，使切割、刮削與敲擊不再只靠牙齒和指甲。製法可以觀看、模仿、再修正，於是一項工具不必在每一代從零發現。年代跨度很長，各地證據並不整齊，本頁只取公共科普常用的約略窗口，不把某一件石器寫成唯一起點。化石與基因組的深時間，仍以人類起源時間線為準；這裡只記工具本身。',
  },
  {
    n: 2,
    name: '用火與熱能',
    short: '用火',
    era: '約 100 萬年前至約 4 萬年前',
    milestones: ['控制用火', '熟食與夜間活動'],
    meaning: '人類開始調度身體以外的能量。',
    lines: ['能源', '工具'],
    chronicle: 1,
    prose: '控制用火是能源線上的早期節點。火擴大可食範圍、延長夜間活動，也讓群體可以圍繞一個熱源分工。它仍是技術，而不是後來的蒸汽或電力：能量就在營地旁邊，尚未進入工廠與城市管網。用火如何銜接採集生活，文明編年第一階段有較完整的四線寫法；本頁只強調身體以外的熱。測年仍有學術討論，宜標「約」。',
  },
  {
    n: 3,
    name: '口傳與共享知識',
    short: '口傳',
    era: '約 10 萬年前至約 1 萬年前',
    milestones: ['複雜語言', '技藝靠口傳累積'],
    meaning: '知識不必每次重新發現，可以在世人之間流轉。',
    lines: ['媒介', '知識'],
    prose: '語言讓不在場的步驟也能被說清楚：哪裡有石材、火種如何保住、哪一種植物需要處理才可食。口傳沒有泥板，卻已經是媒介。技藝因此可以在群體裡累積，而不是只停在個別巧手身上。此階段沒有可直接核對的文字原件，證據來自語言學、考古脈絡與公共科普的綜述，寫法保持克制。它為後來的文字準備了「知識可以被傳遞」這一件事。',
  },
  {
    n: 4,
    name: '文字與可核對記錄',
    short: '文字',
    era: '約公元前 3400–2000 年',
    milestones: ['計數與清單', '文字把口傳固定下來'],
    meaning: '知識可以離開說話的人，事後仍可核對。',
    lines: ['媒介', '知識'],
    chronicle: 3,
    prose: '泥板、印章與早期文字，多半先服務計數、倉儲與清單，而不是文學。一旦記錄可以離開說話的人，配方、帳目與觀測就有了事後核對的可能。這是媒介與知識同時改寫的節點。城市如何靠文字形成公共記錄，見文明編年的「城市與文字」；本頁不重寫城市行政，只寫記錄技術：它讓發現可以被保存、被核對、被重抄。不同地區出現文字的時間並不一致，年代取主流綜述的約數。',
  },
  {
    n: 5,
    name: '科學儀器',
    short: '儀器',
    era: '約公元 1500–1800 年',
    milestones: ['望遠鏡與顯微鏡', '可重複的觀測'],
    meaning: '工具開始延長感官，知識改以觀察與實驗來核對。',
    lines: ['工具', '知識'],
    chronicle: 6,
    prose: '望遠鏡把星空拉近，顯微鏡把細小結構露出來。儀器的重點不是某一位製作人的軼事，而是觀察可以被重複：別人用相近的工具，可以核對同一現象。印刷同時讓圖表與通信傳開，但那是下一階段的媒介問題；這裡先寫感官被工具延長。科學方法如何成為公共規範，文明編年的科學與啟蒙階段寫得更完整。本頁只把儀器看成發現史上的工具節點，年代仍標「約」。',
  },
  {
    n: 6,
    name: '工業能量',
    short: '工業能量',
    era: '約公元 1760–1914 年',
    milestones: ['蒸汽機進入生產', '電力開始改寫城市與工廠'],
    meaning: '能量規模從營地的火，變成可以驅動機器與照明的系統。',
    lines: ['能源'],
    chronicle: 7,
    prose: '蒸汽機把燃料裡的熱轉成持續的機械功，工廠與礦場的節奏隨之改變。十九世紀後期，電力又把能量送到較遠的車間與街道。這仍是人類調度身體以外的能量，只是尺度已不是一堆營火。鐵路與電報如何同時壓縮貨物與消息，見文明編年的工業革命階段；本頁把鐵路裡的訊息部分留給媒介線，這裡集中寫能量。公共博物館對蒸汽機與早期鐵路的陳列，是可核對的入口，不作單一製作人的英雄敘事。',
  },
  {
    n: 7,
    name: '印刷與報刊',
    short: '印刷報刊',
    era: '約公元 1450–1900 年',
    milestones: ['活字印刷降低複製成本', '報刊成為日常消息媒介'],
    meaning: '同一份記錄可以到達許多互不相識的讀者。',
    lines: ['媒介'],
    prose: '活字與後來的機械印刷，使一頁知識不必逐字手抄。教科書、圖表與報刊因此可以有較穩定的讀者群。報刊尤其接近本站所理解的新聞：它把遠處的事件收成可在城市裡閱讀的文字，雖然仍受交通與截稿限制。印刷史在各地的路徑不同，東亞的雕版與活字傳統亦早於歐洲近代印刷，本頁只記複製成本下降這一共同後果，不排座次。編年裡的造紙與紙幣，屬信息與貨幣線，這裡不展開。',
  },
  {
    n: 8,
    name: '電氣與遠距通訊',
    short: '遠距通訊',
    era: '約公元 1840–1960 年',
    milestones: ['電報與電話', '廣播把聲音送到許多家庭'],
    meaning: '消息不必等人或紙張抵達。',
    lines: ['能源', '媒介'],
    prose: '電報把編碼後的文字送到遠處，電話加上即時的聲音，廣播則讓同一段聲音進入許多家庭。能量線上的電力，在這裡變成媒介的載體：沒有穩定的電，遠距的聲與光就難以成為日常。攝影與電影亦在這一窗口成熟，使事件可以留下可重看的影像，而不只是轉述。本頁不寫各項專利爭端，只標出媒介速度的改變。今日一則電訊能在短時間內跨城，起點是這段人不必親自把紙送到的技術。',
  },
  {
    n: 9,
    name: '信息網絡',
    short: '信息網絡',
    era: '約公元 1960 年代至今',
    milestones: ['計算機與分組交換', '萬維網使文件可被公開連結'],
    meaning: '知識與服務可以近乎即時地被檢索、對照與轉發。',
    lines: ['媒介', '知識'],
    chronicle: 9,
    prose: '計算機把處理步驟交給機器，分組交換網絡讓不同地點的機器互相送達數據。約一九九〇年前後公開的萬維網，則使文件可以用連結彼此指向，讀者不必先知道檔案放在哪一台機器。這是媒介與知識的又一次重疊：發現本身仍要靠觀察與實驗，但傳播、檢索與協作的成本驟降。文明編年的信息革命階段同時寫到支付與通用軟件；本頁只沿媒介與知識往下說，不把網絡寫成貨幣史。歐洲核子研究組織保存的萬維網簡史，是可公眾核對的入口。',
  },
  {
    n: 10,
    name: '今日新聞切片',
    short: '新聞切片',
    era: '今日',
    milestones: ['電訊落在軸的末端', '工具新聞仍要回到來源'],
    meaning: '今天的科技報導，是這條發現弧上的一刀，而不是另一套文明。',
    lines: ['知識', '媒介'],
    prose: '一則關於新儀器、新能源、新媒介或新知識工具的新聞，讀的時候可以先問它落在哪一條線。多數電訊只落在一至兩條：一款通訊工具主要是媒介，一座電廠主要是能源，一件實驗儀器主要是工具與知識。沒有溫和史對照的標題，不必強加年代。本頁的作用，是讓讀者在進入今日導讀之前，看見技術並非從本週開始。完整的十階段編年仍在文明編年；城市如何把這些技術收成公共生活，見城市頁。',
  },
];

export const TECH_SOURCES: TechSource[] = [
  { name: 'Smithsonian Human Origins · Stone Tools', note: '打製石器與手斧的公共科普入口', url: 'https://humanorigins.si.edu/evidence/behavior/stone-tools' },
  { name: 'Natural History Museum · Human evolution', note: '人類演化綜述，含工具與用火的公共敘事', url: 'https://www.nhm.ac.uk/discover/human-evolution.html' },
  { name: 'British Museum · How to write cuneiform', note: '早期文字作為可核對記錄的博物館入口', url: 'https://www.britishmuseum.org/blog/how-write-cuneiform' },
  { name: 'Royal Museums Greenwich · History of the telescope', note: '望遠鏡如何延長天文觀測', url: 'https://www.rmg.co.uk/stories/topics/history-telescope' },
  { name: 'Science Museum Group · James Watt and his workshop', note: '蒸汽機與工業能量的博物館敘事', url: 'https://www.sciencemuseum.org.uk/objects-and-stories/james-watt-and-his-workshop' },
  { name: 'CERN · A short history of the Web', note: '萬維網公開過程的機構簡史', url: 'https://home.cern/science/computing/the-birth-of-the-web/short-history-web/' },
];

export function techStageHref(stage: number): string {
  return `/civilization/tech/#tech-${stage}`;
}

/** Essay counted for the index floor. Source URLs and chrome stay out. */
export function techProse(): string {
  return [
    TECH_TITLE,
    TECH_LEDE,
    ...TECH_STAGES.flatMap((stage) => [stage.name, stage.era, ...stage.milestones, stage.meaning, stage.prose, ...stage.lines]),
    TECH_HANDOFF,
    TECH_SOURCE_NOTE,
    ...TECH_SOURCES.flatMap((row) => [row.name, row.note]),
    ...LINES,
  ].join('\n');
}

export function techIndexable(): boolean {
  return TECH_STAGES.length === 10 && cjkChars(techProse()) >= TECH_MIN_CHARS;
}

function ordinal(n: number): string {
  return String(n).padStart(2, '0');
}

function lineChips(lines: readonly string[]): string {
  return `<p class="line-chips">${lines.map((line) => `<span class="line-chip">${esc(line)}</span>`).join('')}</p>`;
}

const CIV = '/static/civilization';

function paperSeal(n: number): string {
  return `<span class="stage-seal">${ordinal(n)}</span>`;
}

/** 640×400 stage cover, with a 1280w candidate for high-DPR. onerror hides a missing file so the paper seal remains. */
export function techCoverImg(stage: TechStage, eager: boolean): string {
  const base = `${CIV}/tech-stage-${stage.n}-cover`;
  const loading = eager ? 'eager' : 'lazy';
  const priority = eager ? ' fetchpriority="high"' : '';
  const alt = `${stage.name}：溫和示意，年代為約數`;
  return `<img src="${base}-640w.webp" srcset="${base}-400w.webp 400w, ${base}-640w.webp 640w, ${base}-1280w.webp 1280w" sizes="(max-width: 640px) 100vw, 400px" width="640" height="400" alt="${esc(alt)}" loading="${loading}"${priority} decoding="async" onerror="this.hidden=true" />`;
}

function sourceHref(url: string): string {
  const safe = safeHttp(url);
  return safe ? esc(safe) : '';
}

function nodeHero(): string {
  return `<figure class="civ-node-hero"><img src="${CIV}/node-tech-v1.jpg" width="1280" height="720" alt="科技與發現：公共科普示意" loading="eager" fetchpriority="high" decoding="async" onerror="this.hidden=true" /><figcaption>科技與發現 · 示意</figcaption></figure>`;
}

function stageSection(stage: TechStage): string {
  const points = stage.milestones.map((item) => `<li>${esc(item)}</li>`).join('');
  const extra: string[] = [];
  if (stage.origins) extra.push('<a href="/civilization/origins/">人類起源時間線</a>');
  if (stage.chronicle) extra.push(`<a href="/civilization/chronicle/#stage-${stage.chronicle}">對照文明編年</a>`);
  const links = extra.length ? `<p class="stage-links">${extra.join('')}</p>` : '';
  const reveal = stage.n === 1 ? ' civ-reveal civ-reveal--above-fold is-inview' : ' civ-reveal';
  return `<section class="chronicle-stage tech-stage${reveal}" id="tech-${stage.n}" data-stage="${stage.n}">
    <p class="era">${esc(ordinal(stage.n))} · ${esc(stage.era)}</p>
    <h2>${esc(stage.name)}</h2>
    <figure class="civ-figure" data-stage="${stage.n}"><div class="stage-frame stage-cover" data-stage="${stage.n}">${techCoverImg(stage, false)}${paperSeal(stage.n)}</div><figcaption>${esc(stage.name)} · 示意 · 約數</figcaption></figure>
    <ul class="stage-milestones">${points}</ul>
    <p>${esc(stage.prose)}</p>
    <p class="stage-meaning">${esc(stage.meaning)}</p>
    ${lineChips(stage.lines)}
    ${links}
    ${renderCasesBeside('/civilization/tech/', `tech-${stage.n}`)}
  </section>`;
}

function sourceTable(): string {
  const rows = [
    ...TECH_SOURCES,
    ...caseSourceRows('/civilization/tech/').map((row) => ({ name: row.name, note: row.note, url: row.url })),
  ];
  const body = rows.map((row, index) => {
    const href = sourceHref(row.url);
    const link = href ? `<a href="${href}">${esc(row.url)}</a>` : esc(row.url);
    return `<tr><td>${index + 1}</td><td>${esc(row.name)}</td><td>${esc(row.note)}</td><td>${link}</td></tr>`;
  }).join('');
  return `<table class="civ-table"><thead><tr><th>#</th><th>機構／入口</th><th>說明</th><th>網址</th></tr></thead><tbody>${body}</tbody></table>`;
}

export function renderTechArticle(): string {
  const nav = TECH_STAGES.map((stage) => `<a class="chip" href="#tech-${stage.n}">${ordinal(stage.n)} ${esc(stage.short)}</a>`).join('');
  return `<article class="civ-article tech-page">
    <header class="tech-hero">
      <p class="kicker">Discovery · 發現</p>
      <h1 class="column-title civ-page-title">${esc(TECH_TITLE)}</h1>
    </header>
    ${nodeHero()}
    <p>${esc(LEDE_BEFORE)}<a href="/#slice">${LEDE_LINK}</a>${esc(LEDE_AFTER)}</p>
    ${lineChips(LINES)}
    <nav class="chronicle-nav tech-nav" aria-label="跳到技術階段">${nav}</nav>
    ${renderCaseNav('/civilization/tech/')}
    <div class="civ-progress" aria-hidden="true"></div>
    ${TECH_STAGES.map(stageSection).join('')}
    <h2>交接編年與今日</h2>
    <p>${esc(HANDOFF_A)}<a href="/civilization/origins/">人類起源時間線</a>${esc(HANDOFF_B)}<a href="/civilization/chronicle/">文明編年</a>${esc(HANDOFF_C)}<a href="/civilization/city/">城市・基建・民生</a>${esc(HANDOFF_D)}<a href="/#slice">今日切片</a>${esc(HANDOFF_E)}</p>
    <p class="stage-links"><a href="/civilization/origins/">人類起源時間線</a><a href="/civilization/chronicle/">文明編年</a><a href="/civilization/city/">城市・基建・民生</a><a href="/civilization/">返回文明總覽</a><a href="/#slice">今日切片</a></p>
    ${renderSliceReturns('tech')}
    <h2>來源</h2>
    ${sourceTable()}
    <p class="stage-source">${esc(TECH_SOURCE_NOTE)}</p>
    <p class="civ-ai"><span class="badge">AI 整合</span> 本頁由公開科普與主流綜述入口整合，僅供研究與編輯參考。</p>
  </article>`;
}
