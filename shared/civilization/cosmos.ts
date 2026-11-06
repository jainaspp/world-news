import { cjkChars, esc } from '../contentPage.js';
import { renderThreadArticle } from './db/render.js';

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

export const COSMOS_LEDE = '在人類起源與文明編年之前，尚有更深的時間長河：宇宙如何展開能量與時空，冷凝出物質與恆星，結成宜居地球，並讓信息在生命層級累積。本頁沿能量、物質、信息與時間四條線索，按主流綜述寫這條粗線；年代一律作約。人類對起源亦有文化與信仰想像，本頁只述科學共識。約七百萬年前交接入類起源。';

/** Page-end handoff. The origins link is the fixed anchor at about seven million years ago. */
const HANDOFF_LEAD = '約七百萬年前，演化進入人族階段：深時間的能量、物質與生命信息，已鋪就宜居地球與複雜生物圈。自此之後的化石、石器與基因組故事，請繼續閱讀本站';
const HANDOFF_MID = '。文明制度、技術與貨幣的十階段編年，則另見';
const HANDOFF_END = '；宇宙長河不併入文明編年，兩者前後銜接、互不覆蓋。';
export const COSMOS_HANDOFF = `${HANDOFF_LEAD}人類起源時間線${HANDOFF_MID}文明編年${HANDOFF_END}`;

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
    prose: '主流綜述認為，約一百三十八億年前，時空經歷極短暫的暴脹，其後能量轉化為物質與輻射，宇宙進入可觀測的熱密開端。基本粒子與輻射場在此奠基，為一切後續結構提供能量與時間的初始條件。觀測到的宇宙微波背景，是這一早期歷史留下的可核對遺跡。\n\n暴脹本身極短，直接的溫度計並不存在。能夠核對的是它留下的統計痕跡：宇宙微波背景在大尺度上幾乎均勻，細小起伏的角功率譜又接近最簡單的絕熱、近標度不變模型。歐洲空間局與美國國家航空航天局的全天圖，把再結合時期的溫度起伏畫出來；暴脹則是用來解釋那些起伏為何如此平滑、又為何有特定形狀的一種主流框架。它不是實驗室裡重做過的一次爆炸。張量模與具體勢的細節仍有多種模型並存。本節只採用「極早期加速膨脹，其後轉入熱密狀態」這一層公共敘述，不把某一個場的參數寫成已測定的常數。',
  },
  {
    n: 2,
    name: '原初核合成',
    short: '核合成',
    era: '約大爆炸後數分鐘',
    milestones: ['氫、氦（及微量鋰）原子核形成'],
    meaning: '恆星燃料與後續化學的物質起點。',
    lines: ['物質', '能量'],
    prose: '約大爆炸後數分鐘內，宇宙仍極熱極密，質子與中子碰撞形成氫、氦原子核，以及微量鋰等輕核。其後溫度下降，核合成大致停歇，這些輕核成為後續恆星燃燒與化學演化的物質起點。今日宇宙中氫、氦的豐度比例，與原初核合成計算高度吻合，是大爆炸圖景的重要支柱。\n\n輕核的比例是這一段最硬的證據。質子與中子在最初幾分鐘裡的相對數量，取決於弱相互作用凍結時的溫度，以及中子的衰變。算完之後，氦的質量分數大約落在四分之一附近，其餘多半是氫，鋰只有微量。今日用貧金屬氣體雲與宇宙微波背景推回的原初豐度，與這組數字同向。吻合的是比例，不是某一團氣體的出生證明。重子密度若改用別的觀測來錨定，鋰的理論值與部分恆星測量仍有張力，學界稱為鋰問題。本節因此不把「完全吻合」寫成沒有餘數，只把氫與氦的大比例當作核合成圖景站得住的部分。',
  },
  {
    n: 3,
    name: '宇宙透明與第一代恆星',
    short: '第一代星',
    era: '約 133–135 億年前',
    milestones: ['再結合使宇宙對光透明', '第一代恆星點燃'],
    meaning: '重元素開始在恆星內部合成，金屬豐度起步。',
    lines: ['能量', '物質'],
    prose: '約大爆炸後三十八萬年，電子與原子核結合為中性原子，宇宙對光變得透明，宇宙微波背景自此自由傳播。其後約數億年——對應今日宇宙年齡約一百三十三至一百三十五億年前——第一代恆星在引力塌縮中點燃，結束「宇宙黑暗時代」。這些巨星內部開始合成重於氦的元素，金屬豐度由此起步，為行星與複雜化學鋪路。\n\n再結合留下的是一幅幾乎均勻的微波天空。中性原子形成之後，光子不再頻繁散射，於是那一時刻的溫度起伏可以一路傳到今日的天線。黑暗時代本身幾乎不發光，所以第一代恆星的證據是間接的：再電離把中性氫再次打散，微波背景的偏振與遙遠類星體的吸收譜都記錄了這一次相變的大致時間。紅外觀測開始看見極高紅移的明亮星系，但它們未必就是純粹由氫氦組成的第一代星。金屬線一旦出現，就說明至少有過一代核合成。哪些天體算第一代，仍隨光譜與模擬修訂。本節只堅持一件事：重元素不是原初核合成的產物，而是恆星內部與爆發送出來的。',
  },
  {
    n: 4,
    name: '星系與大尺度結構',
    short: '星系結構',
    era: '約 100–130 億年前起',
    milestones: ['星系、星系群與暗物質暈穩固'],
    meaning: '物質在引力下組織成可長期演化的結構骨架。',
    lines: ['物質', '時間'],
    prose: '約一百至一百三十億年前起，物質在引力與暗物質暈作用下逐漸聚集成星系、星系群與絲狀大尺度結構。恆星生成、超新星回饋與星系合併反覆改寫氣體與重元素分布，形成可長期演化的結構骨架。今日觀測到的星系網與空洞格局，即是這段緩慢組織過程的結果。\n\n星系不是先畫好輪廓再填入恆星。暗物質暈先在引力下成團，氣體再冷卻、掉進去、形成恆星；超新星與活動星系核又把氣體推出來，合併則把暈與恆星盤攪在一起。可核對的圖像來自兩端：近處有星系紅移巡天畫出的絲狀網與空洞，遠處有深場裡已成形的星系。絲狀結構的典型尺度以億光年計，遠大於單個星系。模擬能重現網的大圖案，卻仍在小尺度衛星星系的數目、核心密度與重子反饋上反覆修正。本節把「引力加上暗物質暈，可以長出持久的結構」寫成主線，不把任何一次模擬的子暈計數當成已定案。銀河系只是這張網上的一個節點，特寫另見銀河系誕生。',
  },
  {
    n: 5,
    name: '太陽系形成',
    short: '太陽系',
    era: '約 46 億年前',
    milestones: ['原行星盤坍縮', '行星吸積成形'],
    meaning: '地球獲得穩定軌道與持續的恆星能量輸入。',
    lines: ['能量', '物質'],
    prose: '約四十六億年前，一片星際氣體與塵埃雲塌縮為旋轉的原行星盤：中心點燃為太陽，盤內固體顆粒吸積為行星、衛星與小天體。地球由此獲得相對穩定的軌道，以及來自恆星的持續能量輸入。隕石測年與太陽系公共科普敘事，均將此節點標為約四十六億年前的主流約數。\n\n隕石裡的鈣鋁包裹體，是目前能在實驗室測年的最老太陽系固體，年齡集中在約四十五億六千七百萬年附近。這個數字比「地球的生日」更具體：它量的是盤內第一批耐高溫顆粒凝結的時間，不是海洋或生命出現的時間。原行星盤的氣體與塵埃同時在動。毫米波陣列能看見尚在形成的年輕盤，有環、有縫；縫的位置常被解釋為行星正在掃開軌道，但縫也可能來自其他不穩定。太陽系自身的盤早已散掉，重建靠隕石、小行星與軌道結構。巨行星遷移曾被用來解釋內太陽系的撞擊史，不同模型對遷移幅度仍不一致。本節採用的只是：約四十六億年前，一片分子雲塌成一顆恆星和一批行星，地球因此得到長期、相對穩定的光照。',
  },
  {
    n: 6,
    name: '早期地球與液態水',
    short: '液態水',
    era: '約 44–40 億年前',
    milestones: ['地殼分化', '海洋與水循環趨向穩定'],
    meaning: '為複雜化學與能量循環提供環境舞台。',
    lines: ['物質', '能量'],
    prose: '約四十四至四十億年前，地球經歷分化，形成地核、地幔與早期地殼；撞擊與火山活動頻繁，但液態水逐漸在地表積聚，海洋與水循環趨向穩定。穩定的水環境為複雜化學、能量交換與後續生命化學提供舞台。此階段細節仍隨地質與同位素證據修訂，宜標「約」。\n\n液態水的證據比「海洋從哪一天開始」更碎。最老的碎屑鋯石把地殼礦物的年齡推到約四十四億年前，其中有的氧同位素被解讀為曾與液態水接觸，但解讀依賴鋯石沒有被後來的熱事件改寫。若月球形成的大撞擊發生在這一段早期，地表水有可能一度被剝走，再由火山排氣與富水小天體補回。哪一次補給是主來源，隕石、彗星與太陽星雲氣體的同位素並不完全一致。本節不挑選單一水源。它只說明：到約四十億年前後，地表已經可以維持水循環，複雜化學才有溶劑。撞擊、火山與局部蒸發仍使環境遠不如後來的穩定海洋。',
  },
  {
    n: 7,
    name: '生命起源',
    short: '生命起源',
    era: '約 40–35 億年前',
    milestones: ['可自我複製／代謝的分子系統出現'],
    meaning: '信息開始在生物層級傳遞與累積。',
    lines: ['信息', '物質'],
    prose: '約四十至三十五億年前，地球上出現可自我複製或可持續代謝的分子系統——生命起源。具體路徑（如熱液噴口、潮汐池、黏土表面等）假說並存，證據仍在累積，本頁不採納單一理論為定論。自此，信息開始在生物層級傳遞、突變與選擇中累積，與純粹物理化學過程分道。最早化石與同位素跡象時間窗口仍有學術討論。\n\n生命起源沒有一塊可以指認為第一個細胞的化石。能拿出來的是時間窗口與化學約束。約三十五億年前的疊層石與碳同位素偏移，被不少綜述視為生命活動的跡象，也有人認為部分構造可以用非生物過程解釋。更早的疑似跡象爭議更大。化學上，自我複製與代謝不必同時在第一天完成：有的假說從核糖核酸的模板複製出發，有的從鹼性熱液噴口的質子梯度與礦物表面出發，有的把濕乾循環放在陸地池塘。這些路徑要求的溫度、酸鹼度與金屬離子並不相同，目前沒有一個實驗把從無機物到可遺傳細胞的全程做完。本節保留假說並存，並把信息開始被複製、被選擇，寫成與單純平衡化學分道的那一步。',
  },
  {
    n: 8,
    name: '光合作用與大氧化',
    short: '大氧化',
    era: '約 24–20 億年前',
    milestones: ['氧氣在大氣中顯著累積'],
    meaning: '全球能量流與化學環境改寫，複雜代謝路徑打開。',
    lines: ['能量', '信息'],
    prose: '約二十四至二十億年前，產氧光合作用使大氣與海洋中的氧氣顯著累積，史稱大氧化事件。全球能量流與化學環境被改寫：好氧代謝路徑打開，同時許多厭氧生態位受壓。氧氣也改變地表礦物與氣候反饋，為後來更複雜的多細胞生命準備化學條件。時間與強度細節仍有綜述區間。\n\n大氧化不是氧氣在某一年突然灌滿天空。產氧光合作用可能更早開始，游離氧卻先被海洋裡的還原性鐵與其他匯消耗，條帶狀鐵建造是這一段消耗留下的沉積。直到匯接不住，大氣氧才明顯上升，時間多被放在約二十四億至二十億年前，其後還有一次約在八億至五億年前的進一步抬升。證據來自硫同位素的非質量分餾在某時段消失、古土壤與碎屑岩的氧化程度，以及後來的生物標記。上升的節奏、是否曾回落，不同岩芯並不完全重合。氧氣打開好氧代謝，也使許多厭氧群落難以維持，這是化學環境的改寫，不是進步敘事。多細胞的複雜身體要等很久以後才在化石裡變得常見。',
  },
  {
    n: 9,
    name: '多細胞與顯生宙輻射',
    short: '顯生宙',
    era: '約 5.4 億年前起',
    milestones: ['複雜身體構型與生態位快速分化（寒武紀等）'],
    meaning: '生物信息與生態結構複雜度躍升。',
    lines: ['信息', '時間'],
    prose: '約五億四千萬年前起，顯生宙開端前後，複雜身體構型與生態位快速分化（常以寒武紀大爆發等事件為公共敘事節點）。多細胞組織、感官與運動能力使生物信息與生態結構複雜度躍升。其後數億年中，海洋與陸地生態系反覆更迭，為哺乳動物與靈長類譜系留下深遠的生態背景。\n\n寒武紀前後的化石突然變多，一部分是因為硬殼、牙齒與骨骼開始能夠保存，一部分是因為捕食關係真的在變。更早的大型軟體印痕，身體計畫與後來的兩側對稱動物不完全連續。特異保存的頁岩把軟組織也留下，讓人看見附肢、腸與眼的分化，但頁岩捕集的是特定海底，不是全球普查。其後的輻射各自把生態位再填一次。本節用顯生宙標出可保存身體構型成為常態的這一段，細節、門類清單與類群更替交給地球生命長文。這裡只留下：信息不再只存在於代謝網絡，也寫進了可以化石化的形態。',
  },
  {
    n: 10,
    name: '人族前生物圈',
    short: '前生物圈',
    era: '約 6600 萬年前 → 約 700 萬年前',
    milestones: ['哺乳動物輻射', '森林—草原環境與靈長類譜系適應'],
    meaning: '為人族出現準備生態與生理前提；在此交接入類起源頁。',
    lines: ['物質', '時間'],
    prose: '約六千六百萬年前非鳥恐龍等類群大規模消失後，哺乳動物輻射加速；其後森林—草原環境變遷，與靈長類譜系的適應並行。約七百萬年前，主流綜述認為早期人族／人科在非洲開始分化——宇宙史敘事在此收束，交接入類起源頁。本階段只鋪生態與生理前提，不展開人屬細節。\n\n白堊紀末的撞擊與火山活動清空了一批生態位之後，哺乳動物並沒有立刻變成今日的各個目。古新世到始新世是體型與食性重新鋪開的時期，靈長類的早期成員出現在溫暖森林裡。再往後，草地擴張、高冠牙與草原有蹄類是新生代後期的陸相主線，和人族沒有簡單的單線因果。人族與黑猩猩譜系分途的分子鐘與化石，主流放在約七百萬年前的非洲，屬種名稱仍會隨新標本移動。直立行走的生物力學、石器技術與走出非洲的路徑，證據類型已經換成化石、石器組合與古代基因組，那些敘事在人類起源時間線。宇宙長河若繼續寫人屬，就會把自然史與後來的文明史疊成同一套年表，兩者的時間分辨率並不相同。',
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

export const COSMOS_SCALES: ReadonlyArray<{ name: string; size: string }> = [
  { name: '可觀測宇宙', size: '約 930 億光年' },
  { name: '宇宙網', size: '約數億光年' },
  { name: '本星系群', size: '約 1000 萬光年' },
  { name: '銀河系', size: '約 10 萬光年' },
  { name: '日球層', size: '約 120 天文單位' },
  { name: '地月系統', size: '約 38.4 萬公里' },
  { name: '地球', size: '約 1.27 萬公里' },
];

export function cosmosIndexable(): boolean {
  return COSMOS_STAGES.length === 10 && cjkChars(cosmosProse()) >= COSMOS_MIN_CHARS;
}

const CIV = '/static/civilization';

export function cosmoCoverImg(stage: CosmoStage, eager: boolean): string {
  const base = `${CIV}/cosmo-stage-${stage.n}-cover`;
  const loading = eager ? 'eager' : 'lazy';
  const priority = eager ? ' fetchpriority="high"' : '';
  const alt = `${stage.name}：溫和示意，年代為約數`;
  return `<img src="${base}-640w.webp" srcset="${base}-400w.webp 400w, ${base}-640w.webp 640w, ${base}-1280w.webp 1280w" sizes="(max-width: 640px) 100vw, 400px" width="640" height="400" alt="${esc(alt)}" loading="${loading}"${priority} decoding="async" onerror="this.hidden=true" />`;
}


export function renderCosmosArticle(): string {
  return renderThreadArticle('cosmos');
}
