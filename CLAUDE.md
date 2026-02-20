# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

ドメイン特化型 RAG Q&A Webサービス。管理者がテキストソースを登録し、一般ユーザーが質問→回答を得る。

詳細仕様: `docs/requirement.md`

## コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# Lint
npm run lint

# 型チェック
npx tsc --noEmit
```

## アーキテクチャ

Next.js 16 App Router の単一プロジェクトでフロントエンド・バックエンドを統合。

**主要なlib/**
- `lib/supabase.ts` — Supabaseクライアント（anon key / service role key の2種）
- `lib/chunking.ts` — テキストを500文字・50文字オーバーラップでチャンキング
- `lib/embedding.ts` — OpenAI `text-embedding-3-small`（1536次元）でベクター化
- `lib/claude.ts` — `claude-sonnet-4-6` で回答生成
- `lib/auth.ts` — `jose` でJWT生成・検証

**ルーティング**
- `/` — ユーザー向けQ&A画面（認証不要）
- `/admin/login` — 管理者ログイン
- `/admin/sources` — ソース管理（JWT認証必須）
- `middleware.ts` が `/admin/*` を保護し、未認証は `/admin/login` へリダイレクト

**APIエンドポイント一覧**: `docs/api.md`

## RAG処理フロー

**ソース登録**: テキスト入力 → チャンキング → Embedding → Supabase pgvector に保存

**Q&A**: 質問 → Embedding → pgvector cosine similarity で上位5チャンク取得 → Claude に送信 → 回答返却

スコープ外の質問（関連チャンクが0件）は `"提供された情報の範囲外のため、お答えできません。"` を返す。

## データベース

Supabase PostgreSQL + pgvector。テーブル定義・RLS・ベクター検索関数のSQL: `docs/database.md`

- `sources` — ソースのメタデータ（id, title, body, created_at）
- `source_chunks` — チャンク本文 + embedding ベクター（1536次元）
- ソース削除時は `ON DELETE CASCADE` で関連チャンクも自動削除

## 環境変数

`.env.local` に設定（`docs/architecture.md` に全項目記載）:
- `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD` / `JWT_SECRET`

## ドキュメント参照

実装・調査・判断を行う際は、必要に応じて `docs/` 配下のドキュメントを参照すること。

| ドキュメント | 参照タイミング |
|-------------|--------------|
| `docs/requirement.md` | 仕様・スコープの確認 |
| `docs/architecture.md` | ディレクトリ構成・処理フロー・環境変数の確認 |
| `docs/database.md` | テーブル定義・RLS・SQL関数の確認 |
| `docs/api.md` | APIリクエスト/レスポンス仕様の確認 |
| `docs/nextjs-best-practices.md` | コード実装時のNext.js/Reactベストプラクティス確認 |
| `docs/progress.md` | 実装前の進捗確認・完了後のチェック |

## Next.js ベストプラクティス

コードを書く際は `docs/nextjs-best-practices.md` を必ず参照すること。特に以下は必須：

- **Waterfall排除**: 独立した非同期処理は `Promise.all()` で並列実行
- **バンドル最適化**: バレルインポートを避け、`optimizePackageImports` を活用
- **Server Action認証**: middleware頼みにせず、Action/Route Handler内で必ずJWT検証
- **useTransition**: Q&Aフォームなどのローディング状態管理に使用
- **条件レンダリング**: `&&` ではなく三項演算子を使う

## 開発進捗

`docs/progress.md` にフェーズ別チェックリストを管理。

- 実装に着手する前に対象タスクを確認すること
- タスクが完了したら `docs/progress.md` の該当項目を `[x]` にチェックすること
