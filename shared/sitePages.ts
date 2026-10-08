import { FEEDS } from './feeds.js';
import { chrome, esc, footer, head } from './contentPage.js';
import { homeIntroBody } from './homeIntro.js';

/** Shown on the privacy and terms pages. */
export const POLICY_UPDATED = '2026年10月7日';
export const POLICY_UPDATED_ISO = '2026-10-07';

const HTML_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'public, max-age=3600',
};

export function siteHeaders(): Record<string, string> {
  return { ...HTML_HEADERS };
}

function shell(title: string, description: string, path: string, body: string): string {
  const canonical = `https://world-news.xyz${path}`;
  return `<!doctype html>
<html lang="zh-HK">
${head(title, description, canonical, '', 'website', '', '', false)}
<body>
  <div class="page column-page" data-kind="site">
  ${chrome('none')}
  <main id="content" class="column-index site-prose">
    ${body}
  </main>
  ${footer()}
  </div>
</body>
</html>`;
}

function section(heading: string, inner: string): string {
  return `<section class="story column-block"><div class="story-body"><h2 class="column-h2">${heading}</h2>${inner}</div></section>`;
}

function feedList(): string {
  const seen = new Set<string>();
  const rows: string[] = [];
  for (const feed of FEEDS) {
    const key = `${feed.label}|${feed.homepage}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(`<li><a href="${esc(feed.homepage)}" rel="noopener noreferrer">${esc(feed.label)}</a></li>`);
  }
  return `<ul class="feed-sources">${rows.join('')}</ul>`;
}

export function renderAboutPage(): string {
  const body = `
    <header class="index-head">
      <h1 class="column-title">關於我們</h1>
      <p class="dek">世界頭條（world-news.xyz）是香港繁體中文的新聞標題板，加上由編輯部設定的 AI 整合欄目。</p>
    </header>
    ${section('網站簡介', homeIntroBody())}
    ${section('這個網站做什麼', `<p>世界頭條一次列出各地公開報道的標題、來源名稱、時間，以及前往原文的連結。介面使用繁體中文（香港）。我們不是通訊社，也不轉載其他機構的新聞全文。</p>`)}
    ${section('標題如何收集', `<p>標題來自公開的 RSS。程式只保留標題、來源名稱、時間、分類，以及 RSS 若有提供的縮圖網址。解析時會捨棄內文，不會儲存或顯示全文，也不會把圖片下載到我們的伺服器。</p><p>卡片上的「閱讀原文」會離開本站，前往原來的出版者。標題本身仍可能受版權保護；我們的做法是短標題加出處連結，不是取得轉載授權。</p>`)}
    ${section('AI 整合如何產生', `<p>日報、週報與熱門分析會在頁面標明<span class="badge ai-badge">AI 整合</span>。模型根據已收錄的標題與短摘錄，用繁體中文整理成摘要，並附上原文連結。</p><p>熱門分析針對多間媒體同時報道的同一件事，分成背景、各方說法等小節。一週回顧整理科技與財經標題。</p>`)}
    ${section('編輯原則', `<ul class="points"><li>不轉載新聞全文，也不把標題寫成本站的獨家報道。</li><li>AI 摘要必須標明，並且可以追到出處。</li><li>材料不足就寫短，或者整段不寫，不用空話填篇幅。</li><li>廣告只出現在有實質內文的頁面，標題頁與搜尋結果不放廣告。</li><li>個別來源的授權並不一致。若某個來源不允許這種展示，應把它拿掉。</li></ul>`)}
    ${section('來源', `<p>下面的名單由網站現用的公開 RSS 產生。名稱連到該機構的網站，不是轉載許可。</p>${feedList()}`)}
    ${section('更多', `<p>私隱做法見<a href="/privacy/">私隱政策</a>，使用範圍見<a href="/terms/">使用條款</a>。有問題請用<a href="/contact/">聯絡表格</a>，本站沒有公開電郵。</p>`)}
  `;
  return shell('關於我們', '世界頭條如何收集公開 RSS 標題，以及 AI 整合欄目如何寫成、如何標明。', '/about/', body);
}

export function renderPrivacyPage(): string {
  const body = `
    <header class="index-head">
      <h1 class="column-title">私隱政策</h1>
      <p class="dek">這頁說明世界頭條（world-news.xyz）如何使用廣告、分析、瀏覽器儲存與位置。最後更新：<time datetime="${POLICY_UPDATED_ISO}">${POLICY_UPDATED}</time>。</p>
    </header>
    ${section('本站不設立帳號', `<p>瀏覽標題不用註冊。本站沒有用戶帳號，不會向你收集姓名或電郵，除非你自己在聯絡表格填寫。本站不會出售個人資料，也沒有個人資料可以出售。</p>`)}
    ${section('Google AdSense', `<p>本站使用 Google AdSense 顯示廣告，發布商編號是 ca-pub-8392975944327076。Google 與其合作的第三方廠商可能使用 cookie 或類似技術，按照你的廣告設定顯示個人化或非個人化廣告。</p><p>你可以在 <a href="https://adssettings.google.com" rel="noopener noreferrer">Google 廣告設定</a> 管理個人化廣告，也可以在 <a href="https://policies.google.com/technologies/partner-sites" rel="noopener noreferrer">Google 的合作網站說明</a> 了解這些廠商。廣告會標明「廣告」，不會放在彈出視窗，頁面上也不會有催促你與廣告互動的字句。</p><p>標題頁、搜尋與篩選結果不會放廣告單元。廣告只放在首頁的標題之間，以及日報、週報與分析這些有內文的欄目。</p>`)}
    ${section('分析與託管', `<p>首頁載入後會使用 Google Analytics（衡量編號 G-WHXYS5YE2K）統計瀏覽。網站亦使用 Cloudflare 提供頁面與網絡服務，並可能啟用 Cloudflare Web Analytics，用來了解有多少人閱讀頁面。Cloudflare Web Analytics 一般不用廣告 cookie 追蹤你到其他網站。請求經過 Cloudflare 時，對方會按其網絡需要處理 IP 位址。</p><p>字體來自 Google Fonts。來源網站的小圖示由 Google 的圖示服務顯示。這些第三方有自己的政策。</p>`)}
    ${section('瀏覽器裡的 localStorage', `<p>以下資料只留在你的瀏覽器，用來記住版面，不會當成帳號資料上傳出售：</p><ul class="points"><li><code>darkMode</code>：深色或淺色。</li><li><code>wn_lang</code>：介面語言。</li><li><code>wn_tr_v1</code>：已顯示譯文的本機快取。尚未有譯文的字句會送到本站翻譯，譯文留在這台裝置，不會寫進帳號。</li><li><code>wn_bookmarks_v2</code>：你收藏的標題。</li><li><code>wn_board_v1</code>：側欄要不要顯示最常讀、關鍵詞、多方報道。</li><li><code>wn_follows_v1</code>：你關注的地區、分類與來源名稱。</li><li><code>wn_wx_loc_v1</code>：天氣位置選擇。座標只留在瀏覽器。</li><li><code>wn_wx_open_v1</code>：天氣詳情面板是否打開。</li><li><code>wn-major-dismiss</code>：你關掉的重大更新提示。</li></ul><p>清除網站資料就會去掉這些偏好。收藏與追蹤沒有雲端副本。</p>`)}
    ${section('用我位置與 Open-Meteo', `<p>香港天氣預設使用天文台的公開資料，不會問你的位置。只有當你按下「用我位置」，瀏覽器才會向你詢問定位。如果該位置在香港以外，瀏覽器會直接向 <a href="https://open-meteo.com/" rel="noopener noreferrer">Open-Meteo</a> 查詢天氣，座標不會送到世界頭條的伺服器。</p>`)}
    ${section('聯絡表格', `<p>表格上的名字可留空，訊息會存在本站的伺服器約九十日，然後到期刪除。本站會把 IP 位址雜湊，只用於限制同一網絡短時間內連續送出，不會把原始 IP 寫進留言。請不要在留言留下密碼或其他敏感資料。</p>`)}
    ${section('兒童', `<p>本站不是為十三歲以下兒童而設，也不會明知地收集兒童的個人資料。如果你認為留言裡有兒童資料，請用聯絡表格告訴我們，以便刪除。</p>`)}
    ${section('聯絡', `<p>私隱問題請用<a href="/contact/">聯絡表格</a>。本站沒有公開電郵地址。</p>`)}
  `;
  return shell('私隱政策', '世界頭條的廣告、Cookie、Cloudflare 分析、localStorage 與 Open-Meteo 說明。', '/privacy/', body);
}

export function renderTermsPage(): string {
  const body = `
    <header class="index-head">
      <h1 class="column-title">使用條款</h1>
      <p class="dek">使用 world-news.xyz 即表示你明白下面的範圍。最後更新：<time datetime="${POLICY_UPDATED_ISO}">${POLICY_UPDATED}</time>。</p>
    </header>
    ${section('內容屬於原來的出版者', `<p>新聞標題、內文、圖片與商標屬於原來的出版者或權利人。世界頭條只顯示標題、來源名稱、時間，以及前往原文的連結，不將全文當成自己的作品。RSS 縮圖由來源網站提供，我們不主張擁有這些圖片。</p><p>標明「AI 整合」的日報、週報與分析，是根據公開標題與短摘錄整理的摘要，版權意義上不能取代原文，也不能當成取得了轉載授權。</p>`)}
    ${section('摘要只供參考', `<p>AI 摘要、各方說法與週報回顧只供參考，方便你決定是否閱讀原文。它不是新聞原文，不是專業、法律、醫療或投資意見，也不保證已包括所有重要事實。請以出版者網站上的原文為準。</p>`)}
    ${section('不作出保證', `<p>網站按現況提供。我們不保證標題、摘要、時間、分類或連結準確、完整、及時、不中斷，或適合某一特定用途。來源網站可能改稿、撤稿或無法打開。你因使用或無法使用本站而作出的決定，由你自行負責。</p>`)}
    ${section('外部連結', `<p>標題、出處與廣告會連到世界頭條以外的網站。那些網站的內容、條款與私隱做法由它們自己負責。打開連結之後，就不再適用這一份條款。</p>`)}
    ${section('可接受的使用', `<p>請勿利用本站發送垃圾訊息、探測或干擾服務，或者把標題頁重新包裝成你擁有全文。聯絡表格只應用來與我們溝通。</p>`)}
    ${section('條款變更', `<p>我們可以更新這份條款，並改動頁面上的日期。更新後繼續使用網站，即表示你看過新版本。</p><p>另見<a href="/about/">關於我們</a>與<a href="/privacy/">私隱政策</a>。聯絡請用<a href="/contact/">表格</a>。</p>`)}
  `;
  return shell('使用條款', '世界頭條的內容歸屬、AI 摘要只供參考、不保證以及外部連結。', '/terms/', body);
}

export function renderContactPage(options: { notice?: string; alert?: boolean } = {}): string {
  const notice = options.notice
    ? `<p class="notice" role="${options.alert ? 'alert' : 'status'}">${esc(options.notice)}</p>`
    : '';
  const body = `
    <header class="index-head">
      <h1 class="column-title">聯絡我們</h1>
      <p class="dek">用下面的表格留言。名字可以留空。本站沒有公開電郵。</p>
    </header>
    ${notice}
    ${section('留言', `<form class="contact-form" method="post" action="/api/contact">
      <label>名字（可選）<input name="name" maxlength="80" autocomplete="name" /></label>
      <label>內容<textarea name="message" required maxlength="2000" minlength="2"></textarea></label>
      <div class="hp-field" aria-hidden="true"><label>公司<input name="company" tabindex="-1" autocomplete="off" /></label></div>
      <button class="primary" type="submit">送出留言</button>
    </form>
    <p>留言大約保存九十日，只供世界頭條閱讀，不會在網站上公開。私隱細節見<a href="/privacy/">私隱政策</a>。</p>`)}
  `;
  return shell('聯絡我們', '用表格聯絡世界頭條。名字可留空，本站沒有公開電郵。', '/contact/', body);
}
