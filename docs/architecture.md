# アーキテクチャ概要

## 技術スタック

| 役割 | 採用技術 |
|------|----------|
| フロントエンド | Next.js 16 (App Router) + TypeScript + Tailwind CSS |
| バックエンド | Next.js API Routes（同一プロジェクト） |
| LLM（回答生成） | Claude API (`claude-sonnet-4-6`) |
| Embedding | OpenAI `text-embedding-3-small` |
| データベース | Supabase PostgreSQL |
| ベクターDB | Supabase pgvector |
| 管理者認証 | JWTクッキー（`jose`ライブラリ） |
| デプロイ | Vercel |

---

## ディレクトリ構成

```
rag-qa-app/
├── app/
│   ├── page.tsx                    # Q&A画面（ユーザー向け）
│   ├── layout.tsx
│   ├── admin/
│   │   ├── login/
│   │   │   └── page.tsx            # 管理者ログイン画面
│   │   └── sources/
│   │       └── page.tsx            # ソース管理画面
│   └── api/
│       ├── ask/
│       │   └── route.ts            # POST /api/ask（Q&A処理）
│       ├── admin/
│       │   ├── login/
│       │   │   └── route.ts        # POST /api/admin/login
│       │   ├── logout/
│       │   │   └── route.ts        # POST /api/admin/logout
│       │   └── sources/
│       │       └── route.ts        # GET/POST/DELETE /api/admin/sources
│       └── auth/
│           └── check/
│               └── route.ts        # GET /api/auth/check（JWT検証）
├── lib/
│   ├── supabase.ts                 # Supabaseクライアント初期化
│   ├── embedding.ts                # OpenAI Embedding処理
│   ├── chunking.ts                 # テキストチャンキング
│   ├── claude.ts                   # Claude API呼び出し
│   └── auth.ts                     # JWT生成・検証（jose）
├── middleware.ts                   # /admin/* 保護
├── docs/
│   ├── requirement.md
│   ├── architecture.md             # このファイル
│   ├── database.md                 # DBスキーマ・セットアップ
│   ├── api.md                      # APIエンドポイント仕様
│   └── progress.md                 # 開発進捗
├── .env.local                      # 環境変数（gitignore対象）
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 処理フロー

### ソース登録フロー

```
管理者 → POST /api/admin/sources
  → テキストを約500文字ずつチャンキング（lib/chunking.ts）
  → 各チャンクをOpenAI Embeddingでベクター化（lib/embedding.ts）
  → Supabase `source_chunks` テーブルにupsert
  → `sources` テーブルにメタデータ保存
```

### Q&Aフロー

```
ユーザー → POST /api/ask { question }
  → 質問をOpenAI Embeddingでベクター化
  → pgvector cosine_similarity で上位5チャンクを検索
  → 質問 + コンテキスト をClaudeに送信（lib/claude.ts）
  → 回答テキストを返却
```

### 管理者認証フロー

```
POST /api/admin/login { password }
  → 環境変数 ADMIN_PASSWORD と比較
  → 一致したらJWTを生成 → HttpOnly Cookieにセット
  → middleware.tsで /admin/* アクセス時にJWT検証
```

---

## 環境変数

`.env.local` に以下を設定：

```env
# Anthropic
ANTHROPIC_API_KEY=

# OpenAI（Embeddingのみ）
OPENAI_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# 管理者認証
ADMIN_PASSWORD=
JWT_SECRET=
```
