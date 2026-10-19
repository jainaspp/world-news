import { esc } from '../contentPage.js';
import { renderReadingBlock, type ReadingBlock } from './blocks.js';
import { type CivCard, type CivLine } from './contract.js';

/**
 * Pattern cards. Adding one is a new object in this array.
 * Do not add a key to `PAGES`, and do not branch the renderer on `id`.
 * Mounts: axis chips, hub board, and the chronicle stage named by `anchor`.
 */

export const PATTERN_CARDS: readonly CivCard[] = [
  {
    id: 'power-store',
    title: '功率的儲存與維修',
    lines: ['能量'],
    anchor: '/civilization/chronicle/#stage-7',
    problem: '可用功率提高之後，儲存與維修由誰承接',
    mechanism: '燃料的熱能轉成可調度的機械功之後，產出上限改由機器、傳輸與儲存共同決定。功率不能留下，或斷供時無人修復，增產就停在機房之內。',
    boundary: '可用功率提高，不等於分配跟著改善',
    maintenance: '技術在場，若維修、師徒或備件中斷，可用功率會退回去。',
    ask: '今日新增的功率，備件與儲存是否同時在場？',
    event: '蒸汽動力進入可修復的生產',
    eventDetail: '蒸汽動力進入可修復的生產，是工業階段的機制，而不只是機器到場。約十八世紀中葉以後，改良蒸汽機把煤的熱能轉為可驅動機械的功，工廠把機器與班次放在同一屋簷下。功率是否留得下、修得回，並不隨機器到場而自動解決。',
    products: [
      { name: '蒸汽機與工作母機', kind: '技術', detail: '把煤的熱能轉為可重複使用的機械功，並以可替換的零件維持運轉。' },
      { name: '煤倉、車載燃料與輸配', kind: '技術', detail: '使功率不必在產出的同一刻用盡，可以沿礦井、鐵路與廠房繼續做功。' },
      { name: '班次、師徒與備件', kind: '制度', detail: '連續運轉依賴可輪替的人手與可替換的零件，而不是單台機器本身。' },
    ],
    drivers: [
      { name: '能量', detail: '化石燃料把長年累積的太陽能集中釋放，單位勞動所能調動的功率遠高於人畜。' },
      { name: '貿易', detail: '原料與成品要離開產地，功率必須能夠上路，而不是只留在礦井旁邊。' },
      { name: '信息', detail: '時刻表與電報讓遠方的燃料、班次與故障可以對上同一張時間表。' },
    ],
    impact: '能量線的躍升重塑城市與勞動節奏。這一次躍升能走多遠，取決於功率能否被儲存，以及斷供之後能否被修復。',
    sources: [
      { name: '美國機械工程師學會｜詹姆斯·瓦特', url: 'https://www.asme.org/topics-resources/content/james-watt', supports: 'mechanism' },
      { name: '美國國家地理教育｜工業革命與技術', url: 'https://education.nationalgeographic.org/resource/industrial-revolution-and-technology/' },
      { name: '美國能源信息署｜能量解說', url: 'https://www.eia.gov/energyexplained/what-is-energy/' },
      { name: '英國國家鐵路博物館｜史蒂芬森火箭號與鐵路興起', url: 'https://www.railwaymuseum.org.uk/objects-and-stories/stephensons-rocket-rainhill-and-rise-locomotive' },
      { name: '聯合國教科文組織世界遺產｜鐵橋峽', url: 'https://whc.unesco.org/en/list/371/' },
    ],
  },
  {
    id: 'copy-check',
    title: '複製與校驗',
    lines: ['信息'],
    anchor: '/civilization/chronicle/#stage-3',
    problem: '複製變便宜之後，校驗由誰承擔',
    mechanism: '記錄一旦能夠離開口述、被多次複製，協作就可以跨過當面的人群。複製本身只降低傳遞成本，不產生可核對的底本。',
    boundary: '複製變便宜，不等於內容變真',
    maintenance: '複製成本下降之後，若沒有校驗，協作半徑會把錯誤一起放大。',
    ask: '這則記錄被複製之前，誰對過底本？',
    event: '書面記錄可以被複製',
    eventDetail: '書面記錄可以被複製，是城市與文字階段留下的機制。約公元前四千紀末，泥板把計數、清單與契約壓成可以傳遞的記錄。其後的紙張、印版與頁面把複製成本一降再降。可核對的底本不會隨複本自動出現。',
    products: [
      { name: '泥板、紙張與印版', kind: '媒介', detail: '把一次記錄變成可以攜帶、存檔與再製的物件。' },
      { name: '清單、契約與校勘本', kind: '制度', detail: '寫明哪一份是底本、哪一份是抄本，爭議才可以核對。' },
      { name: '出處與發行標記', kind: '媒介', detail: '讓讀者知道這一份從何而來，而不是只看見它被複製了很多次。' },
    ],
    drivers: [
      { name: '信息', detail: '複製把一份記錄變成許多份，命令與知識可以離開現場。' },
      { name: '知識成本', detail: '單份抄寫昂貴時，錯誤傳得慢；複製變便宜之後，未經校驗的本子更容易同時到達許多人。' },
      { name: '制度', detail: '檔案室、書手與編校程序決定哪一份可以被當成底本。' },
    ],
    impact: '行政、交易與知識網絡的半徑，建立在記錄可以留下並被核對之上，而不僅建立在可以複製之上。',
    sources: [
      { name: '楔形文字數字圖書館', url: 'https://cdli.earth/', supports: 'mechanism' },
      { name: '聯合國教科文組織｜世界記憶', url: 'https://www.unesco.org/en/memory-world' },
      { name: '中國印刷博物館（北京市大興區公共介紹）', url: 'https://www.bjdx.gov.cn/bjsdxqrmzf/zjdx/yjdx/you/2105437/index.html' },
      { name: '歐洲核子研究組織｜萬維網簡史', url: 'https://home.cern/science/computing/the-birth-of-the-web/short-history-web/' },
      { name: '世界歷史百科｜楔形文字', url: 'https://www.worldhistory.org/cuneiform/' },
    ],
  },
  {
    id: 'measure-promise',
    title: '度量的互通',
    lines: ['制度', '貨幣'],
    anchor: '/civilization/chronicle/#stage-6',
    problem: '尺度不共用時，交易與實驗停在哪裡',
    mechanism: '度量可以換算之後，遠方的契約、工程與實驗才指向同一件事。互通靠對照，不靠取消各地既有的尺。',
    boundary: '度量互通，不等於出現單一中心',
    maintenance: '尺、砝碼與單位表靠定期比對、可替換的標準器，以及公開換算的程序維持。',
    ask: '這項交換用的是哪一把可以核對的尺？',
    event: '尺度成為可以換算的公共約定',
    eventDetail: '尺度成為可以換算的公共約定，是科學方法階段的機制，而不是另立一座度量館。約十六至十八世紀，觀測、實驗與印刷的數據表逐漸成為公共規範。遠方讀者要重複一次計算，先得知道對方用的是哪一把尺。換算表使不同地方的尺可以對照，並不要求只留下一個中心。',
    products: [
      { name: '砝碼、量器與刻度', kind: '技術', detail: '把「多少」固定在可以攜帶、可以比對的物件上。' },
      { name: '契約單位與換算表', kind: '制度', detail: '寫明一筆交易或一次觀測用的單位，以及它如何對到另一把尺。' },
      { name: '刊物中的數據表', kind: '媒介', detail: '使遠方讀者按同一刻度重複計算，而不是只複述結論。' },
    ],
    drivers: [
      { name: '制度', detail: '稅收、工程與實驗都要回答「多少」。沒有可核對的尺，命令與結果都無法覆核。' },
      { name: '貨幣', detail: '價格若沒有共用的量，每一筆跨市交易都要重新議定單位。' },
      { name: '信息', detail: '印刷的單位說明與數據表，讓校驗可以離開實驗現場。' },
    ],
    impact: '科學通訊與跨區交易能走多遠，取決於尺度能否換算，而不是是否只剩下一套單位。',
    sources: [
      { name: '國際計量局｜測量單位', url: 'https://www.bipm.org/en/measurement-units', supports: 'mechanism' },
      { name: '國際計量局｜國際單位制沿革', url: 'https://www.bipm.org/en/history-si' },
      { name: '英國國家物理實驗室｜國際單位制', url: 'https://www.npl.co.uk/resources/the-si-units' },
      { name: '中國計量科學研究院', url: 'https://www.nim.ac.cn/' },
      { name: '美國國家標準與技術研究院｜國際單位制', url: 'https://www.nist.gov/pml/owm/metric-si/si-units' },
    ],
  },
];

