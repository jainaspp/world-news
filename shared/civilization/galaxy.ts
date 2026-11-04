import { cjkChars, esc, safeHttp } from '../contentPage.js';

/**
 * Thick page for /civilization/galaxy/.
 * Body is the GALAXY thicken pack (written Chinese), rendered with the
 * cosmos / earth paper shell. No child route is the entry.
 */

/** Whole-page essay floor. Below this the page stays noindex. */
export const GALAXY_MIN_CHARS = 1200;

export type GalaxyLine = '物質' | '能量' | '時間' | '信息';

export interface GalaxyPart {
  heading: string;
  paragraphs: string[];
}

export interface GalaxyStage {
  id: 'define' | 'formation' | 'structure';
  n: number;
  name: string;
  short: string;
  era: string;
  milestones: string[];
  meaning: string;
  lines: GalaxyLine[];
  parts: GalaxyPart[];
}

export interface GalaxySource {
  name: string;
  note: string;
  url: string;
}

export interface GalaxyNote {
  id: string;
  term: string;
  text: string;
}

export interface GalaxyCosmosLink {
  label: string;
  href: string;
  text: string;
}

const LINES: GalaxyLine[] = ['物質', '能量', '時間', '信息'];

export const GALAXY_TITLE = '銀河系誕生';

/**
 * Opening paragraphs. The first stays short so the snap lead card can show
 * prose under the title; later paragraphs continue on the next cards.
 */
export const GALAXY_LEDE_PARTS: readonly string[] = [
  '在文明編年史的時間軸上，宇宙長河先交代能量、時空與大尺度結構如何展開；地球生命頁則厚寫宜居星球上的生物信息如何累積。夾在兩者之間的，是我們所在的銀河系。',
  '本頁把敘事尺度收束到本星系：它如何在暗物質暈與氣體冷卻中成形，銀盤、核球、暈與旋臂如何分工，重元素如何一代代在恆星與超新星中富集，以及為何約四十六億年前的太陽系與後來的地球生命，都必須放回這座星系的化學與動力學背景裡理解。',
  '宇宙長河裡的「星系與大尺度結構」，描述的是宇宙網中無數星系的共通物理；本頁不重複那一層的絲狀網總論，而回答更貼近讀者的問題：我們這座棒旋星系本身，經歷了怎樣的約略年表？它的結構今日如何被觀測描繪？它向上如何掛回宇宙十階，向下如何交接地球生命與開蒙旁註？年代與數字皆為約數，細節隨觀測與模擬修訂；本頁只取可公眾核對的科普粗線。',
];

export const GALAXY_LEDE = GALAXY_LEDE_PARTS.join('');

export const GALAXY_LINES: readonly GalaxyLine[] = LINES;

export const GALAXY_SOURCE_NOTE = '年代、直徑、臂數與質量估值隨示跡物與模型而變；本頁數字皆為約數，上表只列可公眾點開的入口，不作絕對精準年表，也不虛構論文編號。';

export const GALAXY_QUESTIONS: readonly string[] = [
  '為何轉動曲線暗示還有看不見的質量？',
  '旋臂若是密度波，恆星如何進出臂區？',
  '金屬豐度如何聯繫年齡與誕生環境？',
  '衛星星系的恆星流如何成為合併證據？',
  '太陽系化學如何反映更早恆星世代？',
];

export const GALAXY_NOTES: readonly GalaxyNote[] = [
  { id: 'note-light-year', term: '光年', text: '光年是距離單位：光在真空約一年傳播的路程，不是時間長短。' },
  { id: 'note-dark-matter', term: '暗物質', text: '指主要經引力推知、幾乎不發光的物質成分；細節模型仍在推進。' },
  { id: 'note-metallicity', term: '金屬豐度', text: '天文慣稱氫氦以外的元素為「金屬」，用以追蹤化學富集世代。' },
  { id: 'note-spiral-arm', term: '旋臂', text: '多為密度與星形成示跡，不一定是同一批恆星剛體轉動的輪輻。' },
  { id: 'note-cosmic-year', term: '宇宙年', text: '指太陽約略繞銀心一周的時間，量級約兩億年，是方便記憶的約數。' },
  { id: 'note-molecular-cloud', term: '分子雲', text: '寒冷緻密、以分子氫為主的氣體雲，是恆星與行星系統的產房。' },
];

