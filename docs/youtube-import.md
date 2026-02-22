# YouTube字幕インポート 要件定義

## 概要

TranscriptAPI を使用して YouTube 動画の字幕を取得し、RAG のソースとして登録する機能。

- **単一動画インポート**: URL を1件入力して即座に登録
- **チャンネル一括インポート**: チャンネルの複数動画をまとめて登録

---

## 使用 API

**TranscriptAPI** (`https://transcriptapi.com/api/v2`)

| エンドポイント | クレジット | 用途 |
|---|---|---|
| `GET /youtube/transcript` | 1/動画 | 字幕テキスト取得 |
| `GET /youtube/channel/latest` | **0（無料）** | 最新15動画の一覧取得（RSS） |
| `GET /youtube/channel/videos` | 1/ページ | 全動画一覧取得（ページ分割） |

**認証**: `Authorization: Bearer {TRANSCRIPT_API_KEY}` ヘッダー
**無料プラン**: 100クレジット（クレジットカード不要）

---

## 管理画面 UI

### タブ構成の変更

既存の「テキスト」「WebページURL」に「YouTube」タブを追加（3タブ構成）。

```
┌──────────┬──────────────┬──────────┐
│ テキスト  │ WebページURL  │ YouTube  │  ← 新規追加
└──────────┴──────────────┴──────────┘
```

### YouTube タブ内のサブタブ

YouTube タブ内にさらに「単一動画」「チャンネル一括」のサブタブを設ける。

```
┌─────────────────────────────────────────┐
│ [単一動画]  [チャンネル一括]              │  ← サブタブ
├─────────────────────────────────────────┤
│ （サブタブの内容）                        │
└─────────────────────────────────────────┘
```

---

### サブタブ①「単一動画」

1本の YouTube 動画 URL を入力してインポートする。

**UI レイアウト**

```
┌─────────────────────────────────────────┐
│ 動画URL                                  │
│ [https://www.youtube.com/watch?v=...   ] │
│                                           │
│ タイトル（省略するとAPIから自動取得）      │
│ [                                       ] │
│                                           │
│ [インポートする]                          │
│                                           │
│ （完了後）                                │
│ ✓ 「動画タイトル」を登録しました          │
│   または                                  │
│ ⚠ この動画はすでに登録済みです            │
│   または                                  │
│ ✗ 字幕が見つかりませんでした              │
└─────────────────────────────────────────┘
```

**入力**

| フィールド | 必須 | 説明 |
|---|---|---|
| 動画URL | ○ | YouTube の動画URL（`https://www.youtube.com/watch?v=xxx`、短縮URL、動画IDのみ すべて可） |
| タイトル | — | 省略するとAPIから取得した動画タイトルを使用 |

**動作**

1. 「インポートする」クリック → `POST /api/admin/youtube/import/video` を呼び出す
2. ローディング中はボタンを無効化し「インポート中...」を表示
3. 完了後にインライン結果を表示（登録成功 / 登録済みスキップ / 字幕なし失敗）
4. 登録成功時はソース一覧を自動更新、入力欄をクリア

---

### サブタブ②「チャンネル一括」

チャンネルの複数動画を一括インポートする。

**UI レイアウト**

```
┌─────────────────────────────────────────┐
│ チャンネル                               │
│ [@d-chan4997                           ] │
│                                           │
│ 取得範囲                                  │
│ ● 最新15件のみ（無料）                   │
│ ○ 全件取得（クレジット消費）              │
│                                           │
│ [インポート実行]                          │
│                                           │
│ （完了後）                                │
│ ✓ 登録: 10件  スキップ: 3件  失敗: 2件   │
│                                           │
│   詳細                                    │
│   ✓ 動画タイトルA                        │
│   - 動画タイトルB（登録済み）             │
│   ✗ 動画タイトルC（字幕なし）            │
└─────────────────────────────────────────┘
```

**入力**

| フィールド | 必須 | デフォルト | 説明 |
|---|---|---|---|
| チャンネル | ○ | — | @ハンドル、チャンネルURL のいずれか |
| 取得範囲 | — | `latest` | `latest`: 最新15件（無料）/ `all`: 全件（クレジット消費） |

**動作**

1. 「インポート実行」クリック → `POST /api/admin/youtube/import/channel` を呼び出す
2. ローディング中はボタンを無効化し「インポート中...」を表示
3. 完了後に集計結果（登録/スキップ/失敗件数）と動画ごとの詳細一覧を表示
4. ソース一覧を自動更新

---

## API エンドポイント

### 単一動画インポート `POST /api/admin/youtube/import/video`

管理者認証（JWT）必須。

**リクエスト Body**

```json
{
  "videoUrl": "https://www.youtube.com/watch?v=abc123",
  "title": "任意のタイトル（省略可）"
}
```

**処理フロー**

```
1. sources.url で重複チェック → 登録済みなら status=skipped を返す
2. TranscriptAPI /youtube/transcript を呼び出す（1クレジット消費）
   - format=text, include_timestamp=false, send_metadata=true
3. 字幕が取得できた場合:
   - title: リクエストのtitle > APIのmetadata.title の優先順
   - body: 取得した字幕テキスト
   - url: 正規化した動画URL（https://www.youtube.com/watch?v={videoId}）
   - sources テーブルに登録 → チャンキング → Embedding → source_chunks に登録
4. 結果を返す
```

