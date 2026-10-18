import { cjkChars, esc, safeHttp } from '../contentPage.js';

/** Thick-page floor. Below this the page stays noindex. */
export const CITY_MIN_CHARS = 1200;

export type CityLine = '聚落' | '工程' | '交通' | '民生';

export interface CityStage {
  n: number;
  /** Canonical stage name. Urban civilization first; Hong Kong is only a local case. */
  name: string;
  /** Jump-chip label. At most six characters. */
  short: string;
  era: string;
  milestones: string[];
  meaning: string;
  lines: CityLine[];
  prose: string;
  /** Chronicle stage to cross-link. The long chronicle is not repeated. */
  chronicle?: number;
  /** Local anchors. The rest of the page stays on the global urban line. */
  local?: boolean;
}

export interface CitySource {
  name: string;
  note: string;
  url: string;
}

const LINES: CityLine[] = ['聚落', '工程', '交通', '民生'];

export const CITY_TITLE = '城市・基建・民生';

const LEDE_BEFORE = '城市不是一座紀念碑，而是人把聚落、工程、交通與日常公共生活疊在同一塊地上。本頁先寫這條全球尺度的粗線：定居形成聚落，聚落長出文字與公共工程，道路與港口變成交通樞紐，博物館和公民場館把知識開放給不特定的訪客，街道則承擔買菜、通勤與散步。香港的碼頭、隧道、大會堂與科學館，只作為本地案例放在後段，用來說明一座城市怎樣把上述尺度收成可走進去的地方，而不是用本地地名代替整頁。年代一律寫作「約」。技術細節見';
const LEDE_TECH = '科技與發現';
const LEDE_MID = '，四線編年見';
const LEDE_CHRONICLE = '文明編年';
const LEDE_AFTER = '。';
export const CITY_LEDE = `${LEDE_BEFORE}${LEDE_TECH}${LEDE_MID}${LEDE_CHRONICLE}${LEDE_AFTER}`;

const HANDOFF_A = '定居以前的深時間不在本頁。城市與文字的四線寫法，請讀';
const HANDOFF_B = '。工具、能源與媒介的發現弧，請讀';
const HANDOFF_C = '。香港的場館與交通只作本地案例，目錄在';
const HANDOFF_D = '；分日紀事在';
const HANDOFF_E = '。今日標題在';
const HANDOFF_F = '。';
export const CITY_HANDOFF = `${HANDOFF_A}文明編年${HANDOFF_B}科技與發現${HANDOFF_C}香港地標${HANDOFF_D}當年今日${HANDOFF_E}今日切片${HANDOFF_F}`;

export const CITY_SOURCE_NOTE = '年代取公共遺產與博物館頁面的約數。香港開幕與通車只作本地案例，目錄另見站內地標頁，不把一城寫成整頁。';

/** A few local cases. The thick page is not a landmark index. */
export const CITY_LOCAL_LINKS: { href: string; label: string }[] = [
  { href: '/hk/landmarks/', label: '香港地標' },
  { href: '/hk/landmarks/city-hall/', label: '香港大會堂' },
  { href: '/hk/landmarks/cultural-centre/', label: '香港文化中心' },
  { href: '/hk/landmarks/science-museum/', label: '香港科學館' },
  { href: '/hk/landmarks/space-museum/', label: '香港太空館' },
  { href: '/hk/landmarks/star-ferry/', label: '天星小輪' },
  { href: '/hk/landmarks/cross-harbour-tunnel/', label: '海底隧道' },
  { href: '/hk/landmarks/peak-tram/', label: '山頂纜車' },
  { href: '/hk/landmarks/hkia/', label: '香港國際機場' },
  { href: '/on-this-day/', label: '當年今日' },
];