/** Stage links back into the cosmos ladder. Stage 4 is the parent essay; stage 5 is the next handoff. */
export const GALAXY_COSMOS_LINKS: readonly GalaxyCosmosLink[] = [
  { label: '01 大爆炸與暴脹', href: '/civilization/cosmos/#cosmo-1', text: '遠因背景。一句帶過：時空與能量的初始條件，本頁不再展開。' },
  { label: '02 原初核合成', href: '/civilization/cosmos/#cosmo-2', text: '輕元素原料。氫與氦是後續恆星燃料的起點。' },
  { label: '03 宇宙透明與第一代恆星', href: '/civilization/cosmos/#cosmo-3', text: '金屬起步。重元素注入介質，為行星化學鋪路。' },
  { label: '04 星系與大尺度結構', href: '/civilization/cosmos/#cosmo-4', text: '直接上級。本頁是該階的本星系特寫，宇宙長河仍寫共通骨架。' },
  { label: '05 太陽系形成', href: '/civilization/cosmos/#cosmo-5', text: '直接下級。銀盤某一分子雲塌縮為原行星盤，其後交給地球生命。' },
];

const HANDOFF_BRIDGE = '宇宙長河在「星系與大尺度結構」寫出共通骨架；本頁寫出骨架上的這一座棒旋星系。約四十六億年前，銀盤內一片氣體雲走向太陽系形成，敘事交給宇宙長河第五階與地球生命頁繼續。';

const HANDOFF_UP_BEFORE = '向上：先讀或回看宇宙長河第四階';
const HANDOFF_UP_AFTER = '，以把握銀河系所在的宇宙網位置。平行：本頁特寫銀河系誕生。';

const HANDOFF_DOWN_BEFORE = '向下：約四十六億年前，銀盤分子雲塌縮為太陽系。續讀宇宙長河「太陽系形成」，並進入';
const HANDOFF_DOWN_MID = '，看液態水之後的生物信息如何累積；人族段落見';
const HANDOFF_DOWN_AFTER = '。本頁結束於太陽系得以在銀盤中成形、地球獲得液態水與長期光照的舞台。其後早期地球、生命起源與生物圈演代不在此重寫。';

const HANDOFF_THIN = '文明編年史把新聞保留為「今日」薄層；本頁屬於深時間主幹，不在此展開今日切片。';

