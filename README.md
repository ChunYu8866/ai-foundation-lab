# 知序 AI · AI Foundation Lab

繁體中文 AI 基礎學習 App，依使用者提供的兩份 iPAS AI 初級 YouTube 播放清單編排。從 AI 概念、資料思維、機器學習到生成式 AI 與導入規劃，將影片主題串成可以練習、複習與記錄的學習路徑。

## 使用 App

[開啟知序 AI](https://ai-foundation-lab-ipas.chunyu88.chatgpt.site)（私人 App，需使用擁有者帳號登入）

- **6 大模組、12 個單元**：原創導讀、學習目標、生活例子與一句重點。
- **17 部來源影片**：完整保留兩份清單的標題、順序、時長和 YouTube 連結；主題單元映射其中 16 部教學影片，考試分享保留於影片庫。
- **36 題原創練習**：綜合、主題、單課與錯題練習，附即時解析及相關導讀。
- **24 張知識卡片**：中英術語搜尋、已熟悉標記。
- **個人學習紀錄**：完成進度、連續學習、單課筆記，支援 JSON 匯出與還原。
- **響應式 PWA**：桌機與手機皆可使用；首次成功載入並完成快取後，導讀與練習可離線使用，YouTube 影片仍需網路。

## 本機執行

需要 Node.js 20 以上，無第三方執行依賴，無須 API key。

```sh
npm run dev
```

開啟 `http://127.0.0.1:4173`。可用 `PORT=8080 npm run dev` 變更埠號。

```sh
npm run check
npm run build
```

`check` 執行 JavaScript 語法檢查及 Node 原生測試；`build` 將可直接部署的靜態檔案輸出至 `dist/`。可部署到任何支援 HTTPS 的靜態主機；所有資源使用相對路徑，也適用於 GitHub Pages 子目錄。此私人儲存庫不會自動公開或啟用 GitHub Pages。

## 專案結構

```text
index.html                 入口與無障礙基本設定
src/app.js                 路由、學習介面、測驗與筆記互動
src/content.js             6 模組、12 課、36 題、24 術語與參考文件
src/sources.json           兩份播放清單的已查核中繼資料
src/store.js               備份驗證、狀態儲存、日期與連續學習計算
src/styles.css             響應式介面與純 CSS 視覺
public/manifest.webmanifest PWA 設定
sw.js                      同源靜態資源快取
scripts/                   零依賴開發伺服器與建置腳本
tests/                     教材關聯、資料完整性與狀態邊界測試
```

## 教材來源與範圍

1. [iPAS AI應用規劃師(初級)科目一](https://www.youtube.com/playlist?list=PLwGaDBtzBoU9gjO2xGFxpA_VhYICZZVvj)：10 部影片。
2. [iPAS AI應用規劃師(初級)科目二](https://www.youtube.com/playlist?list=PLwGaDBtzBoU-S9AfCdiBlDmV1aVuTqqXu)：7 部影片。

影片作者為 [iPAS AI](https://www.youtube.com/@EasonCheng-l5u)。公開播放清單的名稱、標題、ID、順序與時長於 **2026-10-31（Asia/Taipei）** 查核，共 **7 小時 16 分 49 秒**。

**未取得或分析影片逐字稿。** 導讀、知識卡片與練習題依主題原創編寫，並參考 Google Machine Learning、Microsoft Learn 與 NIST 的一手文件；不是影片逐字摘要、官方教材、歷屆試題或考試通過保證。技術參考文件列在 App 的「課程影片」頁面與 `src/content.js` 的 `references`。

影片與播放清單相關內容的權利歸原作者及各權利人。本 App 不託管影片檔案；點選影片後才載入 YouTube 隱私強化模式播放器，並提供原影片外連。是否可以嵌入播放取決於 YouTube 及原作者設定。

## 個人資料與限制

學習資料保存在目前瀏覽器的 `localStorage`，沒有帳號同步、後端資料庫或外部 AI API。清除瀏覽器資料或切換網域不會自動帶走進度，請先在「我的筆記」匯出 JSON 備份，再到新環境匯入。匯入會在確認後覆蓋目前紀錄。

首次離線開啟無法建立快取。影片、YouTube 外連與技術參考文件需要網路；離線能力需瀏覽器支援 Service Worker，通常須 HTTPS 或 localhost。這是可安裝的網頁 App，並非 App Store／Google Play 原生應用程式。
