import { esc } from '../contentPage.js';
import { civChars, isCivLine, type CivLine } from './contract.js';

/**
 * Future P0. A hub anchor and a stage-10 bridge, not a route.
 * Closed sets live here. `futureIssues` returns [] when the contract holds.
 * Field list: SCHEMA.md
 */

export const FUTURE_DOMAIN_IDS = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'] as const;
export type FutureDomainId = (typeof FUTURE_DOMAIN_IDS)[number];

export const FUTURE_DOMAIN_STATUS = ['加厚中', '有卡'] as const;
export type FutureDomainStatus = (typeof FUTURE_DOMAIN_STATUS)[number];

export interface FutureDomain {
  id: FutureDomainId;
  code: 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6';
  title: string;
  blurb: string;
  status: FutureDomainStatus;
  /** Optional CivLine tags. Not a fifth line. */
  lines?: readonly CivLine[];
  anchor: string;
}

export const FUTURE_TIERS = ['observe', 'pilot', 'infra', 'civ-scale'] as const;
export type FutureTier = (typeof FUTURE_TIERS)[number];

export const FUTURE_TIER_MARKS = ['約', '示意', '假說'] as const;
export type FutureTierMark = (typeof FUTURE_TIER_MARKS)[number];

export interface FutureTierRow {
  tier: FutureTier;
  label: string;
  /** Set only on the three rows the v0 card draws. */
  mark?: FutureTierMark;
  blurb: string;
  shown: boolean;
}

export const LEVEL_BANDS = [
  'e0', 'e1', 'e2', 'e3', 'e4',
  'i0', 'i1', 'i2', 'i3', 'i4',
  'a0', 'a1', 'a2', 'a3', 'a4',
] as const;
export type LevelBand = (typeof LEVEL_BANDS)[number];

export interface LevelFamily {
  id: 'e' | 'i' | 'a';
  label: string;
  bands: readonly LevelBand[];
}

export const FUTURE_CONFIDENCE = ['limited', 'partial', 'steady'] as const;
export type FutureConfidence = (typeof FUTURE_CONFIDENCE)[number];

/** Horizon kind. Expand only when a card is published. */
export const FUTURE_HORIZON_KINDS = ['biosphere', 'health', 'resource'] as const;
export type FutureHorizonKind = (typeof FUTURE_HORIZON_KINDS)[number];

/** Review horizon. Not an onset date and not a clock. */
export const FUTURE_TIME_BANDS = ['進行中', '數年', '數十年', '約本世紀', '深時', '未發生'] as const;
export type FutureTimeBand = (typeof FUTURE_TIME_BANDS)[number];

export const FUTURE_CLADE_KINDS = ['tool-extension', 'niche-continue'] as const;
export type FutureCladeKind = (typeof FUTURE_CLADE_KINDS)[number];

export interface FutureSource {
  name: string;
  url: string;
  /** Reader-facing limit on what this link is allowed to support. */
  scope?: string;
}

export interface FutureHorizon {
  id: string;
  anchor: string;
  title: string;
  domainId: FutureDomainId;
  /** Second domain to read beside. Does not by itself turn 加厚中 into 有卡. */
  alsoDomainId?: FutureDomainId;
  kind?: FutureHorizonKind;
  /** Legend layer. Not a time word. */
  band: LevelBand;
  /** Review horizon such as 進行中 or 數十年. Not a deadline. */
  timeBand?: FutureTimeBand;
  confidence: FutureConfidence;
  mechanism: string;
  mitigation: string;
  uncertainty: string;
  /** YYYY-MM or YYYY-MM-DD. Compilation date, not a catastrophe clock. */
  dataAsOf: string;
  sources: readonly FutureSource[];
}

/**
 * A thickened domain card on the hub. Not a route.
 * `tierId` is maturity. Bands are labels and are not summed.
 */
export interface FutureInstance {
  id: string;
  anchor: string;
  domainId: FutureDomainId;
  title: string;
  /** 80–120 characters. */
  blurb: string;
  mechanism: string;
  /** Second passage, when two claims must not share one paragraph. */
  contingency?: string;
  tierId: FutureTier;
  bands: readonly LevelBand[];
  /** YYYY-MM-DD. Compilation date, not a catastrophe clock. */
  dataAsOf: string;
  sources: readonly FutureSource[];
}

export interface CountdownItem {
  id: string;
  anchor: string;
  horizonId: string;
  /** Checkpoint day, YYYY-MM-DD. */
  checkpoint: string;
  title: string;
  pending: string;
  expired: string;
}

export interface FutureCladeLayer {
  title: '共享遺產' | '共演化' | 'SETI尚無確證';
  text: string;
}

export interface FutureClade {
  id: string;
  anchor: string;
  domainId: FutureDomainId;
  title: string;
  kinds: readonly FutureCladeKind[];
  boundary: string;
  layers: readonly FutureCladeLayer[];
}

const CONFIDENCE_LABEL: Record<FutureConfidence, string> = {
  limited: '有限',
  partial: '部分',
  steady: '較穩',
};

/** Panel chips. The stored status stays 有卡 / 加厚中. */
const DOMAIN_STATUS_READER: Record<FutureDomainStatus, string> = {
  有卡: '已有可讀卡片',
  加厚中: '尚未寫入卡片',
};

const HORIZON_KIND_LABEL: Record<FutureHorizonKind, string> = {
  biosphere: '生物圈',
  health: '健康',
  resource: '資源',
};

const CLADE_KIND_LABEL: Record<FutureCladeKind, string> = {
  'tool-extension': '工具延伸',
  'niche-continue': '生態位延續',
};

const TIER_LABEL: Record<FutureTier, string> = {
  observe: '觀測',
  pilot: '試點',
  infra: '基建',
  'civ-scale': '文明尺度',
};

export const FUTURE_DOMAINS: readonly FutureDomain[] = [
  {
    id: 'f1',
    code: 'F1',
    title: '能量宜居',
    blurb: '文明可用功率受行星能量收支與碳循環約束。宜居帶是可觀測的熱量、水循環與極端事件邊界，寫在約與綜述的區間，不作國別排名。',
    status: '有卡',
    lines: ['能量'],
    anchor: 'future-f1',
  },
  {
    id: 'f2',
    code: 'F2',
    title: '信息可信',
    blurb: '記錄、複製與出處核對的成本，決定協作半徑。近乎零成本的複製若遇上薄弱校驗，誤導可以規模化。本域追問如何驗證，不寫誰該噤聲。',
    status: '有卡',
    lines: ['信息'],
    anchor: 'future-f2',
  },
  {
    id: 'f3',
    code: 'F3',
    title: '制度協作',
    blurb: '度量、標準、基礎設施與跨代機構，把陌生人的協作半徑拉長。這裡寫機制與維修條件，不寫口號，也不把制度能力寫成文明高下。',
    status: '加厚中',
    lines: ['制度'],
    anchor: 'future-f3',
  },
  {
    id: 'f4',
    code: 'F4',
    title: '生物譜系',
    blurb: '人類的遺傳多樣性是共享遺產。人類與微生物、作物、生態系一同演化。地外智慧生命仍是開放的科學問題，一律標明尚無確證，不寫人群高下。',
    status: '有卡',
    anchor: 'future-f4',
  },
  {
    id: 'f5',
    code: 'F5',
    title: '技術能力階',
    blurb: '能量通量、信息校驗與維修能動，只作條件帶的示意，標明約或假說。成熟度掛在域卡上，不印合成分數，也不印文明等級。卡爾達肖夫尺度僅作文獻對照。',
    status: '有卡',
    lines: ['能量', '信息'],
    anchor: 'future-f5',
  },
  {
    id: 'f6',
    code: 'F6',
    title: '生存風險',
    blurb: '長期風險寫成可更新的地平線卡：區間、信心、機制、緩解與日期戳。盤點只對準機構窗口，過期改為靜態句。這裡寫維修條件，不寫束手無策。',
    status: '有卡',
    anchor: 'future-f6',
  },
];