export const GALAXY_STAGES: GalaxyStage[] = [
  {
    id: 'define',
    n: 1,
    name: '定義：什麼是星系，什麼是銀河系',
    short: '定義',
    era: '今所見的棒旋星系',
    milestones: ['引力束縛的恆星、氣體、塵埃與暗物質暈', '盤的特徵尺度約十萬光年量級'],
    meaning: '看見星光，並不等於理解勢阱、軌道與化學。',
    lines: ['物質', '時間'],
    parts: [
      {
        heading: '星系作為引力束縛的恆星系統',
        paragraphs: [
          '在現代天文綜述裡，星系通常指由恆星、氣體、塵埃與暗物質暈共同構成、在引力下長期束縛的系統。可見光裡最醒目的是恆星與發光氣體，但主導質量預算、撐起勢阱深度的，往往是幾乎不發光的暗物質。沒有足夠深的勢阱，氣體難以長期停留並冷卻塌縮；沒有氣體冷卻與角動量分配，也難以形成穩定的恆星盤。因此看見一座星系與理解一座星系並不是同一件事：前者多半是星光與發射線，後者還包括暈、軌道與化學。',
          '星系的形態大致可粗分為盤狀（常含旋臂）、橢球狀，以及不規則形態。盤狀星系若具有旋臂結構，常稱旋渦星系；若中央還有長條狀的恆星結構，則稱棒旋星系。這些標籤是觀測分類，不是價值排序：不同形態對應不同的氣體儲量、恆星形成史與合併經歷。',
        ],
      },
      {
        heading: '銀河系：我們從內部看見的棒旋星系',
        paragraphs: [
          '銀河系是太陽系所在的星系。因為我們身處銀盤之內，夜空中的銀河呈現為橫過天球的亮帶——那是盤內無數恆星與塵埃在視線方向上的投影，而不是一條真正的河流。從河外視角的想像重建，與紅外、射電、可見光多波段製圖，可以拼出更接近俯視的結構：一個具有中央結構與旋臂的盤，外加延伸更遠的恆星暈，以及尺度更大的暗物質暈。',
          '主流科普常把銀河系直徑說成約十萬光年量級，指的是恆星盤的特徵尺度；不同示跡物給出的邊緣並不一致，故宜標「約」。太陽約位於距銀心兩萬六千光年量級的盤內軌道上，以約兩億年量級完成一周，這段時間常被稱作一個宇宙年。這些數字方便建立直覺，但不是實驗室裡的單一精確常數。測量依賴恆星距離、自行、視向速度與動力學模型，會隨太空望遠鏡與地面巡天更新。',
        ],
      },
      {
        heading: '本頁在站內的定義邊界',
        paragraphs: [
          '向上，本頁不取代宇宙長河對星系與大尺度結構的總論，它是其中一個成員的特寫。向下，本頁不展開地球地質年代與生物各大輻射的長文，那些留給地球生命頁。橫向，本頁不併入文明編年的制度、技術與貨幣敘事。銀河系是物理與化學舞台，不是王朝年表，也不寫人族化石與遷徙路線。',
        ],
      },
    ],
  },
  {
    id: 'formation',
    n: 2,
    name: '形成史：從宇宙網節點到可長期演化的銀盤',
    short: '形成',
    era: '約一百至一百三十億年前起',
    milestones: ['暈內小系統合併，氣體沉降成盤', '金屬豐度隨恆星世代爬升'],
    meaning: '銀河系沒有單一的完工日期，只有可階段化的約略里程碑。',
    lines: ['物質', '能量', '時間'],
    parts: [
      {
        heading: '大尺度背景',
        paragraphs: [
          '約一百至一百三十億年前起，物質已在引力與暗物質暈作用下組織成絲、結與空洞。星系傾向出現在絲與結的高密度區：氣體沿絲流入暈中，冷卻後形成恆星。銀河系的出生證明並不是某一瞬的單一爆炸事件，而是一段跨越數十億年的組裝史——早期暈內小系統合併、氣體沉降成盤、旋臂與棒逐漸可辨，同時金屬豐度隨恆星世代爬升。',
          '宇宙長河第三階說明，第一代巨星把重於氦的元素注入介質，金屬豐度由此起步。沒有這一步，行星的固態原料與複雜化學都缺少物質基礎。第四階則說明，暗物質暈與回饋、合併共同塑造可長期演化的結構骨架。銀河系正是這兩階之後，在本星系群尺度上繼續寫下來的地方誌。',
        ],
      },
      {
        heading: '早期組裝與恆星暈',
        paragraphs: [
          '觀測上，銀河系的恆星暈含有軌道偏離銀盤、化學上往往更老、金屬豐度偏低的恆星族群，以及可辨認的恆星流。這些結構常被解讀為早期較小星系落入主暈時被潮汐撕扯的遺跡：合併不是把歷史抹平，而是把碎片留在相空間與化學空間裡，供後人重建。暈星與球狀星團提供了盤成形之前與之外的時間膠囊。它們提醒讀者：銀盤雖然是我們最熟悉的亮帶，卻不是銀河系質量與歷史的全部。',
          '早期宇宙中氣體更豐富、相互作用更頻繁，恆星形成率可以高於今日銀盤的平均值。大質量恆星迅速走完一生，以星風與超新星把能量與重元素送回介質。這既可能吹散氣體、抑制下一輪形成，也可能在壓縮中觸發新的星團。形成史因此是冷卻沉降與回饋攪動的拉鋸，而不是單調的直線堆積。',
        ],
      },
      {
        heading: '薄盤、厚盤與化學鐘',
        paragraphs: [
          '銀盤內部常再分為化學與運動學上可區分的成分。科普敘事裡常見厚盤與薄盤的粗分：前者恆星年齡偏老、軌道垂直運動較大、金屬豐度分佈不同；後者更薄、更年輕、持續有氣體與新恆星。這樣的分層不是書架上兩本互不相關的書，而是同一勢阱裡不同時期、不同動力學加熱與富集路徑的疊加。',
          '化學鐘指的是：恆星大氣保留了它形成時的介質組成。通過測量鐵族與 α 元素等豐度比，可以粗略判斷一顆星誕生於富集進程的哪一階段。對銀河系而言，這意味著我們能把空間結構與時間順序對起來讀。旋臂與分子雲是正在進行的製造現場，而老盤星與暈星則是檔案庫。',
        ],
      },
      {
        heading: '棒與旋臂的出現',
        paragraphs: [
          '盤內角動量重新分配與軌道共振，有助於形成棒狀結構。棒能驅動氣體向內輸送，影響中央區域的恆星形成與核活動。旋臂則常被理解為密度波或瞬態臂段：氣體進入臂區被壓縮，星雲塌縮，年輕亮星點亮臂的輪廓，隨後恆星又離開臂區，使臂看起來像旋轉的圖案，而不必是同一批恆星在作剛體轉動。臂的數目、節距與清晰度會隨時間與氣體含量改變，因此「四條臂」之類的說法屬於便於溝通的示意，細節模型並非固定不變。',
          '約數十億年的尺度上，銀河系逐漸具備今日科普圖常見的棒旋輪廓；與此同時，低水平的吸積與衛星星系擾動仍在發生。形成史沒有乾淨的完工日期，只有可階段化的約略里程碑。約四十六億年前太陽系誕生時，這座星系已經是一個化學上相當富集的盤，而不是第一代恆星剛點燃時的貧金屬環境。',
        ],
      },
    ],
  },
  {
    id: 'structure',
    n: 3,
    name: '結構：我們如何描繪這座星系',
    short: '結構',
    era: '暈、核、盤與本星系群',
    milestones: ['暗物質暈撐起轉動曲線', '本星系群把宇宙網收到太陽系'],
    meaning: '先有勢阱，才有長期束縛的盤；化學與軌道要合在同一顆星上讀。',
    lines: ['物質', '信息'],
    parts: [
      {
        heading: '暗物質暈',
        paragraphs: [
          '暗物質暈的特徵尺度遠大於可見恆星盤。它幾乎不參與電磁輻射，卻透過引力決定外圍恆星與氣體的轉動曲線。在許多旋渦星系中，轉動速度並不隨半徑迅速下降，這一觀測是暗物質論述的重要公共支柱之一。對銀河系而言，本地暗物質密度與暈的整體質量仍是活躍測量題，但「暈提供主勢阱」這一粗線，足以支撐所需的結構直覺：先有勢阱，才有長期束縛的盤與暈星。',
        ],
      },
      {
        heading: '核球與銀心',
        paragraphs: [
          '銀心方向有高密度的恆星集中區，以及受塵埃嚴重遮擋的中心環境。多波段觀測揭示中央存在與大質量緻密天體相容的動力學訊號；科普敘事常以此說明，許多大星系中心可寄宿超大質量緻密核。銀心也有劇烈的恆星形成與高能過程跡象。對本頁而言，重點不是獵奇，而是結構分工：中央區域處理高密度動力學與部分氣體的最終歸宿；盤區承載大多數年輕恆星與旋臂圖案；暈區保存合併與早期富集的檔案。',
        ],
      },
      {
        heading: '銀盤：氣體、塵埃與恆星形成',
        paragraphs: [
          '銀盤是分子雲、原子氫與塵埃的主要居所。寒冷緻密的分子雲是恆星的產房；紫外光與超新星則把雲驅散或加熱，形成可觀測的殼層與泡狀結構。塵埃既遮擋可見光，也重新以紅外輻射能量，並提供固體表面，催化部分化學反應。沒有盤內的氣體循環，就不會有持續的行星原料補給；沒有塵埃與金屬，類地行星的固態核心也難以想像。',
        ],
      },
      {
        heading: '旋臂作為壓縮與示跡',
        paragraphs: [
          '旋臂是密度與星形成的示跡結構。臂區常見年輕星團、電離氫區與分子雲排列；臂間則相對稀疏。對生活在盤內的觀測者，旋臂還造成距離與消光的複雜前景。這正是為何銀河系結構圖高度依賴紅外、射電、脈澤、天文測量衛星與大規模巡天，而不只靠肉眼所見的銀河亮帶。',
        ],
      },
      {
        heading: '衛星星系與本星系群',
        paragraphs: [
          '銀河系並非孤立。它屬於本星系群，並擁有多個衛星星系。衛星的軌道與恆星流，持續輕微攪動主暈與盤的外圍。大尺度上，本星系群又嵌在更龐大的宇宙網絲絡之中。這樣的層級——宇宙網、星系群、主星系與衛星、銀盤上的太陽系——正是站內由宇宙到銀河系、再到地球生物所要讓讀者摸到的階梯。',
        ],
      },
      {
        heading: '觀測如何看見銀河系',
        paragraphs: [
          '因為我們位於盤內，銀河系結構研究高度依賴多波段與天文測量。可見光受塵埃消光限制，在銀心與旋臂切線方向尤其嚴重。近紅外較能穿透塵埃，勾勒核球與盤的恆星質量分佈。射電觀測中性氫與分子譜線，重建氣體盤的轉動與臂段。太空天文測量提供巨量恆星的位置、自行與視向速度，使相空間中的流與次結構可被統計分離。',
          '這些手段共同把銀河亮帶升級成可檢驗的三維模型。對讀者，重要的不是記住每一架望遠鏡的名稱，而是建立方法上的直覺：深時間敘事必須可被觀測示跡，而不是只靠想像插圖。文明編年史的圖像槽標明示意與約數，避免把藝術重建誤認為相片級實景。另一條粗線是化學與動力學聯合：只談空間形狀而不談豐度，容易把不同世代的恆星混成同一張薄餅；只談豐度而不談軌道，又難以判斷它們來自盤、暈還是吸積碎片。現代巡天之所以改變銀河系敘事，正是因為兩者開始在同一顆星上會合。',
        ],
      },
      {
        heading: '能量、物質、信息與時間',
        paragraphs: [
          '能量在本頁讀作大質量恆星與超新星的回饋、銀心的高能過程，以及太陽長期穩態輸出對地球的意義，後者只點到為止。物質讀作暗物質暈的勢阱、氫氦氣體、塵埃與金屬，以及衛星貢獻的恆星與氣體。信息讀作化學豐度這份形成環境的記錄，以及恆星流這份合併史的相空間記錄；生物信息留給地球生命頁。時間讀作從早期組裝到盤趨於穩定的數十億年、約兩億年量級的宇宙年，以及太陽系誕生在銀河年齡裡偏晚的位置。四個標籤不必在每段強行出現。它們用來避免本頁寫成純觀光導覽：它仍是深時間長河的一段，只是尺度換成了一座星系。',
        ],
      },
    ],
  },
];

