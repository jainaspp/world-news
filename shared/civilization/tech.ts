import { cjkChars, esc } from '../contentPage.js';
import { renderThreadArticle } from './db/render.js';
import { axisReadingProse } from './axisReading.js';
import { TECH_READINGS } from './content/techReadings.js';

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

export const TECH_LINES: readonly TechLine[] = ['工具', '能源', '媒介', '知識'];

export const TECH_TITLE = '科技與發現';

const LEDE_BEFORE = '人類把身體以外的能力一層層做出來：先是石器與用火，再是可以傳給下一代的口傳與文字，其後是把觀察固定下來的科學儀器、把熱與電引入生產的工業能量，以及把消息送到遠處的印刷、電波與網絡。本頁以十階段勾勒這條發現弧，標以「工具 · 能源 · 媒介 · 知識」。年代一律寫作「約」或「主流綜述」。文明編年用能量、信息、制度與貨幣重讀同一條長河；本頁不重寫編年三卷的刻度，只沿工具、能源、媒介與知識把節點收緊，並在末端交回';
const LEDE_LINK = '今日的新聞切片';
const LEDE_AFTER = '。';
export const TECH_LEDE = `${LEDE_BEFORE}${LEDE_LINK}${LEDE_AFTER}`;

const HANDOFF_A = '石器以前的深時間化石與譜系，請讀';
const HANDOFF_B = '。若要改以能量、信息、制度與貨幣重讀同一條長河，請讀';
const HANDOFF_C = '；本頁不重寫編年三卷。技術如何落到街道、場館與日常往來，請讀';
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
    meaning: '刃口可以在下一塊石頭上重做，石頭上沒有署名。',
    lines: ['工具'],
    origins: true,
    prose: '主流綜述把打製石器放在人族技術史的開端。石片、石核與後來的手斧，使切割、刮削與敲擊不再只靠牙齒和指甲。製法可以觀看、模仿、再修正。年代跨度很長，各地證據並不整齊。一塊石片上沒有署名，也不能告訴你下一個營地是否用同一套角度。窗口只取約數，不把某一件石器寫成唯一起點。',
  },
  {
    n: 2,
    name: '用火與熱能',
    short: '用火',
    era: '約 100 萬年前至約 4 萬年前',
    milestones: ['控制用火', '熟食與夜間活動'],
    meaning: '燒土、燒骨與灰燼要分開記，不能合成一個生日。',
    lines: ['能源', '工具'],
    chronicle: 1,
    prose: '控制用火是能源線上的早期節點。火擴大可食範圍、延長夜間活動，也讓群體可以圍繞一個熱源分工。灰燼、燒骨與燒土可以同在一個層位，也可以只是野火燒過。三種痕跡要分開記。測年仍有學術討論，宜標「約」。蒸汽與管網是很久以後的另一筆帳，不從這一層灰裡推出來。',
  },
  {
    n: 3,
    name: '口傳與共享知識',
    short: '口傳',
    era: '約 10 萬年前至約 1 萬年前',
    milestones: ['複雜語言', '技藝靠口傳累積'],
    meaning: '沒有載體的句子會走樣，走樣就是這一節的限度。',
    lines: ['媒介', '知識'],
    prose: '語言讓不在場的步驟也能被說清楚：哪裡有石材、火種如何保住、哪一種植物需要處理才可食。口傳沒有泥板。此階段沒有可直接核對的文字原件，證據來自語言學、考古脈絡與公共科普的綜述，寫法保持克制。一句話過了一夜就可能換詞。校驗只發生在下一次一起動手的時候，沒有頁碼可以翻回去。',
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
    prose: '泥板、印章與早期文字，多半先服務計數、倉儲與清單，而不是文學。配方、帳目與觀測被刻下來之後，對不上的那一行會留在物件上。一塊泥板對不上封泥，錯誤不必等說話的人回到房間。不同地區出現符號的時間並不一致，年代取主流綜述的約數。',
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
    prose: '望遠鏡把星空拉近，顯微鏡把細小結構露出來。儀器的重點不是某一位製作人的軼事，而是觀察可以被重複：別人用相近的工具，可以核對同一現象。印刷同時讓圖表與通信傳開。印刷術的年代早於後面的蒸汽工廠，不把它寫成儀器的下一站。鏡片的曲率差一點，星的位置就對不上上一次的圖。年代仍標「約」。對不上的那張圖留在紙上。',
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
    prose: '蒸汽機把燃料裡的熱轉成持續的機械功，工廠與礦場的節奏隨之改變。十九世紀後期，電力又把能量送到較遠的車間與街道。汽缸裡的熱和電線上的電流不是同一種停法。鐵路時刻表是另一份紙，不在這一節的功率裡。公共博物館對蒸汽機的陳列，是可核對的入口，不作單一製作人的英雄敘事。',
  },
  {
    n: 7,
    name: '印刷與報刊',
    short: '印刷報刊',
    era: '約公元 1450–1900 年',
    milestones: ['活字印刷降低複製成本', '報刊成為日常消息媒介'],
    meaning: '同一份記錄可以到達許多互不相識的讀者。',
    lines: ['媒介'],
    prose: '活字與後來的機械印刷，使一頁知識不必逐字手抄。教科書、圖表與報刊因此可以有較穩定的讀者群。報刊把遠處的事件收成可在城市裡閱讀的文字，雖然仍受交通與截稿限制。印刷史在各地的路徑不同，東亞的雕版與活字傳統亦早於歐洲近代印刷，只記複製成本下降這一共同後果，不排座次。一份沒有校對的印張，會把同一個錯字同時放進許多座城市。',
  },
  {
    n: 8,
    name: '電氣與遠距通訊',
    short: '遠距通訊',
    era: '約公元 1840–1960 年',
    milestones: ['電報與電話', '廣播把聲音送到許多家庭'],
    meaning: '消息不必等人或紙張抵達。',
    lines: ['能源', '媒介'],
    prose: '電報把編碼後的文字送到遠處，電話加上即時的聲音，廣播則讓同一段聲音進入許多家庭。能量線上的電力，在這裡變成媒介的載體：沒有穩定的電，遠距的聲與光就難以成為日常。攝影與電影亦在這一窗口成熟，使事件可以留下可重看的影像，而不只是轉述。專利先後不在這裡排。線路一斷，速度就回到信使的腳程，銘牌上的速度並不跟著走。',
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
    prose: '計算機把處理步驟交給機器，分組交換網絡讓不同地點的機器互相送達數據。約一九九〇年前後公開的萬維網，則使文件可以用連結彼此指向，讀者不必先知道檔案放在哪一台機器。發現本身仍要靠觀察與實驗。支付與結算是另一本帳。這裡只問連結還指不指得到那一頁。歐洲核子研究組織保存的萬維網簡史，是可公眾核對的入口。',
  },
  {
    n: 10,
    name: '今日新聞切片',
    short: '新聞切片',
    era: '今日',
    milestones: ['電訊落在軸的末端', '工具新聞仍要回到來源'],
    meaning: '今天的科技報導，是這條發現弧上的一刀，而不是另一套文明。',
    lines: ['知識', '媒介'],
    prose: '一則關於新儀器、新能源、新媒介或新知識工具的新聞，讀的時候可以先問它落在哪一條線。多數電訊只落在一至兩條：一款通訊工具主要是媒介，一座電廠主要是能源，一件實驗儀器主要是工具與知識。沒有溫和史對照的標題，不必強加年代。沒有出處的標題就停在原處，不替它補一個更老的年份。',
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
    ...TECH_STAGES.flatMap((stage) => [
      stage.name,
      stage.era,
      ...stage.milestones,
      stage.meaning,
      stage.prose,
      ...stage.lines,
      axisReadingProse(TECH_READINGS[stage.n] ?? []),
    ]),
    TECH_HANDOFF,
    TECH_SOURCE_NOTE,
    ...TECH_SOURCES.flatMap((row) => [row.name, row.note]),
    ...TECH_LINES,
  ].join('\n');
}

export function techIndexable(): boolean {
  return TECH_STAGES.length === 10 && cjkChars(techProse()) >= TECH_MIN_CHARS;
}


const CIV = '/static/civilization';

/** 640×400 stage cover, with a 1280w candidate for high-DPR. onerror hides a missing file so the paper seal remains. */
export function techCoverImg(stage: TechStage, eager: boolean): string {
  const base = `${CIV}/tech-stage-${stage.n}-cover`;
  const loading = eager ? 'eager' : 'lazy';
  const priority = eager ? ' fetchpriority="high"' : '';
  const alt = `${stage.name}：溫和示意，年代為約數`;
  return `<img src="${base}-640w.webp" srcset="${base}-400w.webp 400w, ${base}-640w.webp 640w, ${base}-1280w.webp 1280w" sizes="(max-width: 640px) 100vw, 400px" width="640" height="400" alt="${esc(alt)}" loading="${loading}"${priority} decoding="async" onerror="this.hidden=true" />`;
}


export function renderTechArticle(): string {
  return renderThreadArticle('tech');
}
