import { cjkChars } from '../../contentPage.js';
import { CASE_STUDIES } from '../cases.js';
import { CHRONICLE_BRIDGE, CHRONICLE_CHAPTERS, CHRONICLE_EXTRA_SOURCES, CHRONICLE_HOW, CHRONICLE_LEDE, CHRONICLE_STAGES, CHRONICLE_SUMMARY, CHRONICLE_TITLE, chronicleProse } from '../chronicle.js';
import { CHRONICLE_MILESTONE_BLOCKS } from '../chronicleMilestones.js';
import { CITY_HANDOFF, CITY_LEDE, CITY_LOCAL_LINKS, CITY_SOURCE_NOTE, CITY_SOURCES, CITY_STAGES, CITY_TITLE, cityProse } from '../city.js';
import { CITY_READINGS } from '../content/cityReadings.js';
import { EARTH_HANDOFF, EARTH_LEDE, EARTH_SOURCE_NOTE, EARTH_SOURCES, EARTH_STAGES, EARTH_TITLE, earthProse } from '../earth.js';
import { BAND_NOTES, FUTURE_CLADE, FUTURE_COUNTDOWNS, FUTURE_DOMAINS, FUTURE_HORIZONS, FUTURE_INSTANCES, FUTURE_OPENING, FUTURE_TIER_CARD, FUTURE_TIER_ROWS, LEVEL_LEGEND, STAGE10_BRIDGE, STAGE10_BRIDGE_EXTRA } from '../future.js';
import { COSMOS_HANDOFF, COSMOS_LEDE, COSMOS_SCALES, COSMOS_SOURCE_NOTE, COSMOS_SOURCES, COSMOS_STAGES, COSMOS_TITLE, cosmosProse } from '../cosmos.js';
import { GALAXY_COSMOS_LINKS, GALAXY_LEDE, GALAXY_NOTES, GALAXY_QUESTIONS, GALAXY_SOURCE_NOTE, GALAXY_SOURCES, GALAXY_STAGES, GALAXY_TITLE, HANDOFF_BRIDGE, HANDOFF_DOWN_AFTER, HANDOFF_DOWN_BEFORE, HANDOFF_DOWN_MID, HANDOFF_THIN, HANDOFF_UP_AFTER, HANDOFF_UP_BEFORE, galaxyProse } from '../galaxy.js';
import { ORIGINS_BODY, ORIGINS_SOURCES } from '../originsSource.js';
import { PATTERN_CARDS } from '../patterns.js';
import { TECH_HANDOFF, TECH_LEDE, TECH_SOURCE_NOTE, TECH_SOURCES, TECH_STAGES, TECH_TITLE, techProse } from '../tech.js';
import { TECH_READINGS } from '../content/techReadings.js';
import type { CivDriver, CivProduct } from '../contract.js';
import type { ChronicleDb, ChronicleEntry, ChronicleSource, ChronicleThread } from './types.js';

const BANNED = /台灣|臺灣|台海|臺海|台湾|xAI|Grok/;
const VERSION = '2026-11-07-text-first';
const GENERATED_AT = '2026-11-07';

const CONFIDENCE: Record<string, string> = { limited: '有限', partial: '部分', steady: '較穩' };
const HORIZON_KIND: Record<string, string> = { biosphere: '生物圈', health: '健康', resource: '資源' };
const CLADE_KIND: Record<string, string> = { 'tool-extension': '工具延伸', 'niche-continue': '生態位延續' };

const CHRONICLE_NEXT = [
  '火與語言把經驗留在群體裡。氣候進入相對穩定的全新世之後，多地才把這種經驗用在作物與牲畜上。剩餘不是突然出現的，而是可存放的食物慢慢改變了人能否留在原地。',
  '人能留在原地，倉儲與分工才有地方生長。下一節要處理的，是陌生人如何共用一份不會隨口述消失的記錄。',
  '記錄一旦可以離開現場，行政、稅收與思想才有機會在更大的區域裡穩定下來。金屬貨幣把遠距交換從一次次臨時議價裡抽出一部分。',
  '更大的行政區域並沒有終止交流。造紙、印刷與紙幣要改變的，是知識與支付能否以更低的成本走得更遠。',
  '複製變便宜之後，下一件要問的事是：哪一種說法可以被重複觀察。科學方法把知識權威的一部分改放到可核對的證據上。',
  '可重複的觀察若仍只靠人手，功率的上限就停在作坊裡。蒸汽、鐵路與電報把能量和消息的速度一起抬高，也把維修與班次變成日常條件。',
  '機器在場，並不自動產生跨國信用。金本位與後來的多邊安排，處理的是遠方的支付如何仍能被核對。日常電子錢包不在這一節。',
  '貨幣安排收到約一九六九年為止。其後的互聯網與萬維網，把信息與早期在線支付放進另一個窗口，不與前一節的年代重疊。',
  '網絡使複製近乎即時，卻還沒有把約二零一零年以後的通用工具算進來。本世紀要寫的，是已經進入公共機構頁面的測量、支付、測序與氣候說明，而不是對以後世紀的預測。',
];

