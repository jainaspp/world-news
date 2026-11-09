import { cjkChars } from '../../contentPage.js';
import { CASE_STUDIES } from '../cases.js';
import { CHRONICLE_BRIDGE, CHRONICLE_CHAPTERS, CHRONICLE_EXTRA_SOURCES, CHRONICLE_HOW, CHRONICLE_LEDE, CHRONICLE_STAGES, CHRONICLE_SUMMARY, CHRONICLE_TITLE, chronicleProse } from '../chronicle.js';
import { CHRONICLE_MILESTONE_BLOCKS } from '../chronicleMilestones.js';
import { CITY_HANDOFF, CITY_LEDE, CITY_LOCAL_LINKS, CITY_SOURCE_NOTE, CITY_SOURCES, CITY_STAGES, CITY_TITLE, cityProse } from '../city.js';
import { CITY_READINGS } from '../content/cityReadings.js';
import { COUNTDOWN_LEAD, FUTURE_LONGFORM } from '../content/futureLongform.js';
import { EARTH_HANDOFF, EARTH_LEDE, EARTH_SOURCE_NOTE, EARTH_SOURCES, EARTH_STAGES, EARTH_TITLE, earthProse } from '../earth.js';
import { BAND_NOTES, FUTURE_CLADE, FUTURE_COUNTDOWNS, FUTURE_DOMAINS, FUTURE_HORIZONS, FUTURE_INSTANCES, FUTURE_OPENING, FUTURE_TIER_CARD, FUTURE_TIER_ROWS, LEVEL_LEGEND, STAGE10_BRIDGE, STAGE10_BRIDGE_EXTRA } from '../future.js';
import { COSMOS_HANDOFF, COSMOS_LEDE, COSMOS_SCALES, COSMOS_SOURCE_NOTE, COSMOS_SOURCES, COSMOS_STAGES, COSMOS_TITLE, cosmosProse } from '../cosmos.js';
import { GALAXY_COSMOS_LINKS, GALAXY_LEDE, GALAXY_NOTES, GALAXY_QUESTIONS, GALAXY_SOURCES, GALAXY_STAGES, GALAXY_TITLE, HANDOFF_BRIDGE, galaxyProse } from '../galaxy.js';
import { COSMOS_GAP, EARTH_GAP, GALAXY_GAP, LATE_ENTRIES, ORIGINS_GAP } from '../content/thickenGap.js';
import { CITY_BULK, COSMOS_BULK, FUTURE_BULK, GALAXY_BULK, ORIGINS_BULK } from '../content/thickenBulk.js';
import { COSMOS_LAST, GALAXY_LAST, ORIGINS_LAST } from '../content/thickenLast.js';
import { CITY_FILL, COSMOS_FILL, FUTURE_FILL, GALAXY_FILL, ORIGINS_FILL } from '../content/thickenFill.js';
import { EARTH_HABITABILITY } from '../content/thickenEarth.js';
import { COSMOS_THICK, GALAXY_THICK, HANDOFF_CARD, SCALE_BEAT } from '../content/thickenEarly.js';
import { ORIGINS_NODE_MATRIX, ORIGINS_THICK, ORIGINS_ZOOM } from '../content/thickenOrigins.js';
import { ORIGINS_BODY, ORIGINS_SOURCES } from '../originsSource.js';
import { CHRONICLE_FIGURES } from './figures.js';
import { PATTERN_CARDS } from '../patterns.js';
import { TECH_HANDOFF, TECH_LEDE, TECH_SOURCE_NOTE, TECH_SOURCES, TECH_STAGES, TECH_TITLE, techProse } from '../tech.js';
import { TECH_READINGS } from '../content/techReadings.js';
import type { CivDriver, CivProduct } from '../contract.js';
import type { ChronicleDb, ChronicleEntry, ChronicleSource, ChronicleThread } from './types.js';

const BANNED = /台灣|臺灣|台海|臺海|台湾|xAI|Grok/;
const VERSION = '2026-11-07-text-first-thick';
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

const TECH_NOTE = [
  '奧杜威石片與後來的兩面器常常不在同一層。層一錯，就不能排成連續升級。東非與南非的石料也不一樣，一件標本代表不了所有層位。混層以後，廢片不能再給石核排順序。',
  '有的灰燼層後來被改讀成自然火。層位還在，解釋要重寫。燒骨單獨出現時，燃料種類讀不出來。這是保存證據。加厚的灰只證明位置，不證明有人輪值。',
  '採集路線裡的地點詞隔夜可能換成另一個地名。換過以後沒有頁邊可批。這是傳播限度。聽的人離開以後，沒有第二份可以把詞改回來。',
  '一枚封泥對得上罐子，對不上星的高度。倉儲的核對與天空的核對不是同一種動作。星的高度要靠儀器，不靠倉庫的封條。封泥在，星星的位置並不因此被記下。',
  '早期天文管子的口徑只有幾厘米。下一位若磨不出相近的鏡片，上一次觀看就不能重做。口徑可以寫在說明上，鏡片不在就沒有那一次觀看。說明書留着，不等於今夜還能對上同一顆星。',
  '分離凝汽器改的是熱留在汽缸外還是留在裡面。機器停轉時，圖紙還在，功不在。備件沒有到，功率數字就只是銘牌上的字。銘牌不記載今天燒了多少煤。',
  '約公元八六八年的一卷金剛經能對上刻版。它對不上後來一座城市裡報紙的截稿時刻。截稿過了，錯字已經在街上，刻版並不跟著改。街上的那一份，不會自己回到刻版上改正。',
  '點和劃要兩端都認得。一端不認得，線上剩下的只是電流，收報的人無句可讀。電話多了一層聲音，線路斷時聲音同樣消失。斷開以後，速度沒有留在機器裡。',
  '公開簡史寫的是萬維網公開的那幾年。某一頁被撤下之後，簡史還在，那一頁上的句子不在。檢索得到地址，不等於檢索得到當時的原文。地址簿不能代替那一頁。',
  '只寫「突破」二字的標題，若指不出器物、燃料、媒介或可翻回去的記錄，就不替它補一個座標。出處若只寫本站，也不算核對過更早的記錄。沒有出處的句子就停在新聞裡。',
];

