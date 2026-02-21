# 開発進捗

## ステータス凡例
- [ ] 未着手
- [~] 進行中
- [x] 完了

---

## フェーズ 1: プロジェクト初期セットアップ

- [x] `npx create-next-app@latest` でプロジェクト作成（TypeScript, Tailwind, App Router）
- [x] 必要パッケージのインストール
  - `@anthropic-ai/sdk`
  - `openai`
  - `@supabase/supabase-js`
  - `jose`
- [x] `next.config.ts` に `optimizePackageImports` を設定（`docs/architecture.md` 参照）
- [x] `.env.local` を作成（APIキー設定）※各自でAPIキーを記入すること
- [x] Supabase でテーブル・関数・RLS を作成（`docs/database.md` 参照）※手動作業

---

## フェーズ 2: バックエンド（lib/）

- [x] `lib/supabase.ts` — Supabaseクライアント（anon/service role）
- [x] `lib/chunking.ts` — テキストチャンキング（500文字、50文字オーバーラップ）
- [x] `lib/embedding.ts` — OpenAI Embedding生成
- [x] `lib/claude.ts` — Claude API呼び出し（回答生成）
- [x] `lib/auth.ts` — JWT生成・検証（jose）

---

## フェーズ 3: API Routes

- [x] `POST /api/admin/login` — パスワード認証 → JWT Cookie
- [x] `POST /api/admin/logout` — Cookie削除
- [x] `GET /api/auth/check` — JWT検証
- [x] `GET /api/admin/sources` — ソース一覧
- [x] `POST /api/admin/sources` — ソース登録（チャンキング＋Embedding）
- [x] `DELETE /api/admin/sources/[id]` — ソース削除
- [x] `POST /api/ask` — Q&A（ベクター検索＋Claude）

---

## フェーズ 4: Middleware

- [x] `middleware.ts` — `/admin/*` 保護（JWT検証→未認証はloginへリダイレクト）

---

## フェーズ 5: フロントエンド

- [x] `app/page.tsx` — Q&A画面
  - 質問入力フォーム
  - 送信ボタン（ローディング表示）
  - 回答表示エリア
- [x] `app/admin/login/page.tsx` — ログイン画面
  - パスワード入力フォーム
  - エラーメッセージ表示
- [x] `app/admin/sources/page.tsx` — ソース管理画面
  - ソース一覧（タイトル・登録日・削除ボタン）
  - 新規登録フォーム（タイトル＋テキスト）
  - ログアウトボタン

---

## フェーズ 6: デプロイ

- [x] Vercel プロジェクト作成・連携
- [x] 環境変数を Vercel に設定
- [x] 動作確認（Q&A・管理画面）

---

## 課題・メモ

（開発中に発生した問題や決定事項をここに記録）

---

## 参照ドキュメント

- [要件定義](./requirement.md)
- [アーキテクチャ](./architecture.md)
- [DB設計](./database.md)
- [API仕様](./api.md)
- [Next.js ベストプラクティス](./nextjs-best-practices.md)
