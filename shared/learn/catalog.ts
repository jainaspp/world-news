/**
 * 開蒙契約 v2。地圖仍是十二門，方位不動；這一版把物質、生命兩門點亮，
 * 並為每門立下葉序：由一葉起，讀完一葉，下一葉在本機開啓。
 * 加域要升版，不在這一版另造名單；加深只沿已開的門往下走。
 */

export interface LearnSubject {
  id: string;
  name: string;
  bearing: string;
  /** Open doors are readable. The rest stay on the map and do not pretend to have a syllabus. */
  open: boolean;
  orientation: string;
}

export interface LearnLesson {
  id: string;
  subjectId: string;
  /** 1-based depth in the track. Level 1 is the entry leaf of an open door. */
  level: number;
  /** Id of the previous leaf in the same track. Undefined on level 1. */
  requires?: string;
  title: string;
  summary: string;
  body: string[];
}

export const LEARN_PROGRESS_KEY = 'wn.edu.progress.v1';

/** PP O：開蒙全部教學正文以 CC BY 4.0 釋出。 */
export const LEARN_LICENSE = {
  name: 'CC BY 4.0',
  url: 'https://creativecommons.org/licenses/by/4.0/',
  note: '開蒙全部教學正文以 CC BY 4.0（姓名標示 4.0 國際）釋出：轉載與再用，請標示「文明編年史 · 開蒙」及原文地址。',
} as const;

const LEVEL_NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'] as const;

export function learnLevelLabel(level: number): string {
  return `${LEVEL_NUMERALS[level - 1] ?? level}葉`;
}

export const LEARN_SUBJECTS: readonly LearnSubject[] = [
  {
    id: 'zh',
    name: '漢語與文字',
    bearing: '符號與語言',
    open: true,
    orientation: '符號如何把聲音和意思留在紙上。',
  },
  {
    id: 'math',
    name: '數量與形式',
    bearing: '抽象結構',
    open: true,
    orientation: '數量與形狀如何被寫成可以複核的關係。',
  },
  {
    id: 'en',
    name: '英語與世界語文門徑',
    bearing: '符號與語言',
    open: true,
    orientation: '另一套字母如何成為進入世界語文的門徑。',
  },
  {
    id: 'phy',
    name: '物質',
    bearing: '物質與自然',
    open: true,
    orientation: '物質如何被稱量、被描述、被檢查。',
  },
  {
    id: 'chem',
    name: '變化',
    bearing: '物質與自然',
    open: false,
    orientation: '變化之門在萬有地圖的「物質與自然」。此路尚未開啓。',
  },
  {
    id: 'bio',
    name: '生命',
    bearing: '物質與自然',
    open: true,
    orientation: '生命如何被辨認、被分類、被連成網。',
  },
  {
    id: 'hist',
    name: '時間中的人類',
    bearing: '世界與人文',
    open: false,
    orientation: '時間中的人類在萬有地圖的「世界與人文」。此路尚未開啓。敘事時間軸見文明編年，不在這裡重寫。',
  },
  {
    id: 'geo',
    name: '地表',
    bearing: '世界與人文',
    open: false,
    orientation: '地表之門在萬有地圖的「世界與人文」。此路尚未開啓。',
  },
  {
    id: 'music',
    name: '聲音',
    bearing: '感知與身體',
    open: false,
    orientation: '聲音之門在萬有地圖的「感知與身體」。此路尚未開啓。',
  },
  {
    id: 'art',
    name: '形色',
    bearing: '感知與身體',
    open: false,
    orientation: '形色之門在萬有地圖的「感知與身體」。此路尚未開啓。',
  },
  {
    id: 'pe',
    name: '身體',
    bearing: '感知與身體',
    open: false,
    orientation: '身體之門在萬有地圖的「感知與身體」。此路尚未開啓。',
  },
  {
    id: 'gen',
    name: '求知方法',
    bearing: '跨域工具',
    open: false,
    orientation: '求知方法在萬有地圖的「跨域工具」。此路尚未開啓。',
  },
];

