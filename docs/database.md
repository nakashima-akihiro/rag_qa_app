# データベース設計

## Supabase セットアップ手順

1. supabase.com でプロジェクト作成
2. `Settings > API` から URL・Anon Key・Service Role Key を取得
3. SQL Editor で以下のSQLを実行

---

## テーブル定義

### `sources` テーブル（ソースメタデータ）

```sql
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `source_chunks` テーブル（チャンク＋ベクター）

```sql
-- pgvector 拡張を有効化
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE source_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536),  -- text-embedding-3-small の次元数
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ベクター検索用インデックス
CREATE INDEX ON source_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

---

## ベクター類似検索関数

```sql
-- 類似チャンク検索（Q&A時に使用）
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  source_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    id,
    source_id,
    content,
    1 - (embedding <=> query_embedding) AS similarity
  FROM source_chunks
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

## Row Level Security (RLS)

```sql
-- sources テーブル
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

-- anon はselectのみ（不要なら省略可）
-- 書き込みはservice_role_keyのみ許可
CREATE POLICY "service_role_only_insert" ON sources
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_role_only_delete" ON sources
  FOR DELETE TO service_role USING (true);
CREATE POLICY "public_read" ON sources
  FOR SELECT USING (true);

-- source_chunks テーブル
ALTER TABLE source_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_write" ON source_chunks
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "public_read" ON source_chunks
  FOR SELECT USING (true);
```

---

## チャンキング仕様

- 分割単位：約500文字
- オーバーラップ：50文字（前チャンクの末尾50文字を次チャンクの先頭に含める）
- 分割基準：句点（。）や改行を優先してきれいに分割

## Embeddingモデル

| 項目 | 値 |
|------|-----|
| モデル | `text-embedding-3-small` |
| 次元数 | 1536 |
| 料金 | $0.02 / 1M tokens |