export const CITY_STAGES: CityStage[] = [
  {
    n: 1,
    name: '定居與聚落',
    short: '聚落',
    era: '約 1.2 萬年前至約 5000 年前',
    milestones: ['定居農耕', '聚落而不是季節營地'],
    meaning: '人開始在同一地點累積房屋、儲存與路徑。',
    lines: ['聚落'],
    chronicle: 2,
    prose: '全新世之後，多地先後出現較長期的定居。房屋、儲糧與反覆使用的路徑，使一塊地從季節營地變成聚落。這不是某一座「第一城」的生日，而是剩餘與人口讓人可以留在原地的過程。恰塔霍裕克等新石器遺址，被公共遺產名錄用作理解早期定居生活的入口。農業如何支撐後來的組織，文明編年第二階段寫得更完整；本頁從這裡接過「人開始住下來」這一句，下面才寫城市。',
  },
  {
    n: 2,
    name: '城市與文字',
    short: '城市文字',
    era: '約公元前 4000–2000 年',
    milestones: ['密集聚落成為城市', '文字服務清單與公共記錄'],
    meaning: '足夠多的人住在一起之後，記錄變成城市得以運作的條件。',
    lines: ['聚落', '民生'],
    chronicle: 3,
    prose: '當聚落密集到需要倉儲、作坊與公共空間，後世稱之為城市。文字在這裡首先是清單、計數與交接，使不認識的人仍可以按記錄分工。城市與文字因此常被放在同一階段：沒有記錄，大型聚落難以把糧食、工時與公共工程交接到下一季。編年頁以信息與制度重讀這一節；本頁強調的是居住形態，也就是人怎樣在同一座城市裡繼續生活。各地進入城市的時間不同，只取約數。文字作為發現技術的細節，見科技與發現。',
  },
  {
    n: 3,
    name: '供水與公共工程',
    short: '公共工程',
    era: '約公元前 1000 年至約公元 500 年',
    milestones: ['引水與公共水源', '道路、港口與倉儲'],
    meaning: '城市用工程把水、路與儲存變成眾人共用的條件。',
    lines: ['工程'],
    prose: '一座城市要每天成立，就得解決水從哪裡來、路通到哪裡、糧食放在哪裡。引水渠、公共水池、道路、港口與倉儲，都是把個人無法單獨維持的條件做成公共工程。加爾橋一類遺址，今天仍以遺產名錄向公眾說明引水如何服務城市，而不是只作為風景。工程尺度因地而異，重修也很常見；本頁不把任何一項工程寫成永不改變，只說明城市依賴可共享的基礎設施。這是全球城市線上的工程，不是某一地的專名表。',
  },
  {
    n: 4,
    name: '街道、市場與日常供給',
    short: '日常供給',
    era: '古代城市至近代城市',
    milestones: ['市場集中日常供給', '街道成為公共節奏'],
    meaning: '民生發生在重複的購買、搬運與相遇之中。',
    lines: ['民生', '工程'],
    prose: '市場把糧食、燃料與日用品集中到可到達的地方，街道則決定人怎麼走過去。城市史若只剩紀念建築，就會漏掉這一日復一日的供給：開店、運貨、取水、收市。這些活動很少留下單一開幕日，卻是民生的本體。後世的市政安排多半在整理已經發生的街道節奏，而不是發明節奏本身。本頁只寫供給與公共空間如何讓陌生人可以並存。買菜、等候與搬運，比落成典禮更接近城市的日常。',
  },
  {
    n: 5,
    name: '交通樞紐',
    short: '交通樞紐',
    era: '約公元 1800 年至今',
    milestones: ['港口、車站與機場', '樞紐把城市接到更遠的日程'],
    meaning: '城市的邊緣變成進出的門，而不只是道路的盡頭。',
    lines: ['交通'],
    prose: '近代以降，港口、鐵路車站與機場把到達一座城市變成可對照的時刻表。樞紐是交通線，也是公共空間：人在這裡等候、換乘、告別。蒸汽鐵路在公共博物館敘事中常被用作這一轉變的物質象徵；地下鐵路與航空則把同一邏輯收進二十世紀的城市。蒸汽與電力作為能量技術，見科技與發現；本頁只寫樞紐如何改寫日常，通勤、探訪與貨運開始圍繞固定的入口。香港的隧道、渡輪與機場放在本地案例，不在這裡代替全球城市。',
  },
  {
    n: 6,
    name: '博物館與公民場館',
    short: '公民場館',
    era: '約公元 1700 年至今',
    milestones: ['收藏向公眾開放', '科學館、天文館與演藝場'],
    meaning: '知識與演出有了不特定訪客可以進入的房子。',
    lines: ['民生'],
    prose: '博物館、科學館、天文館、圖書館與演藝場，把原先限於學院或私人的收藏與節目，逐漸開放給買票或免費入場的公眾。開放日因此值得記住：它標出一座城市願意把知識與演出放進公共日程。國際博物館協會一類組織，把向公眾開放寫成博物館工作的公共目標，可作行業入口，而不是某一個館的全部歷史。本地的科學館、太空館、大會堂與文化中心，是這一邏輯在香港的例子，詳見後段，不在本階段展開地址。',
  },
  {
    n: 7,
    name: '步行與公共空間',
    short: '公共空間',
    era: '城市成形以來',
    milestones: ['廣場、海濱與公園', '步行本身就是公共生活'],
    meaning: '公共生活包括沒有節目單的停留與通過。',
    lines: ['民生', '交通'],
    prose: '廣場、海濱、公園與有蓋步行道，承載沒有票根的公共生活：等人、散步、看船、放學經過。這些空間常常由填海、園林或街道工程產生，卻以日常使用而不是落成典禮被記住。交通樞紐解決進出，步行空間解決留下。兩者都屬於城市，只是速度不同。本頁只記地理與日常用途。城市需要一些不必預約的地面，人可以在那裡通過、停留、觀看，然後回到自己的日程。',
  },
  {
    n: 8,
    name: '照明與城市公用',
    short: '城市公用',
    era: '約公元 1800 年至今',
    milestones: ['街道照明', '自來水與公共清潔'],
    meaning: '夜路、飲水與清潔變成可以預期的城市條件。',
    lines: ['工程', '民生'],
    prose: '街道照明讓夜間仍能辨認路口，自來水與排水讓飲用與清潔不必每戶各自解決，街道清潔則維持市場翌日仍能開檔。這些公用事業很少成為觀光點，卻決定一座城市能不能每天重複。能源技術的來源見科技頁的工業能量與電力；本頁把它們看成已經接到住戶與街道之後的民生。各地接通的年份差異很大，只保留從個別解決變成城市供給這個方向。沒有這些不起眼的工程，前面的市場與步行都難以每天成立。',
  },
  {
    n: 9,
    name: '本地案例：香港公共場所',
    short: '本地案例',
    era: '一八八八年至一九九八年的若干開幕與通車',
    milestones: ['場館向公眾開放', '過海與登山的日常路徑'],
    meaning: '全球城市線落到一組可以走進去的本地地址。',
    lines: ['交通', '民生'],
    local: true,
    prose: '香港把上述尺度收成具體地址，但這些地址不是本頁的全部。大會堂於一九六二年啟用，是臨海的公共文化建築；文化中心於一九八九年開幕，音樂廳與劇院面向尖沙咀海旁。科學館於一九九一年開幕，太空館於一九八〇年開幕，分別以常設展覽介紹日常科學與星空。交通方面，天星小輪長期往來維多利亞港，海底隧道於一九七二年通車，山頂纜車於一八八八年開始載客，赤鱲角的客運大樓於一九九八年啟用。讀者若要看建築、開放安排與分年紀事，應進入香港地標各頁；本頁只用它們說明：一座城市的公共生活，是場館、渡輪與道路同時存在。',
  },
  {
    n: 10,
    name: '今日城市切片',
    short: '今日城市',
    era: '今日',
    milestones: ['通車、開幕與場館新聞', '沒有對照就不強加座標'],
    meaning: '今天的城市新聞，是公共生活長河上的一刀。',
    lines: ['民生'],
    prose: '一則關於通車、館舍開放、步行空間或公用事業的新聞，可以掛回聚落、工程、交通或民生中的一至兩條線。沒有溫和史對照的電訊不強加年代。當年今日收錄的是已核對的本地紀事，香港地標則是可以逐頁閱讀的案例；兩者都服務本頁，而不取代從聚落到公共空間的全球粗線。技術儀器與媒介如何被發現，請回到科技與發現。讀完尺度之後，再進入今日切片。城市頁到此為止，新聞主線仍在導讀與標題。',
  },
];