export function patternsForStage(stageN: number): CivCard[] {
  const hash = `#stage-${stageN}`;
  return PATTERN_CARDS.filter((card) => card.anchor.endsWith(hash));
}

export function patternAsReadingBlock(card: CivCard): ReadingBlock {
  const lineLabel = card.lines.join(' · ');
  return {
    anchor: `pattern-${card.id}`,
    domId: `pattern-${card.id}`,
    frame: 'pattern',
    kicker: `模式卡 · ${lineLabel}`,
    event: card.title,
    eventDetail: card.eventDetail,
    products: card.products.map((product) => ({ ...product })),
    drivers: card.drivers.map((driver) => ({ ...driver })),
    impact: card.impact,
    cover: null,
    captionNote: '紙感',
    lines: card.lines,
    problem: card.problem,
    mechanism: card.mechanism,
    boundary: card.boundary,
    maintenance: card.maintenance,
    ask: card.ask,
    sources: card.sources,
    stageHref: card.anchor,
  };
}

export function renderPatternCard(card: CivCard): string {
  return renderReadingBlock(patternAsReadingBlock(card));
}

export function renderPatternCardsForStage(stageN: number): string {
  return patternsForStage(stageN).map((card) => renderPatternCard(card)).join('');
}

export function renderPatternBoard(): string {
  const cards = PATTERN_CARDS.map((card) => renderPatternCard(card)).join('');
  return `<section class="pattern-board" id="pattern-board" aria-label="模式卡">
    <h2>可調用的機制</h2>
    <p class="pattern-note">三張模式卡掛在既有編年階段上。新卡只追加資料，不新增路由。</p>
    <p class="line-filter-echo" hidden></p>
    ${cards}
  </section>`;
}

export function renderPatternNav(): string {
  const links = PATTERN_CARDS.map((card) => `<a class="chip" href="#pattern-${esc(card.id)}">${esc(card.title)}</a>`).join('');
  return `<nav class="chronicle-nav pattern-nav" aria-label="模式卡">${links}</nav>`;
}

export function renderPatternAxisLinks(): string {
  const links = PATTERN_CARDS.map((card) => `<a class="chip" href="/civilization/chronicle/#pattern-${esc(card.id)}">${esc(`${patternLineLabel(card.lines)} · ${card.title}`)}</a>`).join('');
  return `<nav class="pattern-axis" aria-label="模式卡">${links}</nav>`;
}

export function patternLinksForStage(stageN: number): string {
  return patternsForStage(stageN).map((card) => `<a href="/civilization/chronicle/#pattern-${esc(card.id)}">模式卡</a>`).join('');
}

export function patternSourceRows(): { stage: string; name: string; url: string }[] {
  return PATTERN_CARDS.flatMap((card) => card.sources.map((source) => ({
    stage: `模式 ${card.title}`,
    name: source.name,
    url: source.url,
  })));
}

export function patternLineLabel(lines: readonly CivLine[]): string {
  return lines.join(' · ');
}