export const FUTURE_TIER_ROWS: readonly FutureTierRow[] = [
  {
    tier: 'observe',
    label: TIER_LABEL.observe,
    mark: '約',
    shown: true,
    blurb: '能持續記錄某一現象，並把記錄留在可核對的出處。記錄在場，不等於運行條件已被改寫。',
  },
  {
    tier: 'pilot',
    label: TIER_LABEL.pilot,
    mark: '示意',
    shown: true,
    blurb: '在有限範圍內試行。結果只說明該範圍，不可外推成全域能力。',
  },
  {
    tier: 'infra',
    label: TIER_LABEL.infra,
    mark: '假說',
    shown: true,
    blurb: '若維修、備件與記錄同時在場，能力才可能離開單點。這是條件句，不是已完成的階梯。',
  },
  {
    tier: 'civ-scale',
    label: TIER_LABEL['civ-scale'],
    shown: false,
    blurb: '只表示約束被放到文明尺度上討論。不在本卡畫成等級，也不與前三檔相加。',
  },
];

export const FUTURE_TIER_CARD = {
  anchor: 'future-tier',
  domainId: 'f5' as const,
  title: '技術能力階',
  note: '這張卡只標成熟度，不排文明高下。頁上的「約」「示意」「假說」是成熟度記號，不是等級。契約另有文明尺度一檔，不在本卡畫成等級，也不與前三檔相加。',
};

export const LEVEL_FAMILIES: readonly LevelFamily[] = [
  { id: 'e', label: '能量帶', bands: ['e0', 'e1', 'e2', 'e3', 'e4'] },
  { id: 'i', label: '信息帶', bands: ['i0', 'i1', 'i2', 'i3', 'i4'] },
  { id: 'a', label: '能動帶', bands: ['a0', 'a1', 'a2', 'a3', 'a4'] },
];

export const LEVEL_LEGEND = '能量帶 e0–e4、信息帶 i0–i4、能動帶 a0–a4。各帶只標約束寫到哪一層，互不換算，頁面不設合成分數，也不作文明等級。';

/** One sentence each, so these layers are not read as civilization ranks. */
export const BAND_NOTES = [
  { band: 'e2', text: 'e2 記行星能量收支、宜居窗口與淡水可用量正在被監測的這一層，不是文明等級。' },
  { band: 'i2', text: 'i2 記底本與更正能否被後來的複本認出，不是文明等級。' },
  { band: 'a1', text: 'a1 記擾動或耐藥能否被寫成可核對的維修條件，不是文明等級。' },
] as const;

/** What the six entries answer, then the no-new-URL note. */
export const FUTURE_OPENING = '六個入口各自回答一件事。能量宜居回答功率受什麼收支約束。信息可信回答底本靠什麼留下。制度協作回答規則如何維修。生物譜系回答延續而不分高下。技術能力階回答成熟到哪一檔。生存風險回答如何被事後核對。這裡不另開網址。';

