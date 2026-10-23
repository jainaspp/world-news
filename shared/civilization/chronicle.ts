import { cjkChars, esc, safeHttp } from '../contentPage.js';
import { CIV_LINES, type CivLine } from './contract.js';
import { milestoneBlockProse, milestoneBlockSources, renderMilestoneBlocks } from './milestoneBlock.js';
import { caseSourceRows, renderCaseNav, renderCasesBeside } from './cases.js';
import { renderLineFilter } from './lineFilter.js';
import { PATTERN_CARDS, patternSourceRows, renderPatternCardsForStage, renderPatternNav } from './patterns.js';
import { FUTURE_DOMAINS, renderFutureBridge } from './future.js';
import { renderSliceReturns } from './renderSlice.js';

export type { CivLine };
export { CIV_LINES };

/** Thick-page floor from the chronicle brief. Below this the page stays noindex. */
export const CHRONICLE_MIN_CHARS = 1200;

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
  /** Shown when the stage has no pattern-card ask. Used in both volume 1 and volume 2. */
  mechanismAsk?: string;
  /** Extra https sources rendered on the stage and merged into the table. */
  moreSources?: { name: string; url: string }[];
}

export interface ChronicleSource {
  stage: string;
  name: string;
  url: string;
}

export const CHRONICLE_TITLE = '文明編年：從採集到智能工具';

export const CHRONICLE_LEDE = [
  '人類文明不是一夜之間出現的城市燈光，而是一條可被分段閱讀的長河。本頁分作三卷：卷一古，寫採集到商路的積累；卷二今，寫科學方法到本世紀的工具；卷三未來，只留章門，展望全文仍在總覽。卷內刻度標出一至兩個界定性里程碑——沒有它們，其後的社會形態很難想像——並用「能量 · 信息 · 制度 · 貨幣」四線標籤，提示讀者該節點主要改寫了哪一類基礎設施。',
  '年代一律寫作「約」或「主流綜述」：考古測年、文獻與基因組證據持續更新，精確到年往往並無意義。階段一與階段二的深時間細節，另見本站人類起源時間線長頁；本頁只保留銜接所需的約略窗口。本頁只提供溫和的科技、經濟與文化史觀察，方便讀者把首頁的今日切片掛回從前到今的連續故事。',
].join('\n');

export const CHRONICLE_HOW = '第一，先看三卷扉頁，確認自己在古、今或未來。第二，留意每節的四線標籤：例如工業革命同時拉高「能量」與「信息」速度，而紙幣與跨國清算主要落在「貨幣」線。第三，需要核對時，翻至頁底來源表；博物館與國際組織的公共頁面是本站優先引用的入口。本地讀者亦可把香港科學館、太空館等地標，理解為城市向公眾講解自然史與技術史的溫和節點，而非替代學術年表。';

export interface ChronicleChapter {
  id: 'ch-ancient' | 'ch-now' | 'ch-future';
  volume: string;
  name: string;
  era: string;
  lede: string;
  /** Stages that belong to the chapter. Future is a door and has none. */
  stages: readonly number[];
}

