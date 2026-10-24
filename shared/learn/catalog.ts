/**
 * 開蒙契約 v2（taxonomy 加厚）。對齊 research/learn-tree-2026-10-23/TREE.md：
 * 12 門閉集；種子 zh／math／en 之外，按樣葉開 phy／bio／gen 三門；
 * 餘下 chem／hist／geo／music／art／pe 仍為淡門，只標方位。
 * 深度：L0 門根 → L1 門徑（paths）→ L2 區塊（blocks）→ L3 葉（lessons）；
 * L4 列為 growth 示意，非本版必種。解鎖＝葉完成驅動（prereq 同 L2 鏈），
 * 進度記本機 localStorage；文明點只作顯示，不兌換。
 * 與文明／懶人包只走 softLinks，正文不互貼。
 */

export interface LearnBlock {
  id: string;
  name: string;
}

export interface LearnPath {
  id: string;
  name: string;
  blocks: LearnBlock[];
}

export interface LearnSubject {
  id: string;
  name: string;
  bearing: string;
  /** 開＝可掛葉；淡＝只標方位，不假裝有正文。 */
  open: boolean;
  orientation: string;
  /** L1 門徑；淡門留空，不預支假目錄。 */
  paths: LearnPath[];
  /** L4「可再長」示意，一句列點，非本版必種。 */
  growth?: string;
}

export interface LearnSoftLinks {
  /** 0–2 條文明軸軟鏈；只列路徑，不貼正文。 */
  civilization?: string[];
  /** 0–2 條懶人包／今天切片軟鏈。 */
  explainer?: string[];
}

export interface LearnLesson {
  id: string;
  subjectId: string;
  /** 所屬 L2 區塊 id。 */
  blockId: string;
  /** 同 L2 下一葉的建議前置（葉 id，非門外跨鏈）。 */
  prereq?: string;
  title: string;
  summary: string;
  body: string[];
  softLinks?: LearnSoftLinks;
}

/** 葉在進度鍵裡的完整 id 形（`${subjectId}:${lessonId}`）。 */
export interface EduProgress {
  completed: string[];
  civPoints?: number;
  updatedAt: string;
}

export const LEARN_PROGRESS_KEY = 'wn.edu.progress.v1';