const TECH_NEXT = [
  '自然火和有地址的燃燒要分開。人在不在場，不是刃口能回答的事。灰和石片若不同層，就不能寫成同一天的兩件事。',
  '地名隔夜會換。灰層裡沒有那個地名，也沒有第二份口述。燒土不能把換過的地名改回來。',
  '倉庫的封條對得上罐子以後，錯才留在物件上，不再只靠記得的人。人離開了，罐子上的那一行還在。',
  '星的位置要靠可重做的刻度。倉庫的封條對不上天空，那是下一層才要分開的兩種核對。刻度沒有重做，星圖就只是一張圖。',
  '功能不能送出城，不由鏡片決定。印刷的年代更早，也不從管子裡長出來。鏡片不在的那一夜，並沒有測到可以送走的功。',
  '印張便宜是另一筆帳，年代也更早。它不從鍋爐的功率裡長出來。鍋爐停着，別處的印張仍可以便宜。',
  '印得便宜的那一頁，交通仍限制它哪一天到城裡。電波不是印張的延長。截稿前沒有對過的字，到了城裡也不會自己變對。',
  '電報要雙方都懂的碼。不懂的碼只是電流，不是消息。線路恢復以前，沒有一句話留在電流裡。',
  '連結可以指向一頁已經撤下的文件。撤下之後，地址還在，句子不在。簡史不能把撤下的那一頁補回去。',
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
  '本地案例之後，今日的城市標題仍只是薄層。工具與能源如何走到街上，見〈科技與發現〉第二節用火、第六節工業能量與第八節電氣；能量、信息、制度與貨幣四線如何重讀城市，見〈文明編年〉。',
];

const COSMOS_NEXT = [
  '暴脹與熱密開端留下的，是後續一切結構的能量與時間條件。數分鐘之內，輕核才成為恆星燃料的物質起點。',
  '輕核的比例若與今日觀測相合，才談得上後來的恆星。宇宙對光透明之後，第一代恆星才有黑暗時代的終點。',
  '第一代恆星把重元素送進氣體。沒有這一步，後來的星系只是引力骨架，化學還無從開始。',
  '星系網穩下來之後，其中一片氣體雲才可能在約四十六億年前塌成太陽與行星。銀河系這一座棒旋星系的特寫，另見銀河系誕生。',
  '原行星盤、吸積與遷移見銀河卷的太陽系誕生。地球表面的水與生命不在本卷展開。',
  '此後的水與地殼，詳敘見地球生命。',
  '生命化學的路徑假說並存，詳敘見地球生命，本卷不展開。',
  '氧與大氣的岩層證據見地球生命。',
  '可保存的身體與後來的生物圈見地球生命。約七百萬年前的人族分途見人類起源。',
];

const EARTH_NEXT = [
  '含氧的水體與大氣準備好化學餘地之後，寒武紀要寫的是身體構型與捕食如何進入化石記錄。那是地質時間上的相對加快，不是一日之內的事件。',
  '海洋食物網成立之後，古生代把初級生產推上陸地。森林、有頜魚類與四足動物是這一長段的主線，二疊紀末的類群更替只記自然史後果。',
  '陸地生態已經在場。三疊紀是災後的重新組織，也是侏羅紀的直接前鄰。早期恐龍出現，卻尚未在許多陸相群落裡獨佔優勢。',
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

let formulaLeft = 2;

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
  /** Tech readings state each condition in its own words. Chronicle keeps the older frame. */
  bare?: boolean;
}): string {
  const productText = input.products.map((item) => `${item.name}：${item.detail}`).join('');
  const driverText = input.drivers.map((item) => (
    input.bare ? `${item.name}。${item.detail}` : `${item.name}方面，${item.detail}`
  )).join('');
  const useFormula = !input.bare && formulaLeft > 0 && Boolean(productText);
  if (useFormula) formulaLeft -= 1;
  const productPara = productText
    ? (useFormula ? `就當時可以留下來、也可以事後核對的事物而言，${productText}` : productText)
    : '';
  const driverPara = driverText
    ? (input.bare ? driverText : `推動這一步的條件，可以分開看。${driverText}`)
    : '';
  return [input.detail, productPara, driverPara, input.impact].filter(Boolean).join('\n\n');
}

