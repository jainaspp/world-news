# 內容同授權（不是法律意見）

畫面顯示 RSS 裡的標題、來源名稱、時間，同埋去原文網站的連結。若該則 RSS 有縮圖（`media:content`、`media:thumbnail`、`enclosure`、`itunes:image`，或描述裡的 `<img>`），卡片會直接連到那個圖片網址，不會下載或轉存。解析器會丟掉內文，不會儲存或顯示全文。

| 來源 | 標記 | 說明 |
| --- | --- | --- |
| NASA | `public-domain` | 美國聯邦政府作品，一般可公開使用。仍應保留 NASA 名稱同連結。 |
| UN News | `un-reuse` | 聯合國新聞通常允許連出處轉載。保留 UN News 名稱同連結。 |
| BBC、The Guardian、DW、Al Jazeera、NHK、RTHK、Yonhap、Yahoo 新聞、Now 新聞、有線新聞、星島頭條、政府新聞網、新聞公報、香港01、巴士的報、SAI KUNG BUZZ、中新網、人民網、新華社、環球時報、新浪、Sixth Tone、CGTN、界面新聞、CNBC、The Verge、Ars Technica、Variety、Deadline、Sky Sports、NPR | `uncertain` | 這些 RSS（Now 新聞同香港01是網站自己的公開 JSON 列表）可以在伺服器讀取，但各家條款對「公開網站再顯示標題」同「廣告」並不一致。BBC 的 RSS 條款傾向非商業用途。本站 `index.html` 仍載入現有 AdSense 發布商編號。若廣告條款不允許某個來源，應拿掉該來源。SCMP 的 RSS 在一般網絡可讀，但 Cloudflare 出口會回 HTTP 403，所以沒有列入。明報 RSS、財新官方列表同聯合早報都沒有返回可用標題，所以沒有列入。 |

標題本身仍可能受版權保護。本程式的做法是短標題加出處連結，不是取得轉載授權。

翻譯使用非官方的 Google 翻譯端點，失敗時才用 MyMemory。這兩個都不是本專案的付費服務，條款亦未書面授權這種用法。翻譯失敗時會顯示原文。

已移除假新聞後備標題。來源失敗時顯示錯誤或空白，不會再假冒 BBC 或其他機構。

## 港／陸欄合規（維護備註，不是法律意見）

香港與中國欄、港聞導讀、相關專題不採用法廣（RFI）、美國之音、自由亞洲、紐約時報中文、BBC 中文、德國之聲中文、FT中文、Guardian 中國、HKFP 等來源；並過濾台灣相關與若干敏感政治關鍵字標題。國際英文欄（如 BBC News、Guardian 英文）仍可獨立存在，刪除前需確認。