export const LEARN_SUBJECTS: readonly LearnSubject[] = [
  {
    id: 'zh',
    name: '漢語與文字',
    bearing: '符號與語言',
    open: true,
    orientation: '符號如何把聲音和意思留在紙上。',
    paths: [
      {
        id: 'zh.l1.form',
        name: '字形與部件',
        blocks: [
          { id: 'zh.l2.stroke-part', name: '筆畫與部件' },
          { id: 'zh.l2.phonetic', name: '形聲初識' },
        ],
      },
      { id: 'zh.l1.word', name: '詞與義', blocks: [] },
      { id: 'zh.l1.discourse', name: '句段條理', blocks: [] },
      { id: 'zh.l1.genre', name: '文體入門', blocks: [] },
    ],
    growth: '書體流變淺層 · 標點作為呼吸',
  },
  {
    id: 'math',
    name: '數量與形式',
    bearing: '抽象結構',
    open: true,
    orientation: '數量與形狀如何被寫成可以複核的關係。',
    paths: [
      {
        id: 'math.l1.unit',
        name: '單位與計數',
        blocks: [
          { id: 'math.l2.equal', name: '相等可核' },
          { id: 'math.l2.unit', name: '可重複單位' },
          { id: 'math.l2.carry', name: '進位淺層' },
        ],
      },
      { id: 'math.l1.ops', name: '運算與可逆', blocks: [] },
      { id: 'math.l1.relation', name: '式與關係', blocks: [] },
      { id: 'math.l1.measure', name: '形與度量', blocks: [] },
    ],
    growth: '簡易比例 · 圖上讀數',
  },
  {
    id: 'en',
    name: '英語與世界語文門徑',
    bearing: '符號與語言',
    open: true,
    orientation: '另一套字母如何成為進入世界語文的門徑。',
    paths: [
      {
        id: 'en.l1.script',
        name: '字母與語音',
        blocks: [
          { id: 'en.l2.spell', name: '拼讀可還原' },
          { id: 'en.l2.alphabet', name: '字母表方位' },
        ],
      },
      { id: 'en.l1.word', name: '詞的拼合', blocks: [] },
      { id: 'en.l1.sentence', name: '句的骨架', blocks: [] },
      { id: 'en.l1.passage', name: '短文門徑', blocks: [] },
    ],
    growth: '多語並存淺層 · 詞典作為地圖',
  },
  {
    id: 'phy',
    name: '物質',
    bearing: '物質與自然',
    open: true,
    orientation: '物質之門在「物質與自然」：先學會用可以複核的方式描述「在哪裡、如何改變」。',
    paths: [
      {
        id: 'phy.l1.motion',
        name: '位置與運動',
        blocks: [
          { id: 'phy.l2.where', name: '描述「在哪／多快」' },
          { id: 'phy.l2.push', name: '推拉與形變' },
        ],
      },
      { id: 'phy.l1.force', name: '力與接觸', blocks: [] },
      { id: 'phy.l1.energy', name: '能量初識', blocks: [] },
      { id: 'phy.l1.quantity', name: '量與單位', blocks: [] },
    ],
    growth: '簡易電路現象（無施工教程）',
  },
  {
    id: 'chem',
    name: '變化',
    bearing: '物質與自然',
    open: false,
    orientation: '變化之門在萬有地圖的「物質與自然」。此路尚未開啓。',
    paths: [],
  },
  {
    id: 'bio',
    name: '生命',
    bearing: '物質與自然',
    open: true,
    orientation: '生命之門在「物質與自然」：從細胞這一單位開始，長出可以再往上走的根。',
    paths: [
      {
        id: 'bio.l1.cell',
        name: '細胞作為單位',
        blocks: [
          { id: 'bio.l2.membrane', name: '膜與內部' },
          { id: 'bio.l2.uni-multi', name: '單細胞與多細胞' },
        ],
      },
      { id: 'bio.l1.levels', name: '生物體層級', blocks: [] },
      { id: 'bio.l1.inheritance', name: '遺傳淺層', blocks: [] },
      { id: 'bio.l1.eco', name: '生態關係', blocks: [] },
    ],
    growth: '演化時間尺度（軟鏈文明起源）',
  },
  {
    id: 'hist',
    name: '時間中的人類',
    bearing: '世界與人文',
    open: false,
    orientation: '時間中的人類在萬有地圖的「世界與人文」。此路尚未開啓。敘事時間軸見文明編年，不在這裡重寫。',
    paths: [],
  },
  {
    id: 'geo',
    name: '地表',
    bearing: '世界與人文',
    open: false,
    orientation: '地表之門在萬有地圖的「世界與人文」。此路尚未開啓。',
    paths: [],
  },
  {
    id: 'music',
    name: '聲音',
    bearing: '感知與身體',
    open: false,
    orientation: '聲音之門在萬有地圖的「感知與身體」。此路尚未開啓。',
    paths: [],
  },
  {
    id: 'art',
    name: '形色',
    bearing: '感知與身體',
    open: false,
    orientation: '形色之門在萬有地圖的「感知與身體」。此路尚未開啓。',
    paths: [],
  },
  {
    id: 'pe',
    name: '身體',
    bearing: '感知與身體',
    open: false,
    orientation: '身體之門在萬有地圖的「感知與身體」。此路尚未開啓。',
    paths: [],
  },
  {
    id: 'gen',
    name: '求知方法',
    bearing: '跨域工具',
    open: true,
    orientation: '跨域工具層：核對、筆記、來源。無論走進哪一門都用得上。',
    paths: [
      {
        id: 'gen.l1.ask',
        name: '提問',
        blocks: [{ id: 'gen.l2.claim', name: '命題與核對' }],
      },
      {
        id: 'gen.l1.source',
        name: '來源分層',
        blocks: [
          { id: 'gen.l2.primary', name: '一手／二手' },
          { id: 'gen.l2.stamp', name: '時間戳與出處' },
        ],
      },
      { id: 'gen.l1.notes', name: '筆記結構', blocks: [] },
      { id: 'gen.l1.recheck', name: '複核與改正', blocks: [] },
    ],
    growth: '與懶人包／文明軸的閱讀分工（軟鏈）',
  },
];

