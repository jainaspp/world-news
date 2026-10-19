import { cjkChars, esc, safeHttp } from '../contentPage.js';
import {
  COSMOS_HANDOFF,
  COSMOS_HANDOFF_CHIPS,
  ORIGINS_HANDOFF_HREF,
  renderCosmosHandoff,
  renderLinkChips,
} from './handoff.js';

/** Thick-page floor. Below this the page stays noindex. */
export const COSMOS_MIN_CHARS = 1200;

export type CosmoLine = '能量' | '物質' | '信息' | '時間';

export interface CosmoStage {
  n: number;
  /** Canonical stage name. Do not fold these into the civilization chronicle. */
  name: string;
  /** Jump-chip label. At most six characters. */
  short: string;
  era: string;
  milestones: string[];
  meaning: string;
  lines: CosmoLine[];
  prose: string;
}

export interface CosmoSource {
  name: string;
  note: string;
  url: string;
}

const LINES: CosmoLine[] = ['能量', '物質', '信息', '時間'];

export const COSMOS_TITLE = '宇宙長河・深時間';

export const COSMOS_LEDE = '在人類起源與文明編年之前，尚有更深的時間長河：宇宙如何展開能量與時空，冷凝出物質與恆星，結成宜居地球，並讓信息在生命層級累積。本頁以十階段勾勒主流綜述粗線，標以「能量 · 物質 · 信息 · 時間」；年代一律「約」。人類對起源亦有文化與信仰想像，本頁只述科學共識。約七百萬年前交接入類起源。';

export { COSMOS_HANDOFF } from './handoff.js';

export const COSMOS_SOURCE_NOTE = '年代與事件表述均採「約／主流綜述」；上表僅列可公眾核對的科普入口，不作絕對精準年表。';