**レスポンス 200**

```json
{
  "status": "imported" | "skipped" | "failed",
  "title": "動画タイトル",
  "videoId": "abc123",
  "reason": "already_registered" | "no_captions" | null
}
```

---

### チャンネル一括インポート `POST /api/admin/youtube/import/channel`

管理者認証（JWT）必須。

**リクエスト Body**

```json
{
  "channelHandle": "@d-chan4997",
  "mode": "latest"
}
```

| パラメータ | 必須 | デフォルト | 説明 |
|---|---|---|---|
| `channelHandle` | ○ | — | YouTubeチャンネルの@ハンドル または チャンネルURL |
| `mode` | — | `"latest"` | `"latest"`: 最新15件（無料）/ `"all"`: 全件（クレジット消費） |

**処理フロー**

```
1. チャンネル動画一覧取得
   - mode=latest → /youtube/channel/latest（無料）
   - mode=all    → /youtube/channel/videos（1クレジット/ページ）

2. 各動画に対して順次処理:
   a. sources.url で重複チェック → 登録済みは skipped でスキップ
   b. TranscriptAPI /youtube/transcript を呼び出す（1クレジット）
   c. 字幕なし（404）→ failed でスキップし次の動画へ
   d. クレジット不足（402）→ 即座に中断し途中結果を返す
   e. 字幕取得成功 → sources 登録 → チャンキング → Embedding

3. 全動画処理後に集計結果を返す
```

**レスポンス 200**

```json
{
  "imported": 10,
  "skipped": 3,
  "failed": 2,
  "details": [
    {
      "videoId": "abc123",
      "title": "動画タイトル",
      "status": "imported" | "skipped" | "failed",
      "reason": "already_registered" | "no_captions" | "insufficient_credits" | null
    }
  ]
}
```

---

## 非機能要件

### 重複登録防止

`sources.url` の値で事前に `SELECT` して重複チェック。同じ動画 URL が登録済みの場合は `skipped` として処理を継続する。

### エラーハンドリング

| エラー種別 | 対応 |
|---|---|
| 字幕なし（404） | `failed` / `reason: no_captions` としてスキップ |
| クレジット不足（402） | 即座に中断し途中結果を返す |
| レート制限（429） | `Retry-After` ヘッダーに従い待機して再試行（最大3回） |
| タイムアウト（408/503） | 最大3回リトライ |
| その他APIエラー | `failed` としてスキップし処理継続 |

### クレジット消費の目安

| 操作 | クレジット消費 |
|---|---|
| 単一動画インポート | 1 |
| 最新15件一覧取得 | 0（無料） |
| 最新15件すべて新規インポート | 最大15 |
| 全件取得（仮に50件） | 1（一覧）＋ 最大50（字幕）= 最大51 |

---

## 環境変数

```env
TRANSCRIPT_API_KEY=your_api_key_here
```

取得方法: https://transcriptapi.com/ でアカウント作成 → API Keys ダッシュボード

---

## DB 変更

| 変更 | 内容 | 状態 |
|---|---|---|
| `sources.url` カラム追加 | `ALTER TABLE sources ADD COLUMN url TEXT` | ✅ 適用済み |
| `sources.url` にユニーク制約追加 | `ALTER TABLE sources ADD CONSTRAINT sources_url_unique UNIQUE (url)` | 要適用 |

---

## 実装ファイル一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `lib/transcriptapi.ts` | 新規作成 | TranscriptAPI クライアント（字幕取得・チャンネル動画一覧） |
| `app/api/admin/youtube/import/video/route.ts` | 新規作成 | 単一動画インポートエンドポイント |
| `app/api/admin/youtube/import/channel/route.ts` | 新規作成 | チャンネル一括インポートエンドポイント |
| `app/admin/sources/page.tsx` | 変更 | YouTube タブ（単一動画 / チャンネル一括 サブタブ）追加 |
| `.env.local` | 変更 | `TRANSCRIPT_API_KEY` 追加 |

---

## 実装順序

1. `TRANSCRIPT_API_KEY` を `.env.local` に追加（手動作業）
2. DB: `sources.url` にユニーク制約を追加
3. `lib/transcriptapi.ts` を作成
4. `app/api/admin/youtube/import/video/route.ts` を作成・動作確認
5. `app/api/admin/youtube/import/channel/route.ts` を作成・動作確認
6. `app/admin/sources/page.tsx` に YouTube タブ UI を追加
7. 動作確認（単一動画 → チャンネル最新15件の順でテスト）

---

## 字幕テキストのフォーマット

```
GET /youtube/transcript
  ?video_url={videoId}
  &format=text
  &include_timestamp=false
  &send_metadata=true
```

レスポンス例:

```json
{
  "video_id": "abc123",
  "language": "ja",
  "transcript": "こんにちは、今日は釣りの話をします。\n今回使うルアーは...",
  "metadata": {
    "title": "【バス釣り】#043 フックセレクト",
    "author_name": "D-chan"
  }
}
```

---

## 参照

- TranscriptAPI ドキュメント: https://transcriptapi.com/docs/api/
- D-Chan チャンネル: https://www.youtube.com/@d-chan4997/videos
- TranscriptAPI 無料プラン: 100クレジット（カード不要）
