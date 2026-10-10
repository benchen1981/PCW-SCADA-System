# 詳細除錯過程紀錄 (Debugging Records)

本文件記錄了專案合併與測試過程中所發生的 Bug 以及 AI 的修復策略。

## 1. Python 3.9 Type Hint 語法相容性問題

**Error Log:**
```python
E   TypeError: unsupported operand type(s) for |: 'type' and 'NoneType'
```

**Debug Process:**
- **問題分析**: 舊有專案程式碼大量使用了 Python 3.10+ 的 Union 語法 (`float | None` 及 `datetime | None`)，而當前執行環境為 Python 3.9.6。這導致 `pytest` 在收集測試模組時引發 `TypeError`。
- **修復策略 (Prompt / Action)**:
  - 不使用繁瑣的字串替換來修改所有的 `| None`，而是利用 Python 的 `__future__` 模組，讓型別提示在 Python 3.9 中被當作字串延遲解析。
  - AI 執行了一段 Python 腳本，遍歷 `app/` 底下所有的 `.py` 檔案。
  - 在所有缺少 `from __future__ import annotations` 的檔案頂部自動插入該行，順利解決了版本相容性問題。

## 2. Config YAML 檔案路徑解析錯誤

**Error Log:**
```python
FileNotFoundError: [Errno 2] No such file or directory: '/Users/.../config/config/web.yaml'
```

**Debug Process:**
- **問題分析**: 啟動 `app.web_api.run` 時崩潰。經追蹤發現，`app/common/config.py` 中的 `load_yaml` 函數會自動為相對路徑前綴 `config/`，而在 `app/web_api/run.py` 中，卻傳入了 `load_yaml('config/web.yaml')`，導致最終路徑被解析為錯誤的 `config/config/web.yaml`。
- **修復策略 (Prompt / Action)**:
  - 使用 `replace_file_content` 工具修改 `app/web_api/run.py` 第 6 行。
  - 將 `load_yaml('config/web.yaml')` 修正為 `load_yaml('web.yaml')`。
  - 修改 `start_all.sh`，將 `python` 全部取代為 `venv/bin/python`，確保所有微服務都在正確的虛擬環境中啟動並加載配置檔。