export const GALAXY_SOURCES: GalaxySource[] = [
  { name: '中國科學院國家天文台 · 科學傳播資源', note: '銀河系、巡天與銀心的公眾說明入口', url: 'https://www.nao.cas.cn/ncb/kx/' },
  { name: 'NASA Science · Galaxies', note: '星系與銀河系公眾教育頁', url: 'https://science.nasa.gov/universe/galaxies/' },
  { name: 'ESA · Gaia', note: '銀河系恆星測量與結構製圖的任務介紹', url: 'https://www.esa.int/Science_Exploration/Space_Science/Gaia' },
  { name: '歐洲南方天文台 · 公眾頁', note: '銀河系中心與星際介質的公眾新聞與圖像說明', url: 'https://www.eso.org/public/' },
  { name: '哈佛—史密松天體物理中心', note: '旋渦星系與暗物質的公眾教育入口', url: 'https://www.cfa.harvard.edu/' },
];

export function galaxyRobots(chars: number): 'index,follow' | 'noindex,follow' {
  return chars >= GALAXY_MIN_CHARS ? 'index,follow' : 'noindex,follow';
}

/** Essay counted for the index floor. Source URLs and chrome stay out. */
export function galaxyProse(): string {
  return [
    GALAXY_TITLE,
    GALAXY_LEDE,
    ...LINES,
    ...GALAXY_STAGES.flatMap((stage) => [
      stage.name,
      stage.era,
      ...stage.milestones,
      stage.meaning,
      ...stage.lines,
      ...stage.parts.flatMap((part) => [part.heading, ...part.paragraphs]),
    ]),
    HANDOFF_BRIDGE,
    HANDOFF_UP_BEFORE,
    HANDOFF_UP_AFTER,
    HANDOFF_DOWN_BEFORE,
    HANDOFF_DOWN_MID,
    HANDOFF_DOWN_AFTER,
    HANDOFF_THIN,
    ...GALAXY_COSMOS_LINKS.flatMap((row) => [row.label, row.text]),
    ...GALAXY_NOTES.flatMap((note) => [note.term, note.text]),
    ...GALAXY_QUESTIONS,
    GALAXY_SOURCE_NOTE,
    ...GALAXY_SOURCES.flatMap((row) => [row.name, row.note]),
    '地球生命',
    '人類起源時間線',
    '宇宙長河',
  ].join('\n');
}

