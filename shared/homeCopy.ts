/** Static publisher copy on the homepage, so the first screen is not only headlines. */

export interface HomeSection {
  name: string;
  text: string;
  href?: string;
}

/** One line at the top of the homepage. The full text stays in the HTML, below the news. */
export const HOME_INTRO_LINE = '世界頭條是香港繁體中文的新聞標題板，只列出公開標題與出處。';

export const HOME_INTRO = '世界頭條是一個香港繁體中文的新聞標題板。本站從公開 RSS 收集各地標題、來源與原文連結，不會轉載全文。日報、週報與熱門分析是編輯部以標題及短描述整理的欄目，每篇都標明「AI 整合」，方便讀者先掌握重點。每日導讀整理香港、國際，以及科技與財經的標題。新聞懶人包整合多方報道，並配上時間線。';

export const HOME_SECTIONS: readonly HomeSection[] = [
  { name: '頭條', href: '/', text: '最新公開標題，可按地區、分類與時間瀏覽。卡片只顯示標題、來源及前往原文的連結。' },
  { name: '日報', href: '/digest/', text: '每日綜合多間媒體同時報道的題目，寫成標明 AI 整合的摘要，並附上出處。' },
  { name: '週報', href: '/weekly/', text: '回顧一週科技與一週財經的公開標題，並非投資建議。' },
  { name: '熱門分析', href: '/analysis/', text: '三間或以上媒體報道同一件事時，整理背景與各方說法，並連結原文。' },
  { name: '每日導讀', href: '/briefing/', text: '每日整理香港、國際，以及科技與財經的公開標題。' },
  { name: '新聞懶人包', href: '/explainer/', text: '整合多方報道、配時間線，方便對照同一件事的各家說法。' },
];
