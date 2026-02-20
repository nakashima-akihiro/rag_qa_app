# 開発進捗

## ステータス凡例
- [ ] 未着手
- [~] 進行中
- [x] 完了

---

## フェーズ 1: プロジェクト初期セットアップ

- [ ] `npx create-next-app@latest` でプロジェクト作成（TypeScript, Tailwind, App Router）
- [ ] 必要パッケージのインストール
  - `@anthropic-ai/sdk`
  - `openai`
  - `@supabase/supabase-js`
  - `jose`
- [ ] `next.config.ts` に `optimizePackageImports` を設定（`docs/architecture.md` 参照）
- [ ] `.env.local` を作成（APIキー設定）
- [ ] Supabase でテーブル・関数・RLS を作成（`docs/database.md` 参照）

---

## フェーズ 2: バックエンド（lib/）

- [ ] `lib/supabase.ts` — Supabaseクライアント（anon/service role）
- [ ] `lib/chunking.ts` — テキストチャンキング（500文字、50文字オーバーラップ）
- [ ] `lib/embedding.ts` — OpenAI Embedding生成
- [ ] `lib/claude.ts` — Claude API呼び出し（回答生成）
- [ ] `lib/auth.ts` — JWT生成・検証（jose）

---

## フェーズ 3: API Routes

- [ ] `POST /api/admin/login` — パスワード認証 → JWT Cookie
- [ ] `POST /api/admin/logout` — Cookie削除
- [ ] `GET /api/auth/check` — JWT検証
- [ ] `GET /api/admin/sources` — ソース一覧
- [ ] `POST /api/admin/sources` — ソース登録（チャンキング＋Embedding）
- [ ] `DELETE /api/admin/sources/[id]` — ソース削除
- [ ] `POST /api/ask` — Q&A（ベクター検索＋Claude）

---

## フェーズ 4: Middleware

- [ ] `middleware.ts` — `/admin/*` 保護（JWT検証→未認証はloginへリダイレクト）

---

## フェーズ 5: フロントエンド

- [ ] `app/page.tsx` — Q&A画面
  - 質問入力フォーム
  - 送信ボタン（ローディング表示）
  - 回答表示エリア
- [ ] `app/admin/login/page.tsx` — ログイン画面
  - パスワード入力フォーム
  - エラーメッセージ表示
- [ ] `app/admin/sources/page.tsx` — ソース管理画面
  - ソース一覧（タイトル・登録日・削除ボタン）
  - 新規登録フォーム（タイトル＋テキスト）
  - ログアウトボタン

---

## フェーズ 6: デプロイ

- [ ] Vercel プロジェクト作成・連携
- [ ] 環境変数を Vercel に設定
- [ ] 動作確認（Q&A・管理画面）

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
