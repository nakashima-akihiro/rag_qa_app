# API エンドポイント仕様

## 認証なし（パブリック）

### `POST /api/ask`

ユーザーの質問に対してRAGで回答を生成する。ストリーミング形式（Server-Sent Events）で応答する。

**Request Body**
```json
{
  "question": "string"  // 必須、最大500文字
}
```

**Response 200** — `Content-Type: text/event-stream`

SSE形式で以下のイベントを順次送信：

- `data: {"type":"text","delta":"..."}` — 回答テキストのチャンク（複数回）
- `data: {"type":"sources","sources":[...]}` — 参考ソース一覧
- `data: {"type":"done"}` — 完了
- `data: {"type":"error","error":"..."}` — エラー時

**Response 400**
```json
{ "error": "question is required" }
```

**Response 500**
```json
{ "error": "Failed to generate answer" }
```

**処理詳細**
1. 質問を Embedding でベクター化
2. `match_chunks()` で上位5チャンクを取得
3. チャンクが0件 → `"提供された情報の範囲外のため、お答えできません。"` を返す
4. Claude API にシステムプロンプト＋コンテキスト＋質問を送信

**Claude システムプロンプト**
```
あなたは提供された情報を元に質問に答えるアシスタントです。
以下の[情報]のみを根拠に回答してください。
[情報]に含まれない内容については「提供された情報の範囲外のため、お答えできません。」と答えてください。
```

---

## 管理者向け（JWT認証必須）

### `POST /api/admin/login`

**Request Body**
```json
{
  "password": "string"
}
```

**Response 200** — HttpOnly Cookie `admin_token` をセット
```json
{ "ok": true }
```

**Response 401**
```json
{ "error": "Invalid password" }
```

---

### `POST /api/admin/logout`

Cookieを削除してログアウト。

**Response 200**
```json
{ "ok": true }
```

---

### `GET /api/admin/sources`

登録済みソース一覧を取得。

**Response 200**
```json
[
  {
    "id": "uuid",
    "title": "string",
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

---

### `POST /api/admin/sources`

新しいソースを登録（チャンキング＋Embedding）。

**Request Body**
```json
{
  "title": "string",   // 必須
  "body": "string"     // 必須、テキスト本文
}
```

**Response 201**
```json
{
  "id": "uuid",
  "title": "string",
  "created_at": "..."
}
```

**Response 400**
```json
{ "error": "title and body are required" }
```

---

### `DELETE /api/admin/sources/:id`

指定IDのソースを削除（関連チャンクはCASCADEで自動削除）。

**Response 200**
```json
{ "ok": true }
```

**Response 404**
```json
{ "error": "Source not found" }
```

---

## 認証チェック

### `GET /api/auth/check`

クライアントサイドでログイン状態を確認する際に使用。

**Response 200**（ログイン済み）
```json
{ "authenticated": true }
```

**Response 401**（未ログイン）
```json
{ "authenticated": false }
```

---

## Middleware（`middleware.ts`）

`/admin/*` パスへのアクセス時に `admin_token` Cookie の JWT を検証。
検証失敗時は `/admin/login` にリダイレクト。

```
matcher: ["/admin/:path*"]
```

JWT ペイロード構造：
```json
{
  "role": "admin",
  "iat": 1234567890,
  "exp": 1234567890   // 24時間後
}
```