export const FUTURE_HORIZONS: readonly FutureHorizon[] = [
  {
    id: 'climate',
    anchor: 'future-horizon-climate',
    title: '氣候宜居約束',
    domainId: 'f1',
    band: 'e2',
    confidence: 'partial',
    mechanism: '地球宜居窗口由入射能量、溫室氣體與水循環共同約束。公共機構的年度評估修訂的是幅度與範圍，不是把單一年寫成終局。',
    mitigation: '減排、適應與持續監測可以並行。本站只記機構已經寫明的公共路徑，不發動員句。',
    uncertainty: '區域差異、回饋強度與政策路徑仍有範圍，不能從全球平均直接讀出某一城市的結果。',
    dataAsOf: '2026-10',
    sources: [
      { name: '政府間氣候變化專門委員會｜第六次評估綜合報告', url: 'https://www.ipcc.ch/report/ar6/syr/' },
      { name: '世界氣象組織', url: 'https://wmo.int/' },
      { name: '美國國家航空航天局｜氣候', url: 'https://climate.nasa.gov/' },
      { name: '哥白尼氣候變化服務', url: 'https://climate.copernicus.eu/' },
      { name: '美國氣候網', url: 'https://www.climate.gov/' },
    ],
  },
  {
    id: 'trust',
    anchor: 'future-horizon-trust',
    title: '信息可信與大規模誤導',
    domainId: 'f2',
    band: 'i2',
    confidence: 'limited',
    mechanism: '記錄一旦能被低成本複製，未經校驗的敘述也可以同時到達許多人。可信靠可指認的底本與出處，不靠傳播速度。萬維網簡史只說明複製變便宜，不支撐大規模誤導。',
    mitigation: '發出之前標明出處，並保留可以事後核對的底本。校驗放在複製之前，協作半徑才不會把錯誤一起放大。',
    uncertainty: '平台機制與讀者習慣持續變化，單一語種的研究不能外推到所有公共討論。',
    dataAsOf: '2026-10',
    sources: [
      { name: '聯合國教科文組織｜媒體與信息素養', url: 'https://www.unesco.org/en/media-information-literacy' },
      { name: '路透新聞研究所｜數字新聞報告', url: 'https://reutersinstitute.politics.ox.ac.uk/digital-news-report' },
      { name: '經濟合作與發展組織｜虛假信息專題', url: 'https://www.oecd.org/en/topics/disinformation-and-misinformation.html' },
      { name: '歐洲核子研究組織｜萬維網簡史', url: 'https://home.cern/science/computing/the-birth-of-the-web/short-history-web/', scope: '只說明複製變便宜' },
    ],
  },
  {
    id: 'space',
    anchor: 'future-horizon-space',
    title: '近地／空間天氣監測',
    domainId: 'f6',
    band: 'a1',
    confidence: 'partial',
    mechanism: '太陽活動可以擾動電離層、導航與電網。監測把擾動提前寫成可核對的通報，讓維修與備援有時間對上同一件事。',
    mitigation: '預報、備援電源與關鍵設施的防護程序，把單次擾動留在可修復的範圍。',
    uncertainty: '單次事件的到達時間與強度仍有預報誤差。通報是檢查點，不是災變時鐘。',
    dataAsOf: '2026-10',
    sources: [
      { name: '美國國家海洋和大氣管理局｜空間天氣預報中心', url: 'https://www.swpc.noaa.gov/' },
      { name: '美國國家航空航天局｜太陽物理', url: 'https://science.nasa.gov/heliophysics/' },
      { name: '歐洲空間局｜空間安全', url: 'https://www.esa.int/Space_Safety' },
      { name: '美國空間天氣預報中心｜影響說明', url: 'https://www.swpc.noaa.gov/impacts' },
    ],
  },
  {
    id: 'horizon-biodiversity-services',
    anchor: 'future-horizon-biodiversity',
    title: '生物多樣性與生態系服務約束',
    domainId: 'f6',
    alsoDomainId: 'f4',
    kind: 'biosphere',
    band: 'e1',
    timeBand: '進行中',
    confidence: 'steady',
    mechanism: '物種與生態系功能減弱之後，授粉、水質、土壤與災害緩衝等服務跟著變窄。監測靠紅色名錄、指標與評估週期；緩解靠棲地維護、永續利用與目標年盤點。這是可觀測的約束。',
    mitigation: '依紅色名錄與國家報告追蹤受脅等級；對齊全球生物多樣性框架的目標年進度；把棲地維護、復育與永續利用留成可核對的槓桿。',
    uncertainty: '評估覆蓋仍不均勻，無脊椎動物與真菌的缺口較大。局部復育的成效，不能直接外推成全球結果。',
    dataAsOf: '2026-10-19',
    sources: [
      { name: '生物多樣性和生態系服務政府間科學政策平台｜全球評估決策者摘要', url: 'https://files.ipbes.net/ipbes-web-prod-public-files/inline/files/ipbes_global_assessment_report_summary_for_policymakers.pdf' },
      { name: '國際自然保護聯盟｜受威脅物種紅色名錄', url: 'https://www.iucn.org/resources/conservation-tool/iucn-red-list-threatened-species' },
      { name: '《生物多樣性公約》｜昆明—蒙特婁全球生物多樣性框架', url: 'https://www.cbd.int/gbf' },
      { name: '《生物多樣性公約》｜第十五屆締約方大會框架文本', url: 'https://www.cbd.int/article/cop15-final-text-kunming-montreal-gbf-221222' },
      { name: '《生物多樣性公約》｜框架集體進度全球審議', url: 'https://www.cbd.int/gbf/implementation/globalreview' },
      { name: '《生物多樣性公約》｜第十七屆締約方大會', url: 'https://www.cbd.int/conferences/2026' },
    ],
  },
  {
    id: 'horizon-antimicrobial-resistance',
    anchor: 'future-horizon-amr',
    title: '抗微生物藥物耐藥性（AMR）',
    domainId: 'f6',
    alsoDomainId: 'f4',
    kind: 'health',
    band: 'a1',
    timeBand: '數十年',
    confidence: 'steady',
    mechanism: '病原體對既有藥物的反應減弱之後，同一種感染會更難治療。不當使用、感染防控不足，以及新藥研發管線偏薄，是主要驅動。世界衛生組織以同一健康行動計畫與國家自評調查追蹤進度。這是健康基礎設施的維修問題。',
    mitigation: '處方與農畜用藥保持合理使用。感染預防、疫苗與診斷需要可及。國家進度依自評調查與全球行動計畫的公開窗口刷新。二〇二六年世界衛生大會已通過更新版全球行動計畫，涵蓋二〇二六至二〇三六年。',
    uncertainty: '監測覆蓋與實驗室能力各地差異很大。新藥研發時程與可及性仍不確定，局部進展不能外推成全球已經修復。',
    dataAsOf: '2026-10-19',
    sources: [
      { name: '世界衛生組織｜抗微生物藥物耐藥性實況報導', url: 'https://www.who.int/news-room/fact-sheets/detail/antimicrobial-resistance' },
      { name: '世界衛生組織歐洲區｜認識抗微生物藥物耐藥性', url: 'https://www.who.int/europe/news-room/questions-and-answers/item/understanding-antimicrobial-resistance-(amr)' },
      { name: '世界衛生組織｜抗微生物藥物耐藥性概況', url: 'https://www.who.int/docs/default-source/antimicrobial-resistance/amr-factsheet.pdf' },
      { name: '世界衛生組織｜國家行動計畫實施與監測', url: 'https://www.who.int/activities/supporting-countries-with-national-action-plan-implementation-and-monitoring' },
      { name: '世界衛生組織｜更新版全球行動計畫（二〇二六至二〇三六年）', url: 'https://www.who.int/news/item/25-05-2026-the-world-health-assembly-adopts-updated-global-action-plan-on-antimicrobial-resistance-(2026-2036)' },
    ],
  },
  {
    id: 'horizon-freshwater-stress',
    anchor: 'future-horizon-freshwater',
    title: '淡水可用量與衛生服務壓力',
    domainId: 'f6',
    alsoDomainId: 'f1',
    kind: 'resource',
    band: 'e2',
    timeBand: '進行中',
    confidence: 'steady',
    mechanism: '安全飲用水、環境衛生與水資源管理的進度，由可持續發展目標六的指標與綜合報告共同核對。壓力來自用水需求、污染、基礎設施維修與氣候變率疊加。這項約束正在持續，盤點修訂的是覆蓋與缺口。',
    mitigation: '覆蓋缺口依聯合國水機制，以及世界衛生組織與聯合國兒童基金會聯合監測計劃的指標更新。節水、廢水處理與流域管理是可以事後核對的槓桿。敘事只跟著綜合報告與年度指標窗口走。',
    uncertainty: '國家數據有時滯，方法也不盡相同。一地的極端乾旱，不能由全球均值直接代表。',
    dataAsOf: '2026-10-19',
    sources: [
      { name: '聯合國水機制｜可持續發展目標六綜合報告（二〇二六）', url: 'https://www.unwater.org/publications/sdg-6-synthesis-report-2026' },
      { name: '聯合國水機制｜可持續發展目標六進度報告', url: 'https://www.unwater.org/publications/sdg-6-progress-reports' },
      { name: '聯合國水機制｜可持續發展目標六數據', url: 'https://www.sdg6data.org/en' },
      { name: '世界衛生組織與聯合國兒童基金會｜聯合監測計劃家戶進度', url: 'https://washdata.org/reports/jmp-2025-wash-households' },
      { name: '世界衛生組織｜飲用水', url: 'https://www.who.int/news-room/fact-sheets/detail/drinking-water' },
      { name: '聯合國教科文組織｜世界水資源發展報告（二〇二五）', url: 'https://www.unesco.org/reports/wwdr/en/2025' },
    ],
  },
];

/**
 * W1 domain cards. At most two. `spare-grid` stays inside `energy-budget`
 * rather than becoming a third card.
 */