/** Pass a short string to see the floor fail. The live page uses galaxyProse(). */
export function galaxyIndexable(prose = galaxyProse()): boolean {
  return galaxyRobots(cjkChars(prose)) === 'index,follow';
}

function ordinal(n: number): string {
  return String(n).padStart(2, '0');
}

function lineChips(lines: readonly string[]): string {
  return `<p class="line-chips">${lines.map((line) => `<span class="line-chip">${esc(line)}</span>`).join('')}</p>`;
}

function paragraphs(blocks: readonly string[]): string {
  return blocks.map((text) => `<p>${esc(text)}</p>`).join('');
}

const CIV = '/static/civilization';

function paperSeal(n: number): string {
  return `<span class="stage-seal">${ordinal(n)}</span>`;
}

/**
 * Cover slot. Art files are a later batch. The paper ordinal stays in the
 * figure and shows when the image is missing. onerror hides the broken file.
 */
function coverImg(stage: GalaxyStage, eager: boolean): string {
  const base = `${CIV}/galaxy-stage-${stage.n}-cover`;
  const loading = eager ? 'eager' : 'lazy';
  const priority = eager ? ' fetchpriority="high"' : '';
  const alt = `${stage.name}：溫和示意，年代為約數`;
  return `<img src="${base}-640w.webp" srcset="${base}-400w.webp 400w, ${base}-640w.webp 640w, ${base}-1280w.webp 1280w" sizes="(max-width: 640px) 100vw, 400px" width="640" height="400" alt="${esc(alt)}" loading="${loading}"${priority} decoding="async" onerror="this.hidden=true" />`;
}

