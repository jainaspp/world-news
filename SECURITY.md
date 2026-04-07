# 🔐 安全政策

## 報告漏洞

如果你發現任何安全問題，請聯絡 `jainaspp@gmail.com`，**不要**公開披露。

## API Key 管理

本項目使用環境變量（`.env`）存儲所有敏感憑據：

```
VITE_NEWSDATA_API_KEY   — NewsData.io API Key
VITE_RSS2JSON_API_KEY   — rss2json API Key
VITE_WORKER_BASE_URL    — Cloudflare Worker URL
```

### 部署時

1. **前端**（Vercel）
   - 在 Vercel Dashboard → 你的 Project → Settings → Environment Variables 加入以上變量
   - 或使用 `.env.production` 通過 `vercel env pull` 同步

2. **Cloudflare Worker**
   - 在 Workers & Pages → 你的 Worker → Settings → Variables & Secrets
   - 分別加入 `NEWS_API_KEY_GLOBAL` 和 `RSS2JSON_API_KEY_GLOBAL`

### ⚠️ 嚴禁

- 將 `.env` 文件提交到 Git
- 將 API Key 直接寫入 TypeScript/JavaScript 源碼
- 在前端代碼中暴露 Secret Key

`.gitignore` 已正確配置排除 `.env` 及相關文件。

## 依賴安全

```bash
npm audit          # 檢查已知漏洞
npm audit fix      # 自動修復
```

建議定期更新依賴：
```bash
npm outdated
npm update
```