export const FUTURE_INSTANCES: readonly FutureInstance[] = [
  {
    id: 'energy-budget',
    anchor: 'future-energy-budget',
    domainId: 'f1',
    title: '能量收支與備援',
    blurb: '地球宜居窗口先受入射短波與向外長波輻射的收支約束。衛星輻射與海洋熱含量互相核對之後，修訂的是失衡幅度，不是某一年的終局。本段只記載這一收支如何被監測，並把序列留在可核對的出處。',
    mechanism: '「觀測」只標這一收支的監測。監測把大氣層頂的輻射收支與海洋熱含量留在可以互相對照的公共序列裡。序列靠校準與接替的儀器維持，單次退役並不取消這一收支。',
    contingency: '電網的應急備用另成一段。BAL-002-3 適用於北美可靠性標準下的應急備用，要求至少覆蓋最嚴重的單點出力損失，動用之後要在限期內補回，並留下可事後調取的記錄。備用或記錄缺一，功率就退回單點。設備能否換上，是另一項維修條件，不隨標準文本自動在場。這是條件，不是已完成的階梯。',
    tierId: 'observe',
    bands: ['e2'],
    dataAsOf: '2026-10-19',
    sources: [
      { name: '政府間氣候變化專門委員會｜第六次評估第一工作組第七章', url: 'https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-7/' },
      { name: '美國國家航空航天局｜雲與地球輻射能量系統', url: 'https://ceres.larc.nasa.gov/' },
      { name: '全球 Argo 海洋觀測網', url: 'https://argo.ucsd.edu/' },
      { name: '美國國家航空航天局地球觀測站｜氣候與能量收支', url: 'https://science.nasa.gov/earth/earth-observatory/climate-and-earths-energy-budget/' },
      { name: '美國氣候網｜海洋熱含量', url: 'https://www.climate.gov/news-features/understanding-climate/climate-change-ocean-heat-content' },
      { name: '北美電力可靠性機構｜應急備用標準', url: 'https://www.nerc.com/standards/reliability-standards/bal/bal-002-3' },
    ],
  },
  {
    id: 'verify-flood',
    anchor: 'future-verify-flood',
    domainId: 'f2',
    title: '大規模複製下的核對',
    blurb: '記錄一旦能被低成本複製，未經核對的敘述也可以同時到達許多互不相識的人。可信靠可指認的底本、出處與事後勘誤，不靠傳播有多快。本卡只寫核對程序如何運作，不替具體爭議選邊。',
    mechanism: '監測要回答兩件事：底本是否仍可打開，以及一份更正能否被後來的複本認出。修復不靠把複本刪盡。已經有穩定編號的文獻，更正或撤稿是另一份公開記錄，必須指回原篇，並把狀態寫進後來的複本仍能讀到的標記。這個程序只在採用它的出版範圍內成立，不能外推成所有公共討論都已核對。底本、編號與可辨認的更正缺一，錯誤就會隨複製一併擴散。撤稿鏈只以美國國家信息標準組織的撤稿傳遞頁，以及 Crossref 的版本、更正、撤稿頁為據。',
    tierId: 'pilot',
    bands: ['i2'],
    dataAsOf: '2026-10-19',
    sources: [
      { name: '美國國家信息標準組織｜撤稿與更正的傳遞', url: 'https://www.niso.org/standards-committees/crec', scope: '撤稿鏈' },
      { name: 'Crossref｜版本、更正與撤稿', url: 'https://www.crossref.org/documentation/principles-practices/best-practices/versioning/', scope: '撤稿鏈' },
      { name: '聯合國教科文組織｜媒體與信息素養', url: 'https://www.unesco.org/en/media-information-literacy', scope: '不作為撤稿鏈依據' },
      { name: '路透新聞研究所｜數字新聞報告', url: 'https://reutersinstitute.politics.ox.ac.uk/digital-news-report', scope: '不作為撤稿鏈依據' },
    ],
  },
];

export const FUTURE_COUNTDOWNS: readonly CountdownItem[] = [
  {
    id: 'wmo-annual',
    anchor: 'future-countdown-wmo',
    horizonId: 'climate',
    checkpoint: '2027-03-31',
    title: '年度評估窗口',
    pending: '下一檢查點是世界氣象組織年度全球氣候評估的公開窗口，約在二〇二七年三月。這是核對日期，不是災變時鐘。',
    expired: '該年度評估窗口已過。請改讀世界氣象組織最新的公開評估，本頁不保留倒數。',
  },
  {
    id: 'cd-cbd-gbf-checkpoint',
    anchor: 'future-countdown-cbd',
    horizonId: 'horizon-biodiversity-services',
    checkpoint: '2026-10-30',
    title: '生物多樣性框架進度窗',
    pending: '下一檢查點是《生物多樣性公約》秘書處已排定的框架進度盤點，約在二〇二六年十月十九日至三十日。這是生物多樣性盤點窗口，不是災變時鐘。',
    expired: '這一輪生物多樣性盤點窗口已過。等待下一輪締約方大會或進度報告。本頁不保留倒數。',
  },
  {
    id: 'cd-who-amr-tracss',
    anchor: 'future-countdown-amr',
    horizonId: 'horizon-antimicrobial-resistance',
    checkpoint: '2026-12-31',
    title: 'WHO AMR 進度自評',
    pending: '下一檢查點是世界衛生組織抗微生物藥物耐藥性國家自評的年度公開窗口，約每年一輪。本頁把這一輪記到二〇二六年十二月。這是核對日期，不是災變時鐘。',
    expired: '該輪自評窗口已過。等待下一輪自評。請改讀世界衛生組織最新的公開自評，本頁不保留倒數。',
  },
  {
    id: 'unwater-sdg6',
    anchor: 'future-countdown-unwater',
    horizonId: 'horizon-freshwater-stress',
    checkpoint: '2027-06-30',
    title: 'SDG 6 淡水進度盤點',
    pending: '二〇二六年可持續發展目標六綜合報告已經發布。下一檢查點是指標保管機構的年度進度公開窗口，約在二〇二七年六月。這是核對日期，不是災變時鐘。',
    expired: '該年度進度窗口已過。請改讀聯合國水機制與聯合監測計劃最新的公開進度，本頁不保留倒數。',
  },
];

export const FUTURE_CLADE: FutureClade = {
  id: 'mild-clade',
  anchor: 'future-clade',
  domainId: 'f4',
  title: '譜系的溫和讀法',
  kinds: ['tool-extension', 'niche-continue'],
  boundary: '本卡只寫工具如何延伸既有能力，以及既有生態位如何延續。不寫優生，不寫人群高下，也不寫封閉棲居。',
  layers: [
    {
      title: '共享遺產',
      text: '工具與記錄可以離開發明者，成為後來者能夠核對的公共底本。共享的是遺產，不是某一群人的座次。',
    },
    {
      title: '共演化',
      text: '技術與生活環境互相改寫。沒有單向的階梯，也沒有可以據此排列人群的分數。',
    },
    {
      title: 'SETI尚無確證',
      text: '搜尋地外技術信號的公開計劃，至今沒有可複核的接觸確證。未確證不寫成已經相遇。',
    },
  ],
};

/** 80–120 characters. Points at the six domains without renaming stage 10. */
export const STAGE10_BRIDGE = '展望・分域把第十階段接到六個閱讀入口：能量宜居、信息可信、制度協作、生物譜系、技術能力階與生存風險。各域只在總覽展望面板分頭加厚，本階段不改名，編年帶仍止於第十階，不另立第十一階。';

const DOOM_TITLE = /末日|崩潰|滅絕|倒數|災難/;
const RANK_TITLE = /第[0-9０-９一二三四五六七八九十百]+[級级]文明|文明分數|MiniMax/i;
const DATE_STAMP = /^\d{4}-\d{2}(?:-\d{2})?$/;
const DATE_DAY = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function domainById(id: string): FutureDomain | undefined {
  return FUTURE_DOMAINS.find((domain) => domain.id === id);
}

/** Hub anchors this module actually renders. */
export function futureAnchorIds(): string[] {
  return [
    'future',
    ...FUTURE_DOMAINS.map((domain) => domain.anchor),
    FUTURE_TIER_CARD.anchor,
    ...FUTURE_INSTANCES.map((card) => card.anchor),
    ...FUTURE_HORIZONS.map((horizon) => horizon.anchor),
    ...FUTURE_COUNTDOWNS.map((item) => item.anchor),
    FUTURE_CLADE.anchor,
    'future-bands',
  ];
}

