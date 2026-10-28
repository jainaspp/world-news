import { cjkChars, esc, safeHttp } from '../contentPage.js';

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
  /** Thick prose: one or more paragraphs, each rendered as its own <p>. */
  prose: string | string[];
}

function proseParas(stage: CosmoStage): string[] {
  return Array.isArray(stage.prose) ? stage.prose : [stage.prose];
}

export interface CosmoSource {
  name: string;
  note: string;
  url: string;
}

const LINES: CosmoLine[] = ['能量', '物質', '信息', '時間'];

export const COSMOS_TITLE = '宇宙長河・深時間';

export const COSMOS_LEDE = '在人類起源與文明編年之前，尚有更深的時間長河：宇宙如何展開能量與時空，冷凝出物質與恆星，結成宜居地球，並讓信息在生命層級累積。本頁以十階段勾勒主流綜述粗線，標以「能量 · 物質 · 信息 · 時間」；年代一律「約」。人類對起源亦有文化與信仰想像，本頁只述科學共識。約七百萬年前交接入類起源。';

/** Page-end handoff. The origins link is the fixed anchor at about seven million years ago. */
const HANDOFF_LEAD = '約七百萬年前，演化進入人族階段：深時間的能量、物質與生命信息，已铺就宜居地球與複雜生物圈。自此之後的化石、石器與基因組故事，請繼續閱讀本站';
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
    prose: [
      '主流綜述認為，約一百三十八億年前，時空經歷極短暫的暴脹，其後能量轉化為物質與輻射，宇宙進入可觀測的熱密開端。基本粒子與輻射場在此奠基，為一切後續結構提供能量與時間的初始條件。歐洲空間局等公共科普把早期宇宙描述為由夸克、電子、中微子與光子構成的均勻浴；夸克在開端約一秒內結合成質子與中子。年代一律標「約」，不作絕對精準年表。',
      '觀測上，宇宙微波背景是這一早期歷史留下的可核對遺跡：它是再結合時代之後自由傳播至今的「餘輝」。歐洲空間局普朗克任務與美國宇航局相關任務，均以全天微波圖量測該背景的溫度與偏振細微起伏。這些起伏被理解為後來星系與大尺度結構得以成長的「種子」痕跡，而不是後世才疊加上去的噪聲。',
      '暴脹本身屬主流宇宙學框架中的早期加速膨脹假說，用以說明可觀測宇宙的大尺度均勻與平坦等性質；細節參數仍隨觀測更新。個別暴脹模型的能階與重加熱路徑仍有討論，本頁不採納單一理論為定論。讀者宜把本階讀作：能量與時間的初始條件如何被寫入可觀測宇宙，而不是某一天的「爆炸現場」。',
      '本階標籤為能量與時間。後續核合成、再結合與第一代恆星，都建立在這一熱密開端之上；宇宙長河不把此節併入文明編年，只為宜居地球與生命信息铺下最遠的前史。',
    ],
  },
  {
    n: 2,
    name: '原初核合成',
    short: '核合成',
    era: '約大爆炸後數分鐘',
    milestones: ['氫、氦（及微量鋰）原子核形成'],
    meaning: '恆星燃料與後續化學的物質起點。',
    lines: ['物質', '能量'],
    prose: [
      '約大爆炸後數分鐘內，宇宙仍極熱極密，質子與中子碰撞形成氫、氦原子核，以及微量鋰等輕核。歐洲空間局「宇宙時代」科普敘事把這一窗口概括為：約三分鐘後，質子與中子結合成氫核與氦核。其後溫度下降，核合成大致停歇，這些輕核成為後續恆星燃燒與化學演化的物質起點。',
      '今日宇宙中氫、氦的豐度比例，與原初核合成計算高度吻合，是大爆炸圖景的重要支柱。公共科普常強調：觀測到的輕核豐度，與「熱大爆炸」模型的預期相一致，因而構成可核對的證據鏈之一，而不是孤立口號。鋰等微量輕核的細節仍有觀測與理論張力，宜標「約／綜述區間」。',
      '本階的意義在於：恆星尚未點燃之前，宇宙已備好最簡單的核燃料。後續恆星內部的核聚變，才能把重於氦的元素逐步合成；沒有這一物質起點，就不會有行星岩石與生命化學所需的金屬豐度。原初鋰豐度的精確測值與模型偏差幅度仍待進一步核對，本頁不寫死數字。',
      '本階標籤為物質與能量。它回答的是「最早的原子核從何而來」，而把重元素與行星盤留給其後數階。',
    ],
  },
  {
    n: 3,
    name: '宇宙透明與第一代恆星',
    short: '第一代星',
    era: '約 133–135 億年前',
    milestones: ['再結合使宇宙對光透明', '第一代恆星點燃'],
    meaning: '重元素開始在恆星內部合成，金屬豐度起步。',
    lines: ['能量', '物質'],
    prose: [
      '約大爆炸後三十八萬年，電子與原子核結合為中性原子，宇宙對光變得透明，宇宙微波背景自此自由傳播。歐洲空間局把這一節點稱為再結合時代，並說明其後進入「黑暗時代」：尚無個別恆星光源，普通物質主要以氫、氦雲的形式存在。普朗克任務量測的微波背景，即是那一時刻的全天快照。',
      '其後約數億年——對應今日宇宙年齡約一百三十三至一百三十五億年前——第一代恆星在引力塌縮中點燃，結束黑暗時代。這些巨星內部開始合成重於氦的元素，金屬豐度由此起步，為行星與複雜化學鋪路。美國宇航局韋伯望遠鏡早期宇宙科普，強調以紅外觀測追蹤高紅移星系與早期恆星形成的線索；具體「第一代」樣本的認定仍隨新數據修訂。第一代恆星質量譜與金屬污染時標的精確區間仍待進一步核對。',
      '再電離時代則發生在約大爆炸後兩億年至約十億年之間：第一代星與早期星系發出的紫外光，使星際介質中的氫再度被電離。歐洲空間局敘事把其寫成緩慢、長時段的過程，而非瞬間切換。宇宙正午（星形成高峰）更晚，本頁只作背景，不另開階段。',
      '本階標籤為能量與物質。它把「光可自由傳播」與「重元素開始合成」兩條線索並置，使讀者理解：可觀測的宇宙史，既依賴微波背景，也依賴其後恆星工廠的點燃。',
    ],
  },
  {
    n: 4,
    name: '星系與大尺度結構',
    short: '星系結構',
    era: '約 100–130 億年前起',
    milestones: ['星系、星系群與暗物質暈穩固'],
    meaning: '物質在引力下組織成可長期演化的結構骨架。',
    lines: ['物質', '時間'],
    prose: [
      '約一百至一百三十億年前起，物質在引力與暗物質暈作用下逐漸聚集成星系、星系群與絲狀大尺度結構。恆星生成、超新星回饋與星系合併反覆改寫氣體與重元素分布，形成可長期演化的結構骨架。今日觀測到的星系網與空洞格局，即是這段緩慢組織過程的結果。',
      '歐洲空間局蓋亞任務以高精度測量銀河系內外大量恆星的位置、運動與性質，為「本星系如何組裝而成」提供可核對的三维地圖入口；其科學觀測已於約二零二五年一月結束，後續數據釋出仍在進行。讀者宜把蓋亞理解為觀測工具敘事，而不是把任一數據發行版寫成宇宙年齡的重新定義。',
      '暗物質在公共科普中被表述為：透過引力影響可見物質分布、但尚未被直接認定為某種粒子的成分。本頁採「主流綜述」語氣，不把某一候選粒子寫成定案。暗物質粒子種類與自相互作用截面仍待進一步核對。星系合併與星暴的細節時間表，亦隨巡天更新。',
      '本階標籤為物質與時間。它說明結構如何在漫長時間裡被引力組織起來，使後續太陽系與地球得以落在一個可長期演化的星系環境之中。',
    ],
  },
  {
    n: 5,
    name: '太陽系形成',
    short: '太陽系',
    era: '約 46 億年前',
    milestones: ['原行星盤坍縮', '行星吸積成形'],
    meaning: '地球獲得穩定軌道與持續的恆星能量輸入。',
    lines: ['能量', '物質'],
    prose: [
      '約四十六億年前，一片星際氣體與塵埃雲塌縮為旋轉的原行星盤：中心點燃為太陽，盤內固體顆粒吸積為行星、衛星與小天體。美國宇航局太陽系事實頁把太陽系年齡與行星形成敘事標為公共約數；美國地質調查局地質年代表則說明：地球年齡難以直接用「原始地殼」單獨測得，因板塊過程會回收早期岩石，較穩妥的做法是把地球與太陽系其他固態天體視為大致同時形成。',
      '隕石放射性測年顯示，太陽系固態體形成約在四十五點三億至四十五點八億年前的窗口；地球的最佳年齡估計常引用約四十五點四億年，並與鐵隕石等鉛同位素約束相耦合。月球樣品中較古老岩石亦落在約四十四至四十五億年量級，提供鄰近天體的下限。數字一律「約」，本頁不寫到無法辯護的個位。',
      '美國宇航局「行星如何形成」科普，把原行星盤中的塵埃聚合成行星核、氣體吸積成氣態巨行星等過程，作為主流示意；具體遷移軌道與巨撞擊細節仍有模型競爭。月球形成的巨撞擊參數與時間精確值仍待進一步核對。地球由此獲得相對穩定的軌道，以及來自恆星的持續能量輸入。',
      '本階標籤為能量與物質。宇宙長河至此從「星系環境」收到「我們的行星系統」，為下一階液態水與宜居條件做交接。',
    ],
  },
  {
    n: 6,
    name: '早期地球與液態水',
    short: '液態水',
    era: '約 44–40 億年前',
    milestones: ['地殼分化', '海洋與水循環趨向穩定'],
    meaning: '為複雜化學與能量循環提供環境舞台。',
    lines: ['物質', '能量'],
    prose: [
      '約四十四至四十億年前，地球經歷分化，形成地核、地幔與早期地殼；撞擊與火山活動頻繁，但液態水逐漸在地表積聚，海洋與水循環趨向穩定。穩定的水環境為複雜化學、能量交換與後續生命化學提供舞台。美國宇航局地球事實頁把地球描述為太陽系中已知唯一確認存在生命的行星，並強調液態水與適宜能量流的關鍵角色。',
      '美國地質調查局指出：地球上已發現超過約三十五億年的古老岩石，分布于多個大陸；西澳沉積岩中的鋯石顆粒可達約四十三億年，顯示「地球歷史在這些岩石沉積之前早已開始」。這些證據支持早期已有水體與沉積過程，但不等於全球均一的溫和海洋。晚期重轟擊強度與持續時間的具體曲線仍待進一步核對。',
      '板塊構造把地球外層描述為若干相對運動的剛性板塊，騎在更熱、更易流動的物質之上；這一框架統一解釋了地震帶、火山帶與大山脈的分布。對本階而言，重點不是現代板塊圖，而是：分化與構造活動長期改寫地表與揮發分循環，使液態水環境得以維持或反覆重建。',
      '本階標籤為物質與能量。細節仍隨地質與同位素證據修訂，宜標「約」。宇宙長河在此只寫宜居舞台，生命起源的假說競爭改在下一階與地球生命頁展開。',
    ],
  },
  {
    n: 7,
    name: '生命起源',
    short: '生命起源',
    era: '約 40–35 億年前',
    milestones: ['可自我複製／代謝的分子系統出現'],
    meaning: '信息開始在生物層級傳遞與累積。',
    lines: ['信息', '物質'],
    prose: [
      '約四十至三十五億年前，地球上出現可自我複製或可持續代謝的分子系統——生命起源。具體路徑（如熱液噴口、潮汐池、黏土表面等）假說並存，證據仍在累積，本頁不採納單一理論為定論。自此，信息開始在生物層級傳遞、突變與選擇中累積，與純粹物理化學過程分道。最早化石與同位素跡象時間窗口仍有學術討論。',
      '美國宇航局天體生物學把該領域界定為研究生命的起源、演化與在宇宙中的分布；並強調：迄今尚未發現地球之外的生命，但透過極端環境生命、化學起源實驗與宜居探測，科學邏輯上的「他處生命可能性」持續被檢驗。公共定義之一把生命表述為「能夠進行達爾文式演化的自我維持化學系統」，本頁僅作溫和入口，不把定義之爭寫成定案。',
      '宇宙長河在此只保留粗線：信息開始在生物層級編碼與傳遞。從早期代謝、大氧化到顯生宙各階的厚寫，見本站地球生命頁；本階避免把單一化石點或單一地點寫成全球「第一生命」日曆。最古老可靠的生物成因碳同位素與微化石的下限年代仍待進一步核對。',
      '本階標籤為信息與物質。它是宇宙四線中「信息」首次成為主線的節點，也是後續交接地球生命與人類起源的邏輯起點。',
    ],
  },
  {
    n: 8,
    name: '光合作用與大氧化',
    short: '大氧化',
    era: '約 24–20 億年前',
    milestones: ['氧氣在大氣中顯著累積'],
    meaning: '全球能量流與化學環境改寫，複雜代謝路徑打開。',
    lines: ['能量', '信息'],
    prose: [
      '約二十四至二十億年前，產氧光合作用使大氣與海洋中的氧氣顯著累積，史稱大氧化事件。全球能量流與化學環境被改寫：好氧代謝路徑打開，同時許多厭氧生態位受壓。氧氣也改變地表礦物與氣候反饋，為後來更複雜的多細胞生命準備化學條件。時間與強度細節仍有綜述區間。',
      '地球生命頁把同一粗線寫得更厚：可自我維持的代謝或複製，常被放在約四十億至三十五億年前的窗口；其後大氧化使游離氧在大氣與淺海顯著累積。條帶狀鐵建造等礦物記錄，被公共敘事用來提示鐵與氧的反覆相遇。本頁不重複地球生命的深讀結構，只保留宇宙長河尺度的能量—信息交接。',
      '好氧呼吸一旦可行，單位有機物所能調動的能量往往高於多數厭氧途徑，為後來更大的細胞與食物網留下化學餘地。這是自然史意義上的「產物」，不是技術產品。大氧化是否為單次或多次脈衝、以及與甲烷菌等生態位消長的精確耦合，仍待進一步核對。',
      '本階標籤為能量與信息。讀者若需各階環境與優勢類群，應轉入地球生命；宇宙長河在此只回答：全球化學環境如何被光合信息系統改寫。',
    ],
  },
  {
    n: 9,
    name: '多細胞與顯生宙輻射',
    short: '顯生宙',
    era: '約 5.4 億年前起',
    milestones: ['複雜身體構型與生態位快速分化（寒武紀等）'],
    meaning: '生物信息與生態結構複雜度躍升。',
    lines: ['信息', '時間'],
    prose: [
      '約五億四千萬年前起，顯生宙開端前後，複雜身體構型與生態位快速分化（常以寒武紀大爆發等事件為公共敘事節點）。多細胞組織、感官與運動能力使生物信息與生態結構複雜度躍升。其後數億年中，海洋與陸地生態系反覆更迭，為哺乳動物與靈長類譜系留下深遠的生態背景。',
      '地球生命頁提醒：埃迪卡拉生物群約在五億七千萬至五億四千萬年前已出現多種大型軟體生物；左右對稱、分節、具消化與運動構造的動物，則在寒武紀化石記錄中迅速增多。「大爆發」描述的是地質時間上的相對加快，不是一日之內的事件，也不是此後不再有新門類。大氣與海水含氧量已高於前寒武紀多數區間，但局部缺氧仍常見。',
      '顯生宙其後包含多次生態系更替與生物大滅絕；本階在宇宙長河中只作粗線，不展開各紀詳表。寒武紀與埃迪卡拉的連續性、以及「爆發」幅度的量化指標，仍待進一步核對。陸地植物與脊椎動物上岸等節點，改在地球生命對應階段閱讀。',
      '本階標籤為信息與時間。它標示生物信息結構複雜度的躍升，並把敘事指向其後哺乳動物輻射與人族前生物圈。',
    ],
  },
  {
    n: 10,
    name: '人族前生物圈',
    short: '前生物圈',
    era: '約 6600 萬年前 → 約 700 萬年前',
    milestones: ['哺乳動物輻射', '森林—草原環境與靈長類譜系適應'],
    meaning: '為人族出現準備生態與生理前提；在此交接入類起源頁。',
    lines: ['物質', '時間'],
    prose: [
      '約六千六百萬年前非鳥恐龍等類群大規模消失後，哺乳動物輻射加速；其後森林—草原環境變遷，與靈長類譜系的適應並行。約七百萬年前，主流綜述認為早期人族／人科在非洲開始分化——宇宙史敘事在此收束，交接入類起源頁。本階段只鋪生態與生理前提，不展開人屬細節。',
      '史密森尼人類起源計劃的公共導論指出：人屬與其他猿類分開後的演化歷程，科學證據支持約六百萬年量級的時間尺度；雙足行走等關鍵特徵在約四百多萬年前已可辨認，而大腦擴大、工具與語言等能力更晚才顯著。化石個體樣本已累計數千，但仍有物種僅由少量標本代表，年表持續修訂。',
      '宇宙長河與地球生命、人類起源的分工應保持清晰：宇宙頁交代能量、物質與生命信息如何铺就宜居地球與複雜生物圈；地球生命厚寫顯生宙至交接人族；人類起源自約七百萬年前起展開化石、石器與基因組故事。三者前後銜接、互不覆蓋，亦不併入文明編年十階。人族／黑猩猩譜系分化的基因組鐘精確區間仍待進一步核對（公共敘事常引用約六至八百萬年量級）。',
      '本階標籤為物質與時間。頁尾交接句保持不變：約七百萬年前進入人族階段，請繼續閱讀人類起源時間線；文明制度與技術貨幣編年另見文明編年。',
    ],
  },
];

