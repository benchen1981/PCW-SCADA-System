# 國立中興大學 人工智慧與資料科學碩士在職學位學程 — LaTeX 論文模板

本專案為**國立中興大學人工智慧與資料科學碩士在職學位學程**碩士學位論文的 LaTeX 排版模板公版，已預先設定好學校格式規範（封面、頁碼、目錄、字型、章節編號等），使用者只需填入自己的論文內容即可。

---

## 📁 檔案結構

| 檔案 / 資料夾 | 說明 |
|---|---|
| `main.tex` | 論文主檔，包含封面、誌謝、摘要、目錄、正文章節、參考文獻等所有結構 |
| `refs.bib` | 參考文獻資料庫（BibLaTeX 格式），在此新增 / 管理引用文獻 |
| `kaiu.ttf` | 標楷體字型檔，供 XeLaTeX 編譯時使用（Overleaf 雲端無此字型，須一併上傳） |
| `picture/` | 圖片資料夾，論文中使用的圖片、口試審核頁掃描 PDF 皆放置於此 |
| `README.md` | 本說明文件 |

---

## 🚀 使用方式（Overleaf）

### Step 1 — 下載 / 取得所有檔案

將本專案的所有檔案下載到本機（可透過 GitHub 的 **Code → Download ZIP**）。

### Step 2 — 上傳到 Overleaf

1. 前往 [Overleaf](https://www.overleaf.com/) 並登入帳號。
2. 點選 **New Project → Upload Project**。
3. 將下載的 ZIP 整包上傳（或將所有檔案手動上傳至新專案中，保持資料夾結構不變）。

### Step 3 — 設定編譯器

在 Overleaf 專案中：

1. 點左上角 **Menu**。
2. 將 **Compiler** 設為 **`XeLaTeX`**（本模板使用 XeLaTeX + fontspec 載入中文字型，**不可使用 pdfLaTeX**）。
3. 確認主文件 (Main document) 為 `main.tex`。

### Step 4 — 開始撰寫

- 打開 `main.tex`，依照註解提示修改**封面資訊**（論文題目、研究生姓名、指導教授、日期等）。
- 在各章節區塊（`\section`、`\subsection`）填入論文內容。
- 圖片放入 `picture/` 資料夾後，取消 `main.tex` 中對應的範例註解並修改檔名即可插入。
- 在 `refs.bib` 中新增文獻條目，正文使用 `\cite{key}` 引用。

---

## 📝 模板功能摘要

- ✅ **封面頁** — 符合學校格式，含中英文題目、指導教授、研究生、日期
- ✅ **口試審核頁** — 預留空白頁；取得掃描 PDF 後可直接插入
- ✅ **誌謝** — 獨立頁面，不顯示頁碼
- ✅ **中英文摘要** — 含關鍵詞欄位
- ✅ **目錄 / 表目錄 / 圖目錄** — 自動產生，點線連結頁碼
- ✅ **章節自動編號** — 第一章、第二章… / 1.1、1.2… / 1.1.1…
- ✅ **頁碼** — 前半部羅馬數字 (i, ii, iii…)，正文阿拉伯數字 (1, 2, 3…)
- ✅ **圖、表、公式範例** — 直式圖、橫式大圖、子圖、表格、公式，皆附範例程式碼（註解中）
- ✅ **參考文獻** — 使用 BibLaTeX + Biber，自動排版，支援 APA 風格作者格式
- ✅ **中文字型** — 標楷體 (kaiu.ttf)，已隨附字型檔

---

## ⚙️ 本機編譯（選用）

若不使用 Overleaf，也可以在本機編譯：

```bash
# 確保已安裝 TeX Live / MiKTeX 且包含 XeLaTeX、Biber
xelatex main.tex
biber main
xelatex main.tex
xelatex main.tex
```

> 需要執行多次 `xelatex` 以正確產生目錄與交叉引用。

---

## 📖 引用文獻範例

在 `refs.bib` 中新增：

```bibtex
@article{chen2026,
  author  = {Chen, Ming and Lin, Yu},
  title   = {A Novel Approach to AI},
  journal = {Journal of AI Research},
  year    = {2026},
  volume  = {10},
  pages   = {1--15},
  doi     = {10.1234/jair.2026}
}
```

在 `main.tex` 正文中引用：

```latex
本研究參考了相關方法~\cite{chen2026}。
```

---

## 📌 注意事項

1. **編譯器必須選擇 XeLaTeX**，否則中文字型無法正確載入。
2. `kaiu.ttf` 為標楷體字型檔，**必須與 `main.tex` 一起上傳到 Overleaf**，否則會編譯失敗。
3. 圖片請統一放在 `picture/` 資料夾中，以利管理與引用。
4. 如需修改版面邊界、字體大小等格式，請參考 `main.tex` 中的「版面與格式設定」區塊。

---

## 📄 授權

本模板為國立中興大學人工智慧與資料科學碩士在職學位學程論文格式公版，供學程學生自由使用與修改。
