import { describe, expect, it } from 'vitest';
import { applyModelText, promptFor } from '../shared/content';
import { focusBody, renderWeekFocus } from '../shared/focus';
import { compareFromCluster, hanCount, richness } from '../shared/grok';
import { arabicDigits, cantoneseLeft, polishProse } from '../shared/prose';
import type { StoryCluster } from '../shared/trending';
import type { NewsItem } from '../shared/types';

/** Mocked Grok briefing, after the written-Chinese pass. Quoted in the pull request. */
export const SAMPLE_BRIEFING = '立法會三讀通過開支預算後，教育開支的增幅被明報放在最前，香港電台則同時寫到醫療開支的討論。兩家都沒有寫出新稅項或撥款年期，所以這份預算的意義在於支出結構，而不是新的收入措施。對香港讀者，今日要看的是教育與醫療兩項如何被描述，以及表決已經完成這一件事。內地方面，新華社報道華南有暴雨，北京提醒市民留意，但沒有列出降雨毫米數，因此不能把影響寫成全國，也不能假設香港同一日受這場雨影響。值得留意的具體事項有三項：預算裡教育開支的寫法、醫療開支是否只被一筆帶過，以及暴雨提醒有沒有寫到具體城市。兩邊標題沒有把它們連成同一個因果，跟進時應分開看。香港這一段可以確定的只有三點：立法會已經三讀通過開支預算，明報把教育開支增幅放在最前，香港電台同時寫到醫療開支仍有討論。兩家都沒有交代新稅項，也沒有交代撥款年期，所以不能把通過寫成加稅，也不能把增幅寫成一個具體百分比。對讀者，表決完成是今日的事實，教育與醫療則是兩家選擇突出的開支項目。內地這一段同樣短。新華社只寫華南有暴雨，以及北京提醒市民留意。沒有毫米數，就沒有雨量可以引用；沒有點名香港，就不能把這場雨寫進香港的天氣。提醒的主體是北京，範圍被寫成華南，這兩句已經是來源給出的全部。分開看的原因在於兩組標題沒有共同的人物、地點或因果。預算屬於香港的財政程序，暴雨屬於內地的天氣提醒。跟進時，一邊看教育開支與醫療開支在後續報道裡有沒有被寫得更具體，另一邊看暴雨提醒有沒有補上城市或毫米數。在來源補上之前，這份導讀只停在已經寫明的事實。';

/** Mocked region intro for /region/eur/. About 250–400 characters. Quoted in the pull request. */
export const SAMPLE_REGION_INTRO = '歐洲方面，路透報道歐中貿易談判仍未完成，雙方就307項貨品的關稅清單有分歧，涉及規模21.44億歐元。BBC中文指出目前談及的貨品約佔雙邊貿易57.7%，並寫到下月會繼續會談。兩家都沒有寫成協議已經簽署。值得留意的是清單裡的汽車與農產品有沒有被納入、稅率差距是否收窄，以及下月會談的日期有沒有寫明。數字只反映來源列出的規模和占比，不是本站的推算。這組報道的重要性在於談判仍未完成，而不是關稅已經落地。路透把分歧放在307項貨品和21.44億歐元的規模上，BBC中文則用57.7%說明目前談及的貨品在雙邊貿易中的占比。兩家都寫到會談還會繼續，但都沒有寫明下月的具體日期，也沒有寫明汽車與農產品是否已經入清單。讀者可以留意的，是下一輪會談有沒有日期、稅率差距有沒有收窄，以及協議有沒有被任何一家寫成已經簽署。在來源補上之前，這段只停在已經列出的數字和未完成的談判。';

function story(id: string, title: string, source: string): NewsItem {
  return {
    id,
    title,
    link: `https://example.com/${id}`,
    source,
    sourceUrl: 'https://example.com',
    regions: ['HKG'],
    pubDate: '2026-10-07T00:00:00Z',
    category: 'hk',
    excerpt: title,
  };
}