export const LEARN_LESSONS: readonly LearnLesson[] = [
  {
    id: 'glyph',
    subjectId: 'zh',
    level: 1,
    title: '一葉：字形何以可讀',
    summary: '漢字把聲音、意義和形狀收在同一個格子裡。這一葉只說明字形為什麼能被再次認出。',
    body: [
      '一張紙上的字，先是一組可以重複的筆畫。讀者不必在場，後來的人仍能按同一組筆畫把句子讀出來。這就是文字作為記錄的位置：它把一次說出的話，留成可以核對的形狀。',
      '開蒙由這一葉開始，不求把整部文字史講完。敘事上，文字如何進入城市與印刷，見文明編年，兩處正文不相貼。',
      '字形可以拆解。一個常用字往往由表意的部分與標音的部分合成；認得零件，便容易認得整字。拆解不是條文的背誦，而是閱讀時可以反覆使用的工具。',
    ],
  },
  {
    id: 'sound',
    subjectId: 'zh',
    level: 2,
    requires: 'glyph',
    title: '二葉：聲音如何入字',
    summary: '文字先記下語言，語言先有聲音。這一葉說明聲音的線索如何留在字形裡。',
    body: [
      '漢字不直接拼音，卻處處帶著聲音的線索。同一個聲旁的字，造字之時讀音相近；字形把這層關係留了下來，讓後人可以按線索推讀，而不是逐字死記。',
      '聲音會隨時代遷移，字形卻相對安定。同一個字，古音與今讀可以不同，各地讀法也可以不同，而寫下的形狀仍然相認。文字因此跨過聲音的變化，把意思交到遠處與後世。',
      '誦讀是把字形重新喚回聲音的練習。讀出聲，句子的節奏與虛實便容易分辨；這一層功夫，正是下一葉談詞與句的準備。',
    ],
  },
  {
    id: 'sentence',
    subjectId: 'zh',
    level: 3,
    requires: 'sound',
    title: '三葉：詞與句的次序',
    summary: '次序與虛字擔起漢語的語法。這一葉說明長句如何拆成可以消化的小段。',
    body: [
      '漢語的詞少變形，次序於是擔起語法。同樣幾個詞，先後一換，意思便不同；讀句子，先看誰在前、誰在後，再看虛字如何把關係點明。',
      '虛字不指事物，專管關係。之、乎、者、也一類字，把停頓、提頓、判斷與疑問標在句中；熟讀虛字，長句便能拆成可以消化的小段，段落大意也跟著浮現。',
      '句讀是前人留給讀者的扶手。文章原本連寫，讀者依虛字與節奏斷句；斷得對，文意才站得住。這一手功夫，直接通向下一葉的篇章。',
    ],
  },
  {
    id: 'text',
    subjectId: 'zh',
    level: 4,
    requires: 'sentence',
    title: '四葉：篇章如何立住',
    summary: '篇章把句子編成可以整體理解的單位。這一葉說明怎樣才算真正讀過一篇。',
    body: [
      '篇章把句子編成可以整體理解的單位。一段有一段的主旨，一篇有一篇的起結；讀者先識段落之職，再觀全篇之勢，意思便不會散在句與句之間。',
      '篇章之上有傳統的讀法：注疏隨文而生，前人解字句，後人解前人之解。層層相疊，不是堆疊文字，而是把一部書讀成一條可以追溯的長路。',
      '讀罷全篇，當能自答三問：作者要說的是甚麼，憑甚麼說，說給誰聽。三問能答，這一篇才算真正讀過；漢語與文字一門的開蒙四葉，至此成環。',
    ],
  },
  {
    id: 'count',
    subjectId: 'math',
    level: 1,
    title: '一葉：數何以可對',
    summary: '數量先要有可以重複的單位。這一葉只說明「再數一次」為什麼站得住。',
    body: [
      '數，是把事物換成可以再數一次的單位。十與十相加仍是二十，不因說話的人換了而改寫。形式把這一步收成關係，於是後來的人可以按同一關係複核。',
      '這一葉停在單位與複核。度量如何在異地仍被信任，見文明軸上的先例，不在這裡另寫一套新聞。',
      '數到盡頭，便要記數。位值制用少數符號排出任何數：同一個符號，位置不同，所代表的多少便不同。記數法一旦通用，帳目與度量才敢跨越千里與百年。',
    ],
  },
  {
    id: 'shape',
    subjectId: 'math',
    level: 2,
    requires: 'count',
    title: '二葉：形何以可量',
    summary: '形從測量開始。這一葉說明長短大小如何變成可以複核的數。',
    body: [
      '一塊地、一隻器、一段路，都有可以比較的長短與大小。把比較的結果記成數，形便進入了可以複核的範圍；測量的單位來自上一葉，數與形在此會合。',
      '規與矩是古人畫形的老工具：規畫圓，矩畫方。方圓既正，圖形便可以照樣重作；作圖的步驟寫得下來，別人才能按步驟驗證，圖才不是一人的手藝。',
      '面積把形與數接起來。同樣一塊地，切成小方格再數，格數不因切法而改；形可以變換，量必須守恆。守住這一條，下一葉才談得上形與形之間的關係。',
    ],
  },
  {
    id: 'ratio',
    subjectId: 'math',
    level: 3,
    requires: 'shape',
    title: '三葉：關係先於數值',
    summary: '兩量相比，得到的是關係。這一葉說明比例如何讓未知可以推算。',
    body: [
      '兩個量相比，得到的是關係，不是孤立的數值。三比二不因換了單位而改寫；地圖縮小千倍，山川的相對位置不動。關係守恆，量度才可以隨身攜帶。',
      '比例讓未知可以推算。已知三項，可求第四項；竿影與塔影同時量，塔高不必攀爬可得。推算的根據，是相似之形對應的邊成比例。',
      '關係寫成等式，形式便離開了具體事物。同是二比一，可以說繩，可以說田，也可以說工期。抽象不是離地，而是一式多用；這正是下一葉證明的起點。',
    ],
  },
  {
    id: 'proof',
    subjectId: 'math',
    level: 4,
    requires: 'ratio',
    title: '四葉：證明何以服人',
    summary: '證明從公認的前提出發，按公認的步子走。這一葉說明結論為什麼可信。',
    body: [
      '證明從公認的前提出發，按公認的步子走到結論。每一步都寫得下來，於是任何人都能逐步複核；結論之所以可信，不在說話的人，而在走過的路。',
      '反證是另一條路：先假設結論不成立，走到自相矛盾之處，便知道假設錯了。矛盾一現，取捨立判；這種走法，把「不可能」也變成可以檢查的對象。',
      '證明讓知識可以累積。前人的定理成為後人的前提，一層壓一層，層層可以回查。數量與形式一門的開蒙四葉，至此從數數走到證明。',
    ],
  },
  {
    id: 'script',
    subjectId: 'en',
    level: 1,
    title: '一葉：另一種文字的門徑',
    summary: '字母把語音拆成可以拼回去的零件。這一葉只說明門徑，不把一種語文寫成高下。',
    body: [
      '英語使用字母。一個詞由少數字母拼成，讀者可以按字母把聲音拼回去。它因此成為進入許多世界語文的一扇門，而不是唯一的門。',
      '這一葉不比較人群，也不排座次。符號與語言在地圖上有兩扇已開的門：漢語與文字，以及這一門徑。其餘語文次第再開。',
      '字母之後是習慣：拼寫與讀音並不總是一一對應。學這一門，須把拼寫與讀音分開記，再在日常練成一處。門徑既明，功夫在日積月累。',
    ],
  },
  {
    id: 'word',
    subjectId: 'en',
    level: 2,
    requires: 'script',
    title: '二葉：詞如何帶著歷史',
    summary: '英語的詞分層而生。這一葉說明按詞族記詞，比逐個硬背走得遠。',
    body: [
      '英語的詞不是一次造成的。日常用語多來自古老的日耳曼層，典章與學術用語多經法語、拉丁語而入；同一個意思，常有口語與書面兩個詞並存。',
      '詞有家族。前綴、詞根、後綴各自帶著意思，拼在一起成詞；認得零件，生詞便可以猜出大意。記詞按族而記，比逐個硬背走得遠。',
      '借詞是語言的常態，不是缺失。英語向世界借，世界也向英語借；看清來路，便知道一門語文始終在交換中生長。門徑之義，正在於此。',
    ],
  },
  {
    id: 'matter',
    subjectId: 'phy',
    level: 1,
    title: '一葉：物質何以可稱',
    summary: '物質有輕重，也佔地方。這一葉說明稱與量如何把「有多少」變成記錄。',
    body: [
      '把物放在秤上，讀出一個數；把物浸入水中，看水面升起多少。稱與量把「有多少」變成可以核對的記錄，這是物質之門的第一級台階。',
      '測量要有單位，單位要眾人共用。同一桿秤，異地異時再稱，讀數仍然相認；單位一旦通行，記錄便可以交付給不在場的人複核。',
      '物質守恆是開蒙的第一個大判斷：冰化為水，水沸為汽，樣子變了，稱出的總量不變。形態可改，總量有據；物質一門，由此站穩。',
    ],
  },
  {
    id: 'motion',
    subjectId: 'phy',
    level: 2,
    requires: 'matter',
    title: '二葉：運動如何被描述',
    summary: '運動是位置的改變，而位置要先有參照。這一葉說明描述先於解釋。',
    body: [
      '說一物在動，總是相對另一物而言；行船看岸，坐車看樹。參照一換，描述隨之而換，這不是含糊，而是如實。',
      '描述先於解釋。把一物在不同時刻的位置逐一記下，排出先後，便得到它運動的軌跡；快慢可以比較，變化可以畫成圖。記錄做得好，解釋才有落腳處。',
      '均勻與變速是兩種基本情形：前者在相等的時間走相等的距離，後者不然。把這兩種情形分清，下一葉談力，才有可談的對象。',
    ],
  },
  {
    id: 'force',
    subjectId: 'phy',
    level: 3,
    requires: 'motion',
    title: '三葉：力如何改變運動',
    summary: '力的用處是改變運動，不是維持運動。這一葉說明慣性與可公開的檢查。',
    body: [
      '一物不受推拉，便照原來的快慢沿原來的方向走下去；這個秉性稱為慣性。日常以為要一直推才一直動，是摩擦在一旁干預。把干預認出來，力的真面目才露面。',
      '力有方向，也有大小。推與拉可以相抵，也可以合成；把各個方向算清楚，物體下一步怎樣動，便可以預先說出，再由實驗檢查。',
      '檢查的方法是公開的：同一個安排，誰做都應得到同一個結果。預言與實測對得上，說法留下；對不上，說法讓路。物質一門的開蒙三葉，立在可複核之上。',
    ],
  },
  {
    id: 'life',
    subjectId: 'bio',
    level: 1,
    title: '一葉：生命何以辨',
    summary: '生命有幾個可以觀察的記號。這一葉說明辨認的第一道關。',
    body: [
      '生命的記號可以觀察：攝取與排出，生長與繁殖，對外界有反應。一塊石頭樣子可以像生物，這些記號卻裝不長久；記號齊備與否，是辨認的第一道關。',
      '細胞是生命共同的單位。小至塵埃中的微物，大至參天的樹，拆到最後都是細胞；有的單獨成活，有的萬億相依。單位一立，生命的多樣便有了共同的底。',
      '辨認要靠觀察的本事。同一株苗，今日量、明日量，記下變化，生長便不再是印象而是記錄。開蒙的方法始終如一：先如實看，再小心說。',
    ],
  },
  {
    id: 'kind',
    subjectId: 'bio',
    level: 2,
    requires: 'life',
    title: '二葉：萬物如何分類',
    summary: '分類把描述變得可以核對。這一葉說明層層名目是一套可以修訂的方法。',
    body: [
      '生物多到數不清，分類是為了把描述變得可以核對。先按形態與構造分大群，再在大群中分小群；界、門、綱、目、科、屬、種，一層套一層，各有名目。',
      '分類不是貼標籤，而是提出可以檢查的主張。兩物同屬一類，是說它們共有的特徵多於差異；新證據一到，歸類可以修訂。名目會改，方法不變。',
      '分類的深處藏著來路。特徵的相似，往往指向共同的祖先；把譜系畫成樹，親疏遠近便有了圖。這一層意思留待日後深讀，此處先記下方法。',
    ],
  },
  {
    id: 'web',
    subjectId: 'bio',
    level: 3,
    requires: 'kind',
    title: '三葉：生命如何相依',
    summary: '沒有一種生命獨自存活。這一葉說明食物網與能量的單向流動。',
    body: [
      '草食者依草，肉食者依草食者，枯枝落葉歸於分解者。把誰吃誰逐一畫出，便得到一張食物網，而不是一條單鏈；網上每一結，都有來路與去路。',
      '能量在網中單向流動。日光入網，層層傳遞，每過一層便散失大半；所以頂層的猛獸稀少，底層的草木廣布。數一數各層的量，網的形狀便明白。',
      '相依意味著牽一處而動全身。網上抽去一結，影響沿線傳開；田野與池塘都是現成的書。生命一門的開蒙三葉，由辨認走到相依，仍只是門徑。',
    ],
  },
];