/** Three volumes over the ten anchors. Stage numbers stay the in-volume scale. */
export const CHRONICLE_CHAPTERS: readonly ChronicleChapter[] = [
  {
    id: 'ch-ancient',
    volume: '卷一',
    name: '古',
    era: '約三百萬年前至約公元一五〇〇年',
    lede: '採集、農業、城市、帝國與商路，在此收成可核對的刻度。本卷正文按階段加厚，標出時間線節點與能量、物質、信息、時間的交接；深時間與人屬細節仍交宇宙長頁與起源長頁。',
    stages: [1, 2, 3, 4, 5],
  },
  {
    id: 'ch-now',
    volume: '卷二',
    name: '今',
    era: '約公元一五〇〇年起',
    lede: '科學方法、工業能量、全球信用、信息網絡與本世紀工具，是仍可對照新聞切片的一章。章名是今。新聞切片在首頁。',
    stages: [6, 7, 8, 9, 10],
  },
  {
    id: 'ch-future',
    volume: '卷三',
    name: '未來',
    era: '章門 · 不設年代',
    lede: '未來章門只連到總覽既有展望。面板全文留在總覽，本頁不搬移，也不另立第十一階。',
    stages: [],
  },
];

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
    mechanismAsk: '圍火與語言如何把個體經驗變成群體知識？',
    moreSources: [
      { name: '史密森尼學會國家自然史博物館「人類起源計劃」', url: 'https://humanorigins.si.edu/' },
      { name: '倫敦自然史博物館「現代人如何走出非洲」', url: 'https://www.nhm.ac.uk/discover/when-how-did-modern-humans-homo-sapiens-spread-out-of-africa.html' },
      { name: '聯合國教科文組織世界遺產「周口店北京人遺址」', url: 'https://whc.unesco.org/en/list/449/' },
      { name: '中國科學院古脊椎動物與古人類研究所', url: 'http://www.ivpp.ac.cn/' },
    ],
    prose: [
      '宇宙長河把敘事交到約七百萬年前非洲的人科分化，其後的深時間由本站宇宙長頁與人類起源長頁承接。本階段從約三百萬年前說起：南方古猿等早期人族已經直立行走，拉埃托利約三百六十萬年前的足印化石，把雙足步態留下明確物證；行走解放了雙手，為其後的工具與搬運預留了可能。',
      '約二百六十萬年前，東非出現主流綜述歸入奧杜威模式的最早石器組合；更早的候選遺址（如洛邁奎）年代與性質仍在評估。工具與腦量在數十萬年尺度上互相拉動：人族腦量由約四五百立方厘米增至智人的約一千三百至一千五百立方厘米，肉食與熟食帶來的熱量被視為條件之一，先後細節仍在修訂。',
      '控制用火是本階段最重要的能量轉折。主流綜述把「習慣性用火」的窗口放在約一百萬至四十萬年前之間，證據包括燒過的骨骼、灰燼與耐熱土層；個別遺址（如周口店）的用火解釋仍反覆討論，宜標約數。熟食提高單位食物的可用能量，圍火而坐也改寫了群體在夜間交換訊息的方式。',
      '約三十萬年前，非洲已出現形態接近現代智人的化石（如摩洛哥傑貝爾依羅）；約七萬至五萬年前的擴散是走出非洲的主流窗口，更早的零星遷徙亦見蹤跡。智人與尼安德特人、丹尼索瓦人等古人類相遇，基因組證據顯示留有少量交流痕跡——測年與測序仍持續更新，屬活躍研究區。',
      '複雜語言沒有直接化石證據，只能由象徵行為側寫：赭石顏料、貝殼珠飾與洞穴壁畫約在十萬至四萬年間漸多，遠距取得的黑曜石亦提示交換網絡。共享故事讓親緣之外的個體協作，文化演化的速度自此超過生物演化。能量線由火啟動，信息線由語言啟動，物質線上的石器與時間線上的深時間約數，是本階段另外兩條暗軸。',
      '採集狩獵不是「原始」的同義詞：末次冰期結束前，智人已遍佈除南極以外的各大洲，技術與生態知識在各地累積數萬年。這些積累是農業革命的暗堤。深時間細節與里程碑表，另見本站人類起源時間線。',
    ].join('\n'),
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
    mechanismAsk: '為何多地近乎同時轉向農耕？',
    moreSources: [
      { name: '聯合國糧食及農業組織「全球重要農業文化遺產系統」', url: 'https://www.fao.org/giahs/en/' },
      { name: '聯合國教科文組織世界遺產「良渚古城遺址」', url: 'https://whc.unesco.org/en/list/1592/' },
      { name: '聯合國教科文組織世界遺產「巨石陣與埃夫伯里及相關遺址」', url: 'https://whc.unesco.org/en/list/373/' },
    ],
    prose: [
      '約一萬二千年前，末次冰期結束、全新世氣候轉暖趨穩，農耕與馴化在多個地區先後成形。新仙女木冷回返等氣候波動與農業起源的因果，學界假說並存；主流綜述也不把農業寫成單一中心的發明，而是多地獨立出現：肥沃月灣的小麥與大麥、長江與黃河流域的稻與粟、中美洲的玉米、新幾內亞的塊根作物，以及安第斯的馬鈴薯與藜麥，時間各異，一律標「約」。',
      '馴化以百年至千年計。小麥的落粒軸變為不落，方便收割卻必須靠人播種；玉米由類蜀黍的小穗演成大穗，歷經數千年篩選。人群與作物互相鎖定：馴化反饋一邊改寫植物與牲畜的性狀，一邊改寫人的勞動、飲食與居住。定居不是一日決定，而是作物、牲畜與村落互相拉扯的漫長過程。',
      '以四線交接讀本階段：能量線上，農耕把太陽能定向轉入可食組織，單位土地的熱量產出遠高於採集；物質線上，磨製石器、陶器與倉窖使剩餘可被保管與分配；信息線上，播種、輪作與馴化經驗靠口傳與示範累積；時間線上，農時把年週期刻進群體作息，曆法需求由此萌芽。剩餘與分工，是城市與國家的前置條件。',
      '農業不是單向的進步敘事。骨骼與牙釉證據提示，部分早期農人群出現營養壓力與勞動負荷上升；早期人類學「採集者更閒暇」的說法亦已被反覆修正。兩種生活的工時、營養與風險難以單向比較，利弊並存仍是較穩妥的表述。',
      '恰塔霍裕克等新石器遺址展示了無街道的密集聚落；長江下游的良渚在其後的階段，把稻作剩餘轉為大型水利與城牆。定居、儲存與馴化彼此拉扯數千年；銜接所需的深時間細節，另見本站人類起源時間線，城市正文則由下一階段接手。',
    ].join('\n'),
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
    moreSources: [
      { name: '聯合國教科文組織世界遺產「殷墟」', url: 'https://whc.unesco.org/en/list/1114/' },
      { name: '聯合國教科文組織世界遺產「摩亨朱達羅考古遺址」', url: 'https://whc.unesco.org/en/list/138/' },
      { name: '芝加哥大學古代文化研究所（前稱東方研究所）', url: 'https://oi.uchicago.edu/' },
    ],
    prose: [
      '約公元前三千紀，大型聚落集中倉儲、神廟與工匠，城市在多個流域成形。兩河以南的烏魯克被視為早期城市的代表，高峰人口估計達數萬，實際規模仍有區間；尼羅河谷約於公元前三一〇〇年前後趨向統一國家；印度河的哈拉帕與摩亨朱達羅以規整街巷與覆蓋排水著稱；黃河與長江流域的城址（如良渚、二里頭）亦先後成形，年代與性質仍在討論。',
      '城市首先是一套組織方案。倉儲與配給需要簿記，神廟與城牆需要動員，工匠與市場需要規則——人口密度把面對面協調推到極限，行政與法律由需求拉出。印度河文明以標準化磚與統一度量長距離維持秩序；其文字尚未被公認破譯，城市組織仍是最可靠的閱讀入口。',
      '文字發明是本階段的信息轉折。約公元前三千四百年至三千二百年間，兩河的計數泥籌簡化為泥板符號，楔形文字由計數與清單起步，詩文與法律其後才逐漸上板；埃及聖書體約於同期成形；中國的甲骨文於商代晚期（約公元前十三世紀）已是有體系的漢字，殷墟卜辭顯示王室行政與占卜共用同一套書寫。記錄讓債務、契約與知識第一次可跨代核對。',
      '以四線交接讀：信息線由文字拉開，行政半徑不再受限於記憶；制度線由城市與法律拉開，治理開始可被稽核；能量線上，灌溉與糧倉把流域產出集中調度；貨幣線此時仍未獨立，以糧與金屬按重量計值。史前與有史的分界由此劃開——這是敘事方便，各文明的書寫窗口並不同步。',
      '美索不達米亞古城遺址群、殷墟與摩亨朱達羅的公共遺產頁面，是本節可核對的物質入口；深讀塊與來源表附於本階段之內，頁底另設總表。',
    ].join('\n'),
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
    mechanismAsk: '標準鑄幣如何把信任裝進口袋？',
    moreSources: [
      { name: '聯合國教科文組織世界遺產「秦始皇陵及兵馬俑坑」', url: 'https://whc.unesco.org/en/list/441/' },
      { name: '聯合國教科文組織世界遺產「長城」', url: 'https://whc.unesco.org/en/list/438/' },
      { name: '聯合國教科文組織世界遺產「波斯波利斯」', url: 'https://whc.unesco.org/en/list/114/' },
      { name: '聯合國教科文組織世界遺產「雅典衛城」', url: 'https://whc.unesco.org/en/list/404/' },
    ],
    prose: [
      '約公元前八世紀起，亞歐大陸先後出現以道路、稅制與文書維持的大型政體：阿契美尼德波斯的行省與御道，秦漢的郡縣與馳道，羅馬的道路與法律，孔雀王朝的石刻詔令。命令半徑以千公里計，行政靠標準格式、副本與考課核對——里耶秦簡等出土文書，讓後世能直接讀到基層行政的運作。',
      '同一窗口內，多地的倫理與行政思想成形並被整理為經典。「軸心時代」是二十世紀學者提出的命名框架，不是嚴格同期的事件，其解釋力至今仍有討論；但孔子、佛陀與蘇格拉底一輩的論述先後進入文字，規範開始以文本而非僅以口傳流通，這點有廣泛共識。',
      '金屬鑄幣於約公元前一千紀在多地普及。主流綜述常以呂底亞的電子合金幣為最早鑄幣候選，中國的布幣、刀幣與其後的秦半兩、南亞的打製銀幣在相近的世紀裡各自成形。標準化的成色與重量降低每次交易的檢驗成本；國家以鑄幣支付軍餉並徵收賦稅，信任由熟人網絡轉移到可檢驗的物件上。',
      '以四線交接讀：制度線上，公布法與文書行政讓權力可被援引與稽核；貨幣線上，鑄幣使跨區貿易有共同尺度；信息線上，經典文本化使倫理與行政知識可複製；能量線上，道路與驛傳把糧食與人力的調度半徑拉長。跨區貿易與帝國組織互相餵養，商路時代由此接手。',
      '秦始皇陵兵馬俑、長城、波斯波利斯與雅典衛城的公共遺產頁面，是本節可核對的物質入口；中國錢幣博物館的貨幣通史陳列，展示自先秦至後世金屬鑄幣形制的長程演變，可作溫和的制度與經濟史窗口。',
    ].join('\n'),
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
    mechanismAsk: '一張紙的價值靠什麼維持？',
    moreSources: [
      { name: '聯合國教科文組織世界遺產「絲綢之路：長安－天山廊道路網」', url: 'https://whc.unesco.org/en/list/1442/' },
      { name: '聯合國教科文組織世界遺產「泉州：宋元中國的世界海洋商貿中心」', url: 'https://whc.unesco.org/en/list/1561/' },
      { name: '聯合國教科文組織世界遺產「撒馬爾罕：文化交匯之地」', url: 'https://whc.unesco.org/en/list/603/' },
      { name: '國際敦煌項目（英國國家圖書館）', url: 'https://idp.bl.uk/' },
    ],
    prose: [
      '造紙與印刷把知識複製成本壓到新低。紙在中國成熟後，約於八世紀經中亞傳入阿拉伯世界，其後經北非於約十二世紀進入歐洲；雕版印刷在唐代已用於佛經與曆書，約公元八六八年的《金剛經》是現存最早有明確紀年的印刷書之一，畢昇的活字約於十一世紀中葉見於文獻記載。經卷、曆書與科舉用書得以批量複製，識字與藏書的範圍超出宮廷與寺院。',
      '北宋約十一世紀初，益州商民先行以交子作憑據，官府其後約於一〇二四年設益州交子務、發行官交子，被中國錢幣博物館公共展覽敘述為世界最早的官方紙幣之一。紙的價值不靠物料本身，而靠發行、額度與兌付安排——信用工程在此第一次明顯脫離金屬物料，其後的會子與寶鈔沿用同一課題。',
      '陸海商路同時傳遞貨物與知識。阿拉伯與印度洋水手利用季風往返波斯灣、印度與中國港口，廣州、泉州等港自唐宋設市舶管理；磁羅盤用於航海約於十二世紀見於文獻。絲綢、瓷器與香料之外，天文、曆算與醫學在翻譯與轉口中匯流，敦煌文書正是這張知識網絡的實物見證。',
      '以四線交接讀：信息線上，複製成本下降使知識網絡加密；貨幣線上，紙幣與匯兌把大額結算從運送金屬改為憑據；制度線上，市舶、關稅與驛傳把遠距貿易寫成則例；能量線上，風帆與季風是這一時期最重要的動力來源。跨區交流由商隊與船隊的偶然，轉為可預期的網絡。',
      '絲路廊道、泉州與撒馬爾罕的公共遺產頁面，連同國際敦煌項目的數位文書，是本節可核對的入口；下一卷的科學方法，將在這張複製與貿易的網絡上展開。',
    ].join('\n'),
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
    era: '約公元 1870 年至 1969 年',
    milestones: ['金本位', '布雷頓森林體系', '多邊清算'],
    meaning: '貨幣與信用在全球尺度上被重新編排。',
    lines: ['貨幣', '制度'],
    sourceName: '國際貨幣基金組織｜機構年表',
    sourceUrl: 'https://www.imf.org/external/about/timeline/index.htm',
    mechanismAsk: '遠距結算如何維持可核對的信用？',
    moreSources: [
      { name: '美國聯邦儲備史｜布雷頓森林的創立', url: 'https://www.federalreservehistory.org/essays/bretton-woods-created' },
      { name: '世界銀行檔案｜機構史', url: 'https://www.worldbank.org/en/archive/history' },
      { name: '美國聯邦儲備｜關於聯邦儲備', url: 'https://www.federalreserve.gov/aboutthefed.htm' },
    ],
    prose: '金本位與戰後布雷頓森林安排，把貨幣與信用編排到跨國尺度。本節年代收到約公元一九六九年，不與隨後的信息網絡重疊。國際貨幣基金組織的公開年表，可核對多邊匯率與合作框架的節點。世界銀行與美國聯邦儲備的公共史頁，補充同一窗口的機構沿革。日常電子錢包改在本世紀一節閱讀。此節只作文具與制度說明，不作投資建議。',
  },
  {
    n: 9,
    name: '信息革命',
    short: '信息革命',
    era: '約公元 1970 年至 2009 年',
    milestones: ['互聯網', '萬維網', '在線支付'],
    meaning: '信息處理與遠距協作成本驟降。',
    lines: ['信息', '貨幣'],
    sourceName: '歐洲核子研究組織｜萬維網簡史',
    sourceUrl: 'https://home.cern/science/computing/the-birth-of-the-web/short-history-web/',
    mechanismAsk: '分組交換如何繞過單點故障？',
    moreSources: [
      { name: '萬維網聯盟｜網頁史', url: 'https://www.w3.org/History.html' },
      { name: '互聯網工程任務組｜互聯網協議說明', url: 'https://www.rfc-editor.org/info/rfc791/' },
      { name: '互聯網協會｜互聯網簡史', url: 'https://www.internetsociety.org/internet/history-internet/brief-history-internet/' },
    ],
    prose: '分組交換與互聯網，以及約一九九零年前後公開的萬維網，使知識與服務近乎即時可達。本節年代由約公元一九七零年收到約公元二零零九年，不與前一節的貨幣安排相交，也不把二零一零年以後的通用智能工具算進本節。歐洲核子研究組織保存的萬維網簡史，是可核對的技術史入口。早期在線支付屬於這一窗口的結算實驗。',
  },
  {
    n: 10,
    name: '本世紀／當代',
    short: '本世紀',
    era: '約公元 2010 年起',
    milestones: ['數字貨幣形態', '生命科學工具', '智能工具通用化'],
    meaning: '貨幣、生命與智能的工具形態在本世紀同時改寫（溫和科技敘事）。',
    lines: ['貨幣', '信息'],
    sourceName: '美國國家標準與技術研究院｜物理測量實驗室',
    sourceUrl: 'https://www.nist.gov/pml',
    mechanismAsk: '公開工具改寫之後，出處如何被核對？',
    moreSources: [
      { name: '美國國家人類基因組研究所｜測序成本數據', url: 'https://www.genome.gov/about-genomics/fact-sheets/DNA-Sequencing-Costs-Data' },
      { name: '政府間氣候變化專門委員會｜第六次評估綜合報告', url: 'https://www.ipcc.ch/report/ar6/syr/' },
      { name: '世界衛生組織｜氣候變化與健康實況', url: 'https://www.who.int/news-room/fact-sheets/detail/climate-change-and-health' },
      { name: '國際貨幣基金組織｜機構年表', url: 'https://www.imf.org/external/about/timeline/index.htm' },
    ],
    prose: [
      '數字貨幣形態、生命科學工具與人工智能的通用化，是本世紀已經進入公共機構頁面的工具事實，不是對以後世紀的預測。本節把年代收到約公元二零一零年起，只寫可核對的形態，不把展望六域的條件句混進階段正文。',
      '其一，測量與智能工具。公開模型可以檢索、翻譯與起草，個人終端與機構流程都已接上。工具是否可核對，先要有公共的尺。美國國家標準與技術研究院的物理測量實驗室，維持可追溯的測量標準。本站只記工具如何改寫檢索與草稿，不把模型輸出當成已經核對的事實。',
      '其二，貨幣形態。電子錢包已進入日常小額場景。跨國貨幣合作的公開節點，仍可對照國際貨幣基金組織的機構年表。本節不作投資建議，也不比較任何一種代幣的收益。',
      '其三，生命科學工具。測序成本長期下降之後，基因組資訊進入實驗室與公共衛生的問答。美國國家人類基因組研究所公開說明人類基因組測序成本的下降軌跡。這裡只寫工具進入實驗流程，不寫人群高下，也不把編輯技術寫成已經完成的社會改造。',
      '其四，行星約束進入當代日程。政府間氣候變化專門委員會第六次評估的綜合報告，把升溫、極端事件與適應窗口寫成可核對的綜述。世界衛生組織的氣候變化與健康實況頁，說明熱壓力與衛生服務如何被放進同一張公共說明。本節不另造時鐘，也不把監測讀數寫進展望正文。',
      '讀者若要看能量宜居、信息可信、制度協作、生物譜系、技術能力階與生存風險的條件句，應走未來章門，進入總覽既有分域。今日切片仍在首頁。一則關於支付、測序、模型或極端天氣的標題，可以掛回貨幣、信息或能量中的一至兩條線，再決定要不要打開條件門。本階段名為本世紀／當代。編年在此止步，不另立第十一階。',
    ].join(''),
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

/**
 * Display order comes from the data: stages render sorted by `n`, so the
 * canonical order is configurable in one place while `#stage-N` anchors stay
 * stable regardless of array order.
 */
export function chronicleStagesOrdered(): ChronicleStage[] {
  return [...CHRONICLE_STAGES].sort((a, b) => a.n - b.n);
}

export function chronicleCardMilestones(stage: ChronicleStage): string[] {
  return stage.milestones.slice(0, 2);
}

export function chronicleCardProse(): string {
  return chronicleStagesOrdered().map((stage) => [
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
    ...chronicleStagesOrdered().flatMap((stage) => [stage.name, stage.era, ...stage.milestones, stage.meaning, stage.prose, ...stage.lines, milestoneBlockProse(stage.n)]),
    CHRONICLE_SUMMARY,
    CHRONICLE_BRIDGE,
    ...CIV_LINES,
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

/** 640×400 stage cover, with a 1280w candidate for high-DPR. onerror hides a missing file so the paper seal remains. */
function stageCoverImg(stage: ChronicleStage, eager: boolean): string {
  const base = `${CIV}/civ-stage-${stage.n}-cover`;
  const loading = eager ? 'eager' : 'lazy';
  const priority = eager ? ' fetchpriority="high"' : '';
  const alt = `${stage.name}：溫和示意，年代為約數`;
  return `<img src="${base}-640w.webp" srcset="${base}-400w.webp 400w, ${base}-640w.webp 640w, ${base}-1280w.webp 1280w" sizes="(max-width: 640px) 100vw, 400px" width="640" height="400" alt="${esc(alt)}" loading="${loading}"${priority} decoding="async" onerror="this.hidden=true" />`;
}

export function chronicleChapterHref(id: ChronicleChapter['id']): string {
  return `/civilization/chronicle/#${id}`;
}

/** Same three entry cards on the home band and the hub. No stage dots, no stage cards. */
export function renderVolumeCards(): string {
  const cards = CHRONICLE_CHAPTERS.map((chapter) => `<article class="volume-card"><a href="${chronicleChapterHref(chapter.id)}"><p class="era">${esc(chapter.volume)}</p><h3>${esc(chapter.name)}</h3><p>${esc(chapter.lede)}</p></a></article>`).join('');
  return `<div class="volume-grid">${cards}</div>`;
}

/** Hub board. The four-line filter stays for pattern cards; stage cards are not repeated here. */
export function renderVolumeBoard(): string {
  const stages = chronicleStagesOrdered();
  return `<section class="chronicle-board" aria-label="三卷入口">
    <div class="chronicle-board-head">
      <h2>文明編年</h2>
      <a href="/civilization/chronicle/">打開完整編年</a>
    </div>
    <p class="chronicle-board-note">三卷入口。古、今、未來各進編年扉頁；卷內刻度只在編年頁展開。</p>
    ${renderLineFilter(stages.map((stage) => stage.lines), PATTERN_CARDS.map((card) => card.lines))}
    <div class="volume-board">${renderVolumeCards()}</div>
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
  const more = (stage.moreSources ?? []).map((item) => {
    const itemHref = sourceHref(item.url);
    return itemHref ? `<li><a href="${itemHref}">${esc(item.name)}</a></li>` : '';
  }).join('');
  const moreSources = more ? `<ul class="stage-sources">${more}</ul>` : '';
  const ask = stage.mechanismAsk ? `<p class="stage-ask">機制問題：${esc(stage.mechanismAsk)}</p>` : '';
  const origins = stage.origins ? '<p class="stage-links"><a href="/civilization/origins/">詳見人類起源時間線</a></p>' : '';
  const reveal = stage.n === 1 ? ' civ-reveal civ-reveal--above-fold is-inview' : ' civ-reveal';
  const paragraphs = stage.prose.split('\n').filter((paragraph) => paragraph.trim()).map((paragraph) => `<p>${esc(paragraph)}</p>`).join('');
  return `<section class="chronicle-stage${reveal}" id="stage-${stage.n}" data-stage="${stage.n}">
    <p class="era">${esc(ordinal(stage.n))} · ${esc(stage.era)}</p>
    <h2>${esc(stage.name)}</h2>
    <figure class="civ-figure" data-stage="${stage.n}"><div class="stage-frame">${stageCoverImg(stage, stage.n === 1)}${paperSeal(stage.n)}</div><figcaption>${esc(stage.name)} · 示意 · 約數</figcaption></figure>
    <ul class="stage-milestones">${points}</ul>
    ${paragraphs}
    <p class="stage-meaning">${esc(stage.meaning)}</p>
    ${lineChips(stage.lines)}
    ${ask}
    ${renderFutureBridge(stage.n)}
    ${renderMilestoneBlocks(stage)}
    ${renderPatternCardsForStage(stage.n)}
    ${renderCasesBeside('/civilization/chronicle/', `stage-${stage.n}`)}
    ${source}
    ${moreSources}
    ${origins}
  </section>`;
}

function renderChapterBand(chapter: ChronicleChapter): string {
  const stages = chronicleStagesOrdered().filter((stage) => chapter.stages.includes(stage.n));
  const chips = stages.map((stage) => `<a class="chip" href="#stage-${stage.n}">${ordinal(stage.n)} ${esc(stage.short)}</a>`).join('');
  const nav = chips ? `<nav class="chronicle-nav" aria-label="${esc(`${chapter.name}卷刻度`)}">${chips}</nav>` : '';
  return `<header class="chapter-band" id="${chapter.id}">
    <p class="chapter-kicker">${esc(chapter.volume)}</p>
    <h2>${esc(chapter.name)}</h2>
    <p class="era">${esc(chapter.era)}</p>
    <p>${esc(chapter.lede)}</p>
    ${nav}
  </header>`;
}

function renderFutureChapter(): string {
  const chapter = CHRONICLE_CHAPTERS.find((item) => item.id === 'ch-future');
  const links = FUTURE_DOMAINS.map((domain) => `<a href="/civilization/#${esc(domain.anchor)}">${esc(domain.code)} ${esc(domain.title)}</a>`).join('');
  return `<header class="chapter-band chapter-band-future" id="ch-future">
    <p class="chapter-kicker">${esc(chapter?.volume ?? '卷三')}</p>
    <h2>${esc(chapter?.name ?? '未來')}</h2>
    <p class="era">${esc(chapter?.era ?? '章門')}</p>
    <p>${esc(chapter?.lede ?? '')}</p>
    <p class="stage-links"><a href="/civilization/#future">總覽展望</a>${links}</p>
  </header>`;
}

function sourceTable(): string {
  const seen = new Set<string>();
  const rows: ChronicleSource[] = [
    ...chronicleStagesOrdered().flatMap((stage) => [
      { stage: String(stage.n), name: stage.sourceName, url: stage.sourceUrl },
      ...(stage.moreSources ?? []).map((item) => ({ stage: String(stage.n), name: item.name, url: item.url })),
    ]),
    ...milestoneBlockSources(),
    ...patternSourceRows(),
    ...caseSourceRows('/civilization/chronicle/'),
    ...CHRONICLE_EXTRA_SOURCES,
  ].filter((row) => {
    if (seen.has(row.url)) return false;
    seen.add(row.url);
    return true;
  });
  const body = rows.map((row) => {
    const href = sourceHref(row.url);
    const link = href ? `<a href="${href}">${esc(row.url)}</a>` : esc(row.url);
    return `<tr><td>${esc(row.stage)}</td><td>${esc(row.name)}</td><td>${link}</td></tr>`;
  }).join('');
  return `<table class="civ-table"><thead><tr><th>階段</th><th>來源機構</th><th>網址</th></tr></thead><tbody>${body}</tbody></table>`;
}

export function renderChronicleArticle(): string {
  const stages = chronicleStagesOrdered();
  const chapters = CHRONICLE_CHAPTERS.map((chapter) => `<a class="chip" href="#${chapter.id}">${esc(chapter.volume)} ${esc(chapter.name)}</a>`).join('');
  const nav = stages.map((stage) => `<a class="chip" href="#stage-${stage.n}">${ordinal(stage.n)} ${esc(stage.short)}</a>`).join('');
  const lede = CHRONICLE_LEDE.split('\n').map((paragraph) => `<p>${esc(paragraph)}</p>`).join('');
  const body = stages.flatMap((stage) => {
    const chapter = CHRONICLE_CHAPTERS.find((item) => item.stages[0] === stage.n);
    return [chapter ? renderChapterBand(chapter) : '', stageSection(stage)];
  }).join('');
  return `<article class="civ-article chronicle-page">
    <h1 class="column-title civ-page-title">${esc(CHRONICLE_TITLE)}</h1>
    ${lede}
    ${lineChips(CIV_LINES)}
    <h2>如何閱讀本編年</h2>
    <p>${esc(CHRONICLE_HOW)}</p>
    <nav class="chronicle-nav" aria-label="跳到卷">${chapters}</nav>
    <nav class="chronicle-nav" aria-label="跳到階段">${nav}</nav>
    ${renderPatternNav()}
    ${renderCaseNav('/civilization/chronicle/')}
    <div class="civ-progress" aria-hidden="true"></div>
    ${body}
    ${renderFutureChapter()}
    <h2>四線總結</h2>
    <p>${esc(CHRONICLE_SUMMARY)}</p>
    <h2>與今日新聞的銜接</h2>
    <p>${esc(CHRONICLE_BRIDGE)}</p>
    <p class="stage-links"><a href="/civilization/">返回文明總覽</a><a href="/civilization/origins/">人類起源時間線</a><a href="/#slice">今日切片</a></p>
    ${renderSliceReturns('chronicle')}
    <h2>來源</h2>
    ${sourceTable()}
    <p class="civ-ai"><span class="badge">AI 整合</span> 本頁由公開博物館與國際組織頁面整合，僅供研究與編輯對照；年代均為約數。</p>
  </article>`;
}