function sourceHref(url: string): string {
  const safe = safeHttp(url);
  return safe ? esc(safe) : '';
}

function stageSection(stage: GalaxyStage): string {
  const points = stage.milestones.map((item) => `<li>${esc(item)}</li>`).join('');
  const parts = stage.parts.map((part) => `<div class="galaxy-part"><h3>${esc(part.heading)}</h3>${paragraphs(part.paragraphs)}</div>`).join('');
  const reveal = stage.n === 1 ? ' civ-reveal civ-reveal--above-fold is-inview' : ' civ-reveal';
  return `<section class="chronicle-stage galaxy-stage${reveal}" id="${stage.id}" data-stage="${stage.n}">
    <p class="era">${esc(ordinal(stage.n))} · ${esc(stage.era)}</p>
    <h2 tabindex="-1">${esc(stage.name)}</h2>
    <figure class="civ-figure" data-stage="${stage.n}"><div class="stage-frame stage-cover" data-stage="${stage.n}">${coverImg(stage, stage.n === 1)}${paperSeal(stage.n)}</div><figcaption>${esc(stage.name)} · 示意 · 約數</figcaption></figure>
    <ul class="stage-milestones">${points}</ul>
    ${parts}
    <p class="stage-meaning">${esc(stage.meaning)}</p>
    ${lineChips(stage.lines)}
  </section>`;
}