/** True only for `/civilization/#future` and anchors this module renders. */
export function futureHrefAllowed(href: string): boolean {
  const match = /^\/civilization\/#([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(href);
  if (!match) return false;
  return new Set(futureAnchorIds()).has(match[1] ?? '');
}

function publishedText(): string {
  const parts: string[] = [
    STAGE10_BRIDGE,
    FUTURE_OPENING,
    LEVEL_LEGEND,
    ...BAND_NOTES.map((note) => note.text),
    ...Object.values(DOMAIN_STATUS_READER),
    FUTURE_TIER_CARD.note,
    FUTURE_TIER_CARD.title,
    FUTURE_CLADE.title,
    FUTURE_CLADE.boundary,
    ...FUTURE_CLADE.layers.flatMap((layer) => [layer.title, layer.text]),
    ...FUTURE_CLADE.kinds.map((kind) => CLADE_KIND_LABEL[kind]),
    ...FUTURE_DOMAINS.flatMap((domain) => [domain.title, domain.blurb, domain.status, ...(domain.lines ?? [])]),
    ...FUTURE_TIER_ROWS.flatMap((row) => [row.label, row.blurb, row.mark ?? '']),
    ...FUTURE_HORIZONS.flatMap((horizon) => [
      horizon.title,
      horizon.mechanism,
      horizon.mitigation,
      horizon.uncertainty,
      horizon.timeBand ?? '',
      horizon.kind ? HORIZON_KIND_LABEL[horizon.kind] : '',
      ...horizon.sources.map((source) => `${source.name}${source.scope ?? ''}`),
    ]),
    ...FUTURE_INSTANCES.flatMap((card) => [
      card.title,
      card.blurb,
      card.mechanism,
      card.contingency ?? '',
      card.tierId,
      ...card.bands,
      ...card.sources.map((source) => `${source.name}${source.scope ?? ''}`),
    ]),
    ...FUTURE_COUNTDOWNS.flatMap((item) => [item.title, item.pending, item.expired]),
  ];
  return parts.join('\n');
}