function patternBody(stageN: number): string {
  const cards = PATTERN_CARDS.filter((card) => card.anchor.endsWith(`#stage-${stageN}`));
  return cards.map((card) => {
    const products = card.products.map((item) => `${item.name}。${item.detail}`).join('\n\n');
    const drivers = card.drivers.map((item) => `${item.name}。${item.detail}`).join('\n\n');
    return [
      `### ${card.title} {#pattern-${card.id}}`,
      `這一節裡的機制是「${card.title}」。`,
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

function addEntry(bag: Bag, threadId: string, slug: string, title: string, time: string, sort: number, body: string, sources: readonly NamedUrl[] = [], alsoId: string | null = null, parent: string | null = null, summary?: string): void {
  const text = body.trim();
  bag.entries.push({
    id: `${threadId}:${slug}`,
    thread_id: threadId,
    slug,
    title,
    summary: summary ?? summaryOf(text),
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

function closeMilestones(milestones: readonly string[], meaning: string, keepFormula: boolean): string {
  if (keepFormula) return `就公共敘事可以對上的事物而言，包括${milestones.join('、')}。把這一節收成一句：${meaning}`;
  const [first, ...rest] = milestones;
  const restText = rest.length ? `，並一併寫到${rest.join('、')}` : '';
  return `${meaning}落到具體歷史上，是${first ?? ''}${restText}。`;
}

function readingBlocks(readings: readonly { event: string; eventDetail: string; products: readonly CivProduct[]; drivers: readonly CivDriver[]; impact: string }[] | undefined, bare = false): string {
  if (!readings?.length) return '';
  return readings.map((reading) => [`### ${reading.event}`, weaveFacts({
    detail: reading.eventDetail,
    products: reading.products,
    drivers: reading.drivers,
    impact: reading.impact,
    bare,
  })].join('\n\n')).join('\n\n');
}

/** Tech stages do not share one paragraph order. City readings stay on readingBlocks. */
function techReading(n: number, readings: readonly { event: string; eventDetail: string; products: readonly CivProduct[]; drivers: readonly CivDriver[]; impact: string }[] | undefined): string {
  if (!readings?.length) return '';
  return readings.map((reading) => {
    const head = `### ${reading.event}`;
    const products = reading.products.map((item) => `${item.name}：${item.detail}`).join('\n\n');
    const drivers = reading.drivers.map((item) => `${item.name}。${item.detail}`).join('\n\n');
    const order: Record<number, string[]> = {
      1: [head, products, reading.eventDetail, drivers, reading.impact],
      2: [head, products, drivers, reading.eventDetail, reading.impact],
      3: [head, reading.eventDetail, drivers, products, reading.impact],
      4: [head, products, drivers, reading.eventDetail, reading.impact],
      5: [head, products, drivers, reading.eventDetail, reading.impact],
      6: [head, products, drivers, reading.eventDetail, reading.impact],
      7: [head, products, reading.eventDetail, drivers, reading.impact],
      8: [head, drivers, products, reading.eventDetail, reading.impact],
      9: [head, products, reading.eventDetail, drivers, reading.impact],
      10: [head, reading.eventDetail, products, drivers, reading.impact],
    };
    return (order[n] ?? order[10]).join('\n\n');
  }).join('\n\n');
}

function buildBag(): Bag {
  formulaLeft = 2;
  const bag: Bag = { threads: [], entries: [], sources: [] };

  addThread(bag, {
    id: 'cosmos',
    slug: 'cosmos',
    title: COSMOS_TITLE,
    lede: `${HANDOFF_CARD.cosmos}\n\n${COSMOS_LEDE}\n\n閱讀時按時間往下走：從熱密開端到輕核、第一代恆星、星系網，再交到銀河如何組裝。地球的水、氧與生命詳敘見地球生命。年代寫作約數。`,
    sort_key: 10,
    path: '/civilization/cosmos/',
    ai_note: '本頁由公開科普與主流綜述入口整合，僅供研究與編輯參考。',
  });
  COSMOS_STAGES.forEach((stage, index) => {
    const next = COSMOS_NEXT[index] ?? '';
    const body = [stage.prose, next].filter(Boolean).join('\n\n');
    const summary = `${stage.era}：${stage.meaning}可核對的範圍停在主流綜述，不把單一模型寫成定論。`;
    addEntry(bag, 'cosmos', `cosmo-${stage.n}`, stage.name, stage.era, (index + 1) * 10, body, COSMOS_SOURCES, null, null, summary);
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
    lede: `${HANDOFF_CARD.galaxy}\n\n${GALAXY_LEDE}\n\n本頁先定義星系，再寫形成與從盤內看到的結構，然後寫太陽系誕生。詞義旁註與地球生命的交接放在其後。年代、直徑與質量一律為約。`,
    sort_key: 20,
    path: '/civilization/galaxy/',
    ai_note: '本頁由公開科普與主流綜述入口整理，作為文明記載的深時間頁。授權跟隨站級 CC BY 4.0。',
  });
  const galaxyJoin = [
    '定義寫清之後，才談得上這座星系如何在宇宙網的節點裡冷卻成盤。形態標籤是觀測分類，不是價值排序。',
    '形成史給出時間。結構一節改寫我們從盤內如何描繪它：旋臂、棒與暈都是示跡，不是剛體輪輻。',
  ];
  GALAXY_STAGES.forEach((stage, index) => {
    const parts = stage.parts.map((part) => [`### ${part.heading}`, ...part.paragraphs].join('\n\n')).join('\n\n');
    const body = [
      SCALE_BEAT[`galaxy:${stage.id}`] ?? '',
      closeMilestones(stage.milestones, `本節要記住的是：${stage.meaning}`, false),
      parts,
      galaxyJoin[index] ?? '',
    ].filter(Boolean).join('\n\n');
    addEntry(bag, 'galaxy', stage.id, stage.name, stage.era, (index + 1) * 10, body, GALAXY_SOURCES);
  });
  addEntry(bag, 'galaxy', 'notes', '開蒙旁註', '詞義', 40, [
    '下列旁註只解釋詞義與尺度。[開蒙](/learn/)葉頁另備，這裡先留一句，不另做導覽樹。',
    ...GALAXY_NOTES.map((note) => `### ${note.term} {#${note.id}}\n\n${note.text}`),
  ].join('\n\n'));
  addEntry(bag, 'galaxy', 'ask', '今日可問', '問題', 70, [
    '三節正文寫完，還有幾件機制沒有在敘事裡展開完。它們不是一組待辦清單，而是拿著現有觀測仍可以追下去的句子。每一問都對著上面某一節的證據邊界。',
    `轉動曲線為何在盤的外圍仍不下降？${GALAXY_QUESTIONS[0]}可見物質的光已經數過，引力卻像還有一份質量。這份質量幾乎不發光，模型仍在改，問句先停在曲線本身。`,
    `旋臂看起來像固定的輪輻，恆星卻不會永遠停在臂上。${GALAXY_QUESTIONS[1]}密度波只是一種解釋：氣體在臂區被壓縮、形成年輕恆星，恆星隨後離開。臂是示跡，不是剛體。`,
    `同一團氣體裡，重元素多寡並不相同。${GALAXY_QUESTIONS[2]}天文把氫氦以外的元素稱為金屬。豐度高，通常意味著更多世代的恆星已經把產物送回來；它聯繫年齡與誕生環境，卻不是一把可以直接讀出歲數的尺。`,
    `銀河系周圍的衛星星系並不都完整。${GALAXY_QUESTIONS[3]}拉長的恆星流是引力把小星系撕開之後留下的痕跡，用來討論合併，不用來給星系排座次。`,
    `太陽與地球的岩石、水與鐵，都不是原初核合成的產物。${GALAXY_QUESTIONS[4]}前代恆星的核合成、超新星與恆星風，決定了這片分子雲裡有什麼可以凝成行星。化學是原料廠的流水賬，不是地球的出生證明。`,
  ].join('\n\n'));

  addThread(bag, {
    id: 'earth',
    slug: 'earth',
    title: EARTH_TITLE,
    lede: `${HANDOFF_CARD.earth}\n\n${EARTH_LEDE}\n\n各紀按時間前後相接。文內可以從[侏羅紀](#jurassic)一節讀起。宜居門檻寫在各紀之前。年代一律標約，不把單一塊化石寫成全球定論。`,
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
      closeMilestones(stage.milestones, stage.meaning, false),
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
    lede: `${HANDOFF_CARD.origins}\n\n從深時間到解剖學現代人與全球擴張的約略年表。尺度尺在前，正文在後。生成圖像標為示意，真實照片另標授權。`,
    sort_key: 40,
    path: '/civilization/origins/',
    ai_note: '本頁由公開科普與學術綜述入口整理，只供對照深時間。',
  });
  const originsBody = ORIGINS_BODY.replace(
    '# 人類起源時間線：從深時間到今日切片\n\n',
    `# 人類起源時間線：從深時間到今日切片\n\n${ORIGINS_ZOOM}\n\n`,
  );
  const originsWithMatrix = originsBody
    .replace('## 總覽里程碑', '## 總覽里程碑 {#origins-overview}')
    .replace('## 三階段框架（綜述常用）', `${ORIGINS_NODE_MATRIX}\n\n## 三階段框架（綜述常用） {#origins-stages}`)
    .replace('## 各里程碑溫和說明', '### 目錄 {#origins-milestones}\n\n## 各里程碑溫和說明');
  addEntry(bag, 'origins', 'body', '人類起源時間線', '約七百萬年前起', 10, `${originsWithMatrix}\n\n${ORIGINS_THICK}\n\n${ORIGINS_GAP}\n\n${ORIGINS_FILL}\n\n${ORIGINS_BULK}\n\n${ORIGINS_LAST}\n\n## 與地球生命、文明編年的連續\n\n地球生命頁寫到約七百萬年前的人族分途為止。本頁從那裡接上，寫化石、石器與基因組所能支持的約略過程，直到全新世農業的門口。文明編年的開篇只保留銜接所需的窗口，深時間的細節留在這裡。兩頁前後相接，不把同一段故事寫成兩套互相否定的年表。新測年仍可能把節點前移或後移；有爭議的地方繼續標明，不為了故事完整而刪去。`);
  addEntry(bag, 'origins', 'sources', '參考與研究入口', '來源', 20, [
    '這些入口用來核對正文裡的約數，不是另一套年表。公共時間線與博物館頁面適合先建立尺度；學術綜述與關鍵化石研究用來查看仍有爭議的節點。站內的香港科學館與太空館只說明一座城市如何向公眾講解自然史，不取代測年。表中的年份會隨新標本移動。正文已在有分歧處標明，這裡不另造更精確的數字。',
    '文中的三階段框架是化石、石器與基因組的閱讀分層：先看總覽，再看非洲內外的分化與擴張，最後才對照本地的公共科普。它是年表的讀法，隨證據改寫。',
    ORIGINS_SOURCES,
  ].join('\n\n'));

  addThread(bag, {
    id: 'chronicle',
    slug: 'chronicle',
    title: CHRONICLE_TITLE,
    lede: `${HANDOFF_CARD.chronicle}\n\n${CHRONICLE_LEDE}\n\n${CHRONICLE_HOW}\n\n能量、信息、制度與貨幣是閱讀時可以放在心裡的四條線索，用來分辨一節主要改寫了哪一類基礎設施。古、今兩段順序閱讀；未來一節把條件句交到總覽的展望，編年本身停在本世紀已經可以核對的工具。`,
    sort_key: 50,
    path: '/civilization/chronicle/',
    ai_note: '本頁由公開博物館與國際組織頁面整合，僅供研究與編輯對照；年代均為約數。',
  });
  addEntry(bag, 'chronicle', 'ch-ancient', '古', CHRONICLE_CHAPTERS[0]?.era ?? '', 5, [
    '古這一段從用火與語言寫到商路。時間跨度最長，證據也最不整齊：前兩節的化石、火塘與基因組細節在人類起源長文，這裡只保留文明得以積累的窗口。',
    '人先學會把熱留在營地旁邊，再用語言把不在場的步驟說給別人聽。全新世的氣候相對穩定之後，多地才把這種經驗用在作物與牲畜上。剩餘糧食使一部分人可以不親自耕作，倉儲與分工才有地方生長。城市把倉儲、清單與契約壓進泥板，記錄第一次可以離開說話的人。跨區域的道路、鑄幣與成文法把同一套規則送到陌生人面前。造紙、印刷與海港則讓知識和支付走得更遠。',
    '五節前後相接：用火與語言、定居與剩餘、城市與文字、跨區域的制度與金屬貨幣，然後是造紙、印刷與遠距貿易。讀的時候按這個順序。每一節改寫的基礎設施並不相同，能量、信息、制度與貨幣四線只是幫讀者記住差別。',
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
    const milestoneLine = stage.milestones.length
      ? `${stage.milestones.join('、')}寫在這一段裡。`
      : '';
    const body = [
      SCALE_BEAT[`chronicle:${stage.n}`] ?? '',
      stage.prose,
      milestoneLine,
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
    '今這一段從可重複的觀察寫到本世紀已經進入公共頁面的工具。科學方法把一部分知識權威改放到證據上。蒸汽、鐵路與電報同時抬高功率與消息的速度。',
    '全球貨幣安排收到約一九六九年，避免與後來的信息網絡疊成同一段年代。分組交換與萬維網把複製的成本再降一次，卻還沒有把約二零一零年以後的通用工具算進前一節。最後一節只寫測量、支付、測序與氣候說明裡已經可以核對的部分。新聞標題仍在首頁，不在這一章裡重排。',
    CHRONICLE_CHAPTERS[1]?.lede ?? '',
  ].join('\n\n'));
  addEntry(bag, 'chronicle', 'ch-future', '未來', '章門', 200, [
    '未來這一節是章門。編年寫到本世紀已經可以核對的工具為止；往後的句子改成條件句，分六個方面寫在總覽的展望裡。能量宜居問功率受什麼收支約束，信息可信問底本靠什麼留下，制度協作問規則如何維修，生物譜系問延續而不分高下，技術能力階問證據成熟到哪一檔，生存風險問風險如何被事後核對。',
    '六個方面各有自己的機制與日期戳。氣候評估、生物多樣性盤點、耐藥性自評與淡水進度不是同一份日曆，全文不在編年裡複製。下面只把門打開，指到總覽裡已經寫好的各節。',
    CHRONICLE_CHAPTERS[2]?.lede ?? '',
    '### 展望分域 {#stage-10-bridge}',
    STAGE10_BRIDGE,
    STAGE10_BRIDGE_EXTRA,
    '第十階名為本世紀／當代。編年在此止步，不另立第十一階。條件句分六個方面，全文在[總覽展望](/civilization/#future)：[能量宜居](/civilization/#future-f1)、[信息可信](/civilization/#future-f2)、[制度協作](/civilization/#future-f3)、[生物譜系](/civilization/#future-f4)、[技術能力階](/civilization/#future-f5)、[生存風險](/civilization/#future-f6)。',
    '### 分帶如何閱讀 {#stage-10-bands}',
    LEVEL_LEGEND,
    ...BAND_NOTES.map((note) => note.text),
    '這些句子只說明某一層在記什麼，避免被讀成文明等級。各帶不換算，也不相加成一個分數。',
  ].join('\n\n'));
  addEntry(bag, 'chronicle', 'summary', '四線總結', '總結', 210, `${CHRONICLE_SUMMARY}\n\n${CHRONICLE_BRIDGE}\n\n今日標題見[今日切片](/#slice)。`);

  addThread(bag, {
    id: 'tech',
    slug: 'tech',
    title: TECH_TITLE,
    lede: `${HANDOFF_CARD.tech}\n\n${TECH_LEDE}\n\n${TECH_HANDOFF}\n\n本卷沿工具、能源、媒介與知識往下寫。印刷與工業能量兩節按主題並置：活字與報刊的年代早於蒸汽工廠，正文在這兩節寫明，節次不是嚴格年序。十節的停法各不相同：石器停在打擊角，用火停在分不清的灰，口傳停在改過的詞，文字停在對不上的一行，儀器停在重畫的圖，能量停在停轉的機器，印刷停在已經出門的錯字，電報停在斷掉的線，網絡停在撤下的頁，新聞停在沒有出處的標題。前三節的推進也不相同：石器看層位裡的物件，用火看熱留下的痕跡，口傳看沒有第二份可對的句子。`,
    sort_key: 60,
    path: '/civilization/tech/',
    ai_note: '本頁由公開科普入口整合，年代均為約數。',
  });
  TECH_STAGES.forEach((stage, index) => {
    const chronicle = stage.chronicle ? `若改用能量、信息、制度與貨幣重讀同一段，見〈文明編年〉第${stage.chronicle}節（[文明編年](/civilization/chronicle/#stage-${stage.chronicle})）。` : '';
    const origins = stage.origins ? '化石與基因組仍以[人類起源時間線](/civilization/origins/)為準。' : '';
    const chrono = stage.n === 6
      ? '本卷從這一節起按主題並置，不是嚴格年序。蒸汽與電力的窗口約在一七六〇至一九一四年；活字與報刊約在一四五〇至一九〇〇年，年代更早，卻放在下一節，因為下一節收的是媒介，這一節收的是能量。兩段年份互相重疊，節次不表示因果。'
      : stage.n === 7
        ? '印刷與報刊的年代早於上一節的工業能量。東亞雕版更早於歐洲金屬活字。把它們排在工業能量之後，是媒介主題跟在能源主題後面，屬於並置，不是年表上的先後。'
        : '';
    const beat = SCALE_BEAT[`tech:${stage.n}`] ?? '';
    const miles = stage.milestones.length ? `${stage.milestones.join('、')}。` : '';
    const read = techReading(stage.n, TECH_READINGS[stage.n]);
    const next = TECH_NEXT[index] ?? '';
    const note = TECH_NOTE[index] ?? '';
    const filed = caseBody('/civilization/tech/', `tech-${stage.n}`);
    const order: Record<number, string[]> = {
      1: [read, note, stage.prose, origins, next],
      2: [read, note, stage.prose, chronicle, next],
      3: [read, stage.prose, note, next],
      4: [read, note, chronicle, stage.prose, miles, next],
      5: [beat, note, read, next, stage.prose, chronicle],
      6: [beat, chrono, note, read, next, stage.prose, chronicle],
      7: [chrono, note, filed, read, stage.prose, next],
      8: [note, read, next, stage.prose, miles],
      9: [stage.prose, read, note, chronicle, next],
      10: [note, next, stage.prose, read, miles],
    };
    const body = (order[stage.n] ?? []).filter(Boolean).join('\n\n');
    addEntry(bag, 'tech', `tech-${stage.n}`, stage.name, stage.era, (index + 1) * 10, body, TECH_SOURCES);
  });
  addEntry(bag, 'tech', 'sources', '來源', '來源', 200, [
    '### 交接編年與今日',
    '工具、能源、媒介與知識寫到今日的新聞切片為止。化石與譜系見〈人類起源時間線〉；若改用能量、信息、制度與貨幣重讀，見〈文明編年〉各節；街道與場館見〈城市・基建・民生〉。印刷在第七節，工業能量在第六節，兩節並置，讀年表時以各節標明的年份為準。',
    `${TECH_HANDOFF}見[人類起源時間線](/civilization/origins/)、[文明編年](/civilization/chronicle/)與[城市・基建・民生](/civilization/city/)。`,
    TECH_SOURCE_NOTE,
    links(TECH_SOURCES),
  ].join('\n\n'), TECH_SOURCES);

  addThread(bag, {
    id: 'city',
    slug: 'city',
    title: CITY_TITLE,
    lede: `${HANDOFF_CARD.city}\n\n${CITY_LEDE}\n\n${CITY_HANDOFF}\n\n香港的碼頭、隧道與場館只作本地案例，放在全球城市線之後。工具與能源見〈科技與發現〉第二節、第六節與第八節；四線如何重讀城市與文字，見〈文明編年〉。`,
    sort_key: 70,
    path: '/civilization/city/',
    ai_note: '本頁由公共遺產與博物館頁面整理，年代均為約數。',
  });
  CITY_STAGES.forEach((stage, index) => {
    const chronicle = stage.chronicle ? `能量、信息、制度與貨幣四線裡，這一節見〈文明編年〉第${stage.chronicle}節（[文明編年](/civilization/chronicle/#stage-${stage.chronicle})）。` : '';
    const local = stage.local ? `本地目錄：${CITY_LOCAL_LINKS.map((link) => `[${link.label}](${link.href})`).join('、')}。` : '';
    const body = [
      SCALE_BEAT[`city:${stage.n}`] ?? '',
      stage.prose,
      closeMilestones(stage.milestones, stage.meaning, false),
      readingBlocks(CITY_READINGS[stage.n]),
      chronicle,
      local,
      CITY_NEXT[index] ?? '',
    ].filter(Boolean).join('\n\n');
    addEntry(bag, 'city', `city-${stage.n}`, stage.name, stage.era, (index + 1) * 10, body);
  });
  addEntry(bag, 'city', 'sources', '來源', '來源', 200, [
    '### 交接編年與本地案例',
    '全球城市線從定居寫到照明與本地案例。工具與能源如何走到街上，見〈科技與發現〉[第二節用火](/civilization/tech/#tech-2)、[第六節工業能量](/civilization/tech/#tech-6)與[第八節電氣](/civilization/tech/#tech-8)。四線如何重讀城市與文字，見〈文明編年〉第三節。香港地標只作可以走進去的例子，不代替整頁。',
    `${CITY_HANDOFF}見[科技與發現](/civilization/tech/)、[文明編年](/civilization/chronicle/)與[香港地標](/hk/landmarks/)。`,
    CITY_SOURCE_NOTE,
    links(CITY_SOURCES),
  ].join('\n\n'), CITY_SOURCES);

  addThread(bag, {
    id: 'future',
    slug: 'future',
    title: '展望',
    lede: `${HANDOFF_CARD.future}\n\n${FUTURE_OPENING}\n\n六節順序讀下來：先是行星能量收支，再是底本與更正，然後是標準與公共機構，生物譜系，能力的條件帶，最後是可以事後核對的風險窗口。日期過了的報告，改讀該機構的下一份公開文本。`,
    sort_key: 80,
    path: '/civilization/#future',
    ai_note: '展望由公開機構頁面整理，標明約、示意或假說。不另開網址。',
  });
  addEntry(bag, 'future', 'future', '展望', '條件句', 1, [
    FUTURE_OPENING,
    '六節沿同一條閱讀順序展開。能量宜居先寫行星還能維持多少可用功率，信息可信接着寫底本與更正在複製之後還能不能被認出，制度協作寫度量、標準與跨代機構如何把陌生人放進同一套規則。生物譜系只寫延續與共演化，不排座次。技術能力階把觀測、試點與基建分開，避免把測得到誤讀成已經改寫了運行條件。生存風險把氣候、空間天氣、生物多樣性、耐藥性、淡水與極端熱各自的機構文本留在原處，日期過了就改讀下一份。',
    `各節的入口是${FUTURE_DOMAINS.map((domain) => `[${domain.title}](#${domain.anchor})`).join('、')}。`,
  ].join('\n\n'));
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
      const checkpointText = FUTURE_COUNTDOWNS.filter((item) => item.horizonId === row.id).map((checkpoint) => [
        `### ${checkpoint.title} {#${checkpoint.anchor}}`,
        COUNTDOWN_LEAD[checkpoint.id] ?? '',
        `檢查點日期是 ${checkpoint.checkpoint}。對照[${row.title}](#${row.anchor})。`,
        checkpoint.pending,
      ].filter(Boolean).join('\n\n')).join('\n\n');
      return [
        `### ${row.title} {#${row.anchor}}`,
        `這一則放在${family} ${row.band}${kind ? `，種類是${kind}` : ''}${row.timeBand ? `，時間帶 ${row.timeBand}` : ''}。信心標為${CONFIDENCE[row.confidence] ?? row.confidence}。日期戳 ${row.dataAsOf}。時間帶不是等級。`,
        `機制：${row.mechanism}`,
        `緩解：${row.mitigation}`,
        `不確定：${row.uncertainty}`,
        links(row.sources),
        checkpointText,
      ].filter(Boolean).join('\n\n');
    }).join('\n\n');
    const alsoText = also.length
      ? `並見${also.map((row) => `[${row.title}](#${row.anchor})`).join('、')}。那些段落寫在各自的主域裡，這裡不重複。`
      : '';
    const narrative = FUTURE_LONGFORM[domain.id] ?? '';
    const beat = domain.anchor === 'future-f1' ? SCALE_BEAT['future:f1'] : '';
    const body = [beat, narrative, domain.blurb, instanceText, horizonText, alsoText].filter(Boolean).join('\n\n');
    const summary = `${domain.title}寫的是條件與可核對的邊界，日期戳過了就改讀下一份公開文本。`;
    addEntry(bag, 'future', domain.anchor, domain.title, domain.code, (index + 1) * 10, body, [], null, 'future', summary);
  });
  addEntry(bag, 'future', FUTURE_TIER_CARD.anchor, FUTURE_TIER_CARD.title, '成熟度', 80, [
    FUTURE_TIER_CARD.note,
    '讀的時候先看證據停在哪一檔。觀測只表示記錄還在、出處還能打開。試點只表示有限範圍裡做過，句子不能外推。基建表示維修、備件與記錄同時在場，能力才可能離開單點。三檔之間不相加，也不能換成文明等級。',
    ...FUTURE_TIER_ROWS.filter((row) => row.shown).map((row) => `${row.mark ?? ''} ${row.label}。${row.blurb}`),
    '文明尺度一檔留在說明裡，不畫成可以攀登的等級，也不與前三檔相加。文獻裡的能量量級對照同樣不提供當代的測量程序。',
  ].join('\n\n'), [], null, 'future');
  addEntry(bag, 'future', 'future-bands', '分帶如何閱讀', '圖例', 85, [
    LEVEL_LEGEND,
    ...BAND_NOTES.map((note) => note.text),
    '各帶只說明某一層在記什麼，避免被讀成文明等級。帶與帶之間不換算，也不相加成一個分數。能量帶回答功率與水，信息帶回答底本與更正，能動帶回答擾動能不能被寫成可核對的維修條件。讀新聞時先對上其中一層，再決定標題能夠承擔多大的句子。',
  ].join('\n\n'), [], null, 'future');
  addEntry(bag, 'future', FUTURE_CLADE.anchor, FUTURE_CLADE.title, '譜系', 100, [
    `這裡同時看${FUTURE_CLADE.kinds.map((kind) => CLADE_KIND[kind] ?? kind).join('與')}。工具可以離開發明者，成為後來者能夠核對的公共底本；生態位可以延續，人與微生物、作物、景觀互相改寫。兩件事都沒有座次。`,
    `邊界：${FUTURE_CLADE.boundary}`,
    ...FUTURE_CLADE.layers.map((layer) => `### ${layer.title}\n\n${layer.text}`),
    '地外技術信號的公開搜尋至今沒有可複核的接觸確證。未確證保持為未確證。譜系一節因此只保留延續與共演化，不把沉默或差異寫成等級。',
  ].join('\n\n'), [], null, 'future');

  for (const item of COSMOS_THICK) addEntry(bag, 'cosmos', item.slug, item.title, item.time, item.sort, item.body, item.sources);
  addEntry(bag, 'cosmos', COSMOS_GAP.slug, COSMOS_GAP.title, COSMOS_GAP.time, COSMOS_GAP.sort, COSMOS_GAP.body, COSMOS_GAP.sources);
  addEntry(bag, 'cosmos', COSMOS_FILL.slug, COSMOS_FILL.title, COSMOS_FILL.time, COSMOS_FILL.sort, COSMOS_FILL.body, COSMOS_FILL.sources);
  for (const item of COSMOS_BULK) addEntry(bag, 'cosmos', item.slug, item.title, item.time, item.sort, item.body, item.sources);
  addEntry(bag, 'cosmos', COSMOS_LAST.slug, COSMOS_LAST.title, COSMOS_LAST.time, COSMOS_LAST.sort, COSMOS_LAST.body, COSMOS_LAST.sources);
  addEntry(bag, 'galaxy', GALAXY_THICK.slug, GALAXY_THICK.title, GALAXY_THICK.time, GALAXY_THICK.sort, GALAXY_THICK.body, GALAXY_THICK.sources);
  addEntry(bag, 'galaxy', GALAXY_GAP.slug, GALAXY_GAP.title, GALAXY_GAP.time, GALAXY_GAP.sort, GALAXY_GAP.body, GALAXY_GAP.sources);
  addEntry(bag, 'galaxy', GALAXY_FILL.slug, GALAXY_FILL.title, GALAXY_FILL.time, GALAXY_FILL.sort, GALAXY_FILL.body, GALAXY_FILL.sources);
  for (const item of GALAXY_BULK) addEntry(bag, 'galaxy', item.slug, item.title, item.time, item.sort, item.body, item.sources);
  addEntry(bag, 'galaxy', GALAXY_LAST.slug, GALAXY_LAST.title, GALAXY_LAST.time, GALAXY_LAST.sort, [
    GALAXY_LAST.body,
    HANDOFF_BRIDGE,
    ...GALAXY_COSMOS_LINKS.map((row) => `[${row.label}](${row.href})。${row.text}`),
  ].join('\n\n'), GALAXY_SOURCES);
  addEntry(bag, 'earth', EARTH_HABITABILITY.slug, EARTH_HABITABILITY.title, EARTH_HABITABILITY.time, EARTH_HABITABILITY.sort, EARTH_HABITABILITY.body, EARTH_HABITABILITY.sources);
  addEntry(bag, 'earth', EARTH_GAP.slug, EARTH_GAP.title, EARTH_GAP.time, EARTH_GAP.sort, EARTH_GAP.body, EARTH_GAP.sources);
  for (const item of LATE_ENTRIES) addEntry(bag, item.thread, item.slug, item.title, item.time, item.sort, item.body, item.sources);
  addEntry(bag, 'city', CITY_FILL.slug, CITY_FILL.title, CITY_FILL.time, CITY_FILL.sort, CITY_FILL.body, CITY_FILL.sources);
  addEntry(bag, 'city', CITY_BULK.slug, CITY_BULK.title, CITY_BULK.time, CITY_BULK.sort, CITY_BULK.body, CITY_BULK.sources);
  addEntry(bag, 'future', FUTURE_FILL.slug, FUTURE_FILL.title, FUTURE_FILL.time, FUTURE_FILL.sort, FUTURE_FILL.body, FUTURE_FILL.sources);
  addEntry(bag, 'future', FUTURE_BULK.slug, FUTURE_BULK.title, FUTURE_BULK.time, FUTURE_BULK.sort, FUTURE_BULK.body, FUTURE_BULK.sources);

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
  for (const fig of CHRONICLE_FIGURES) {
    if (fig.kind === 'real_photo') {
      if (!fig.not_ai || !fig.credit || !fig.license || !fig.source_url.startsWith('https://')) throw new Error(`real photo incomplete: ${fig.id}`);
      if (fig.caption_zh.includes('示意') || fig.alt_zh.includes('示意')) throw new Error(`real photo labeled schematic: ${fig.id}`);
    } else if (!fig.caption_zh.includes('示意') || fig.not_ai) {
      throw new Error(`schematic missing label: ${fig.id}`);
    }
  }
  const db: ChronicleDb = {
    meta,
    threads: bag.threads,
    entries: bag.entries,
    sources: bag.sources,
    figures: CHRONICLE_FIGURES,
  };
  const voice = /不再提供階段跳轉|不再提供章節跳轉|不再分成可跳轉|不再另設階段跳轉|篩選按鈕|分域卡片|倒數時鐘|模式卡|已铺就|回技術長文|可以對上的事物包括|章節按鈕|這是機構窗口/;
  const voiced = JSON.stringify(db).match(voice);
  if (voiced) throw new Error(`product voice in chronicle db: ${voiced[0]}`);
  for (const entry of db.entries) {
    if (!entry.slug.startsWith('cosmo-')) continue;
    const flatBody = entry.body.replace(/\s+/g, '');
    const flatSummary = entry.summary.replace(/\s+/g, '');
    if (flatSummary.length > 20 && flatBody.startsWith(flatSummary)) throw new Error(`summary clones ${entry.slug}`);
  }
  const banned = JSON.stringify(db).match(BANNED);
  if (banned) throw new Error(`banned token in chronicle db: ${banned[0]}`);
  return db;
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function seedSql(db: ChronicleDb = buildChronicleDb()): string {
  const lines = [
    '-- Generated from shared/civilization/db/seed.json. Apply migrations/0001_chronicle.sql and migrations/0002_chronicle_figures.sql first.',
    'DELETE FROM figures;',
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
  for (const fig of db.figures) {
    lines.push(`INSERT INTO figures (id, kind, volume, near_entry, after_heading, embed, src, width, height, caption_zh, source_org, title, license, source_url, retrieved, credit, alt_zh, not_ai) VALUES (${sqlString(fig.id)}, ${sqlString(fig.kind)}, ${sqlString(fig.volume)}, ${sqlString(fig.near_entry)}, ${fig.after_heading ? sqlString(fig.after_heading) : 'NULL'}, ${fig.embed ? 1 : 0}, ${sqlString(fig.src)}, ${fig.width}, ${fig.height}, ${sqlString(fig.caption_zh)}, ${sqlString(fig.source_org)}, ${sqlString(fig.title)}, ${sqlString(fig.license)}, ${sqlString(fig.source_url)}, ${sqlString(fig.retrieved)}, ${sqlString(fig.credit)}, ${sqlString(fig.alt_zh)}, ${fig.not_ai ? 1 : 0});`);
  }
  return `${lines.join('\n')}\n`;
}