export const CITY_SOURCES: CitySource[] = [
  { name: 'UNESCO · Çatalhöyük', note: '新石器定居聚落的世界遺產入口', url: 'https://whc.unesco.org/en/list/1405/' },
  { name: 'UNESCO · The Ahwar of Southern Iraq', note: '早期城市與濕地景觀的公共遺產說明', url: 'https://whc.unesco.org/en/list/1481/' },
  { name: 'UNESCO · Pont du Gard', note: '羅馬引水橋作為城市公共供水的遺產入口', url: 'https://whc.unesco.org/en/list/344/' },
  { name: 'UNESCO · Archaeological Ruins at Moenjodaro', note: '早期規劃城市的公共遺產入口', url: 'https://whc.unesco.org/en/list/138/' },
  { name: 'National Railway Museum · Stephenson’s Rocket', note: '鐵路車站時代的博物館敘事，用作交通樞紐的全球參照', url: 'https://www.railwaymuseum.org.uk/objects-and-stories/stephensons-rocket-rainhill-and-rise-locomotive' },
  { name: 'ICOM · Missions and objectives', note: '博物館向公眾開放的行業目標入口', url: 'https://icom.museum/en/about-us/missions-and-objectives/' },
];

export function cityStageHref(stage: number): string {
  return `/civilization/city/#city-${stage}`;
}

/** Essay counted for the index floor. Source URLs and chrome stay out. */
export function cityProse(): string {
  return [
    CITY_TITLE,
    CITY_LEDE,
    ...CITY_STAGES.flatMap((stage) => [stage.name, stage.era, ...stage.milestones, stage.meaning, stage.prose, ...stage.lines]),
    CITY_HANDOFF,
    CITY_SOURCE_NOTE,
    ...CITY_SOURCES.flatMap((row) => [row.name, row.note]),
    ...CITY_LOCAL_LINKS.flatMap((row) => [row.label]),
    ...LINES,
  ].join('\n');
}