const TECH_NEXT = [
  '石器把步驟留在看得見的動作裡。下一步是調度身體以外的熱：用火仍在營地旁邊，尚未進入後來的管網。',
  '熱源讓群體可以圍坐。口傳把圍坐時說出的經驗交給尚未親自動手的人，知識開始不必每次重新發現。',
  '口傳會走樣。文字把計數、清單與契約壓成可以翻回去的物件，校驗才有底本。',
  '有了可翻回去的記錄，儀器才值得把一次觀察固定成別人也能重做的刻度。',
  '儀器延長了眼與手。工業能量要問的是：多出來的功率能否被儲存、送出，並在斷掉之後修得回來。',
  '功率上去之後，印刷與報刊把同一份文字送到更多互不相識的讀者。印得便宜，仍不等於每一句都對過底本。',
  '報刊仍受交通與截稿限制。電氣與電報開始讓消息在人不親至時送達。',
  '點對點的電路之後，分組交換讓網絡可以繞過單點故障。這一節收到約二零零九年，不把後來的通用工具提前寫入。',
  '網絡成為日常之後，新聞標題本身就是這一條發現弧的薄層：只列題與出處，不把模型輸出當成已經核對的事實。',
];

const CITY_NEXT = [
  '人開始住下來，下一件事情才是城市，而不是把村落直接稱作國都。文字與公共記錄在聚落裡變得必要。',
  '城市一旦要維持陌生人共居，水、路與城牆就不再只是家戶自己的事。',
  '工程把人留在城裡。街道與市場接著處理每天的食物、手工與相遇。',
  '日常供給穩定之後，港口、驛道與後來的鐵路才把一座城接到另一座城。',
  '人能到達，場館才有不特定的訪客。博物館把知識從作坊和檔案室裡開放出來。',
  '場館是公共生活的一角。步行、廣場與街道仍是大多數人每天使用的部分。',
  '街道在白天能走，還要在夜間能夠辨認。照明與城市公用把這一件事變成持續的維修。',
  '全球尺度寫到這裡為止。香港的碼頭、隧道與場館只作為一座城市如何把上述尺度收成可走進去的地方，不代替整頁。',
  '本地案例之後，今日的城市標題仍只是薄層。要看工具與能源如何走到街上，應回技術長文；要看四線編年，應回文明編年。',
];

const COSMOS_NEXT = [
  '暴脹與熱密開端留下的，是後續一切結構的能量與時間條件。數分鐘之內，輕核才成為恆星燃料的物質起點。',
  '輕核的比例若與今日觀測相合，才談得上後來的恆星。宇宙對光透明之後，第一代恆星才有黑暗時代的終點。',
  '第一代恆星把重元素送進氣體。沒有這一步，後來的星系只是引力骨架，化學還無從開始。',
  '星系網穩下來之後，其中一片氣體雲才可能在約四十六億年前塌成太陽與行星。銀河系這一座棒旋星系的特寫，另見銀河系誕生。',
  '太陽系把地球放上相對穩定的軌道。液態水是下一件環境條件，不是生命本身。',
  '海洋與水循環趨向穩定，複雜化學才有舞台。生命起源的路徑仍有多個假說並存，本頁不採單一定論。',
  '信息開始在生物層級累積之後，大氧化改寫的是全球能量流與化學環境。好氧代謝由此成為可能，厭氧生態位則受壓。',
  '含氧環境維持了很長的時間，顯生宙才出現可保存的身體構型與捕食關係。細節從地球生命長文寫起，這裡只留粗線。',
  '顯生宙的生態背景一直延伸到哺乳動物輻射。約七百萬年前，敘事交接入類起源，宇宙長河不再展開人屬細節。',
];

const EARTH_NEXT = [
  '含氧的水體與大氣準備好化學餘地之後，寒武紀要寫的是身體構型與捕食如何進入化石記錄。那是地質時間上的相對加快，不是一日之內的事件。',
  '海洋食物網成立之後，古生代把初級生產推上陸地。森林、有頜魚類與四足動物是這一長段的主線，二疊紀末的類群更替只記自然史後果。',
  '陸地生態已經在場。三疊紀是災後的重新組織，也是侏羅紀的直接前鄰。早期恐龍出現，卻尚未在許多陸相群落裡獨占優勢。',
  '三疊紀留下的身體構型，在大陸張裂與暖室氣候裡展開為侏羅紀的食物網。沒有一個類群單獨定義這個紀。',
  '侏羅紀的裸子植物林與淺海，到白堊紀遇上開花植物與更高的海平面。紀末的類群更替空出生態位，卻不是敘事上的終點。',
  '白堊紀讓出的生態位，在新生代被哺乳動物、鳥類與開花植物森林重新填上。草地與高冠牙是較晚的陸相主線。',
  '靈長類在森林裡分化，是人族出現之前的背景。約七百萬年前的分途只標交接點，直立行走、石器與走出非洲留給人類起源長文。',
];

interface Bag {
  threads: ChronicleThread[];
  entries: ChronicleEntry[];
  sources: ChronicleSource[];
}

interface NamedUrl {
  name: string;
  url: string;
  note?: string;
}