export const LEARN_LESSONS: readonly LearnLesson[] = [
  {
    id: 'glyph',
    subjectId: 'zh',
    blockId: 'zh.l2.stroke-part',
    title: '一葉：字形何以可讀',
    summary: '漢字把聲音、意義和形狀收在同一個格子裡。這一葉只說明字形為什麼能被再次認出。',
    body: [
      '漢字把聲音、意義和形狀收在同一個可以重複描摹的格子裡。讀者不必與作者同時在場，只要依照相對穩定的筆畫組合，仍能把紙上的痕跡認回為同一個字。開蒙從這一事實出發：文字首先是一種可核對的形狀約定，而不是一時情緒的圖畫。',
      '筆畫是最小的可重複單位。橫、豎、撇、捺在不同書手筆下會有粗細與傾斜的差異，但只要相對位置與交接關係保持在約定的容差之內，後來的人仍能判定「這是同一個字」。部件則是筆畫之上的組塊：若干部件依固定方位拼合，往往同時提示意義類別與聲音線索。形聲結構並非每一字都嚴格可析，卻為大量常用字提供了可學習的規律入口——學習者不必一次記牢整部字書，而可以先掌握「為何這個格子裡的痕跡可被再次認出」。',
      '可讀性還依賴對比與上下文。單看一個生僻字形，辨識成本很高；放回詞語與句子後，鄰近的已知字會收窄可能讀法。印刷與螢幕進一步把筆畫規格化，使異地、異代的讀者共享同一套視覺標準。規格化並不消滅書法與手寫的多樣性，而是在「藝術表現」與「資訊傳遞」之間劃出可以並行的軌道：開蒙這一葉只處理後者——何以形狀能夠跨越時間，把一次說出的話留成可複核的記錄。',
      '與文明編年的分際應當清楚。文字如何進入城市、如何隨印刷降低複製成本，屬於時間軸上的敘事；此處只立「字形可讀」的能力階梯。讀者若追問書寫如何改變社會組織，可軟鏈文明相關章節，但兩處正文不相貼、不互相充數。下一級可進入部件提示義、同形異義的分辨，以及標點如何為句子標出呼吸；已種的葉按地圖走，未種的只標方位，不假裝已有全文。',
      '完成這一葉，表示讀者能用自己的話說明：可重複的筆畫與約定的結構，使缺席的作者仍能被後來者讀懂。這不是背誦字表，而是握住「記錄」這件事在符號層上的立足點。',
    ],
    softLinks: { civilization: ['/civilization/chronicle/'] },
  },
  {
    id: 'part-hint',
    subjectId: 'zh',
    blockId: 'zh.l2.stroke-part',
    prereq: 'glyph',
    title: '一葉：部件如何提示義',
    summary: '部件把字歸入義類並提示讀音線索。這一葉練「提出假設、上下文核對」的工作方式。',
    body: [
      '部件是筆畫之上的組塊。常用漢字多數不是不可拆解的整圖，而是由有限個部件依相對方位拼合而成：偏在左、偏在右、居於上、托於下，或包在外圍。方位本身就是約定的一部分；同一部件換了位置，往往便不再是原來那個提示。',
      '部件的用處，在於它同時提示意義類別與讀音線索。表義的部件把字歸入一個大意域，例如與水、與手、與草木相關的類別；表音的部件則提供一個可供比對的讀音起點。開蒙這一葉不要求背誦整套術語，只要求建立一種工作方式：見到未識的字，先看部件，提出「它可能屬於哪一域、可能近哪個音」的假設，再放到詞語與句子裡核對。',
      '提示不是判決。部件推測會出錯：同一表義部件之下常混居多個小類；表音部件的線索會因歷史音變而失準；另有少數字的結構早已不易分析。此時正確的動作不是硬撐猜測，而是回到上下文與工具書——部件給出候選，上下文收窄候選，查核確定候選。這一循環，與求知方法門裡「把聽說變成可核對命題」的手續同構。',
      '與文明編年的分際依舊清楚：部件與字書傳統如何在時間中長成，屬敘事軸的課題；此處只立「用部件提出並核對假設」的能力。與「字形何以可讀」一葉相接：那一葉說明整體為何可被再次認出，這一葉把認出的手續拆到部件一層。',
      '完成這一葉，表示讀者能取一個兼具表義與表音部件的字，說明兩種提示各自指向何處，並能舉出一個部件推測失效的例子，說明此時應如何回到上下文核對。能做這一步，「筆畫與部件」這一區塊便有了第二塊石頭。',
    ],
    softLinks: { civilization: ['/civilization/chronicle/'] },
  },
  {
    id: 'count',
    subjectId: 'math',
    blockId: 'math.l2.equal',
    title: '一葉：數何以可對',
    summary: '數量先要有可以重複的單位。這一葉只說明「再數一次」為什麼站得住。',
    body: [
      '數，是把事物換成可以再數一次的單位。三顆石子與另外三顆石子合在一處，無論由誰來數、在哪一天數，只要單位不變、計數規則不變，結果仍應是六。開蒙把這一可複核性放在第一位：數量不是口氣或偏好，而是一套允許異地異人重做的手續。',
      '單位必須先被說清楚。若甲以「筐」為單位、乙以「個」為單位，而一筐所裝個數並未約定，兩人報出的數字便無法對質。度量史上的進步，往往正是把含混的單位收成可複製的標準——哪怕最初只是同地同行的約定，後來才擴成更廣的信任網。開蒙這一葉不重述整部度量史，只要求讀者抓住：沒有穩定單位，就沒有可對的數。',
      '運算是單位之上的關係。加法把兩次計數合併；減法在有意義的前提下追問差額；乘法是同單位的重複合併。這些步驟之所以可靠，是因為每一步都可以被獨立複核：換一支筆、換一個人，按同一關係重做，應得到同一結果。若結果分歧，應當回到單位定義、計數範圍與步驟是否被忠實執行，而不是比誰的語氣更硬。',
      '形式把上述手續寫成可以傳遞的式子與符號。符號節省口頭解釋的成本，也讓錯誤更容易被定位：哪一項的單位不一致、哪一步違反了已聲明的規則，往往在式子上一目了然。學習形式，不是為了堆砌符號，而是為了讓「再數一次」這件事在紙面與螢幕上都能被他人接管。',
      '與新聞懶人包、文明軸的分工同樣明確。今日行情數字如何解讀，屬事件切片；度量如何在異地仍被信任，屬文明敘事中的先例。此處只停在單位、計數與可逆核對。讀者若已能說明「為何同一堆物件被數兩次應當一致」，這一葉即告完成；進位、比例與圖上讀數，留待後葉次第展開。',
    ],
    softLinks: { civilization: ['/civilization/tech/'] },
  },
  {
    id: 'reverse-check',
    subjectId: 'math',
    blockId: 'math.l2.equal',
    prereq: 'count',
    title: '一葉：加法何以可逆核',
    summary: '加法可靠，因為可以換序重算、減法還原。這一葉練把複核拆成可分開檢查的手續。',
    body: [
      '加法把兩次計數合併成一次。它之所以可靠，不在於誰的口氣更硬，而在於三件事可以被分開檢查：單位是否相同、計數範圍是否說清、合併步驟是否被忠實執行。開蒙這一葉承接「數何以可對」，把複核的手續落到加與減兩步。',
      '合併有兩個可核對的性質，可以用日常話說出。其一，先數這一堆再數那一堆，與先數那一堆再數這一堆，結果應當一致；其二，三堆物件先合併哪兩堆，不影響總數。這兩句話不是口號，而是可以換人重做的檢驗：任何一次加法存疑，都可以換一個次序、換一種分組再算一遍；兩次結果不一致，錯必在其中一步，而不是結論各自成立。',
      '減法是加法的還原手續。由和與其中一個加數，應能找回另一個加數；找不回，就說明合併過程或記錄過程出了差錯。帳目與存量的古老核對辦法，正是這一來一回：記進與記出相加，再與手上的實物對質。這一手續不要求任何工具，只要求肯於回頭再數。',
      '遇到分歧，回到單位與範圍。兩次結果不同，最常見的原因不是「算術本身壞了」，而是單位被偷換、邊界被移動，或其中一次並未真正重做。此葉不引入負數與進位的完整處理，那些留待後葉次第展開；度量與帳目如何在異地被信任的長敘事，屬文明軸，此處只練手續。',
      '完成這一葉，表示讀者能對一筆合併寫出兩種複核：換序重算與減法還原，並能說明當兩者都不通時，應回到單位定義與計數範圍去定位差錯。能做到這一步，「相等可核」這一區塊的根便站住了。',
    ],
    softLinks: { civilization: ['/civilization/tech/'] },
  },
  {
    id: 'script',
    subjectId: 'en',
    blockId: 'en.l2.spell',
    title: '一葉：另一種文字的門徑',
    summary: '字母把語音拆成可以拼回去的零件。這一葉只說明門徑，不把一種語文寫成高下。',
    body: [
      '英語使用字母書寫。一個詞通常由有限個字母依序排列而成；識得字母與常見對應規則的人，可以把紙上的序列嘗試拼回語音，也可以把聽到的語音嘗試拆回字母。開蒙稱此為「門徑」：它說明一種把連續語音切成可重組零件的辦法，而不是宣布某一語文高於其他語文。',
      '字母系統的力量在於組合經濟。少數圖形單位，經排列組合，可以覆蓋遠超字母個數的詞彙量。學習成本因此集中在兩端：一端是字母本身與基本拼讀對應，另一端是大量詞在歷史中沉澱下來的不規則與例外。開蒙的第一葉不要求記完例外表，只要求建立正確預期——多數詞可以按零件拼合理解，遇到例外則當成需個別登錄的地圖註記，而不是系統的崩塌。',
      '門徑也意味著可轉移的閱讀姿態。一旦習慣「看序列、試拼讀、再核對意義」，學習者比較容易進入其他同樣使用字母或字母變體的語文材料，並理解詞典、索引與檢索如何依賴穩定的字母序。這與漢字「以形義聲同處一格」的路徑不同，但兩者都是人類把語言留在可傳遞媒介上的解法；開蒙地圖把它們並陳於「符號與語言」方位，拒絕排座次。',
      '文化與權力會影響哪一種文字在何地成為學校與公共領域的常用門，那是歷史與社會敘事的課題，應交文明軸與審慎的史地通識處理。這一葉禁止把「國際通用」寫成天然優劣，也禁止嘲笑任何一種母語書寫。完成標準很具體：讀者能說明字母如何把語音拆成可拼回的零件，並能舉一例展示「拼合—核對」的循環；若同時意識到漢語之門與這一門徑可以並存於同一張萬有地圖，則方位已立。',
      '其餘世界語文將按契約升版次第開門。在那之前，淡門只標「將開」，不堆無正文的科名充數。',
    ],
    softLinks: { civilization: ['/civilization/city/'] },
  },
  {
    id: 'word-build',
    subjectId: 'en',
    blockId: 'en.l2.spell',
    prereq: 'script',
    title: '一葉：詞如何由字母拼回',
    summary: '字母表有限而有序，詞是序上的排列。這一葉練「拼合—核對」的循環與例外的登錄。',
    body: [
      '字母表是一個有限而有序的零件箱。它的力量不在任何單個字母，而在「有序」：一個詞是字母在此序上的排列，詞與詞的差別可以化為位置與字符的差別。詞典、索引與檢索因此能按字母序運作——這是上一葉所稱門徑的具體機件。',
      '拼讀是一個可以核對的循環：看見序列，按已知對應試拼讀音，再拿讀音到詞義處核對；反過來，聽到語音也可以拆回序列寫下。循環並不保證每次成功，但失敗是有信息量的——它標出例外與尚未學到的對應，而不是宣布系統無效。',
      '例外應當登錄，而不是畏懼。少數常用詞的拼讀對應在歷史中沉澱得不規則；對待它們的辦法，是把每一個當作地圖上的個別註記登錄下來，而不是推翻「多數詞可按零件拼合理解」的預期。詞形變化的淺層同理：詞尾的屈折承載語法信息，通常不改動詞幹的可拼回性。',
      '這一葉與漢語之門並陳，不排座次。字母拆合與部件組字，是把語言留在媒介上的兩種解法；開蒙把兩者同列於「符號與語言」方位。哪一種文字在何地成為學校與公共領域的常用門，屬歷史與社會敘事，軟鏈文明軸，不在葉內展開。',
      '完成這一葉，表示讀者能取一個短詞演示「拼合—核對」的循環，並能舉出一個例外詞，說明如何把它登錄為個別註記。做到這一步，「拼讀可還原」這一區塊便有了第二葉。',
    ],
    softLinks: { civilization: ['/civilization/city/'] },
  },
  {
    id: 'motion',
    subjectId: 'phy',
    blockId: 'phy.l2.where',
    title: '一葉：可觀測的運動',
    summary: '位置相對於參照才有意義。這一葉練把「在哪、多快」收成可寫下、可重做的觀察。',
    body: [
      '物理開蒙的第一件事，不是背公式，而是學會用可以複核的方式描述「東西在哪裡、如何改變位置」。位置必須相對於某個參照來說才有意義：說一輛車「在左邊」，若聽者不在場，這句話幾乎無法核對；說它「在站牌以南約二十步」，即使粗糙，也已接近可傳遞的描述。開蒙要求把日常直覺收成可寫下、可重做的觀察。',
      '運動是位置隨時間的變化。要比較快慢，需要同時約定長度單位與時間單位。同一段路程，用不同單位報數，數字會變，但若換算關係清楚，物理事實並未改變。這與數學葉中「單位先說清」的教訓相連，卻把焦點放在自然現象：物體並不在乎我們用哪種語言說話，但我們的描述必須自洽，實驗與觀察才能被他人接力。',
      '接觸與推拉會改變運動狀態——這是力的日常入口。開蒙此葉不引入向量運算，只要求分辨：有的改變來自持續的作用，有的來自短暫的碰撞；有的作用隔著距離仍可被測量其效應。關鍵態度是：先問「我看到了什麼可重複的改變」，再問「哪一種簡化模型暫時夠用」。模型永遠是地圖而非領土；當觀察與模型衝突，應當修正模型或聲明適用範圍，而不是否認觀察。',
      '安全與邊界同樣屬於開蒙。本葉不提供實驗步驟、電路改裝或任何可直接照做的危險操作；若未來加厚實驗常識，也必須把警示與專業協助條件寫在前面。與文明軸上技術史案例的關係是軟鏈：印刷、齒輪與測量如何改變社會，見敘事時間軸；此處只練「描述運動」的能力。',
      '完成這一葉的讀者，應能選一個身邊的移動物體，寫下參照、大致距離變化與時間間隔，並說明若換另一人重做，哪些約定必須先對齊。能做到這一步，物質之門的第一塊石頭便已放下。',
    ],
    softLinks: { civilization: ['/civilization/tech/'] },
  },
  {
    id: 'cell',
    subjectId: 'bio',
    blockId: 'bio.l2.membrane',
    title: '一葉：細胞何以被看作生命的單位',
    summary: '膜劃出邊界，內部維持自身。這一葉立「細胞是生命結構與功能的基本單位」這一圖像。',
    body: [
      '在當代生物學的常用圖像裡，細胞被視為生命結構與功能的基本單位：一層膜把內部與外部分開，內部進行維持自身所需的物質與能量轉變，並在適當條件下生長、分裂，把大致相似的組織傳下去。開蒙採用這一圖像作為入口，同時提醒：科學圖像會隨證據修正，學習者應保留「可被更好觀察取代」的謙虛，而不是把課文句子當成永恆教條。',
      '膜的意義在於邊界。有了邊界，才談得上內部環境相對穩定，才談得上與外界有選擇的交換。單細胞生物在一個細胞內完成其生活史；多細胞生物則由許多細胞分工，形成組織與器官。層級上升並不取消細胞層的約束——整體仍依賴細胞層的代謝與訊息傳遞——但整體也出現單看一個細胞難以預測的協調現象。開蒙此葉先立單位，再為後葉的「生物體」與「生態關係」留出接口。',
      '遺傳淺層與此相關：分裂過程中，指導結構與代謝的資訊以可複製的方式傳遞，使子代與親代在統計上相似，又允許變異。開蒙不在此展開分子機制長卷，只要求建立時間意識——生命不只是此刻的形狀，也是可沿世代追蹤的資訊延續。演化與深時間的敘事，宜軟鏈文明之宇宙／起源章，避免在開蒙葉內重寫整部自然史。',
      '倫理與禁區必須寫明。本葉不提供診斷、用藥、劑量或任何處方級建議；涉及健康的內容僅止於通識層的結構理解。對生態的描述強調關係與相互依賴，拒絕把物種寫成價值排序或歧視隱喻。',
      '完成標準：讀者能用自己的話解釋「為何生物學常從細胞談起」，並能區分「單位圖像」與「整部生命史敘事」分別屬於開蒙能力樹與文明時間軸。做到這一步，生命之門便有了可再往上長的根。',
    ],
    softLinks: { civilization: ['/civilization/origins/'] },
  },
  {
    id: 'hearsay',
    subjectId: 'gen',
    blockId: 'gen.l2.claim',
    title: '一葉：把「聽說」變成可核對的命題',
    summary: '把含混傳聞改寫成明確陳述，分層標註來源。這一葉練跨域的核對姿勢。',
    body: [
      '求知方法是萬有地圖上的跨域工具層。無論走進漢語、數量、物質還是地表，都會反覆遇到同一類問題：這句話是誰說的、依據是什麼、我怎樣才能讓後來的自己或他人重做一次核對。開蒙把「聽說」升格為可檢驗命題的手續，寫成這一葉。',
      '第一步是改寫。把含混的傳聞改成盡可能明確的陳述：主詞是誰、發生了什麼、在何時何地、以何種度量或文件為據。改寫本身常常暴露缺口——原來並沒有時間，原來「很多」並不可數，原來結論跳過了中間步驟。缺口不是恥辱，而是下一步搜尋的清單。',
      '第二步是來源分層。親身觀察、原始數據、官方文件、學術報告、轉述新聞、匿名截圖，可信程度與出錯模式並不相同。開蒙不要求民間讀者假裝成為專業鑑定人，但要求養成標註習慣：我依據的是哪一層？是否看得到可點開的出處？若只有轉述，轉述是否允許我追溯到上一層？時間戳與版本同樣關鍵：昨日報的數，今天可能已被更正。',
      '第三步是複核與改正。獨立來源是否指向相近結論？若衝突，衝突點是否可定位到定義、樣本或利益衝突？當自己先前採信的說法被可靠證據推翻，公開修正比護短更接近求知。筆記結構（命題—出處—不確定點—待查）比華麗摘要更有用，因為它允許未來的自己接力。',
      '與站內其他產品線的分工：懶人包處理「今日事件如何讀」；文明軸處理「長時段敘事如何立」；開蒙這一葉處理「任何領域都用得上的核對姿勢」。三者可軟鏈，正文不互貼。完成標準：讀者能把一則最近聽到的說法改寫成帶缺口清單的命題，並標出目前所依來源層級；若能說明何時應暫緩結論，則工具葉已開始發揮作用。文明點若因完成本葉而增加，只作顯示，不兌換任何特權。',
    ],
    softLinks: { civilization: ['/civilization/chronicle/'] },
  },
];