export const COSMOS_SOURCES: CosmoSource[] = [
  { name: 'NASA Science · Universe Overview', note: '宇宙史、暴脹、核合成、再結合總覽', url: 'https://science.nasa.gov/universe/overview/' },
  { name: 'NASA Science · The Big Bang', note: '大爆炸與早期宇宙科普', url: 'https://science.nasa.gov/universe/the-big-bang/' },
  { name: 'ESA · Cosmic eras', note: '宇宙時代劃分（再結合、黑暗時代、再電離等）', url: 'https://www.esa.int/Science_Exploration/Space_Science/Cosmic_eras' },
  { name: '中國科學院國家天文台 · 科學傳播資源', note: '國內天文科普文章與視頻入口', url: 'https://www.nao.cas.cn/ncb/kx/' },
  { name: 'NASA Science · Solar System Facts', note: '太陽系形成約 46 億年等公共敘事', url: 'https://science.nasa.gov/solar-system/solar-system-facts/' },
  { name: 'NASA Science · Early Universe (Webb)', note: '早期宇宙、第一代恆星相關科普', url: 'https://science.nasa.gov/mission/webb/early-universe/' },
  { name: 'ESA · Planck and the CMB', note: '微波背景餘輝與普朗克全天測量', url: 'https://www.esa.int/Science_Exploration/Space_Science/Planck/Planck_and_the_cosmic_microwave_background' },
  { name: 'USGS · Age of the Earth', note: '隕石測年窗口與地球年齡約數', url: 'https://pubs.usgs.gov/gip/geotime/age.html' },
  { name: 'Smithsonian · Human Origins Introduction', note: '人族演化約六百萬年量級公共導論', url: 'https://humanorigins.si.edu/education/introduction-human-evolution' },
];