function summaryOf(text: string): string {
  const flat = text.replace(/\s+/g, '').replace(/[#>*[\]]/g, '');
  return flat.slice(0, 80);
}

function links(rows: readonly NamedUrl[]): string {
  const https = rows.filter((row) => row.url.startsWith('https://'));
  const http = rows.filter((row) => row.url.startsWith('http://'));
  const parts: string[] = [];
  if (https.length) {
    parts.push(`可核對的入口包括${https.map((row) => `[${row.name}](${row.url})`).join('、')}。`);
  }
  if (http.length) {
    parts.push(`另有以普通網址公開的頁面：${http.map((row) => `${row.name}（${row.url}）`).join('、')}。`);
  }
  return parts.join('\n\n');
}

function weaveFacts(input: {
  detail: string;
  products: readonly CivProduct[];
  drivers: readonly CivDriver[];
  impact: string;
}): string {
  const productText = input.products.map((item) => `${item.name}：${item.detail}`).join('');
  const driverText = input.drivers.map((item) => `${item.name}方面，${item.detail}`).join('');
  return [input.detail, productText ? `就當時可以留下來、也可以事後核對的事物而言，${productText}` : '', driverText ? `推動這一步的條件，可以分開看。${driverText}` : '', input.impact].filter(Boolean).join('\n\n');
}

function patternBody(stageN: number): string {
  const cards = PATTERN_CARDS.filter((card) => card.anchor.endsWith(`#stage-${stageN}`));
  return cards.map((card) => {
    const products = card.products.map((item) => `${item.name}。${item.detail}`).join('\n\n');
    const drivers = card.drivers.map((item) => `${item.name}。${item.detail}`).join('\n\n');
    return [
      `### ${card.title} {#pattern-${card.id}}`,
      card.eventDetail,
      card.mechanism,
      '### 關鍵產物',
      products,
      '### 推動力',
      drivers,
      '### 不適用邊界',
      card.boundary,
      '### 維修／傳承條件',
      card.maintenance,
      '### 今日可問',
      `${card.ask}這一問所對的問題是：${card.problem}`,
      '### 來源',
      links(card.sources),
    ].join('\n\n');
  }).join('\n\n');
}

function caseBody(mount: '/civilization/tech/' | '/civilization/chronicle/', beside: string): string {
  return CASE_STUDIES.filter((item) => item.mount === mount && item.beside === beside).map((item) => {
    const related = item.related.map((link) => `[${link.label}](${link.href})`).join('、');
    return [
      `### ${item.title} {#case-${item.id}}`,
      `案例專篇。這裡寫的是條件，結果標記為「${item.outcome}」。`,
      item.lede,
      ...item.paragraphs,
      `相關記載：${related}。`,
      '### 界定事件',
      item.eventDetail,
      '### 關鍵產物',
      item.products.map((product) => `${product.name}。${product.detail}`).join('\n\n'),
      '### 推動力',
      item.drivers.map((driver) => `${driver.name}。${driver.detail}`).join('\n\n'),
      '### 溫和影響',
      item.impact,
      '### 不適用邊界',
      item.boundary,
      '### 維修／傳承條件',
      item.maintenance,
      '### 今日可問',
      item.ask,
      `問題在於：${item.problem}。機制可以這樣說：${item.mechanism}`,
      '### 來源',
      links(item.sources),
    ].join('\n\n');
  }).join('\n\n');
}

function pushSource(bag: Bag, threadId: string, entrySlug: string | null, row: NamedUrl): void {
  if (!row.url.startsWith('http')) return;
  if (bag.sources.some((item) => item.thread_id === threadId && item.url === row.url && item.entry_slug === entrySlug)) return;
  bag.sources.push({
    thread_id: threadId,
    entry_slug: entrySlug,
    name: row.name,
    url: row.url,
    note: row.note ?? '',
  });
}

function addEntry(bag: Bag, threadId: string, slug: string, title: string, time: string, sort: number, body: string, sources: readonly NamedUrl[] = [], alsoId: string | null = null, parent: string | null = null): void {
  const text = body.trim();
  bag.entries.push({
    id: `${threadId}:${slug}`,
    thread_id: threadId,
    slug,
    title,
    summary: summaryOf(text),
    body: text,
    sort_key: sort,
    time_label: time,
    parent_slug: parent,
    also_id: alsoId,
  });
  for (const row of sources) pushSource(bag, threadId, slug, row);
}

function addThread(bag: Bag, thread: ChronicleThread): void {
  bag.threads.push(thread);
}

function readingBlocks(readings: readonly { event: string; eventDetail: string; products: readonly CivProduct[]; drivers: readonly CivDriver[]; impact: string }[] | undefined): string {
  if (!readings?.length) return '';
  return readings.map((reading) => [`### ${reading.event}`, weaveFacts({
    detail: reading.eventDetail,
    products: reading.products,
    drivers: reading.drivers,
    impact: reading.impact,
  })].join('\n\n')).join('\n\n');
}

function buildBag(): Bag {
  const bag: Bag = { threads: [], entries: [], sources: [] };

  addThread(bag, {
    id: 'cosmos',
    slug: 'cosmos',
    title: COSMOS_TITLE,
    lede: `${COSMOS_LEDE}\n\n這一卷按時間連續書寫，不再分成可跳轉的階段卡片。年代一律寫作約數或主流綜述。銀河系是其中一座星系的特寫，地球生命從生命化學寫起，兩者都另有長文，此處只保留銜接。`,
    sort_key: 10,
    path: '/civilization/cosmos/',
    ai_note: '本頁由公開科普與主流綜述入口整合，僅供研究與編輯參考。',
  });
  COSMOS_STAGES.forEach((stage, index) => {
    const next = COSMOS_NEXT[index] ?? '';
    const body = [
      stage.prose,
      `這一窗口裡可以對上公共敘事的事物，包括${stage.milestones.join('、')}。其意義在於：${stage.meaning}`,
      next,
    ].filter(Boolean).join('\n\n');
    addEntry(bag, 'cosmos', `cosmo-${stage.n}`, stage.name, stage.era, (index + 1) * 10, body, COSMOS_SOURCES);
  });
  addEntry(bag, 'cosmos', 'scales', '空間尺度', '由大到小', 200, [
    '把上面的時間讀完，還需要一把空間的尺子。下列數字都是約數，上一級包含下一級所在的區域，並不表示宇宙是一套套盒玩具。',
    COSMOS_SCALES.map((level) => `${level.name}，${level.size}`).join('。') + '。',
    '第七級收到地球。其後的化石、石器與基因組見[人類起源時間線](/civilization/origins/)。生命各階的厚寫見[地球生命](/civilization/earth/)。',
    '### 交接地球生命',
    '宇宙長河在生命起源、大氧化與顯生宙只作粗線。從早期生命到約七百萬年前的各階，見[地球生命](/civilization/earth/)，其後再進入人類起源。',
    '### 交接人類起源',
    `${COSMOS_HANDOFF}詳見[文明編年](/civilization/chronicle/)。`,
    COSMOS_SOURCE_NOTE,
    links(COSMOS_SOURCES),
  ].join('\n\n'), COSMOS_SOURCES);

  addThread(bag, {
    id: 'galaxy',
    slug: 'galaxy',
    title: GALAXY_TITLE,
    lede: `${GALAXY_LEDE}\n\n本頁是連續的三節，加上詞義旁註與交接，不再提供章節跳轉。年代、直徑與質量一律為約。`,
    sort_key: 20,
    path: '/civilization/galaxy/',
    ai_note: '本頁由公開科普與主流綜述入口整理，作為文明記載的深時間頁。授權跟隨站級 CC BY 4.0。',
  });
  const galaxyJoin = [
    '定義寫清之後，才談得上這座星系如何在宇宙網的節點裡冷却成盤。形態標籤是觀測分類，不是價值排序。',
    '形成史給出時間。結構一節改寫我們從盤內如何描繪它：旋臂、棒與暈都是示跡，不是剛體輪輻。',
  ];
  GALAXY_STAGES.forEach((stage, index) => {
    const parts = stage.parts.map((part) => [`### ${part.heading}`, ...part.paragraphs].join('\n\n')).join('\n\n');
    const body = [
      `本節要記住的是：${stage.meaning}可對照的事物包括${stage.milestones.join('、')}。`,
      parts,
      galaxyJoin[index] ?? '',
    ].filter(Boolean).join('\n\n');
    addEntry(bag, 'galaxy', stage.id, stage.name, stage.era, (index + 1) * 10, body, GALAXY_SOURCES);
  });
  addEntry(bag, 'galaxy', 'notes', '開蒙旁註', '詞義', 40, [
    '下列旁註只解釋詞義與尺度。[開蒙](/learn/)葉頁另備，這裡先留一句，不另做導覽樹。',
    ...GALAXY_NOTES.map((note) => `### ${note.term} {#${note.id}}\n\n${note.text}`),
  ].join('\n\n'));
  addEntry(bag, 'galaxy', 'cosmos-link', '與宇宙長河的銜接', '銜接', 50, [
    HANDOFF_BRIDGE,
    ...GALAXY_COSMOS_LINKS.map((row) => `[${row.label}](${row.href})。${row.text}`),
    '第六階至第十階寫地球與生命。本頁只保留一句：宜居環境需要恆星的長期穩定與化學供應。細節見[地球生命](/civilization/earth/)，約七百萬年前的人族物語見[人類起源時間線](/civilization/origins/)。',
    '本頁是宇宙長河第四階的本星系特寫，不是另一套十階。',
  ].join('\n\n'), GALAXY_SOURCES);
  addEntry(bag, 'galaxy', 'earth-handoff', '接地球生命', '交接', 60, [
    '地球生命頁從早期生命、氧化、顯生宙寫到人族前的生物圈。那些故事默認了幾個星系尺度的前提。本頁點明它們，卻不展開成生物學長文。',
    '穩定的長期能量輸入：太陽作為中等質量的主序星，能在數十億年尺度上相對平穩地輸出能量。這類恆星的誕生，依賴銀盤氣體的冷卻與金屬豐度。',
    '固體與揮發份的原料：岩石行星與水相關組分，需要前代恆星的核合成，以及超新星與恆星風把重元素送進分子雲。銀河系的化學演化，就是這座原料廠的流水線。',
    '相對可討論的軌道環境：行星系統仍可能受鄰近超新星、分子雲遭遇與彗星儲庫擾動影響。把地球放回銀盤軌道，是為了說明宜居是條件的交集。條件清單在變得更清楚，單一敘事不應裝成已經窮盡。',
    `${HANDOFF_UP_BEFORE}[星系與大尺度結構](/civilization/cosmos/#cosmo-4)${HANDOFF_UP_AFTER}`,
    `${HANDOFF_DOWN_BEFORE}[地球生命](/civilization/earth/)${HANDOFF_DOWN_MID}[人類起源時間線](/civilization/origins/)${HANDOFF_DOWN_AFTER}`,
    HANDOFF_THIN,
    GALAXY_QUESTIONS.map((question) => question.endsWith('？') ? question : `${question}？`).join(''),
    '今日仍可問的，是上面這些句子，而不是一排章節按鈕。',
    GALAXY_SOURCE_NOTE,
    links(GALAXY_SOURCES),
  ].join('\n\n'), GALAXY_SOURCES);
  addEntry(bag, 'galaxy', 'ask', '今日可問', '問題', 70, GALAXY_QUESTIONS.map((question) => question).join('\n\n'));

  addThread(bag, {
    id: 'earth',
    slug: 'earth',
    title: EARTH_TITLE,
    lede: `${EARTH_LEDE}\n\n本卷把各紀寫成前後相接的長文。侏羅紀仍可從文內[侏羅紀](#jurassic)抵達，但不再另設階段跳轉列。`,
    sort_key: 30,
    path: '/civilization/earth/',
    ai_note: '本頁由公開科普與主流綜述入口整合，僅供研究與編輯參考。',
  });
  EARTH_STAGES.forEach((stage, index) => {
    const parts = stage.parts.map((part) => {
      const id = part.id ? ` {#${part.id}}` : '';
      return `### ${part.heading}${id}\n\n${part.text}`;
    }).join('\n\n');
    const body = [
      stage.prose,
      `這一時期可以核對的事物，包括${stage.milestones.join('、')}。其意義在於：${stage.meaning}`,
      parts,
      EARTH_NEXT[index] ?? '',
    ].filter(Boolean).join('\n\n');
    addEntry(bag, 'earth', `earth-${stage.n}`, stage.name, stage.era, (index + 1) * 10, body, EARTH_SOURCES, stage.n === 5 ? 'jurassic' : null);
  });
  addEntry(bag, 'earth', 'handoff', '交接人類起源', '約七百萬年前', 200, [
    EARTH_HANDOFF,
    '更早的能量、物質與時空見[宇宙長河](/civilization/cosmos/)。約七百萬年前之後見[人類起源時間線](/civilization/origins/)。文明制度、技術與貨幣見[文明編年](/civilization/chronicle/)。',
    EARTH_SOURCE_NOTE,
    links(EARTH_SOURCES),
  ].join('\n\n'), EARTH_SOURCES);

  addThread(bag, {
    id: 'origins',
    slug: 'origins',
    title: '人類起源時間線',
    lede: '從深時間到解剖學現代人與全球擴張的約略年表。正文保持連續敘述，圖像只作示意。',
    sort_key: 40,
    path: '/civilization/origins/',
    ai_note: '本頁由公開科普與學術綜述入口整理，只供對照深時間。',
  });
  addEntry(bag, 'origins', 'body', '人類起源時間線', '約七百萬年前起', 10, `${ORIGINS_BODY}\n\n## 與地球生命、文明編年的連續\n\n地球生命頁寫到約七百萬年前的人族分途為止。本頁從那裡接上，寫化石、石器與基因組所能支持的約略過程，直到全新世農業的門口。文明編年的開篇只保留銜接所需的窗口，深時間的細節留在這裡。兩頁前後相接，不把同一段故事寫成兩套互相否定的年表。新測年仍可能把節點前移或後移；有爭議的地方繼續標明，不為了故事完整而刪去。`);
  addEntry(bag, 'origins', 'sources', '參考與研究入口', '來源', 20, ORIGINS_SOURCES);

  addThread(bag, {
    id: 'chronicle',
    slug: 'chronicle',
    title: CHRONICLE_TITLE,
    lede: `${CHRONICLE_LEDE}\n\n${CHRONICLE_HOW}\n\n能量、信息、制度與貨幣仍是閱讀時可以放在心裡的四條線索。它們是敘事裡的基礎設施，不是頁面上的篩選按鈕。古、今、未來三節順序閱讀；未來一節只開門，條件句的全文在總覽的展望。`,
    sort_key: 50,
    path: '/civilization/chronicle/',
    ai_note: '本頁由公開博物館與國際組織頁面整合，僅供研究與編輯對照；年代均為約數。',
  });
  addEntry(bag, 'chronicle', 'ch-ancient', '古', CHRONICLE_CHAPTERS[0]?.era ?? '', 5, [
    '卷一寫採集到商路。深時間的化石與基因組仍以人類起源長文為準，這裡只保留文明得以積累的那些窗口。五節前後相接：用火與語言、定居與剩餘、城市與文字、跨區域的制度與金屬貨幣、然後是造紙、印刷與遠距貿易。',
    CHRONICLE_CHAPTERS[0]?.lede ?? '',
  ].join('\n\n'));
  CHRONICLE_STAGES.forEach((stage) => {
    const blocks = CHRONICLE_MILESTONE_BLOCKS[stage.n] ?? [];
    const deep = blocks.map((block) => weaveFacts({
      detail: `${block.event}。${block.eventDetail}`,
      products: block.products,
      drivers: block.drivers,
      impact: block.impact,
    })).join('\n\n');
    const ownSources: NamedUrl[] = [
      { name: stage.sourceName, url: stage.sourceUrl },
      ...(stage.moreSources ?? []),
    ];
    for (const block of blocks) {
      if (block.sourceName && block.sourceUrl) ownSources.push({ name: block.sourceName, url: block.sourceUrl });
    }
    const origin = stage.origins ? '這一窗口的深時間細節，見[人類起源時間線](/civilization/origins/)。' : '';
    const body = [
      stage.prose,
      `就公共敘事可以對上的事物而言，包括${stage.milestones.join('、')}。把這一節收成一句：${stage.meaning}`,
      deep,
      patternBody(stage.n),
      caseBody('/civilization/chronicle/', `stage-${stage.n}`),
      origin,
      stage.mechanismAsk ? `機制問題：${stage.mechanismAsk}` : '',
      CHRONICLE_NEXT[stage.n - 1] ?? '',
      links(ownSources),
    ].filter(Boolean).join('\n\n');
    const sort = stage.n < 6 ? stage.n * 10 : 60 + stage.n * 10;
    addEntry(bag, 'chronicle', `stage-${stage.n}`, stage.name, stage.era, sort, body, ownSources, null, stage.n < 6 ? 'ch-ancient' : 'ch-now');
  });
  for (const row of CHRONICLE_EXTRA_SOURCES) pushSource(bag, 'chronicle', null, row);
  addEntry(bag, 'chronicle', 'ch-now', '今', CHRONICLE_CHAPTERS[1]?.era ?? '', 55, [
    '卷二從科學方法寫到本世紀已經可以核對的工具。新聞標題仍在首頁，不在這一章裡重排。年代在第八節與第九節之間切開，避免把貨幣安排和信息網絡寫成同一段。',
    CHRONICLE_CHAPTERS[1]?.lede ?? '',
  ].join('\n\n'));
  addEntry(bag, 'chronicle', 'ch-future', '未來', '章門', 200, [
    CHRONICLE_CHAPTERS[2]?.lede ?? '',
    '### 展望分域 {#stage-10-bridge}',
    STAGE10_BRIDGE,
    STAGE10_BRIDGE_EXTRA,
    '第十階名為本世紀／當代。編年在此止步，不另立第十一階。條件句分六個方面，全文在[總覽展望](/civilization/#future)：[能量宜居](/civilization/#future-f1)、[信息可信](/civilization/#future-f2)、[制度協作](/civilization/#future-f3)、[生物譜系](/civilization/#future-f4)、[技術能力階](/civilization/#future-f5)、[生存風險](/civilization/#future-f6)。',
    '### 分帶如何閱讀 {#stage-10-bands}',
    LEVEL_LEGEND,
    ...BAND_NOTES.map((note) => note.text),
    '這些句子只說明某一層在記什麼，避免被讀成文明等級。頁面不設合成分數，也不做倒數。',
  ].join('\n\n'));
  addEntry(bag, 'chronicle', 'summary', '四線總結', '總結', 210, `${CHRONICLE_SUMMARY}\n\n${CHRONICLE_BRIDGE}\n\n今日標題見[今日切片](/#slice)。`);

  addThread(bag, {
    id: 'tech',
    slug: 'tech',
    title: TECH_TITLE,
    lede: `${TECH_LEDE}\n\n${TECH_HANDOFF}\n\n本卷沿工具、能源、媒介與知識連續書寫，不重排文明編年，也不再提供階段跳轉。`,
    sort_key: 60,
    path: '/civilization/tech/',
    ai_note: '本頁由公開科普入口整合，年代均為約數。',
  });
  TECH_STAGES.forEach((stage, index) => {
    const chronicle = stage.chronicle ? `若改以能量、信息、制度與貨幣重讀同一段，見[文明編年](/civilization/chronicle/#stage-${stage.chronicle})。` : '';
    const origins = stage.origins ? '化石與基因組仍以[人類起源時間線](/civilization/origins/)為準。' : '';
    const body = [
      stage.prose,
      `可以對上的事物包括${stage.milestones.join('、')}。一句收束：${stage.meaning}`,
      readingBlocks(TECH_READINGS[stage.n]),
      caseBody('/civilization/tech/', `tech-${stage.n}`),
      chronicle,
      origins,
      TECH_NEXT[index] ?? '',
    ].filter(Boolean).join('\n\n');
    addEntry(bag, 'tech', `tech-${stage.n}`, stage.name, stage.era, (index + 1) * 10, body, TECH_SOURCES);
  });
  addEntry(bag, 'tech', 'sources', '來源', '來源', 200, `### 交接編年與今日\n\n${TECH_HANDOFF}見[人類起源時間線](/civilization/origins/)、[文明編年](/civilization/chronicle/)與[城市・基建・民生](/civilization/city/)。\n\n${TECH_SOURCE_NOTE}\n\n${links(TECH_SOURCES)}`, TECH_SOURCES);

  addThread(bag, {
    id: 'city',
    slug: 'city',
    title: CITY_TITLE,
    lede: `${CITY_LEDE}\n\n${CITY_HANDOFF}\n\n香港地標只作本地案例，放在全球城市線之後。本卷不再提供階段跳轉。`,
    sort_key: 70,
    path: '/civilization/city/',
    ai_note: '本頁由公共遺產與博物館頁面整理，年代均為約數。',
  });
  CITY_STAGES.forEach((stage, index) => {
    const chronicle = stage.chronicle ? `城市與文字的四線寫法，見[文明編年](/civilization/chronicle/#stage-${stage.chronicle})。` : '';
    const local = stage.local ? `本地目錄：${CITY_LOCAL_LINKS.map((link) => `[${link.label}](${link.href})`).join('、')}。` : '';
    const body = [
      stage.prose,
      `可以對上的事物包括${stage.milestones.join('、')}。一句收束：${stage.meaning}`,
      readingBlocks(CITY_READINGS[stage.n]),
      chronicle,
      local,
      CITY_NEXT[index] ?? '',
    ].filter(Boolean).join('\n\n');
    addEntry(bag, 'city', `city-${stage.n}`, stage.name, stage.era, (index + 1) * 10, body);
  });
  addEntry(bag, 'city', 'sources', '來源', '來源', 200, `### 交接編年與本地案例\n\n${CITY_HANDOFF}見[科技與發現](/civilization/tech/)、[文明編年](/civilization/chronicle/)與[香港地標](/hk/landmarks/)。\n\n${CITY_SOURCE_NOTE}\n\n${links(CITY_SOURCES)}`, CITY_SOURCES);

  addThread(bag, {
    id: 'future',
    slug: 'future',
    title: '展望',
    lede: `${FUTURE_OPENING}\n\n這裡是連續的說明文字，不是分域卡片、成熟度階梯或倒數時鐘。六個方面各自回答一件事。日期過了的檢查點改讀下一份公開報告，頁面不保留秒針，也不寫只剩多少天。`,
    sort_key: 80,
    path: '/civilization/#future',
    ai_note: '展望由公開機構頁面整理，標明約、示意或假說。不另開網址。',
  });
  addEntry(bag, 'future', 'future', '展望', '條件句', 1, `${FUTURE_OPENING}\n\n${FUTURE_DOMAINS.map((domain) => `[${domain.title}](#${domain.anchor})`).join('、')}。`);
  FUTURE_DOMAINS.forEach((domain, index) => {
    const instances = FUTURE_INSTANCES.filter((card) => card.domainId === domain.id);
    const horizons = FUTURE_HORIZONS.filter((row) => row.domainId === domain.id);
    const also = FUTURE_HORIZONS.filter((row) => row.alsoDomainId === domain.id);
    const instanceText = instances.map((card) => {
      const tier = FUTURE_TIER_ROWS.find((row) => row.tier === card.tierId);
      const band = card.bands.length
        ? `圖例上可標${card.bands.map((item) => `${item.startsWith('e') ? '能量帶' : item.startsWith('i') ? '信息帶' : '能動帶'} ${item}`).join('、')}，各帶不換算，也不相加。`
        : '';
      return [
        `### ${card.title} {#${card.anchor}}`,
        card.blurb,
        `機制是：${card.mechanism}`,
        card.contingency ?? '',
        `成熟度取「${tier?.label ?? card.tierId}」，記號為「${tier?.mark ?? '約'}」，彙編日期 ${card.dataAsOf}。${band}這不是名次。`,
        links(card.sources.map((source) => ({ name: `${source.name}${source.scope ? `（${source.scope}）` : ''}`, url: source.url }))),
      ].filter(Boolean).join('\n\n');
    }).join('\n\n');
    const horizonText = horizons.map((row) => {
      const kind = row.kind ? HORIZON_KIND[row.kind] ?? row.kind : '';
      const family = row.band.startsWith('e') ? '能量帶' : row.band.startsWith('i') ? '信息帶' : '能動帶';
      return [
        `### ${row.title} {#${row.anchor}}`,
        `這一則放在${family} ${row.band}${kind ? `，種類是${kind}` : ''}${row.timeBand ? `，時間帶 ${row.timeBand}` : ''}。信心標為${CONFIDENCE[row.confidence] ?? row.confidence}。日期戳 ${row.dataAsOf}。時間帶不是等級。`,
        `機制：${row.mechanism}`,
        `緩解：${row.mitigation}`,
        `不確定：${row.uncertainty}`,
        links(row.sources),
      ].join('\n\n');
    }).join('\n\n');
    const alsoText = also.length
      ? `並見${also.map((row) => `[${row.title}](#${row.anchor})`).join('、')}。那些段落寫在各自的主域裡，這裡不重複。`
      : '';
    const body = [domain.blurb, instanceText, horizonText, alsoText].filter(Boolean).join('\n\n');
    addEntry(bag, 'future', domain.anchor, domain.title, domain.code, (index + 1) * 10, body, [], null, 'future');
  });
  addEntry(bag, 'future', FUTURE_TIER_CARD.anchor, FUTURE_TIER_CARD.title, '成熟度', 80, [
    FUTURE_TIER_CARD.note,
    ...FUTURE_TIER_ROWS.filter((row) => row.shown).map((row) => `${row.mark ?? ''} ${row.label}。${row.blurb}`),
    '文明尺度一檔留在說明裡，不畫成可以攀登的等級，也不與前三檔相加。',
  ].join('\n\n'), [], null, 'future');
  addEntry(bag, 'future', 'future-bands', '分帶如何閱讀', '圖例', 85, [LEVEL_LEGEND, ...BAND_NOTES.map((note) => note.text)].join('\n\n'), [], null, 'future');
  FUTURE_COUNTDOWNS.forEach((item, index) => {
    const horizon = FUTURE_HORIZONS.find((row) => row.id === item.horizonId);
    const back = horizon ? `對照[${horizon.title}](#${horizon.anchor})。` : '';
    addEntry(bag, 'future', item.anchor, item.title, item.checkpoint, 90 + index, [
      `檢查點日期是 ${item.checkpoint}。這是機構窗口，不是災變時鐘。${back}`,
      item.pending,
      '日期過後改讀下一份公開報告。頁面不顯示秒針，也不寫只剩多少天。',
    ].join('\n\n'), [], null, 'future');
  });
  addEntry(bag, 'future', FUTURE_CLADE.anchor, FUTURE_CLADE.title, '譜系', 100, [
    `這裡同時看${FUTURE_CLADE.kinds.map((kind) => CLADE_KIND[kind] ?? kind).join('與')}。`,
    `邊界：${FUTURE_CLADE.boundary}`,
    ...FUTURE_CLADE.layers.map((layer) => `### ${layer.title}\n\n${layer.text}`),
  ].join('\n\n'), [], null, 'future');

  return bag;
}

function threadPlain(bag: Bag, threadId: string): string {
  const thread = bag.threads.find((item) => item.id === threadId);
  const entries = bag.entries.filter((item) => item.thread_id === threadId);
  return [thread?.title ?? '', thread?.lede ?? '', ...entries.flatMap((item) => [item.title, item.body])].join('\n');
}

export function buildChronicleDb(): ChronicleDb {
  const bag = buildBag();
  const before: Record<string, number> = {
    cosmos: cjkChars(cosmosProse()),
    galaxy: cjkChars(galaxyProse()),
    earth: cjkChars(earthProse()),
    origins: cjkChars(`${ORIGINS_BODY}\n${ORIGINS_SOURCES}`),
    chronicle: cjkChars(chronicleProse()),
    tech: cjkChars(techProse()),
    city: cjkChars(cityProse()),
    future: cjkChars([
      FUTURE_OPENING,
      ...FUTURE_DOMAINS.map((domain) => domain.blurb),
      ...FUTURE_INSTANCES.flatMap((card) => [card.title, card.blurb, card.mechanism, card.contingency ?? '']),
      ...FUTURE_HORIZONS.flatMap((row) => [row.title, row.mechanism, row.mitigation, row.uncertainty]),
      ...FUTURE_COUNTDOWNS.flatMap((item) => [item.pending, item.expired]),
      FUTURE_CLADE.boundary,
      ...FUTURE_CLADE.layers.flatMap((layer) => [layer.title, layer.text]),
      LEVEL_LEGEND,
      ...BAND_NOTES.map((note) => note.text),
    ].join('\n')),
  };
  const meta = [
    { key: 'version', value: VERSION },
    { key: 'generated_at', value: GENERATED_AT },
    { key: 'note', value: '文本優先。架構暫刪。等內容夠厚再談重搭。' },
  ];
  for (const thread of bag.threads) {
    const after = cjkChars(threadPlain(bag, thread.id));
    meta.push({ key: `before_${thread.id}`, value: String(before[thread.id] ?? 0) });
    meta.push({ key: `after_${thread.id}`, value: String(after) });
  }
  meta.push({ key: 'threads', value: String(bag.threads.length) });
  meta.push({ key: 'entries', value: String(bag.entries.length) });
  meta.push({ key: 'sources', value: String(bag.sources.length) });
  const db: ChronicleDb = {
    meta,
    threads: bag.threads,
    entries: bag.entries,
    sources: bag.sources,
  };
  const banned = JSON.stringify(db).match(BANNED);
  if (banned) throw new Error(`banned token in chronicle db: ${banned[0]}`);
  return db;
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function seedSql(db: ChronicleDb = buildChronicleDb()): string {
  const lines = [
    '-- Generated from shared/civilization/db/seed.json. Apply migrations/0001_chronicle.sql first.',
    'DELETE FROM sources;',
    'DELETE FROM entries;',
    'DELETE FROM threads;',
    'DELETE FROM meta;',
  ];
  for (const thread of db.threads) {
    lines.push(`INSERT INTO threads (id, slug, title, lede, sort_key, path, ai_note) VALUES (${sqlString(thread.id)}, ${sqlString(thread.slug)}, ${sqlString(thread.title)}, ${sqlString(thread.lede)}, ${thread.sort_key}, ${sqlString(thread.path)}, ${sqlString(thread.ai_note)});`);
  }
  for (const entry of db.entries) {
    lines.push(`INSERT INTO entries (id, thread_id, slug, title, summary, body, sort_key, time_label, parent_slug, also_id) VALUES (${sqlString(entry.id)}, ${sqlString(entry.thread_id)}, ${sqlString(entry.slug)}, ${sqlString(entry.title)}, ${sqlString(entry.summary)}, ${sqlString(entry.body)}, ${entry.sort_key}, ${sqlString(entry.time_label)}, ${entry.parent_slug ? sqlString(entry.parent_slug) : 'NULL'}, ${entry.also_id ? sqlString(entry.also_id) : 'NULL'});`);
  }
  for (const source of db.sources) {
    lines.push(`INSERT INTO sources (thread_id, entry_slug, name, url, note) VALUES (${sqlString(source.thread_id)}, ${source.entry_slug ? sqlString(source.entry_slug) : 'NULL'}, ${sqlString(source.name)}, ${sqlString(source.url)}, ${sqlString(source.note)});`);
  }
  for (const row of db.meta) {
    lines.push(`INSERT INTO meta (key, value) VALUES (${sqlString(row.key)}, ${sqlString(row.value)});`);
  }
  return `${lines.join('\n')}\n`;
}
