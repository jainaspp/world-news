import { cjkChars, esc } from '../contentPage.js';
import { renderReadingBlock } from './blocks.js';
import { civChars, isCivLine, type CivLine, type CivReadingShape, type CivSource } from './contract.js';

/**
 * Thick case essays. A new essay is a new object in `CASE_STUDIES`.
 * Mount it inside an existing chronicle or tech stage. Do not add a route.
 */

export type CaseMount = '/civilization/tech/' | '/civilization/chronicle/';
export type CaseOutcome = '成' | '敗';

export interface CivCaseLink {
  href: string;
  label: string;
}

export interface CivCase extends CivReadingShape {
  id: string;
  outcome: CaseOutcome;
  title: string;
  mount: CaseMount;
  /** Existing stage id on `mount`, such as `tech-7` or `stage-4`. */
  beside: string;
  lede: string;
  paragraphs: readonly string[];
  problem: string;
  mechanism: string;
  boundary: string;
  maintenance: string;
  ask: string;
  lines: readonly CivLine[];
  sources: readonly CivSource[];
  related: readonly CivCaseLink[];
}

export const CASE_LIMITS = {
  minBody: 800,
  minSources: 4,
  problem: 40,
  mechanism: 120,
  boundary: 80,
  ask: 28,
} as const;

const CASE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BESIDE = /^(?:tech|stage)-\d+$/;

