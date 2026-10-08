import type { ContentDoc } from './content.js';
import { formatHkt, slotId } from './content.js';
import { quizKey, type QuizDoc } from './quiz.js';

/** Local preview only. Production pages read KV and do not use this sample. */
export function previewSeed(now = new Date()): Record<string, string> {
  const edition = slotId(now);
  const publishedAt = now.toISOString();
  const briefing: ContentDoc = {
    kind: 'briefing',
    key: edition,
    title: '港鐵公布票價檢討時間表',
    description: '港鐵宣布下月公布票價檢討結果，運輸署表示會審視對乘客的影響。',
    points: [
      '港鐵宣布下月公布票價檢討結果。',
      '運輸署表示會審視對乘客的影響。',
      '兩間媒體都報道了這項時間表。',
    ],
    blocks: [
      {
        title: '香港',
        sentences: [
          '港鐵宣布下月公布票價檢討結果。',
          '檢討涵蓋短途票價與月票。',
          '運輸署表示會審視對乘客的影響。',
        ],
        sources: [{
          title: '港鐵宣布下月公布票價檢討結果',
          url: 'https://example.com/mtr',
          source: '香港電台',
          category: 'hk',
        }],
        category: 'hk',
      },
    ],
    publishedAt,
    hkt: formatHkt(publishedAt),
    mode: 'ai',
    provider: 'workers-ai',
    model: '@cf/qwen/qwen3-30b-a3b-fp8',
  };
  const quiz: QuizDoc = {
    edition,
    generatedAt: publishedAt,
    questions: [
      {
        prompt: '港鐵預計何時公布票價檢討結果？',
        choices: ['下月', '明年', '本週', '今日'],
        answer: '下月',
        sourceTitle: '港鐵宣布下月公布票價檢討結果',
        sourceUrl: 'https://example.com/mtr',
      },
      {
        prompt: '哪一個部門表示會審視對乘客的影響？',
        choices: ['運輸署', '天文台', '醫管局', '金管局'],
        answer: '運輸署',
        sourceTitle: '運輸署審視港鐵票價對乘客的影響',
        sourceUrl: 'https://example.com/td',
      },
      {
        prompt: '天文台對南海低壓區的說法是什麼？',
        choices: ['會進入本港八百公里範圍', '已經登陸', '不會影響', '改掛十號風球'],
        answer: '會進入本港八百公里範圍',
        sourceTitle: '天文台指南海低壓區會進入本港八百公里範圍',
        sourceUrl: 'https://example.com/hko',
      },
    ],
  };
  const day = edition.slice(0, 10);
  return {
    [quizKey(edition)]: JSON.stringify(quiz),
    [`doc:briefing:${edition}`]: JSON.stringify({ doc: briefing, savedAt: now.getTime() }),
    'index:briefing': JSON.stringify([{
      key: edition,
      title: briefing.title,
      description: briefing.description,
      publishedAt,
      sources: 2,
      category: 'hk',
    }]),
    'index:compare': JSON.stringify([{
      key: `${day}-mtr-fare-0123456789ab`,
      title: '港鐵票價檢討懶人包',
      description: '港鐵宣布下月公布票價檢討結果。',
      publishedAt,
      sources: 2,
      category: 'hk',
    }]),
    rollup: JSON.stringify([
      { title: '港鐵宣布下月公布票價檢討結果', url: 'https://example.com/mtr', source: '香港電台', category: 'hk', at: publishedAt },
      { title: '天文台指南海低壓區會進入本港八百公里範圍', url: 'https://example.com/hko', source: '香港電台', category: 'hk', at: publishedAt },
    ]),
  };
}