function noteAside(note: GalaxyNote): string {
  return `<aside class="learn-note" id="${esc(note.id)}"><p><strong>${esc(note.term)}</strong> · ${esc(note.text)}</p></aside>`;
}

function cosmosLinkSection(): string {
  const items = GALAXY_COSMOS_LINKS.map((row) => `<li><a href="${esc(row.href)}">${esc(row.label)}</a> · ${esc(row.text)}</li>`).join('');
  return `<section class="chronicle-stage galaxy-stage civ-reveal" id="cosmos-link" data-stage="4">
    <p class="era">銜接 · 宇宙十階</p>
    <h2 tabindex="-1">與宇宙十階的銜接</h2>
    <p>${esc(HANDOFF_BRIDGE)}</p>
    <ul class="stage-milestones">${items}</ul>
    <p>第六階至第十階寫地球與生命。本頁只保留一句：宜居環境需要恆星的長期穩定與化學供應。細節見地球生命，約七百萬年前的人族物語見人類起源時間線。</p>
    <p class="stage-meaning">本頁是宇宙長河第四階的本星系特寫，不是另一套十階。</p>
  </section>`;
}

function earthHandoffSection(): string {
  return `<section class="chronicle-stage galaxy-stage civ-reveal" id="earth-handoff" data-stage="5">
    <p class="era">交接 · 地球生命</p>
    <h2 tabindex="-1">接地球生命編年</h2>
    <p>地球生命頁從早期生命、氧化、顯生宙寫到人族前的生物圈。那些故事默認了幾個星系尺度的前提。本頁點明它們，卻不展開成生物學長文。</p>
    <ul class="stage-milestones">
      <li>穩定的長期能量輸入：太陽作為中等質量的主序星，能在數十億年尺度上相對平穩地輸出能量。這類恆星的誕生，依賴銀盤氣體的冷卻與金屬豐度。</li>
      <li>固體與揮發份的原料：岩石行星與水相關組分，需要前代恆星的核合成，以及超新星與恆星風把重元素送進分子雲。銀河系的化學演化，就是這座原料廠的流水線。</li>
      <li>相對可討論的軌道環境：行星系統仍可能受鄰近超新星、分子雲遭遇與彗星儲庫擾動影響。把地球放回銀盤軌道，是為了說明宜居是條件的交集。條件清單在變得更清楚，單一敘事不應裝成已經窮盡。</li>
    </ul>
    <p>${esc(HANDOFF_UP_BEFORE)}<a href="/civilization/cosmos/#cosmo-4">星系與大尺度結構</a>${esc(HANDOFF_UP_AFTER)}</p>
    <p>${esc(HANDOFF_DOWN_BEFORE)}<a href="/civilization/earth/">地球生命</a>${esc(HANDOFF_DOWN_MID)}<a href="/civilization/origins/">人類起源時間線</a>${esc(HANDOFF_DOWN_AFTER)}</p>
    <p>${esc(HANDOFF_THIN)}</p>
    <p class="stage-links"><a href="/civilization/cosmos/">宇宙長河</a><a href="/civilization/cosmos/#cosmo-4">星系與大尺度結構</a><a href="/civilization/cosmos/#cosmo-5">太陽系形成</a><a href="/civilization/earth/">地球生命</a><a href="/civilization/origins/">人類起源時間線</a></p>
    <p class="stage-meaning">演示鏈在此走通：宇宙長河、銀河系誕生、地球生命。</p>
  </section>`;
}

