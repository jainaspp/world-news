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
  /** Rendered when set. A pattern-card ask, if present, stays on the card. */
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
    lede: '採集、農業、城市、帝國與商路，在此收成可核對的刻度。本卷維持既有正文，深時間仍交起源長頁。',
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
    mechanismAsk: '一次觀測如何變成可覆核的公共記錄？',
    moreSources: [
      { name: '倫敦皇家學會｜學會沿革', url: 'https://royalsociety.org/about-us/who-we-are/history/' },
      { name: '佛羅倫薩伽利略博物館', url: 'https://www.museogalileo.it/en/' },
      { name: '皇家博物館格林威治｜皇家天文台史', url: 'https://www.rmg.co.uk/stories/space-astronomy/history-royal-observatory' },
      { name: '聯合國教科文組織世界遺產「格林威治海岸」', url: 'https://whc.unesco.org/en/list/795/' },
    ],
    prose: [
      '本節由約公元一五〇〇年讀到約公元一八〇〇年。金屬活字印本在十五世紀中葉已經出現，進入本階段後，教科書、星表與學者通信得以批量複製，遠方讀者可以按同一頁的數據重算，而不只複述結論。中國的雕版與活字更早成熟。北京市大興區公開介紹的中國印刷博物館，是核對印刷史公共敘事的入口。本站只記述知識生產方式的轉變。',
      '觀測儀器把感官邊界推遠。約一六〇九年前後，望遠鏡被用於天象觀測，木星的衛星與月面的起伏進入可傳遞的記錄；顯微鏡則把目光推向微小結構。佛羅倫薩伽利略博物館是早期科學儀器的公共入口。格林威治皇家天文台約於一六七五年設立，為航海測定經度與時間；一八八四年的本初子午線會議已超出本節年代，改在天文台史頁核對其後的發展。',
      '學會把個人觀察編成公共程序。倫敦皇家學會約於一六六〇年成立，巴黎科學院約於一六六六年成立。皇家學會自約一六六五年起刊行會刊，觀察、實驗與同行評議逐漸成為可以援引的規範。一次觀測要能被別人按方法重做，才進入公共記錄，知識權威由此部分讓位於可重複的證據。啟蒙時期對理性與教育的討論，在本節只指這套知識制度的變化。',
      '尺度要能換算，遠方的實驗與契約才指向同一件事。十八世紀末的子午線測繪，嘗試以地球子午線的弧長定義長度單位，把「一把尺」寫成可公開的約定。國際計量局對單位制的沿革說明，是這份約定在後世的公共入口，局本身晚於本節。度量可以互通，並不要求各地只留一把尺。',
      '以四線交接讀：信息線上，印本與會刊使錯誤可以被指出，知識得以累積；制度線上，學會、大學與發表程序為長期研究提供承認；能量線此時仍以人力、畜力與水力為主，蒸汽改由下一節承接；貨幣線上，可核對的度量先讓價格有共同的量。下一節的工廠與鐵路，將把這套方法用到化石能量的生產裡。',
    ].join('\n'),
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
    mechanismAsk: '貨物與訊息如何對上同一張時間表？',
    moreSources: [
      { name: '聯合國教科文組織世界遺產「德文特河谷工業區」', url: 'https://whc.unesco.org/en/list/1030/' },
      { name: '聯合國教科文組織世界遺產「卡萊納馮工業景觀」', url: 'https://whc.unesco.org/en/list/984/' },
      { name: '科學博物館集團｜藏品目錄', url: 'https://collection.sciencemuseumgroup.org.uk/' },
    ],
    prose: [
      '本節由約公元一七六〇年讀到約公元一九一四年，化石燃料的能量被大規模導入生產。改良蒸汽機把煤的熱能轉成可調度的機械功。冷凝器與專利安排，在公共機構史裡常被放在十八世紀中葉以後：礦井抽水、紡織與後來的交通，先後接上同一類動力。早期廠房很多仍靠水力。蒸汽的意義，是讓工廠不必守在河邊。美國機械工程師學會的公共頁面，是核對瓦特與蒸汽動力敘事的入口之一。',
      '工廠把機器、班次與工序放在同一屋簷下。德文特河谷的棉紡廠，被聯合國教科文組織列為十八至十九世紀的工業景觀；那裡的早期廠房以水力驅動，工廠體系先在河邊成形。南威爾士的卡萊納馮工業景觀，保留煤、鐵與早期鐵路的現場。鐵橋峽的鐵橋約於一七七九年建成，常被用作鐵構件進入日常尺度的物質象徵。標準工序與可替換零件，使增產不再只靠個別工匠的手藝。功率要能留下，儲煤、備件與能夠維修的人手必須同時在場。',
      '鐵路與電報把貨物和訊息的時間一起壓縮。約一八二九年的公開試車中，史蒂芬森的「火箭號」在鐵路博物館敘事裡被用作機車時代的象徵。英國國家鐵路博物館保存這一敘事的物質入口。電報約於一八三〇年代進入實用，價格、班次與故障可以離開信使的腳程。英國鐵路在十九世紀中葉把時刻從各城的太陽時收束為可以對表的公共時間。',
      '各地的窗口並不整齊。煤鐵條件與市場規模不同，工業節奏在歐亞與美洲並不一致，年代一律標約。本節與下一節在十九世紀末有年代重疊。這裡讀能量與信息的速度。跨國信用如何編排，改在現代金融一節，本節不作投資建議。',
      '以四線交接讀：能量線上，煤把長年累積的太陽能集中釋放，單位勞動所能調動的功率遠高於人畜；信息線上，時刻表與電報讓遠方對上同一張表；制度線上，班次、公司與專利維持連續運轉；貨幣線上，工資與匯票隨大宗貨物增加，全球貨幣安排的文本留待下一節。城市規模與勞動節奏，在這一次雙重躍升裡被一起改寫。',
    ].join('\n'),
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
      { name: '國際清算銀行｜機構沿革', url: 'https://www.bis.org/about/history/overview' },
      { name: '美國聯邦儲備｜關於聯邦儲備', url: 'https://www.federalreserve.gov/aboutthefed.htm' },
    ],
    prose: [
      '本節年代由約公元一八七〇年收到約公元一九六九年，讀貨幣與信用如何編到跨國尺度，不與隨後的信息網絡重疊。十九世紀七十年代起，多個經濟體把通貨與黃金掛鉤，匯價因此較可預期。這一安排在二十世紀上半葉多次中斷與再調整，各國窗口並不整齊，宜標約，細節以機構年表為準。本節只作文具與制度說明，不作投資建議。',
      '遠距貿易的信用早於金本位。匯票把一地的債權寫成遠方可以兌付的憑據，清算所則把眾多雙邊債務軋差為淨額。金屬不必每筆都上船，信任改靠可核對的簽名、額度與交割規則。銀行卡到本窗口末段才出現。日常電子錢包改在本世紀一節閱讀。',
      '多邊機構把規則寫成公開文本。約一九一三年，美國聯邦儲備體系成立，其公共史頁說明這一中央銀行安排的由來。約一九三〇年成立的國際清算銀行，留下跨境中央銀行合作的沿革。約一九四四年的布雷頓森林會議之後，國際貨幣基金組織與世界銀行進入可以核對的年表：匯率合作、份額與調整程序都有節點可查。聯邦儲備史關於布雷頓森林創立的專文，是同一窗口的另一入口。',
      '本節在約公元一九六九年收束。其後的官方兌換調整與浮動匯率不在這裡展開，以免與信息革命的年代相交。讀者若要核對，應回到基金組織年表、世界銀行檔案、聯邦儲備史與國際清算銀行的沿革頁。',
      '以四線交接讀：貨幣線上，錨定、匯票與多邊清算決定貿易可以走多遠；制度線上，規則文本讓跨境流動有可預期的處理程序；信息線此時已有電報，分組交換與網頁留在下一節；能量線上，工業產出的規模抬高了對匯兌的需求。安排一改，流向會改道。本節不評定任何一種安排的優劣。',
    ].join('\n'),
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
      { name: '計算機歷史博物館｜互聯網史', url: 'https://www.computerhistory.org/internethistory/' },
    ],
    prose: [
      '本節由約公元一九七〇年收到約公元二零零九年。分組交換的實驗在本節開始前已經運行。這裡讀的是它變成開放協議與公共網絡的過程：訊息被拆成小包，沿當時可用的路徑轉發，單一節點停擺不必拖垮整網。約一九八一年公開的互聯網協議說明，即第七九一號文本，把這套設計寫成可以援引的規範。互聯網協會的簡史，則把協議成為公共網絡的過程放在一九八〇年代初期。',
      '萬維網把協議上的文檔連成可點按的整體。歐洲核子研究組織保存的簡史，記錄約一九八九年的構想與一九九〇年前後的公開。萬維網聯盟的網頁史記錄其後的標準化。瀏覽器讓查閱不必先知道檔案放在哪一台機器。知識與服務近乎即時可達，瓶頸由複製轉到核對出處。計算機歷史博物館的互聯網史頁，是同一段技術史的另一公共入口。',
      '在線支付屬於這一窗口的結算實驗。銀行卡授權與一九九〇年代的網頁結帳，把金額與帳戶往返放進可核對的記錄。掃碼錢包與二零一零年以後的通用智能工具，不計入本節。數字貨幣形態改在本世紀閱讀。本節與前一節不以年代相交：金本位與布雷頓森林的文本收到一九六九年，這裡只承接結算可以隨訊息走這一件事。',
      '終端與線路普及之後，遠距協作從實驗室走到機構與家庭。電子郵件、網頁與早期結帳共用同一套分組網絡，地理不再是協作的硬邊界。頁面能夠打開，只說明它被送到讀者面前；出處是否可核對，仍要回到出具的機構。本節的機制因此落在路徑如何繞過單點，而不把模型或測序成本算進這一窗口。',
      '以四線交接讀：信息線上，開放協議與超連結使協作離開現場；貨幣線上，早期在線支付是結算實驗，不是收益品種；制度線上，互聯網工程任務組與萬維網聯盟把介面寫成可以援引的文本；能量線隱在供電與機房裡，不是本節的主標籤。測序成本、氣候評估與公開模型，改由下一節書寫。',
    ].join('\n'),
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
      '測量標準與智能工具一同進入公共頁面。公開模型可以檢索、翻譯與起草，個人終端與機構流程都已接上。工具是否可核對，先要有公共的尺。美國國家標準與技術研究院的物理測量實驗室，維持可追溯的測量標準。本站只記工具如何改寫檢索與草稿，不把模型輸出當成已經核對的事實。',
      '貨幣形態上，電子錢包已進入日常小額場景。錢包進入日常的年份各地不同，一律標約。跨國貨幣合作的公開節點，仍可對照國際貨幣基金組織的機構年表。本節不作投資建議，也不比較任何一種代幣的收益。',
      '生命科學工具方面，測序成本長期下降之後，基因組信息進入實驗室與公共衛生的問答。美國國家人類基因組研究所公開說明人類基因組測序成本的下降軌跡。這裡只寫工具進入實驗流程，不寫人群高下，也不把編輯技術寫成已經完成的社會改造。',
      '行星約束進入當代日程。政府間氣候變化專門委員會第六次評估的綜合報告，把升溫、極端事件與適應窗口寫成可核對的綜述。世界衛生組織的氣候變化與健康實況頁，說明熱壓力與衛生服務如何被放進同一張公共說明。本節不另造時鐘，也不把監測讀數寫進展望正文。',
      '以四線交接讀：貨幣與信息是本節的主標籤；測量標準托住可核對的尺，氣候與衛生頁面則把能量約束寫成公共綜述。讀者若要看能量宜居、信息可信、制度協作、生物譜系、技術能力階與生存風險的條件句，應走未來章門，進入總覽既有分域。今日切片仍在首頁。一則關於支付、測序、模型或極端天氣的標題，可以掛回貨幣、信息或能量中的一至兩條線，再決定要不要打開條件門。本階段名為本世紀／當代。編年在此止步，不另立第十一階。',
    ].join('\n'),
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