export const COSMOS_STAGES: CosmoStage[] = [
  {
    n: 1,
    name: '大爆炸與暴脹',
    short: '大爆炸',
    era: '約 138 億年前',
    milestones: ['時空膨脹啟動', '基本粒子與輻射場誕生'],
    meaning: '為一切後續結構提供能量與時間的初始條件。',
    lines: ['能量', '時間'],
    prose: '主流綜述認為，約一百三十八億年前，時空經歷極短暫的暴脹，其後能量轉化為物質與輻射，宇宙進入可觀測的熱密開端。基本粒子與輻射場在此奠基，為一切後續結構提供能量與時間的初始條件。觀測到的宇宙微波背景，是這一早期歷史留下的可核對遺跡。',
  },
  {
    n: 2,
    name: '原初核合成',
    short: '核合成',
    era: '約大爆炸後數分鐘',
    milestones: ['氫、氦（及微量鋰）原子核形成'],
    meaning: '恆星燃料與後續化學的物質起點。',
    lines: ['物質', '能量'],
    prose: '約大爆炸後數分鐘內，宇宙仍極熱極密，質子與中子碰撞形成氫、氦原子核，以及微量鋰等輕核。其後溫度下降，核合成大致停歇，這些輕核成為後續恆星燃燒與化學演化的物質起點。今日宇宙中氫、氦的豐度比例，與原初核合成計算高度吻合，是大爆炸圖景的重要支柱。',
  },
  {
    n: 3,
    name: '宇宙透明與第一代恆星',
    short: '第一代星',
    era: '約 133–135 億年前',
    milestones: ['再結合使宇宙對光透明', '第一代恆星點燃'],
    meaning: '重元素開始在恆星內部合成，金屬豐度起步。',
    lines: ['能量', '物質'],
    prose: '約大爆炸後三十八萬年，電子與原子核結合為中性原子，宇宙對光變得透明，宇宙微波背景自此自由傳播。其後約數億年——對應今日宇宙年齡約一百三十三至一百三十五億年前——第一代恆星在引力塌縮中點燃，結束「宇宙黑暗時代」。這些巨星內部開始合成重於氦的元素，金屬豐度由此起步，為行星與複雜化學鋪路。',
  },
  {
    n: 4,
    name: '星系與大尺度結構',
    short: '星系結構',
    era: '約 100–130 億年前起',
    milestones: ['星系、星系群與暗物質暈穩固'],
    meaning: '物質在引力下組織成可長期演化的結構骨架。',
    lines: ['物質', '時間'],
    prose: '約一百至一百三十億年前起，物質在引力與暗物質暈作用下逐漸聚集成星系、星系群與絲狀大尺度結構。恆星生成、超新星回饋與星系合併反覆改寫氣體與重元素分布，形成可長期演化的結構骨架。今日觀測到的星系網與空洞格局，即是這段緩慢組織過程的結果。',
  },
  {
    n: 5,
    name: '太陽系形成',
    short: '太陽系',
    era: '約 46 億年前',
    milestones: ['原行星盤坍縮', '行星吸積成形'],
    meaning: '地球獲得穩定軌道與持續的恆星能量輸入。',
    lines: ['能量', '物質'],
    prose: '約四十六億年前，一片星際氣體與塵埃雲塌縮為旋轉的原行星盤：中心點燃為太陽，盤內固體顆粒吸積為行星、衛星與小天體。地球由此獲得相對穩定的軌道，以及來自恆星的持續能量輸入。隕石測年與太陽系公共科普敘事，均將此節點標為約四十六億年前的主流約數。',
  },
  {
    n: 6,
    name: '早期地球與液態水',
    short: '液態水',
    era: '約 44–40 億年前',
    milestones: ['地殼分化', '海洋與水循環趨向穩定'],
    meaning: '為複雜化學與能量循環提供環境舞台。',
    lines: ['物質', '能量'],
    prose: '約四十四至四十億年前，地球經歷分化，形成地核、地幔與早期地殼；撞擊與火山活動頻繁，但液態水逐漸在地表積聚，海洋與水循環趨向穩定。穩定的水環境為複雜化學、能量交換與後續生命化學提供舞台。此階段細節仍隨地質與同位素證據修訂，宜標「約」。',
  },
  {
    n: 7,
    name: '生命起源',
    short: '生命起源',
    era: '約 40–35 億年前',
    milestones: ['可自我複製／代謝的分子系統出現'],
    meaning: '信息開始在生物層級傳遞與累積。',
    lines: ['信息', '物質'],
    prose: '約四十至三十五億年前，地球上出現可自我複製或可持續代謝的分子系統——生命起源。具體路徑（如熱液噴口、潮汐池、黏土表面等）假說並存，證據仍在累積，本頁不採納單一理論為定論。自此，信息開始在生物層級傳遞、突變與選擇中累積，與純粹物理化學過程分道。最早化石與同位素跡象時間窗口仍有學術討論。',
  },
  {
    n: 8,
    name: '光合作用與大氧化',
    short: '大氧化',
    era: '約 24–20 億年前',
    milestones: ['氧氣在大氣中顯著累積'],
    meaning: '全球能量流與化學環境改寫，複雜代謝路徑打開。',
    lines: ['能量', '信息'],
    prose: '約二十四至二十億年前，產氧光合作用使大氣與海洋中的氧氣顯著累積，史稱大氧化事件。全球能量流與化學環境被改寫：好氧代謝路徑打開，同時許多厭氧生態位受壓。氧氣也改變地表礦物與氣候反饋，為後來更複雜的多細胞生命準備化學條件。時間與強度細節仍有綜述區間。',
  },
  {
    n: 9,
    name: '多細胞與顯生宙輻射',
    short: '顯生宙',
    era: '約 5.4 億年前起',
    milestones: ['複雜身體構型與生態位快速分化（寒武紀等）'],
    meaning: '生物信息與生態結構複雜度躍升。',
    lines: ['信息', '時間'],
    prose: '約五億四千萬年前起，顯生宙開端前後，複雜身體構型與生態位快速分化（常以寒武紀大爆發等事件為公共敘事節點）。多細胞組織、感官與運動能力使生物信息與生態結構複雜度躍升。其後數億年中，海洋與陸地生態系反覆更迭，為哺乳動物與靈長類譜系留下深遠的生態背景。',
  },
  {
    n: 10,
    name: '人族前生物圈',
    short: '前生物圈',
    era: '約 6600 萬年前 → 約 700 萬年前',
    milestones: ['哺乳動物輻射', '森林—草原環境與靈長類譜系適應'],
    meaning: '為人族出現準備生態與生理前提；在此交接入類起源頁。',
    lines: ['物質', '時間'],
    prose: '約六千六百萬年前非鳥恐龍等類群大規模消失後，哺乳動物輻射加速；其後森林—草原環境變遷，與靈長類譜系的適應並行。約七百萬年前，主流綜述認為早期人族／人科在非洲開始分化——宇宙史敘事在此收束，交接入類起源頁。本階段只鋪生態與生理前提，不展開人屬細節。',
  },
];

export const COSMOS_SOURCES: CosmoSource[] = [
  { name: 'NASA Science · Universe Overview', note: '宇宙史、暴脹、核合成、再結合總覽', url: 'https://science.nasa.gov/universe/overview/' },
  { name: 'NASA Science · The Big Bang', note: '大爆炸與早期宇宙科普', url: 'https://science.nasa.gov/universe/the-big-bang/' },
  { name: 'ESA · Cosmic eras', note: '宇宙時代劃分（再結合、黑暗時代、再電離等）', url: 'https://www.esa.int/Science_Exploration/Space_Science/Cosmic_eras' },
  { name: '中國科學院國家天文台 · 科學傳播資源', note: '國內天文科普文章與視頻入口', url: 'https://www.nao.cas.cn/ncb/kx/' },
  { name: 'NASA Science · Solar System Facts', note: '太陽系形成約 46 億年等公共敘事', url: 'https://science.nasa.gov/solar-system/solar-system-facts/' },
  { name: 'NASA Science · Early Universe (Webb)', note: '早期宇宙、第一代恆星相關科普', url: 'https://science.nasa.gov/mission/webb/early-universe/' },
];