export function cityIndexable(): boolean {
  return CITY_STAGES.length === 10 && cjkChars(cityProse()) >= CITY_MIN_CHARS;
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
export function cityCoverImg(stage: CityStage, eager: boolean): string {
  const base = `${CIV}/city-stage-${stage.n}-cover`;
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
  return `<figure class="civ-node-hero"><img src="${CIV}/node-city-v1.jpg" width="1280" height="720" alt="城市・基建・民生示意" loading="eager" fetchpriority="high" decoding="async" onerror="this.hidden=true" /><figcaption>城市・基建・民生 · 示意</figcaption></figure>`;
}

function localLinks(): string {
  return `<p class="stage-links">${CITY_LOCAL_LINKS.map((row) => `<a href="${esc(row.href)}">${esc(row.label)}</a>`).join('')}</p>`;
}

function stageSection(stage: CityStage): string {
  const points = stage.milestones.map((item) => `<li>${esc(item)}</li>`).join('');
  const extra: string[] = [];
  if (stage.chronicle) extra.push(`<a href="/civilization/chronicle/#stage-${stage.chronicle}">對照文明編年</a>`);
  const chronicle = extra.length ? `<p class="stage-links">${extra.join('')}</p>` : '';
  const local = stage.local ? localLinks() : '';
  return `<section class="chronicle-stage city-stage" id="city-${stage.n}" data-stage="${stage.n}">
    <p class="era">${esc(ordinal(stage.n))} · ${esc(stage.era)}</p>
    <h2>${esc(stage.name)}</h2>
    <figure class="civ-figure" data-stage="${stage.n}"><div class="stage-frame stage-cover" data-stage="${stage.n}">${cityCoverImg(stage, false)}${paperSeal(stage.n)}</div><figcaption>${esc(stage.name)} · 示意 · 約數</figcaption></figure>
    <ul class="stage-milestones">${points}</ul>
    <p>${esc(stage.prose)}</p>
    <p class="stage-meaning">${esc(stage.meaning)}</p>
    ${lineChips(stage.lines)}
    ${chronicle}
    ${local}
  </section>`;
}

function sourceTable(): string {
  const body = CITY_SOURCES.map((row, index) => {
    const href = sourceHref(row.url);
    const link = href ? `<a href="${href}">${esc(row.url)}</a>` : esc(row.url);
    return `<tr><td>${index + 1}</td><td>${esc(row.name)}</td><td>${esc(row.note)}</td><td>${link}</td></tr>`;
  }).join('');
  return `<table class="civ-table"><thead><tr><th>#</th><th>機構／入口</th><th>說明</th><th>網址</th></tr></thead><tbody>${body}</tbody></table>`;
}

export function renderCityArticle(): string {
  const nav = CITY_STAGES.map((stage) => `<a class="chip" href="#city-${stage.n}">${ordinal(stage.n)} ${esc(stage.short)}</a>`).join('');
  return `<article class="civ-article city-page">
    <header class="city-hero">
      <p class="kicker">Civic life · 公共生活</p>
      <h1 class="column-title civ-page-title">${esc(CITY_TITLE)}</h1>
    </header>
    ${nodeHero()}
    <p>${esc(LEDE_BEFORE)}<a href="/civilization/tech/">${LEDE_TECH}</a>${esc(LEDE_MID)}<a href="/civilization/chronicle/">${LEDE_CHRONICLE}</a>${esc(LEDE_AFTER)}</p>
    ${lineChips(LINES)}
    <nav class="chronicle-nav city-nav" aria-label="跳到城市階段">${nav}</nav>
    ${CITY_STAGES.map(stageSection).join('')}
    <h2>交接編年與本地案例</h2>
    <p>${esc(HANDOFF_A)}<a href="/civilization/chronicle/">文明編年</a>${esc(HANDOFF_B)}<a href="/civilization/tech/">科技與發現</a>${esc(HANDOFF_C)}<a href="/hk/landmarks/">香港地標</a>${esc(HANDOFF_D)}<a href="/on-this-day/">當年今日</a>${esc(HANDOFF_E)}<a href="/#slice">今日切片</a>${esc(HANDOFF_F)}</p>
    <p class="stage-links"><a href="/civilization/tech/">科技與發現</a><a href="/civilization/chronicle/">文明編年</a><a href="/hk/landmarks/">香港地標</a><a href="/on-this-day/">當年今日</a><a href="/civilization/">返回文明總覽</a><a href="/#slice">今日切片</a></p>
    <h2>來源</h2>
    ${sourceTable()}
    <p class="stage-source">${esc(CITY_SOURCE_NOTE)}</p>
    <p class="civ-ai"><span class="badge">AI 整合</span> 本頁由公開遺產名錄、博物館入口與站內地標頁整合，僅供研究與編輯參考。</p>
  </article>`;
}