describe('written Chinese post-processing', () => {
  it('uses Arabic digits, full-width punctuation, and drops banned phrasing', () => {
    const raw = '喺談判入面，規模係三百零七項、二十一點四四億，占比百分之五十七點七。港鐵 建議 加價。詳情見標題同描述。關係同埋係數都要保留。';
    const text = polishProse(raw);
    expect(text).toContain('在談判之中');
    expect(cantoneseLeft(text)).toBe(false);
    expect(cantoneseLeft('佢話')).toBe(true);
    expect(text).toContain('307');
    expect(text).toContain('21.44億');
    expect(text).toContain('57.7%');
    expect(text).toContain('港鐵建議加價。');
    expect(text).not.toContain('標題同描述');
    expect(text).not.toContain('喺');
    expect(text).not.toContain('同埋');
    expect(text).toContain('關係');
    expect(text).toContain('係數');
    expect(text).not.toMatch(/(?<![關干])係(?![數統列])/);
    expect(arabicDigits('一週三讀')).toBe('一週三讀');
    expect(arabicDigits('十分重要')).toBe('十分重要');
  });

  it('keeps a mocked briefing and a region intro inside the style rules', () => {
    const briefing = polishProse(SAMPLE_BRIEFING);
    expect(briefing).toBe(SAMPLE_BRIEFING);
    expect(hanCount(briefing)).toBeGreaterThanOrEqual(500);
    expect(briefing).not.toMatch(/[喺嘅]|同埋|標題同描述/);
    expect(briefing).toContain('，');
    expect(briefing).not.toMatch(/[\u3400-\u9fff] [\u3400-\u9fff]/);

    const intro = focusBody(SAMPLE_REGION_INTRO);
    expect(intro).toBe(SAMPLE_REGION_INTRO);
    expect(hanCount(intro!)).toBeGreaterThanOrEqual(250);
    expect(hanCount(intro!)).toBeLessThanOrEqual(400);
    expect(intro).toContain('307');
    expect(intro).toContain('21.44億');
    expect(intro).toContain('57.7%');
    expect(intro).toContain('路透');
    expect(intro).toContain('BBC中文');
    const html = renderWeekFocus(intro!);
    expect(html).toContain('本週重點');
    expect(html).toContain('AI 整合');
    expect(html).toContain('307');
    expect(renderWeekFocus('')).toBe('');
  });

  it('grounds converted digits and replaces a title that does not match the story', () => {
    const items = [
      { ...story('a', '港鐵建議票價加幅三百零七元', '香港電台'), excerpt: '香港電台報道加幅三百零七元。' },
      { ...story('b', '港鐵票價諮詢', '明報'), excerpt: '明報報道港鐵票價進入諮詢。' },
    ];
    const cluster: StoryCluster = {
      id: 'a',
      lead: items[0]!,
      items,
      sources: ['香港電台', '明報'],
      count: 2,
      latest: 1,
    };
    const draft = compareFromCluster(cluster, new Date('2026-10-07T01:00:00Z'));
    const section = '香港電台把加幅寫成307元，明報則寫諮詢已經開始。兩家說的都是港鐵票價，分別在於一家先給金額，一家先寫程序。讀者要對回各自的原文，不能把諮詢寫成加價已經生效。這組標題沒有其他數字，所以這裡也不補百分比或日期。';
    const doc = applyModelText(draft, JSON.stringify({
      title: '月球基地啟用',
      description: '兩家媒體報道港鐵票價。',
      sections: [
        { heading: '事件經過', text: section },
        { heading: '各方回應', text: section },
        { heading: '後續關注', text: section },
      ],
      outlets: [
        { n: 1, emphasis: '先寫加幅307元', facts: '307元', tone: '速報' },
        { n: 2, emphasis: '先寫諮詢', facts: '', tone: '側重程序' },
      ],
      points: ['港鐵票價', '加幅307元'],
    }), 'grok-4.3');
    expect(doc?.title).toBe('月球基地啟用');
    expect(doc?.blocks.flatMap((block) => block.sentences).join('')).toContain('307');
    expect(richness(doc!)).toBeGreaterThan(0);
    expect(promptFor(draft).system).toContain('禁止添加');
    expect(promptFor(draft).system).not.toContain('標題同描述');
    expect(promptFor(draft).user).toContain('新聞懶人包');
    const rejected = applyModelText(draft, JSON.stringify({
      title: '港鐵票價',
      sections: [{ heading: '事件經過', text: '佢話加幅已經生效，唔使再諮詢。' }],
    }), 'grok-4.3');
    expect(rejected).toBeNull();
  });
});