export function cosmosStageHref(stage: number): string {
  return `/civilization/cosmos/#cosmo-${stage}`;
}

/** Essay counted for the index floor. Source URLs and chrome stay out. */
export function cosmosProse(): string {
  return [
    COSMOS_TITLE,
    COSMOS_LEDE,
    ...COSMOS_STAGES.flatMap((stage) => [stage.name, stage.era, ...stage.milestones, stage.meaning, ...proseParas(stage), ...stage.lines]),
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
  return `<figure class="cosmo-scale-nest"><div class="cosmo-scale-frame">${img}</div><figcaption><p class="cosmo-scale-note">空間尺度由大到小，上一級包含下一級所在區域。數字為約數，採主流綜述。第七級收到地球，其後<a href="/civilization/origins/">交接入類起源</a>。</p><ol class="cosmo-scale-levels">${levels}</ol></figcaption></figure>`;
}

function stageSection(stage: CosmoStage): string {
  const points = stage.milestones.map((item) => `<li>${esc(item)}</li>`).join('');
  const paras = proseParas(stage).map((para) => `<p>${esc(para)}</p>`).join('');
  const reveal = stage.n === 1 ? ' civ-reveal civ-reveal--above-fold is-inview' : ' civ-reveal';
  return `<section class="chronicle-stage cosmo-stage${reveal}" id="cosmo-${stage.n}" data-stage="${stage.n}">
    <p class="era">${esc(ordinal(stage.n))} · ${esc(stage.era)}</p>
    <h2 tabindex="-1">${esc(stage.name)}</h2>
    <figure class="civ-figure" data-stage="${stage.n}"><div class="stage-frame stage-cover" data-stage="${stage.n}">${cosmoCoverImg(stage, stage.n === 1)}${paperSeal(stage.n)}</div><figcaption>${esc(stage.name)} · 示意 · 約數</figcaption></figure>
    <ul class="stage-milestones">${points}</ul>
    ${paras}
    <p class="stage-meaning">${esc(stage.meaning)}</p>
    ${lineChips(stage.lines)}
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
    <p>${esc(COSMOS_LEDE.replace(/交接入類起源。$/, ''))}<a href="/civilization/origins/">交接入類起源</a>。</p>
    <p class="deep-time-return"><a href="/civilization/earth/">生命各階的厚寫：地球生命</a></p>
    ${lineChips(LINES)}
    ${starmap()}
    <nav class="chronicle-nav cosmo-nav cosmo-nav-chips" aria-label="跳到宇宙階段">${nav}</nav>
    <div class="civ-progress" aria-hidden="true"></div>
    ${COSMOS_STAGES.map(stageSection).join('')}
    ${scaleNest()}
    <h2>交接地球生命</h2>
    <p>宇宙長河在生命起源、大氧化與顯生宙只作粗線。從早期生命到約七百萬年前的各階，見<a href="/civilization/earth/">地球生命</a>，其後再進入人類起源。</p>
    <h2>交接人類起源</h2>
    <p>${esc(HANDOFF_LEAD)}<a href="/civilization/origins/">人類起源時間線</a>${esc(HANDOFF_MID)}<a href="/civilization/chronicle/">文明編年</a>${esc(HANDOFF_END)}</p>
    <p class="stage-links"><a href="/civilization/earth/">地球生命</a><a href="/civilization/origins/">約七百萬年前，演化進入人族階段</a><a href="/civilization/chronicle/">文明編年</a><a href="/civilization/">返回文明總覽</a></p>
    <h2>來源</h2>
    ${sourceTable()}
    <p class="stage-source">${esc(COSMOS_SOURCE_NOTE)}</p>
    <p class="civ-ai"><span class="badge">AI 整合</span> 本頁由公開科普與主流綜述入口整合，僅供研究與編輯參考。</p>
  </article>`;
}