export function cosmosStageHref(stage: number): string {
  return `/civilization/cosmos/#cosmo-${stage}`;
}

/** Essay counted for the index floor. Source URLs and chrome stay out. */
export function cosmosProse(): string {
  return [
    COSMOS_TITLE,
    COSMOS_LEDE,
    ...COSMOS_STAGES.flatMap((stage) => [stage.name, stage.era, ...stage.milestones, stage.meaning, stage.prose, ...stage.lines]),
    COSMOS_HANDOFF,
    COSMOS_SOURCE_NOTE,
    ...COSMOS_SOURCES.flatMap((row) => [row.name, row.note]),
    ...LINES,
  ].join('\n');
}

export function cosmosIndexable(): boolean {
  return COSMOS_STAGES.length === 10 && cjkChars(cosmosProse()) >= COSMOS_MIN_CHARS;
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

/**
 * Cover slot for every stage. The paper ordinal is in the figure and stays hidden
 * while the WebP loads. 640 stays the src; 1280w is the high-DPR candidate.
 * onerror reveals the seal if a file is missing.
 */
export function cosmoCoverImg(stage: CosmoStage, eager: boolean): string {
  const base = `${CIV}/cosmo-stage-${stage.n}-cover`;
  const loading = eager ? 'eager' : 'lazy';
  const priority = eager ? ' fetchpriority="high"' : '';
  const alt = `${stage.name}：溫和示意，年代為約數`;
  return `<img src="${base}-640w.webp" srcset="${base}-400w.webp 400w, ${base}-640w.webp 640w, ${base}-1280w.webp 1280w" sizes="(max-width: 640px) 100vw, 400px" width="640" height="400" alt="${esc(alt)}" loading="${loading}"${priority} decoding="async" onerror="this.hidden=true" />`;
}

function sourceHref(url: string): string {
  const safe = safeHttp(url);
  return safe ? esc(safe) : '';
}

/** Brightness peaks on the 16:9 starmap art, percent from the left and the top. Stage order 1–10. */
const STARMAP_POINTS: ReadonlyArray<readonly [number, number]> = [
  [12.1, 52.5],
  [20.4, 50.1],
  [28.9, 47.9],
  [37.0, 46.5],
  [45.2, 47.8],
  [53.7, 45.3],
  [62.5, 44.2],
  [70.7, 41.2],
  [78.7, 39.3],
  [87.2, 35.4],
];

/** Spatial ladder, large to small. Short labels match the scale-nest art; sizes stay approximate. */
const COSMOS_SCALES: ReadonlyArray<{ name: string; size: string }> = [
  { name: '可觀測宇宙', size: '約 930 億光年' },
  { name: '宇宙網', size: '約數億光年' },
  { name: '本星系群', size: '約 1000 萬光年' },
  { name: '銀河系', size: '約 10 萬光年' },
  { name: '日球層', size: '約 120 天文單位' },
  { name: '地月系統', size: '約 38.4 萬公里' },
  { name: '地球', size: '約 1.27 萬公里' },
];

function starmap(): string {
  const stars = COSMOS_STAGES.map((stage, index) => {
    const [left, top] = STARMAP_POINTS[index];
    return `<li class="cosmo-star" style="--x:${left.toFixed(1)}%;--y:${top.toFixed(1)}%"><a class="cosmo-star-link" href="#cosmo-${stage.n}"><span class="cosmo-star-dot" aria-hidden="true"></span><span class="cosmo-star-label"><span class="cosmo-star-ord">${ordinal(stage.n)}</span> <span class="cosmo-star-name">${esc(stage.short)}</span></span></a></li>`;
  }).join('');
  const img = `<img src="${CIV}/cosmo-starmap-640w.webp" srcset="${CIV}/cosmo-starmap-400w.webp 400w, ${CIV}/cosmo-starmap-640w.webp 640w, ${CIV}/cosmo-starmap-1280w.webp 1280w" sizes="(max-width: 720px) 560px, 812px" width="1280" height="720" alt="" decoding="async" />`;
  return `<nav class="cosmo-starmap" role="navigation" aria-label="宇宙長河十階段"><div class="cosmo-starmap-scroll"><div class="cosmo-starmap-figure">${img}<ol class="cosmo-starmap-stars">${stars}</ol></div></div></nav>`;
}

/** Scale figure. Placed after stage 10 so the 16:9 starmap can stay under the hero without pushing #cosmo-1 past ~1.4 phone screens. */
function scaleNest(): string {
  const levels = COSMOS_SCALES.map((level) => `<li><span class="cosmo-scale-name">${esc(level.name)}</span> · <span class="cosmo-scale-size">${esc(level.size)}</span></li>`).join('');
  const img = `<img src="${CIV}/cosmo-scale-nest-640w.webp" srcset="${CIV}/cosmo-scale-nest-400w.webp 400w, ${CIV}/cosmo-scale-nest-640w.webp 640w, ${CIV}/cosmo-scale-nest-1280w.webp 1280w" sizes="(max-width: 640px) calc(100vw - 48px), 640px" width="1280" height="720" alt="" loading="lazy" decoding="async" />`;
  return `<figure class="cosmo-scale-nest"><div class="cosmo-scale-frame">${img}</div><figcaption><p class="cosmo-scale-note">空間尺度由大到小，上一級包含下一級所在區域。數字為約數，採主流綜述。第七級收到地球，其後<a href="${ORIGINS_HANDOFF_HREF}">交接入類起源</a>。</p><ol class="cosmo-scale-levels">${levels}</ol></figcaption></figure>`;
}

function stageSection(stage: CosmoStage): string {
  const points = stage.milestones.map((item) => `<li>${esc(item)}</li>`).join('');
  const reveal = stage.n === 1 ? ' civ-reveal civ-reveal--above-fold is-inview' : ' civ-reveal';
  return `<section class="chronicle-stage cosmo-stage${reveal}" id="cosmo-${stage.n}" data-stage="${stage.n}">
    <p class="era">${esc(ordinal(stage.n))} · ${esc(stage.era)}</p>
    <h2 tabindex="-1">${esc(stage.name)}</h2>
    <figure class="civ-figure" data-stage="${stage.n}"><div class="stage-frame stage-cover" data-stage="${stage.n}">${cosmoCoverImg(stage, stage.n === 1)}${paperSeal(stage.n)}</div><figcaption>${esc(stage.name)} · 示意 · 約數</figcaption></figure>
    <ul class="stage-milestones">${points}</ul>
    <p>${esc(stage.prose)}</p>
    <p class="stage-meaning">${esc(stage.meaning)}</p>
    ${lineChips(stage.lines)}
    ${stage.n === 10 ? renderLinkChips(COSMOS_HANDOFF_CHIPS.filter((chip) => chip.href === ORIGINS_HANDOFF_HREF), '交接入類起源') : ''}
  </section>`;
}

function sourceTable(): string {
  const body = COSMOS_SOURCES.map((row, index) => {
    const href = sourceHref(row.url);
    const link = href ? `<a href="${href}">${esc(row.url)}</a>` : esc(row.url);
    return `<tr><td>${index + 1}</td><td>${esc(row.name)}</td><td>${esc(row.note)}</td><td>${link}</td></tr>`;
  }).join('');
  return `<table class="civ-table"><thead><tr><th>#</th><th>機構／入口</th><th>說明</th><th>網址</th></tr></thead><tbody>${body}</tbody></table>`;
}

export function renderCosmosArticle(): string {
  const nav = COSMOS_STAGES.map((stage) => `<a class="chip" href="#cosmo-${stage.n}">${ordinal(stage.n)} ${esc(stage.short)}</a>`).join('');
  return `<article class="civ-article cosmos-page">
    <header class="cosmo-hero">
      <p class="kicker">Deep time · 深時間</p>
      <h1 class="column-title civ-page-title">${esc(COSMOS_TITLE)}</h1>
    </header>
    <p>${esc(COSMOS_LEDE.replace(/交接入類起源。$/, ''))}<a href="${ORIGINS_HANDOFF_HREF}">交接入類起源</a>。</p>
    <p class="deep-time-return"><a href="/civilization/earth/">生命各階的厚寫：地球生命</a></p>
    ${lineChips(LINES)}
    ${starmap()}
    <nav class="chronicle-nav cosmo-nav cosmo-nav-chips" aria-label="跳到宇宙階段">${nav}</nav>
    <div class="civ-progress" aria-hidden="true"></div>
    ${COSMOS_STAGES.map(stageSection).join('')}
    ${scaleNest()}
    <h2>交接地球生命</h2>
    <p>宇宙長河在生命起源、大氧化與顯生宙只作粗線。從早期生命到約七百萬年前的各階，見<a href="/civilization/earth/">地球生命</a>，其後再進入人類起源。</p>
    ${renderCosmosHandoff()}
    <h2>來源</h2>
    ${sourceTable()}
    <p class="stage-source">${esc(COSMOS_SOURCE_NOTE)}</p>
    <p class="civ-ai"><span class="badge">AI 整合</span> 本頁由公開科普與主流綜述入口整合，僅供研究與編輯參考。</p>
  </article>`;
}