export function learnSubject(id: string): LearnSubject | undefined {
  return LEARN_SUBJECTS.find((subject) => subject.id === id);
}

export function learnLessonsFor(subjectId: string): LearnLesson[] {
  return LEARN_LESSONS.filter((lesson) => lesson.subjectId === subjectId);
}

export function learnLesson(subjectId: string, lessonId: string): LearnLesson | undefined {
  return LEARN_LESSONS.find((lesson) => lesson.subjectId === subjectId && lesson.id === lessonId);
}

/** 葉在進度裡的完整 id（`${subjectId}:${lessonId}`），與 localStorage 既有格式相容。 */
export function learnLeafId(subjectId: string, lessonId: string): string {
  return `${subjectId}:${lessonId}`;
}

export interface LearnPathPlanEntry {
  path: LearnPath;
  blocks: Array<{ block: LearnBlock; lessons: LearnLesson[] }>;
}

/** 把某門的 L1→L2→L3 展開成可渲染的骨架；未種的區塊 lessons 為空。 */
export function learnPathPlan(subjectId: string): LearnPathPlanEntry[] {
  const subject = learnSubject(subjectId);
  if (!subject) return [];
  return subject.paths.map((path) => ({
    path,
    blocks: path.blocks.map((block) => ({
      block,
      lessons: LEARN_LESSONS.filter((lesson) => lesson.subjectId === subjectId && lesson.blockId === block.id),
    })),
  }));
}

