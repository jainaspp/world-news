/**
 * 開蒙契約 v1。顯示名對齊 edu-tree：漢語與文字／數量與形式／英語與世界語文門徑。
 * 其餘九門只在地圖上灰顯。加域要升版，不在這一版另造名單。
 */

export interface LearnSubject {
  id: string;
  name: string;
  bearing: string;
  /** P0 seeds are readable. The other doors stay on the map and do not pretend to have a syllabus. */
  open: boolean;
  orientation: string;
}

export interface LearnLesson {
  id: string;
  subjectId: string;
  title: string;
  summary: string;
  body: string[];
}

export const LEARN_PROGRESS_KEY = 'wn.edu.progress.v1';

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
    open: false,
    orientation: '物質之門在萬有地圖的「物質與自然」。此路尚未開啓。',
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
    open: false,
    orientation: '生命之門在萬有地圖的「物質與自然」。此路尚未開啓。',
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
    title: '一葉：字形何以可讀',
    summary: '漢字把聲音、意義和形狀收在同一個格子裡。這一葉只說明字形為什麼能被再次認出。',
    body: [
      '一張紙上的字，先是一組可以重複的筆畫。讀者不必在場，後來的人仍能按同一組筆畫把句子讀出來。這就是文字作為記錄的位置：它把一次說出的話，留成可以核對的形狀。',
      '開蒙由這一葉開始，不求把整部文字史講完。下一級尚未寫入。敘事上，文字如何進入城市與印刷，見文明編年，兩處正文不相貼。',
    ],
  },
  {
    id: 'count',
    subjectId: 'math',
    title: '一葉：數何以可對',
    summary: '數量先要有可以重複的單位。這一葉只說明「再數一次」為什麼站得住。',
    body: [
      '數，是把事物換成可以再數一次的單位。十與十相加仍是二十，不因說話的人換了而改寫。形式把這一步收成關係，於是後來的人可以按同一關係複核。',
      '這一葉停在單位與複核。度量如何在異地仍被信任，見文明軸上的先例，不在這裡另寫一套新聞。',
    ],
  },
  {
    id: 'script',
    subjectId: 'en',
    title: '一葉：另一種文字的門徑',
    summary: '字母把語音拆成可以拼回去的零件。這一葉只說明門徑，不把一種語文寫成高下。',
    body: [
      '英語使用字母。一個詞由少數字母拼成，讀者可以按字母把聲音拼回去。它因此成為進入許多世界語文的一扇門，而不是唯一的門。',
      '這一葉不比較人群，也不排座次。符號與語言在地圖上有兩扇已開的門：漢語與文字，以及這一門徑。其餘語文次第再開。',
    ],
  },
];

const SUBJECT_IDS = new Set(LEARN_SUBJECTS.map((subject) => subject.id));

export function learnSubject(id: string): LearnSubject | undefined {
  return LEARN_SUBJECTS.find((subject) => subject.id === id);
}

export function learnLessonsFor(subjectId: string): LearnLesson[] {
  return LEARN_LESSONS.filter((lesson) => lesson.subjectId === subjectId);
}

export function learnLesson(subjectId: string, lessonId: string): LearnLesson | undefined {
  return LEARN_LESSONS.find((lesson) => lesson.subjectId === subjectId && lesson.id === lessonId);
}

export function learnCatalogIssues(): string[] {
  const issues: string[] = [];
  if (LEARN_SUBJECTS.length !== 12) issues.push('count');
  const open = LEARN_SUBJECTS.filter((subject) => subject.open);
  if (open.length !== 3) issues.push('open');
  if (open.map((subject) => subject.id).join() !== 'zh,math,en') issues.push('seeds');
  if (open.map((subject) => subject.name).join('／') !== '漢語與文字／數量與形式／英語與世界語文門徑') issues.push('names');
  const ids = new Set<string>();
  for (const subject of LEARN_SUBJECTS) {
    if (ids.has(subject.id)) issues.push(`dup:${subject.id}`);
    ids.add(subject.id);
    if (!subject.name.trim() || !subject.bearing.trim() || !subject.orientation.trim()) issues.push(`blank:${subject.id}`);
  }
  if (LEARN_LESSONS.length < 1 || LEARN_LESSONS.length > 3) issues.push('lessons');
  for (const lesson of LEARN_LESSONS) {
    if (!SUBJECT_IDS.has(lesson.subjectId)) issues.push(`subject:${lesson.id}`);
    if (!learnSubject(lesson.subjectId)?.open) issues.push(`closed-lesson:${lesson.id}`);
    if (!lesson.body.length) issues.push(`body:${lesson.id}`);
  }
  return issues;
}