/** Related links may only point at anchors that already exist, plus the hub question index. */
const CASE_RELATED = /^(?:\/civilization\/chronicle\/#pattern-[a-z0-9]+(?:-[a-z0-9]+)*|\/civilization\/chronicle\/#stage-\d+|\/civilization\/tech\/#tech-\d+|\/civilization\/earth\/#earth-\d+|\/civilization\/origins\/|\/civilization\/#question-index|\/#near-[a-z0-9]+(?:-[a-z0-9]+)*)$/;

export function caseRelatedAllowed(href: string): boolean {
  return CASE_RELATED.test(href);
}

/** Essay body. Chrome, source names and contract labels stay out of the floor. */
export function caseBody(item: CivCase): string {
  return [item.lede, ...item.paragraphs].join('\n');
}

export function caseHref(item: CivCase): string {
  return `${item.mount}#case-${item.id}`;
}

export function casePlain(item: CivCase): string {
  return [
    item.title,
    item.lede,
    ...item.paragraphs,
    item.problem,
    item.mechanism,
    item.boundary,
    item.maintenance,
    item.ask,
    item.event,
    item.eventDetail,
    item.impact,
    ...item.lines,
    ...item.products.flatMap((product) => [product.name, product.detail, product.kind ?? '']),
    ...item.drivers.flatMap((driver) => [driver.name, driver.detail]),
    ...item.sources.map((source) => source.name),
    ...item.related.map((link) => link.label),
  ].join('\n');
}

/** Empty array means the essay satisfies the case contract. */
export function caseIssues(item: CivCase): string[] {
  const issues: string[] = [];
  const limits = CASE_LIMITS;
  if (!CASE_ID.test(item.id)) issues.push('id');
  if (item.outcome !== '成' && item.outcome !== '敗') issues.push('outcome');
  if (!item.title.trim()) issues.push('title');
  if (item.mount !== '/civilization/tech/' && item.mount !== '/civilization/chronicle/') issues.push('mount');
  if (!BESIDE.test(item.beside)) issues.push('beside');
  if (item.mount === '/civilization/tech/' && !item.beside.startsWith('tech-')) issues.push('beside-mount');
  if (item.mount === '/civilization/chronicle/' && !item.beside.startsWith('stage-')) issues.push('beside-mount');
  if (!item.lede.trim() || cjkChars(caseBody(item)) < limits.minBody) issues.push('body');
  if (!item.problem.trim() || civChars(item.problem) > limits.problem) issues.push('problem');
  if (!item.mechanism.trim() || civChars(item.mechanism) > limits.mechanism) issues.push('mechanism');
  if (!item.boundary.trim() || civChars(item.boundary) > limits.boundary) issues.push('boundary');
  if (!item.maintenance.trim()) issues.push('maintenance');
  if (!item.ask.trim() || civChars(item.ask) > limits.ask) issues.push('ask');
  if (!item.event.trim() || !item.eventDetail.trim() || !item.impact.trim()) issues.push('reading');
  if (item.lines.length < 1) issues.push('lines');
  for (const line of item.lines) {
    if (!isCivLine(line)) issues.push(`line:${line}`);
  }
  if (item.mount === '/civilization/tech/' && item.lines.some((line) => line === '制度' || line === '貨幣')) issues.push('tech-line');
  if (item.products.length < 1 || item.drivers.length < 1) issues.push('lists');
  for (const product of item.products) {
    if (!product.name.trim() || !product.detail.trim()) issues.push('product');
  }
  for (const driver of item.drivers) {
    if (!driver.name.trim() || !driver.detail.trim()) issues.push('driver');
  }
  if (item.sources.length < limits.minSources) issues.push('sources');
  const urls = new Set<string>();
  let mechanismSources = 0;
  for (const source of item.sources) {
    if (!source.name.trim() || !/^https:\/\//.test(source.url)) issues.push('source');
    if (urls.has(source.url)) issues.push('source-dup');
    urls.add(source.url);
    if (source.supports === 'mechanism') mechanismSources += 1;
  }
  if (mechanismSources !== 1) issues.push('mechanism-source');
  if (item.related.length < 4) issues.push('related');
  const hrefs = new Set<string>();
  let patterns = 0;
  let axes = 0;
  let questions = 0;
  for (const link of item.related) {
    if (!link.label.trim() || !caseRelatedAllowed(link.href)) issues.push('related-href');
    if (hrefs.has(link.href)) issues.push('related-dup');
    hrefs.add(link.href);
    if (link.href.includes('#pattern-')) patterns += 1;
    if (/#stage-\d+$/.test(link.href) || /#tech-\d+$/.test(link.href)) axes += 1;
    if (link.href === '/civilization/#question-index') questions += 1;
  }
  if (patterns < 1) issues.push('related-pattern');
  if (axes < 1) issues.push('related-axis');
  if (questions !== 1) issues.push('related-question');
  return issues;
}

export const CASE_STUDIES: readonly CivCase[] = [
  {
    id: 'print-cost',
    outcome: '成',
    title: '印刷與知識成本',
    mount: '/civilization/tech/',
    beside: 'tech-7',
    lines: ['信息'],
    lede: '印刷把一份記錄變成許多份相近的印張，多印一份的成本因此下降。可核對的範圍會不會一起變寬，取決於底本、版次與校對是否仍有人維持。',
    paragraphs: [
      '手抄的時代，多一位讀者，往往就要多抄一份。抄手的時間、紙張與校對都攤在每一份上面，知識能走多遠，先受這筆成本限制。錯誤並非不會發生，只是走得慢：一份抄錯的本子，要再經人轉抄，才到得了下一座城市。可核對的底本通常留在檔案室、寺院或作坊裡，大多數讀者看不見它，也無從指向同一頁。',
      '雕版改變的是這筆邊際成本。圖文先刻在板上，其後每一印分享同一塊板的工，而不是各自再抄一遍。美國大都會藝術博物館的藝術史年表寫道，木版印刷約在九世紀趨於成熟；敦煌出土、紀年約在公元 868 年的《金剛經》卷，被該年表稱為現存最早的印刷書籍。同館關於中國印刷圖像的展覽說明指出：重複複製的能力，以及印製品相對可負擔的價格，使印刷圖像長期成為面向許多人的傳播媒介。本篇取價格下降與重複複製這兩句，不取「最早、最長」一類座次。各地進入印刷的路徑並不一致。東亞的雕版傳統，與後來各地的活字傳統，要分開看。',
      '活字把「刻一整頁」換成「排一批字」。字模可以拆開再用，改一行不必重刻整板。美國國會圖書館把《四十二行聖經》記述為西歐以金屬活字印成的重要早期印本，完成時間約在 1455 年的美因茨。這是西歐書籍製作的轉折，不是全球印刷的唯一起點。在此之前，東亞已有雕版實物，亦有文獻記載的泥活字試驗。本站科技頁寫印刷與報刊時已說明：只記複製成本下降這一共同後果，不排座次。',
      '成本下降之後，核對才可能變寬，兩者卻不是同一件事。模式卡「複製與校驗」寫明：複製本身只降低傳遞成本，不產生可核對的底本。印張若標明版次、頁碼與出處，遠方讀者才可以指向同一頁，而不是各自的記憶。科學通信裡的數據表、勘誤與再版，都是把校驗移出印刷現場的做法。報刊把遠處的事件收成可在城市裡閱讀的文字，仍然受交通與截稿限制。讀者變多，並不表示每一句都已經對過底本。',
      '高麗大藏經的經板，把印得便宜和對得回去放在同一條鏈上。聯合國教科文組織世界記憶名錄記述，約 13 世紀刻成的經板有 81258 塊，至今仍能印出完整的文本；名錄並稱其校勘嚴密，後來被用作對照底本。海印寺的藏板建築約在 15 世紀建成，用來保存這些經板，並被列入世界遺產。板在、房子在、會印會校的人在，複製與校驗才同時留下。這是條件，不是某地天生會印。',
      '邊界要留在明處。複製變便宜，不等於內容變真。沒有校對的印本，會把同一個錯誤同時送到許多互不相識的讀者。協作的半徑變大時，錯誤的半徑也變大。今日一份可轉發的記錄，仍要先問：發出之前，誰對過底本？這一問掛在文明總覽的問題索引，也可以回到編年裡的造紙與印刷、科學與啟蒙，以及科技頁的印刷與報刊。',
      '維修與傳承同樣是條件句。印版會裂，字模會散，紙會缺，負責校對的人會離開。若這幾樣不同時在場，便宜的複製要麼停住，要麼變成無法核對的重印。技術還在坊間，不表示下一版仍然對得上上一版。經板能夠跨越數百年再印，是因為保存、取用與校勘沒有一起中斷；缺了任何一環，成本優勢都留不下來。',
    ],
    problem: '複製變便宜之後，核對範圍靠什麼變寬',
    mechanism: '一份底本一旦能印成許多相近的印張，遠方讀者就可以指向同一頁來核對。印價下降並不自動產生這一次指向。',
    boundary: '複製變便宜，不等於內容變真',
    maintenance: '印版、紙張與校對若不同時有人維持，便宜的複本要麼停印，要麼把同一錯誤一起送出。',
    ask: '這份印本發出之前，誰對過底本？',
    event: '印張可以指向同一頁',
    eventDetail: '書面記錄一旦可以付印，多一份的成本就不再等於再抄一遍。約九世紀以後的雕版，以及後來各地的活字，都把同一份底本變成許多份相近的印張。可核對的底本不會隨印數自動出現。版次、頁碼與校對仍要有人維持。',
    products: [
      { name: '雕版與活字印張', kind: '媒介', detail: '一次刻版或一次排字，可以印出許多份相近的頁面，多一位讀者不必再付一整份抄寫。' },
      { name: '版次、頁碼與勘誤', kind: '媒介', detail: '讓遠方讀者指向同一頁，而不是各自記憶裡的那一句。' },
      { name: '經板與藏板處', kind: '技術', detail: '板片、防潮的房子與會再印的人同在，複製才不會在下一次需要時斷掉。' },
    ],
    drivers: [
      { name: '複製成本', detail: '單頁變便宜之後，教科書、圖像與報刊才可能有較穩定的讀者群。' },
      { name: '校對程序', detail: '底本、校勘與再版決定便宜的複本是在傳遞可核對的文本，還是在放大同一個錯誤。' },
      { name: '遠方讀者', detail: '互不相識的人要核對同一件事，先得有一份可以指認的印本。' },
    ],
    impact: '知識網絡的半徑，建立在印本可以留下並被核對之上，而不僅建立在印得更多之上。',
    sources: [
      { name: '美國大都會藝術博物館｜中國印刷圖像展', url: 'https://www.metmuseum.org/exhibitions/listings/2012/printed-image-in-china', supports: 'mechanism' },
      { name: '美國大都會藝術博物館｜藝術史年表（約 500–1000 年）', url: 'https://www.metmuseum.org/toah/ht/06/eac' },
      { name: '美國國會圖書館｜四十二行聖經', url: 'https://www.loc.gov/exhibits/bibles/the-gutenberg-bible.html' },
      { name: '聯合國教科文組織世界記憶｜高麗大藏經經板', url: 'https://www.unesco.org/en/memory-world/printing-woodblocks-tripitaka-koreana-and-miscellaneous-buddhist-scriptures' },
      { name: '聯合國教科文組織世界遺產｜海印寺藏經板殿', url: 'https://whc.unesco.org/en/list/737/' },
      { name: '北京市大興區｜中國印刷博物館介紹', url: 'https://www.bjdx.gov.cn/bjsdxqrmzf/zjdx/yjdx/you/2105437/index.html' },
    ],
    related: [
      { href: '/civilization/chronicle/#pattern-copy-check', label: '模式卡 · 複製與校驗' },
      { href: '/civilization/tech/#tech-7', label: '技術階段 · 印刷與報刊' },
      { href: '/civilization/chronicle/#stage-5', label: '編年 · 造紙與印刷' },
      { href: '/civilization/chronicle/#stage-6', label: '編年 · 科學與啟蒙' },
      { href: '/civilization/#question-index', label: '問題索引' },
    ],
  },
  {
    id: 'gear-pause',
    outcome: '敗',
    title: '齒輪裝置的中斷條件',
    mount: '/civilization/chronicle/',
    beside: 'stage-4',
    lines: ['信息', '制度'],
    lede: '一件用齒輪與銘文推算天文週期的青銅裝置，可以在海底留下殘件，同時失去被修復、被重做的條件。中斷看維修鏈、材料與知識傳遞是否還在，不看人群高下。',
    paragraphs: [
      '1901 年前後，希臘安提基特拉附近的古代沉船中，打撈出一組青銅殘件。雅典國家考古博物館把它列為重要展品，並以齒輪嚙合說明它如何推算天文週期。公開的研究論文記述：原器大約只留下三分之一，分成 82 件殘片，其中可見約 30 枚已經腐蝕的青銅齒輪；銘文描述日、月與當時所知行星的運行，以及這些運行如何被顯示在器面。公共研究多把製作窗口放在約公元前 2 世紀，沉船年代另有討論。本篇年代一律標「約」，不把某一件殘片寫成唯一起點。',
      '公共介紹有時用計算裝置來稱呼它。本篇不採用座次用語，也不把它寫成人群能力的證據。博物館的科學史說明寫道：以當時已有的知識、工藝與材料，製作這樣一件裝置是可能的；齒輪見於更早的文獻，同時代亦有測量時間與天文的器具。中斷不是因為當時做不出來。鑄造、分度與鐫刻當時都可以在場。後來缺的是另一件事：這套做法沒有作為一條可修復、可重做的鏈，一直交到下一手。',
      '三項條件要分開寫，不能併成一句褒貶。',
      '其一是維修鏈。齒輪會磨損，軸會鬆，齒距一變，週期就偏。要恢復原有精度，需要會重新嚙合的人，以及可替換的零件。作坊解散之後，殘件可以躺在海底，計算卻無法在下一季繼續。這與模式卡「功率的儲存與維修」同構，只是這裡退回去的不是可用功率，而是可重複的計算。那張卡寫的是：技術在場，若維修、師徒或備件中斷，能力會退回去。換到這件齒輪裝置上，句子仍然成立。',
      '其二是材料與工序。青銅要鑄，刻度要分，銘文要鐫。材料堆在庫房裡，並不等於下一件仍能咬合。工序若只存在於某一批工匠手上，批次結束，齒形就沒有著落。博物館既已說明當時的材料與工藝並非空白，就不能把後來的空白倒寫成某人不會做金屬，更不能寫成某一地區的能力排名。',
      '其三是知識傳遞。銘文把一部分週期寫在器身上，這是度量：沒有可讀的刻度，齒輪只是金屬。模式卡「度量的互通」說，遠方要重複一次計算，先得知道對方用的是哪一把尺。這件裝置的尺刻在自己身上，能讀它的人一旦不在，尺就停在殘片上。若步驟沒有被另外複製成可核對的文本，或一條穩定的師徒譜系，船難、遷移或作坊停業，就會把做法一起帶走。模式卡「複製與校驗」的反面在這裡出現：沒有被複製的做法，錯誤不會擴散，正確的做法也離不開現場。',
      '殘件留存，不等於做法仍在傳遞。海水保住了金屬，沒有保住會修它的人。後來其他世紀、其他地方出現的星盤或機械鐘，是各自的維修鏈，不能倒推成誰比較會做齒輪，也不能寫成單一血統的延續。本篇只保留條件句：若維修、材料與知識傳遞不同時在場，下一件就做不回同樣的精度。',
      '今日可問的是同一句。一件器具若停產，備件、刻度說明與會修的人是否還在同一條鏈上？這一問可以從文明總覽的問題索引進入，再回到古典階段的編年、科技頁的科學儀器，以及文字如何把記錄留在說話的人之外。度量要能核對，做法要能傳遞，兩者缺一，儀器就只是一件舊金屬。',
    ],
    problem: '殘件還在時，可重複的計算靠什麼留下',
    mechanism: '齒輪與銘文把週期固定在器具上。若維修、材料與可傳遞的做法中斷，殘件仍在，可重複的計算也會停住。',
    boundary: '殘件留存，不等於做法仍在傳遞',
    maintenance: '齒、軸、刻度與會修的人若不同時在場，下一件就無法按原有精度重做。',
    ask: '器具停產之後，備件與刻度說明是否還在？',
    event: '殘件留下而做法中斷',
    eventDetail: '約公元前 2 世紀的一件青銅齒輪裝置，用嚙合與銘文推算天文週期。1901 年前後它從沉船裡被打撈上來時，只剩下約三分之一。殘件可以留存，可重複的計算卻依賴維修、材料與知識傳遞同時在場。',
    products: [
      { name: '青銅齒輪', kind: '技術', detail: '以嚙合把週期變成可以轉動的結構；齒距一變，顯示就偏。' },
      { name: '刻度與銘文', kind: '媒介', detail: '把日、月與行星的週期寫在器身上，使計算有一把可讀的尺。' },
      { name: '作坊與備件', kind: '制度', detail: '會重新嚙合的人與可替換的零件同在，下一件才做得回去。' },
    ],
    drivers: [
      { name: '維修鏈', detail: '磨損之後若無人修復，裝置可以留下，精度不能留下。' },
      { name: '材料與工序', detail: '青銅、分度與鐫刻要一起在場。庫房裡的金屬不會自己變成下一套齒輪。' },
      { name: '知識傳遞', detail: '步驟若沒有寫成可核對的文本，也沒有師徒繼續做，船難或停業就會把做法帶走。' },
    ],
    impact: '一件器具能走多遠，取決於維修、材料與傳遞是否同在，而不是殘件是否還能被看見。',
    sources: [
      { name: '雅典國家考古博物館｜安提基特拉裝置', url: 'https://antikythera-mechanism.namuseum.gr/en/', supports: 'mechanism' },
      { name: '雅典國家考古博物館｜科學史說明', url: 'https://antikythera-mechanism.namuseum.gr/en/science-historian/' },
      { name: '《科學報告》｜安提基特拉裝置的宇宙模型', url: 'https://www.nature.com/articles/s41598-021-84310-w' },
      { name: '世界歷史百科｜安提基特拉裝置', url: 'https://www.worldhistory.org/Antikythera_Mechanism/' },
      { name: '倫敦大學學院｜安提基特拉研究報道', url: 'https://www.ucl.ac.uk/news/2021/mar/experts-recreate-mechanical-cosmos-worlds-first-computer' },
    ],
    related: [
      { href: '/civilization/chronicle/#pattern-measure-promise', label: '模式卡 · 度量的互通' },
      { href: '/civilization/chronicle/#pattern-power-store', label: '模式卡 · 維修條件' },
      { href: '/civilization/chronicle/#pattern-copy-check', label: '模式卡 · 複製與校驗' },
      { href: '/civilization/chronicle/#stage-4', label: '編年 · 古典階段' },
      { href: '/civilization/tech/#tech-5', label: '技術階段 · 科學儀器' },
      { href: '/civilization/tech/#tech-4', label: '技術階段 · 可核對記錄' },
      { href: '/civilization/#question-index', label: '問題索引' },
    ],
  },
];

export function casesBeside(mount: CaseMount, beside: string): CivCase[] {
  return CASE_STUDIES.filter((item) => item.mount === mount && item.beside === beside);
}

export function caseSourceRows(mount: CaseMount): { stage: string; name: string; note: string; url: string }[] {
  return CASE_STUDIES.filter((item) => item.mount === mount).flatMap((item) => item.sources.map((source) => ({
    stage: `案例 ${item.title}`,
    name: source.name,
    note: source.supports === 'mechanism' ? '機制句主要依據' : item.title,
    url: source.url,
  })));
}

function stageHref(item: CivCase): string {
  return `${item.mount}#${item.beside}`;
}

export function renderCase(item: CivCase): string {
  const paragraphs = item.paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('');
  const related = item.related.flatMap((link) => {
    if (!caseRelatedAllowed(link.href)) return [];
    return [`<a href="${esc(link.href)}">${esc(link.label)}</a>`];
  }).join('');
  const block = renderReadingBlock({
    anchor: `case-${item.id}`,
    event: item.event,
    eventDetail: item.eventDetail,
    products: item.products.map((product) => ({ ...product })),
    drivers: item.drivers.map((driver) => ({ ...driver })),
    impact: item.impact,
    cover: null,
    lines: item.lines,
    problem: item.problem,
    mechanism: item.mechanism,
    boundary: item.boundary,
    maintenance: item.maintenance,
    ask: item.ask,
    sources: item.sources,
    stageHref: stageHref(item),
    captionNote: '紙感',
  });
  return `<section class="case-study" id="case-${esc(item.id)}" data-case="${esc(item.id)}" data-outcome="${esc(item.outcome)}">
    <p class="case-kicker">案例專篇 · ${esc(item.outcome)}</p>
    <h2>${esc(item.title)}</h2>
    <p class="case-lede">${esc(item.lede)}</p>
    ${paragraphs}
    <nav class="case-related" aria-label="相關條目">${related}</nav>
    ${block}
  </section>`;
}

export function renderCasesBeside(mount: CaseMount, beside: string): string {
  return casesBeside(mount, beside).map((item) => renderCase(item)).join('');
}

export function renderCaseNav(mount: CaseMount): string {
  const links = CASE_STUDIES.filter((item) => item.mount === mount)
    .map((item) => `<a class="chip" href="#case-${esc(item.id)}">${esc(`${item.outcome} · ${item.title}`)}</a>`)
    .join('');
  if (!links) return '';
  return `<nav class="chronicle-nav case-nav" aria-label="案例專篇">${links}</nav>`;
}

export function renderCaseAxisLinks(): string {
  const links = CASE_STUDIES.map((item) => `<a class="chip" href="${esc(caseHref(item))}">${esc(`${item.outcome} · ${item.title}`)}</a>`).join('');
  return `<nav class="case-axis" aria-label="案例專篇">${links}</nav>`;
}