/** 一條 L1 門徑下各 L2 區塊的葉 id 群（完整 id），供走通判定。 */
export function learnPathGroups(subjectId: string, path: LearnPath): string[][] {
  return path.blocks.map((block) =>
    LEARN_LESSONS
      .filter((lesson) => lesson.subjectId === subjectId && lesson.blockId === block.id)
      .map((lesson) => learnLeafId(subjectId, lesson.id)),
  );
}

/**
 * L1 門徑「走通」規則（本版鎖定）：該 L1 下至少一條 L2 區塊的葉全部完成。
 * 跨門不互鎖；文明點與解鎖正交。
 */
export function learnPathWalked(groups: string[][], completed: string[]): boolean {
  return groups.some((group) => group.length > 0 && group.every((id) => completed.includes(id)));
}

/** 同 L2 區塊中，以本葉為前置的下一葉（建議次序，非硬閘）。 */
export function learnNextLeaf(subjectId: string, lessonId: string): LearnLesson | undefined {
  const current = learnLesson(subjectId, lessonId);
  if (!current) return undefined;
  return LEARN_LESSONS.find(
    (lesson) => lesson.subjectId === subjectId && lesson.blockId === current.blockId && lesson.prereq === current.id,
  );
}

const MARKETING_WORDS = /必考|衝刺|名師|補習|選課中心/;