function banIssues(text: string): string[] {
  const issues: string[] = [];
  if (RANK_TITLE.test(text)) issues.push('rank');
  const stripped = text
    .replace(/沒有總分/g, '')
    .replace(/不寫優生/g, '')
    .replace(/不寫人群高下/g, '')
    .replace(/不寫封閉棲居/g, '')
    .replace(/不是災變時鐘/g, '')
    .replace(/不設災變時鐘/g, '')
    .replace(/不保留倒數/g, '');
  if (/總分|合成分數之外/.test(stripped) && /總分/.test(stripped)) issues.push('score');
  if (/優生|封閉棲居|隔離棲居/.test(stripped)) issues.push('clade-ban');
  if (/末日|滅絕|災變倒數|秒針|紅色倒數/.test(stripped)) issues.push('doom');
  if (/\/civilization\/future\//.test(text)) issues.push('route');
  return issues;
}

/** Empty array means the future contract holds. */
export function futureIssues(): string[] {
  const issues: string[] = [];
  if (FUTURE_DOMAIN_IDS.length !== 6) issues.push('domain-count');
  const titles = ['能量宜居', '信息可信', '制度協作', '生物譜系', '技術能力階', '生存風險'];
  const codes = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'];
  if (FUTURE_DOMAINS.length !== 6) issues.push('domain-rows');
  const anchors = new Set<string>();
  FUTURE_DOMAINS.forEach((domain, index) => {
    if (domain.id !== FUTURE_DOMAIN_IDS[index]) issues.push(`domain-id:${domain.id}`);
    if (domain.code !== codes[index]) issues.push(`domain-code:${domain.id}`);
    if (domain.title !== titles[index]) issues.push(`domain-title:${domain.id}`);
    if (!domain.blurb.trim() || civChars(domain.blurb) < 40 || civChars(domain.blurb) > 80) issues.push(`domain-blurb:${domain.id}`);
    if (!FUTURE_DOMAIN_STATUS.includes(domain.status)) issues.push(`domain-status:${domain.id}`);
    if (domain.anchor !== `future-${domain.id}`) issues.push(`domain-anchor:${domain.id}`);
    if (anchors.has(domain.anchor)) issues.push(`domain-dup:${domain.id}`);
    anchors.add(domain.anchor);
    if (domain.lines) {
      if (domain.lines.length < 1 || new Set(domain.lines).size !== domain.lines.length) issues.push(`domain-lines:${domain.id}`);
      for (const line of domain.lines) {
        if (!isCivLine(line)) issues.push(`domain-line:${domain.id}`);
      }
    }
  });

  if ([...FUTURE_TIERS].join() !== 'observe,pilot,infra,civ-scale') issues.push('tiers');
  if (FUTURE_TIER_ROWS.length !== FUTURE_TIERS.length) issues.push('tier-rows');
  const shown = FUTURE_TIER_ROWS.filter((row) => row.shown);
  if (shown.length !== 3) issues.push('tier-shown');
  if (shown.map((row) => row.tier).join() !== 'observe,pilot,infra') issues.push('tier-shown-order');
  if (shown.map((row) => row.mark).join() !== '約,示意,假說') issues.push('tier-marks');
  const hidden = FUTURE_TIER_ROWS.find((row) => row.tier === 'civ-scale');
  if (!hidden || hidden.shown || hidden.mark) issues.push('tier-civ-scale');
  for (const row of FUTURE_TIER_ROWS) {
    if (row.label !== TIER_LABEL[row.tier] || !row.blurb.trim()) issues.push(`tier-copy:${row.tier}`);
  }
  if (FUTURE_TIER_CARD.domainId !== 'f5' || !FUTURE_TIER_CARD.note.includes('約') || !FUTURE_TIER_CARD.note.includes('示意') || !FUTURE_TIER_CARD.note.includes('假說') || !FUTURE_TIER_CARD.note.includes('成熟度記號')) {
    issues.push('tier-card');
  }

  const bands = LEVEL_FAMILIES.flatMap((family) => family.bands);
  if (bands.join() !== LEVEL_BANDS.join()) issues.push('bands');
  if (!LEVEL_LEGEND.includes('e0') || !LEVEL_LEGEND.includes('e4') || !LEVEL_LEGEND.includes('i0') || !LEVEL_LEGEND.includes('i4') || !LEVEL_LEGEND.includes('a0') || !LEVEL_LEGEND.includes('a4')) {
    issues.push('legend');
  }
  if (/總分|第.+[級级]文明|文明分數/.test(LEVEL_LEGEND)) issues.push('legend-score');
  if (BAND_NOTES.map((note) => note.band).join() !== 'e2,i2,a1') issues.push('band-notes');
  for (const note of BAND_NOTES) {
    if (!note.text.includes(note.band) || !note.text.includes('不是文明等級')) issues.push(`band-note:${note.band}`);
  }
  if (!FUTURE_OPENING.endsWith('這裡不另開網址。')) issues.push('opening');
  for (const domain of FUTURE_DOMAINS) {
    if (!FUTURE_OPENING.includes(`${domain.title}回答`)) issues.push(`opening:${domain.id}`);
  }
  if (DOMAIN_STATUS_READER['有卡'].includes('有卡') || DOMAIN_STATUS_READER['加厚中'].includes('加厚中')) issues.push('status-reader');

  if (FUTURE_CLADE.kinds.join() !== FUTURE_CLADE_KINDS.join()) issues.push('clade-kinds');
  if (!FUTURE_CLADE.boundary.trim()) issues.push('clade-boundary');
  const layerTitles = ['共享遺產', '共演化', 'SETI尚無確證'];
  if (FUTURE_CLADE.layers.length !== 3 || FUTURE_CLADE.layers.some((layer, index) => layer.title !== layerTitles[index] || !layer.text.trim())) {
    issues.push('clade-layers');
  }
  if (FUTURE_CLADE.domainId !== 'f4') issues.push('clade-domain');

  const horizonTitles = ['氣候宜居約束', '信息可信與大規模誤導', '近地／空間天氣監測', '生物多樣性與生態系服務約束', '抗微生物藥物耐藥性（AMR）', '淡水可用量與衛生服務壓力'];
  if (FUTURE_HORIZONS.length !== horizonTitles.length) issues.push('horizon-count');
  const horizonIds = new Set<string>();
  for (const [index, horizon] of FUTURE_HORIZONS.entries()) {
    if (horizon.title !== horizonTitles[index]) issues.push(`horizon-title:${horizon.id}`);
    if (DOOM_TITLE.test(horizon.title)) issues.push(`horizon-doom:${horizon.id}`);
    if (!SLUG.test(horizon.id) || horizonIds.has(horizon.id)) issues.push(`horizon-id:${horizon.id}`);
    horizonIds.add(horizon.id);
    if (!domainById(horizon.domainId)) issues.push(`horizon-domain:${horizon.id}`);
    if (horizon.alsoDomainId && (!domainById(horizon.alsoDomainId) || horizon.alsoDomainId === horizon.domainId)) issues.push(`horizon-also:${horizon.id}`);
    if (horizon.kind && !(FUTURE_HORIZON_KINDS as readonly string[]).includes(horizon.kind)) issues.push(`horizon-kind:${horizon.id}`);
    if (horizon.timeBand && !(FUTURE_TIME_BANDS as readonly string[]).includes(horizon.timeBand)) issues.push(`horizon-time:${horizon.id}`);
    if (!(LEVEL_BANDS as readonly string[]).includes(horizon.band)) issues.push(`horizon-band:${horizon.id}`);
    if (!(FUTURE_CONFIDENCE as readonly string[]).includes(horizon.confidence)) issues.push(`horizon-confidence:${horizon.id}`);
    if (!horizon.mechanism.trim() || !horizon.mitigation.trim() || !horizon.uncertainty.trim()) issues.push(`horizon-copy:${horizon.id}`);
    if (!DATE_STAMP.test(horizon.dataAsOf)) issues.push(`horizon-asof:${horizon.id}`);
    if (horizon.sources.length < 4) issues.push(`horizon-sources:${horizon.id}`);
    const urls = new Set<string>();
    for (const source of horizon.sources) {
      if (!source.name.trim() || !/^https:\/\//.test(source.url)) issues.push(`horizon-source:${horizon.id}`);
      if (urls.has(source.url)) issues.push(`horizon-source-dup:${horizon.id}`);
      urls.add(source.url);
    }
  }

  if (FUTURE_COUNTDOWNS.length < 1) issues.push('countdown');
  for (const item of FUTURE_COUNTDOWNS) {
    if (!horizonIds.has(item.horizonId)) issues.push(`countdown-horizon:${item.id}`);
    if (!DATE_DAY.test(item.checkpoint)) issues.push(`countdown-date:${item.id}`);
    if (!item.pending.trim() || !item.expired.trim() || !item.title.trim()) issues.push(`countdown-copy:${item.id}`);
    if (DOOM_TITLE.test(item.title)) issues.push(`countdown-doom:${item.id}`);
    if (/\d+\s*秒|秒針|setInterval|只剩/.test(`${item.pending}\n${item.expired}`)) issues.push(`countdown-clock:${item.id}`);
  }
  const amr = FUTURE_HORIZONS.find((horizon) => horizon.id === 'horizon-antimicrobial-resistance');
  if (!amr
    || amr.domainId !== 'f6'
    || amr.alsoDomainId !== 'f4'
    || amr.kind !== 'health'
    || amr.timeBand !== '數十年'
    || amr.band !== 'a1'
    || amr.confidence !== 'steady'
    || amr.dataAsOf !== '2026-10-19'
    || amr.sources.length < 4
    || amr.sources.some((source) => !source.url.startsWith('https://www.who.int/'))) {
    issues.push('horizon-amr');
  }
  const tracss = FUTURE_COUNTDOWNS.find((item) => item.id === 'cd-who-amr-tracss');
  if (!tracss
    || tracss.horizonId !== 'horizon-antimicrobial-resistance'
    || tracss.checkpoint !== '2026-12-31'
    || !tracss.expired.includes('等待下一輪自評')) {
    issues.push('countdown-tracss');
  }
  const biodiversity = FUTURE_HORIZONS.find((horizon) => horizon.id === 'horizon-biodiversity-services');
  if (!biodiversity
    || biodiversity.domainId !== 'f6'
    || biodiversity.alsoDomainId !== 'f4'
    || biodiversity.kind !== 'biosphere'
    || biodiversity.timeBand !== '進行中'
    || biodiversity.confidence !== 'steady'
    || biodiversity.dataAsOf !== '2026-10-19') {
    issues.push('horizon-biodiversity');
  }
  const gbf = FUTURE_COUNTDOWNS.find((item) => item.id === 'cd-cbd-gbf-checkpoint');
  if (!gbf || gbf.horizonId !== 'horizon-biodiversity-services' || gbf.checkpoint !== '2026-10-30') issues.push('countdown-gbf');
  const freshwater = FUTURE_HORIZONS.find((horizon) => horizon.id === 'horizon-freshwater-stress');
  if (!freshwater
    || freshwater.domainId !== 'f6'
    || freshwater.alsoDomainId !== 'f1'
    || freshwater.kind !== 'resource'
    || freshwater.timeBand !== '進行中'
    || freshwater.band !== 'e2'
    || freshwater.confidence !== 'steady'
    || freshwater.dataAsOf !== '2026-10-19'
    || freshwater.sources.length < 4) {
    issues.push('horizon-freshwater');
  }
  const sdg6 = FUTURE_COUNTDOWNS.find((item) => item.id === 'unwater-sdg6');
  if (!sdg6 || sdg6.horizonId !== 'horizon-freshwater-stress' || sdg6.checkpoint !== '2027-06-30') {
    issues.push('countdown-sdg6');
  }

  const instanceIds = new Set<string>();
  for (const card of FUTURE_INSTANCES) {
    if (!SLUG.test(card.id) || instanceIds.has(card.id)) issues.push(`instance-id:${card.id}`);
    instanceIds.add(card.id);
    if (card.anchor !== `future-${card.id}` || anchors.has(card.anchor)) issues.push(`instance-anchor:${card.id}`);
    anchors.add(card.anchor);
    if (DOOM_TITLE.test(card.title) || !card.title.trim() || civChars(card.title) > 20) issues.push(`instance-title:${card.id}`);
    const blurbLen = civChars(card.blurb);
    if (blurbLen < 80 || blurbLen > 120) issues.push(`instance-blurb:${card.id}`);
    if (!card.mechanism.trim()) issues.push(`instance-mechanism:${card.id}`);
    if (!(FUTURE_TIERS as readonly string[]).includes(card.tierId)) issues.push(`instance-tier:${card.id}`);
    if (card.tierId === 'civ-scale' && !`${card.title}\n${card.blurb}\n${card.mechanism}`.includes('假說')) {
      issues.push(`instance-hypothesis:${card.id}`);
    }
    if (!domainById(card.domainId)) issues.push(`instance-domain:${card.id}`);
    const seenBands = new Set<string>();
    for (const band of card.bands) {
      if (!(LEVEL_BANDS as readonly string[]).includes(band) || seenBands.has(band)) issues.push(`instance-band:${card.id}`);
      seenBands.add(band);
    }
    if (!DATE_DAY.test(card.dataAsOf)) issues.push(`instance-asof:${card.id}`);
    if (card.sources.length < 4) issues.push(`instance-sources:${card.id}`);
    const urls = new Set<string>();
    for (const source of card.sources) {
      if (!source.name.trim() || !/^https:\/\//.test(source.url)) issues.push(`instance-source:${card.id}`);
      if (urls.has(source.url)) issues.push(`instance-source-dup:${card.id}`);
      urls.add(source.url);
    }
    if (/總分|合成分數|文明分數/.test(`${card.title}\n${card.blurb}\n${card.mechanism}\n${card.contingency ?? ''}`)) issues.push(`instance-score:${card.id}`);
  }
  const budget = FUTURE_INSTANCES.find((card) => card.id === 'energy-budget');
  const grid = budget?.contingency ?? '';
  if (!budget
    || !budget.blurb.includes('向外長波輻射')
    || budget.blurb.includes('外逸')
    || !budget.mechanism.includes('「觀測」只標這一收支的監測')
    || !budget.mechanism.includes('這一收支')
    || budget.mechanism.includes('這筆帳')
    || !grid
    || grid.includes('觀測')
    || !grid.includes('BAL-002-3')
    || !grid.includes('北美可靠性標準下的應急備用')) {
    issues.push('energy-split');
  }
  const flood = FUTURE_INSTANCES.find((card) => card.id === 'verify-flood');
  const chainUrls = [
    'https://www.niso.org/standards-committees/crec',
    'https://www.crossref.org/documentation/principles-practices/best-practices/versioning/',
  ];
  const chain = flood?.sources.filter((source) => source.scope === '撤稿鏈') ?? [];
  if (!flood
    || !flood.mechanism.includes('一併擴散')
    || flood.mechanism.includes('變寬')
    || !flood.mechanism.includes('撤稿鏈只以')
    || chain.length !== chainUrls.length
    || chain.some((source, index) => source.url !== chainUrls[index])
    || flood.sources.some((source) => source.url.includes('cern'))
    || flood.sources.some((source) => source.scope !== '撤稿鏈' && source.scope !== '不作為撤稿鏈依據')) {
    issues.push('retraction-sources');
  }
  const trust = FUTURE_HORIZONS.find((horizon) => horizon.id === 'trust');
  const cern = trust?.sources.find((source) => source.url.includes('home.cern'));
  if (!trust
    || !trust.mechanism.includes('萬維網簡史只說明複製變便宜，不支撐大規模誤導')
    || cern?.scope !== '只說明複製變便宜') {
    issues.push('cern-scope');
  }

  const bridgeLen = civChars(STAGE10_BRIDGE);
  if (bridgeLen < 80 || bridgeLen > 120) issues.push('bridge-len');
  for (const domain of FUTURE_DOMAINS) {
    if (!STAGE10_BRIDGE.includes(domain.title)) issues.push(`bridge:${domain.id}`);
  }
  if (!STAGE10_BRIDGE.includes('不另立第十一階') || !STAGE10_BRIDGE.includes('不改名')) issues.push('bridge-stage');

  const cardDomains = new Set<string>([
    ...FUTURE_HORIZONS.map((horizon) => horizon.domainId),
    ...FUTURE_INSTANCES.map((card) => card.domainId),
    FUTURE_TIER_CARD.domainId,
    FUTURE_CLADE.domainId,
  ]);
  for (const domain of FUTURE_DOMAINS) {
    const hasCard = cardDomains.has(domain.id);
    if (domain.status === '有卡' && !hasCard) issues.push(`status-card:${domain.id}`);
    if (domain.status === '加厚中' && hasCard) issues.push(`status-open:${domain.id}`);
  }

  issues.push(...banIssues(publishedText()));
  return issues;
}

/** Static sentence. The checkpoint day and after use the expired line. */
export function countdownSentence(item: CountdownItem, now: Date): string {
  const today = now.toISOString().slice(0, 10);
  return today >= item.checkpoint ? item.expired : item.pending;
}

function lineChips(lines: readonly string[] | undefined): string {
  if (!lines?.length) return '';
  return `<p class="line-chips">${lines.map((line) => `<span class="line-chip">${esc(line)}</span>`).join('')}</p>`;
}

function renderSources(sources: readonly FutureSource[]): string {
  const links = sources.map((source) => {
    const href = /^https:\/\//.test(source.url) ? esc(source.url) : '';
    const label = `${esc(source.name)}${source.scope ? `（${esc(source.scope)}）` : ''}`;
    return href ? `<a href="${href}">${label}</a>` : label;
  }).join('');
  return `<p class="future-sources">${links}</p>`;
}

function renderLevelLegend(id: string): string {
  const rows = LEVEL_FAMILIES.map((family) => {
    const bands = family.bands.map((band) => `<span class="future-band">${esc(band)}</span>`).join('');
    return `<p class="future-band-row"><span class="future-label">${esc(family.label)}</span>${bands}</p>`;
  }).join('');
  const notes = BAND_NOTES.map((note) => `<p>${esc(note.text)}</p>`).join('');
  return `<aside class="future-legend" id="${esc(id)}" aria-label="分帶圖例"><h3>分帶圖例</h3><p>${esc(LEVEL_LEGEND)}</p>${rows}${notes}</aside>`;
}

function instancesFor(domainId: string): readonly FutureInstance[] {
  return FUTURE_INSTANCES.filter((card) => card.domainId === domainId);
}

/**
 * 紙卡升起只加 class，不改句子。
 * 首兩張域卡是桌面首排，標成首屏並帶 is-inview，錨點落地時不先透明。
 * 其餘域卡交給既有 IntersectionObserver。
 */
function domainClass(index: number): string {
  return index < 2
    ? 'future-domain civ-reveal civ-reveal--above-fold is-inview'
    : 'future-domain civ-reveal';
}

function renderDomains(): string {
  const chips = FUTURE_DOMAINS.map((domain) => `<a href="#${esc(domain.anchor)}">${esc(domain.code)} ${esc(domain.title)}</a>`).join('');
  const cards = FUTURE_DOMAINS.map((domain, index) => {
    const links = instancesFor(domain.id).map((card) => `<a href="#${esc(card.anchor)}">${esc(card.title)}</a>`).join('');
    const more = links ? `<p class="stage-links">${links}</p>` : '';
    return `<article class="${domainClass(index)}" id="${esc(domain.anchor)}">
      <p class="future-kicker">${esc(domain.code)}</p>
      <h3>${esc(domain.title)}</h3>
      <p class="future-status">${esc(DOMAIN_STATUS_READER[domain.status])}</p>
      <p>${esc(domain.blurb)}</p>
      ${lineChips(domain.lines)}
      ${more}
    </article>`;
  }).join('');
  return `<nav class="future-domain-nav" aria-label="分域入口">${chips}</nav><div class="future-grid">${cards}</div>`;
}

function bandFamily(band: string): string {
  if (band.startsWith('e')) return '能量帶';
  if (band.startsWith('i')) return '信息帶';
  return '能動帶';
}

function renderInstance(card: FutureInstance): string {
  const domain = domainById(card.domainId);
  const tier = FUTURE_TIER_ROWS.find((row) => row.tier === card.tierId);
  const domainLink = domain ? `<a href="#${esc(domain.anchor)}">${esc(domain.code)} ${esc(domain.title)}</a>` : '';
  const mark = tier?.mark ? `成熟度記號 ${esc(tier.mark)}` : '';
  const tierBit = card.id === 'energy-budget'
    ? mark
    : [esc(tier?.label ?? card.tierId), mark].filter(Boolean).join(' · ');
  const bands = card.bands.map((band) => `<span class="future-band">${esc(bandFamily(band))} ${esc(band)}</span>`).join('');
  const bandRow = bands ? `<p class="future-band-row">${bands}</p>` : '';
  const contingency = card.contingency ? `<p>${esc(card.contingency)}</p>` : '';
  return `<article class="future-card future-instance civ-reveal" id="${esc(card.anchor)}" data-tier="${esc(card.tierId)}">
    <p class="future-kicker">實例 · ${domainLink} · ${tierBit} · 截至 <time datetime="${esc(card.dataAsOf)}">${esc(card.dataAsOf)}</time></p>
    <h3>${esc(card.title)}</h3>
    <p>${esc(card.blurb)}</p>
    ${bandRow}
    <p class="future-label">機制</p>
    <p>${esc(card.mechanism)}</p>
    ${contingency}
    ${renderSources(card.sources)}
  </article>`;
}

function renderTierCard(): string {
  const rows = FUTURE_TIER_ROWS.filter((row) => row.shown).map((row) => `<div class="future-tier" data-tier="${esc(row.tier)}">
      <p><span class="future-mark">${esc(row.mark ?? '')}</span> ${esc(row.label)}</p>
      <p>${esc(row.blurb)}</p>
    </div>`).join('');
  return `<article class="future-card civ-reveal" id="${esc(FUTURE_TIER_CARD.anchor)}">
    <p class="future-kicker"><a href="#future-f5">F5 技術能力階</a> · 約 · 示意 · 假說</p>
    <h3>${esc(FUTURE_TIER_CARD.title)}</h3>
    <p>${esc(FUTURE_TIER_CARD.note)}</p>
    ${rows}
  </article>`;
}

function renderHorizon(horizon: FutureHorizon): string {
  const domain = domainById(horizon.domainId);
  const also = horizon.alsoDomainId ? domainById(horizon.alsoDomainId) : undefined;
  const family = bandFamily(horizon.band);
  const domainLink = domain ? `<a href="#${esc(domain.anchor)}">${esc(domain.code)} ${esc(domain.title)}</a>` : '';
  const alsoLink = also ? ` · 並見 <a href="#${esc(also.anchor)}">${esc(also.code)} ${esc(also.title)}</a>` : '';
  const kind = horizon.kind ? ` · ${esc(HORIZON_KIND_LABEL[horizon.kind])}` : '';
  const time = horizon.timeBand ? ` · 時間帶 ${esc(horizon.timeBand)}` : '';
  return `<article class="future-card civ-reveal" id="${esc(horizon.anchor)}">
    <p class="future-kicker">${domainLink}${alsoLink} · ${esc(family)} ${esc(horizon.band)}${kind}${time} · 信心 ${esc(CONFIDENCE_LABEL[horizon.confidence])} · 截至 ${esc(horizon.dataAsOf)}</p>
    <h3>${esc(horizon.title)}</h3>
    <p class="future-label">機制</p>
    <p>${esc(horizon.mechanism)}</p>
    <p class="future-label">緩解</p>
    <p>${esc(horizon.mitigation)}</p>
    <p class="future-label">不確定</p>
    <p>${esc(horizon.uncertainty)}</p>
    ${renderSources(horizon.sources)}
  </article>`;
}

function renderCountdown(item: CountdownItem, now: Date): string {
  const horizon = FUTURE_HORIZONS.find((row) => row.id === item.horizonId);
  const back = horizon ? `<p class="stage-links"><a href="#${esc(horizon.anchor)}">${esc(horizon.title)}</a></p>` : '';
  return `<article class="future-card future-checkpoint civ-reveal" id="${esc(item.anchor)}">
    <p class="future-kicker">檢查點 · <time datetime="${esc(item.checkpoint)}">${esc(item.checkpoint)}</time></p>
    <h3>${esc(item.title)}</h3>
    <p>${esc(countdownSentence(item, now))}</p>
    ${back}
  </article>`;
}

function renderClade(): string {
  const kinds = FUTURE_CLADE.kinds.map((kind) => esc(CLADE_KIND_LABEL[kind])).join(' · ');
  const layers = FUTURE_CLADE.layers.map((layer) => `<div class="future-layer"><h4>${esc(layer.title)}</h4><p>${esc(layer.text)}</p></div>`).join('');
  return `<article class="future-card civ-reveal" id="${esc(FUTURE_CLADE.anchor)}">
    <p class="future-kicker"><a href="#future-f4">F4 生物譜系</a> · ${kinds}</p>
    <h3>${esc(FUTURE_CLADE.title)}</h3>
    <p class="future-label">邊界</p>
    <p>${esc(FUTURE_CLADE.boundary)}</p>
    ${layers}
  </article>`;
}

/** Hub panel. Static HTML, so it stays readable with script off. */
export function renderFuturePanel(now = new Date()): string {
  const instances = FUTURE_INSTANCES.map((card) => renderInstance(card)).join('');
  const horizons = FUTURE_HORIZONS.map((horizon) => renderHorizon(horizon)).join('');
  const countdowns = FUTURE_COUNTDOWNS.map((item) => renderCountdown(item, now)).join('');
  return `<section class="future-panel" id="future" aria-label="展望">
    <h2>展望</h2>
    <p class="future-note">${esc(FUTURE_OPENING)}</p>
    ${renderDomains()}
    <div class="future-layout">
      <div class="future-main">
        ${instances}
        ${renderTierCard()}
        ${horizons}
        ${countdowns}
        ${renderClade()}
      </div>
      ${renderLevelLegend('future-bands')}
    </div>
  </section>`;
}

/** Stage 10 only. Other stages return an empty string. */
export function renderFutureBridge(stageN: number): string {
  if (stageN !== 10) return '';
  const links = FUTURE_DOMAINS.map((domain) => `<a href="/civilization/#${esc(domain.anchor)}">${esc(domain.title)}</a>`).join('');
  return `<aside class="future-bridge" id="stage-10-bridge" aria-label="展望・分域">
    <h3>展望・分域</h3>
    <p>${esc(STAGE10_BRIDGE)}</p>
    <p class="stage-links"><a href="/civilization/#future">總覽展望</a>${links}</p>
    ${renderLevelLegend('stage-10-bands')}
  </aside>`;
}