const SUBJECT_IDS = new Set(LEARN_SUBJECTS.map((subject) => subject.id));

export function learnSubject(id: string): LearnSubject | undefined {
  return LEARN_SUBJECTS.find((subject) => subject.id === id);
}

/** Lessons of one subject in reading order, shallow to deep. */
export function learnLessonsFor(subjectId: string): LearnLesson[] {
  return LEARN_LESSONS.filter((lesson) => lesson.subjectId === subjectId).sort((a, b) => a.level - b.level);
}

export function learnLesson(subjectId: string, lessonId: string): LearnLesson | undefined {
  return LEARN_LESSONS.find((lesson) => lesson.subjectId === subjectId && lesson.id === lessonId);
}

/** The leaf that must be finished before this one opens. Undefined on level 1. */
export function learnLessonGate(subjectId: string, lessonId: string): LearnLesson | undefined {
  const lesson = learnLesson(subjectId, lessonId);
  return lesson?.requires ? learnLesson(subjectId, lesson.requires) : undefined;
}

/** The leaf this one unlocks. Undefined at the current end of a track. */
export function learnLessonNext(subjectId: string, lessonId: string): LearnLesson | undefined {
  return learnLessonsFor(subjectId).find((lesson) => lesson.requires === lessonId);
}

export function learnCatalogIssues(): string[] {
  const issues: string[] = [];
  if (LEARN_SUBJECTS.length !== 12) issues.push('count');
  const open = LEARN_SUBJECTS.filter((subject) => subject.open);
  if (open.map((subject) => subject.id).join() !== 'zh,math,en,phy,bio') issues.push('seeds');
  const ids = new Set<string>();
  for (const subject of LEARN_SUBJECTS) {
    if (ids.has(subject.id)) issues.push(`dup:${subject.id}`);
    ids.add(subject.id);
    if (!subject.name.trim() || !subject.bearing.trim() || !subject.orientation.trim()) issues.push(`blank:${subject.id}`);
  }
  if (!LEARN_LICENSE.name.trim() || !LEARN_LICENSE.url.trim() || !LEARN_LICENSE.note.trim()) issues.push('license');
  const lessonKeys = new Set<string>();
  for (const lesson of LEARN_LESSONS) {
    const key = `${lesson.subjectId}:${lesson.id}`;
    if (lessonKeys.has(key)) issues.push(`dup-lesson:${key}`);
    lessonKeys.add(key);
    if (!SUBJECT_IDS.has(lesson.subjectId)) issues.push(`subject:${lesson.id}`);
    if (!learnSubject(lesson.subjectId)?.open) issues.push(`closed-lesson:${lesson.id}`);
    if (!Number.isInteger(lesson.level) || lesson.level < 1) issues.push(`level:${lesson.id}`);
    if (!lesson.title.startsWith(`${learnLevelLabel(lesson.level)}：`)) issues.push(`title:${lesson.id}`);
    if (lesson.summary.trim().length < 12) issues.push(`summary:${lesson.id}`);
    if (lesson.body.length < 2) issues.push(`body:${lesson.id}`);
    for (const paragraph of lesson.body) {
      if (paragraph.trim().length < 40) issues.push(`thin:${lesson.id}`);
    }
  }
  for (const subject of LEARN_SUBJECTS) {
    const track = learnLessonsFor(subject.id);
    if (!subject.open) {
      if (track.length) issues.push(`closed-track:${subject.id}`);
      continue;
    }
    if (!track.length) issues.push(`empty-track:${subject.id}`);
    track.forEach((lesson, index) => {
      const level = index + 1;
      if (lesson.level !== level) issues.push(`gap:${subject.id}:${lesson.id}`);
      if (level === 1) {
        if (lesson.requires) issues.push(`root-requires:${lesson.id}`);
      } else if (lesson.requires !== track[index - 1]?.id) {
        issues.push(`chain:${lesson.id}`);
      }
    });
  }
  return issues;
}