function bodyLength(lesson: LearnLesson): number {
  return lesson.body.join('').replace(/\s+/g, '').length;
}

export function learnCatalogIssues(): string[] {
  const issues: string[] = [];
  if (LEARN_SUBJECTS.length !== 12) issues.push('count');
  const open = LEARN_SUBJECTS.filter((subject) => subject.open);
  if (open.map((subject) => subject.id).join() !== 'zh,math,en,phy,bio,gen') issues.push('open');
  if (open.map((subject) => subject.name).join('／') !== '漢語與文字／數量與形式／英語與世界語文門徑／物質／生命／求知方法') {
    issues.push('names');
  }
  const ids = new Set<string>();
  const blockOwners = new Map<string, string>();
  const pathIds = new Set<string>();
  for (const subject of LEARN_SUBJECTS) {
    if (ids.has(subject.id)) issues.push(`dup:${subject.id}`);
    ids.add(subject.id);
    if (!subject.name.trim() || !subject.bearing.trim() || !subject.orientation.trim()) issues.push(`blank:${subject.id}`);
    if (subject.open && subject.paths.length === 0) issues.push(`paths:${subject.id}`);
    for (const path of subject.paths) {
      if (pathIds.has(path.id)) issues.push(`dup-path:${path.id}`);
      pathIds.add(path.id);
      if (!path.name.trim()) issues.push(`blank-path:${path.id}`);
      for (const block of path.blocks) {
        if (blockOwners.has(block.id)) issues.push(`dup-block:${block.id}`);
        blockOwners.set(block.id, subject.id);
        if (!block.name.trim()) issues.push(`blank-block:${block.id}`);
      }
    }
  }
  if (LEARN_LESSONS.length < 6 || LEARN_LESSONS.length > 60) issues.push('lessons');
  const lessonIds = new Set(LEARN_LESSONS.map((lesson) => lesson.id));
  const perSubject = new Map<string, number>();
  for (const lesson of LEARN_LESSONS) {
    const subject = learnSubject(lesson.subjectId);
    if (!subject) {
      issues.push(`subject:${lesson.id}`);
      continue;
    }
    if (!subject.open) issues.push(`closed-lesson:${lesson.id}`);
    const owner = blockOwners.get(lesson.blockId);
    if (owner !== lesson.subjectId) issues.push(`block:${lesson.id}`);
    if (!lesson.title.trim() || !lesson.summary.trim() || !lesson.body.length) issues.push(`blank:${lesson.id}`);
    if (MARKETING_WORDS.test(lesson.title) || MARKETING_WORDS.test(lesson.summary)) issues.push(`hype:${lesson.id}`);
    if (bodyLength(lesson) < 500) issues.push(`thin:${lesson.id}`);
    if (lesson.body.some((paragraph) => !paragraph.trim())) issues.push(`blank-body:${lesson.id}`);
    if (lesson.prereq) {
      const prereq = learnLesson(lesson.subjectId, lesson.prereq);
      if (!prereq || prereq.blockId !== lesson.blockId || prereq.id === lesson.id) issues.push(`prereq:${lesson.id}`);
    }
    const links = [...(lesson.softLinks?.civilization ?? []), ...(lesson.softLinks?.explainer ?? [])];
    if (links.length > 2) issues.push(`softlinks:${lesson.id}`);
    if ((lesson.softLinks?.civilization ?? []).some((href) => !href.startsWith('/civilization/'))) {
      issues.push(`softlinks:${lesson.id}`);
    }
    perSubject.set(lesson.subjectId, (perSubject.get(lesson.subjectId) ?? 0) + 1);
  }
  for (const subject of LEARN_SUBJECTS.filter((item) => item.open)) {
    if ((perSubject.get(subject.id) ?? 0) < 1) issues.push(`empty:${subject.id}`);
  }
  for (const lesson of LEARN_LESSONS) {
    const seen = new Set<string>();
    let current: LearnLesson | undefined = lesson;
    while (current?.prereq) {
      if (seen.has(current.id)) {
        issues.push(`cycle:${lesson.id}`);
        break;
      }
      seen.add(current.id);
      current = learnLesson(current.subjectId, current.prereq);
    }
  }
  if (lessonIds.size !== LEARN_LESSONS.length) issues.push('dup-lesson');
  return issues;
}