function askSection(): string {
  const items = GALAXY_QUESTIONS.map((question) => `<li>${esc(question)}</li>`).join('');
  return `<section id="ask">
    <h2>今日可問</h2>
    <ul class="stage-ask">${items}</ul>
  </section>`;
}

function sourceTable(): string {
  const body = GALAXY_SOURCES.map((row, index) => {
    const href = sourceHref(row.url);
    const link = href ? `<a href="${href}">${esc(row.url)}</a>` : esc(row.url);
    return `<tr><td>${index + 1}</td><td>${esc(row.name)}</td><td>${esc(row.note)}</td><td>${link}</td></tr>`;
  }).join('');
  return `<table class="civ-table"><thead><tr><th>#</th><th>機構／入口</th><th>說明</th><th>網址</th></tr></thead><tbody>${body}</tbody></table>`;
}

export function renderGalaxyArticle(): string {
  const nav = [
    ...GALAXY_STAGES.map((stage) => `<a class="chip" href="#${stage.id}">${ordinal(stage.n)} ${esc(stage.short)}</a>`),
    '<a class="chip" href="#cosmos-link">銜接</a>',
    '<a class="chip" href="#earth-handoff">交接</a>',
    '<a class="chip" href="#ask">可問</a>',
    '<a class="chip" href="#sources">來源</a>',
  ].join('');
  return `<article class="civ-article galaxy-page">
    <header class="galaxy-hero">
      <p class="kicker">Deep time · 銀河系</p>
      <h1 class="column-title civ-page-title">${esc(GALAXY_TITLE)}</h1>
    </header>
    <p class="deep-time-return"><a href="/civilization/cosmos/#cosmo-4">回看宇宙長河：星系與大尺度結構</a><a href="/civilization/cosmos/">宇宙長河</a></p>
    ${GALAXY_LEDE_PARTS.map((part) => `<p>${esc(part)}</p>`).join('')}
    ${lineChips(LINES)}
    <nav class="chronicle-nav galaxy-nav" aria-label="跳到銀河系章節">${nav}</nav>
    <div class="civ-progress" aria-hidden="true"></div>
    ${GALAXY_STAGES.map(stageSection).join('')}
    <section class="galaxy-notes" aria-label="開蒙旁註">
      <h2>開蒙旁註</h2>
      <p>下列旁註只解釋詞義與尺度。<a href="/learn/">開蒙</a>葉頁另備，本頁先留錨與一句。</p>
      ${GALAXY_NOTES.map(noteAside).join('')}
    </section>
    ${cosmosLinkSection()}
    ${earthHandoffSection()}
    ${askSection()}
    <section id="sources">
      <h2>來源</h2>
      ${sourceTable()}
      <p class="stage-source">${esc(GALAXY_SOURCE_NOTE)}</p>
    </section>
    <p class="civ-ai"><span class="badge">AI 整合</span> 本頁由公開科普與主流綜述入口整理，作為文明編年史的深時間頁。授權跟隨站級 CC BY 4.0。</p>
  </article>`;
}
