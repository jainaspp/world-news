/** Static publisher copy on the homepage, so the first screen is not only headlines. */
export const HOME_INTRO = '世界頭條是一個香港繁體中文的新聞標題板。我哋從公開 RSS 收集各地標題、來源同原文連結，不會轉載全文。日報、週報同熱門分析是編輯部用標題同短描述整理的欄目，每篇都標明「AI 整合」，方便你先掌握重點，再去原文核對。';

export const HOME_SECTIONS = [
  { name: '頭條', text: '最新公開標題，可以按地區、分類同時間瀏覽。卡片只顯示標題、來源同去原文的連結。' },
  { name: '日報', text: '每日綜合多間媒體同時報道的題目，寫成標明 AI 整合的摘要，並附上出處。' },
  { name: '週報', text: '回顧一週科技同一週財經的公開標題，不是投資建議。' },
  { name: '熱門分析', text: '三間或以上媒體報道同一件事時，整理背景同各方說法，並連結原文。' },
] as const;
