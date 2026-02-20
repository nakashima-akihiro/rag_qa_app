# Next.js / React ベストプラクティス

> Vercel Engineering ガイドライン（2026年1月版）を本プロジェクト向けに抜粋。
> 優先度順に記載。実装時は必ずこのルールに従うこと。

---

## 1. Waterfallの排除 【CRITICAL】

### 独立した非同期処理は必ず並列実行

```typescript
// ❌ Bad: 3回のラウンドトリップ
const user = await fetchUser()
const posts = await fetchPosts()
const comments = await fetchComments()

// ✅ Good: 1回のラウンドトリップ
const [user, posts, comments] = await Promise.all([
  fetchUser(),
  fetchPosts(),
  fetchComments()
])
```

**本プロジェクトでの適用例:**
```typescript
// POST /api/ask: 質問のEmbedding取得とDB初期化を並列で
const [embedding, _] = await Promise.all([
  generateEmbedding(question),
  ensureConnection()
])
```

### API Routeでは Promise を早めに開始する

```typescript
// ❌ Bad: configがauthを待つ
const session = await auth()
const config = await fetchConfig()

// ✅ Good: authとconfigを並列開始
const sessionPromise = auth()
const configPromise = fetchConfig()
const session = await sessionPromise
const [config] = await Promise.all([configPromise, ...])
```

### awaitは必要なブランチまで遅らせる

```typescript
// ❌ Bad: 不要なパスでも await
const data = await fetchData()
if (earlyReturn) return { skipped: true }

// ✅ Good: 必要なときだけ fetch
if (earlyReturn) return { skipped: true }
const data = await fetchData()
```

### Suspense でストリーミング

```tsx
// ❌ Bad: ページ全体がデータ待ち
async function Page() {
  const data = await fetchData()
  return <Layout><DataDisplay data={data} /></Layout>
}

// ✅ Good: レイアウトは即時表示、データだけ待つ
function Page() {
  return (
    <Layout>
      <Suspense fallback={<Skeleton />}>
        <DataDisplay />
      </Suspense>
    </Layout>
  )
}
async function DataDisplay() {
  const data = await fetchData()
  return <div>{data}</div>
}
```

---

## 2. バンドルサイズ最適化 【CRITICAL】

### バレルファイルのインポートを避ける

```typescript
// ❌ Bad: ライブラリ全体を読み込む（200-800ms のオーバーヘッド）
import { Check, X, Menu } from 'lucide-react'

// ✅ Good: 直接インポート
import Check from 'lucide-react/dist/esm/icons/check'
import X from 'lucide-react/dist/esm/icons/x'
```

**または `next.config.ts` で自動最適化:**

```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons']
  }
}
```

### 重いコンポーネントは dynamic import

```typescript
// ✅ 初期レンダリング不要な重いコンポーネント
import dynamic from 'next/dynamic'

const HeavyEditor = dynamic(
  () => import('./HeavyEditor'),
  { ssr: false }
)
```

---

## 3. サーバーサイドパフォーマンス 【HIGH】

### Server Action / API Route は必ず内部で認証

```typescript
// ❌ Bad: middleware頼みで内部チェックなし
export async function deleteSource(id: string) {
  await db.delete(id)
}

// ✅ Good: Action内で必ず検証
export async function deleteSource(id: string) {
  const session = await verifyJwt()
  if (!session) throw new Error('Unauthorized')
  await db.delete(id)
}
```

### React.cache() でリクエスト内の重複排除

```typescript
// lib/auth.ts
import { cache } from 'react'

export const verifySession = cache(async () => {
  // 同一リクエスト内で何度呼ばれても1回だけ実行
  return await validateJwt()
})
```

### RSC境界で渡すデータは必要最小限に

```tsx
// ❌ Bad: 50フィールドをすべてシリアライズ
const source = await fetchSource() // 50 fields
return <SourceCard source={source} />

// ✅ Good: 使うフィールドだけ渡す
const source = await fetchSource()
return <SourceCard title={source.title} createdAt={source.createdAt} />
```

### コンポーネント構成でデータ取得を並列化

```tsx
// ❌ Bad: 親が全データを直列取得
async function AdminPage() {
  const sources = await fetchSources()   // 待つ
  const stats = await fetchStats()       // さらに待つ
  return <><SourceList sources={sources} /><Stats stats={stats} /></>
}

// ✅ Good: 子コンポーネントが独立して取得（並列ストリーミング）
function AdminPage() {
  return (
    <>
      <Suspense fallback={<Skeleton />}><SourceList /></Suspense>
      <Suspense fallback={<Skeleton />}><Stats /></Suspense>
    </>
  )
}
async function SourceList() {
  const sources = await fetchSources()
  return <ul>...</ul>
}
async function Stats() {
  const stats = await fetchStats()
  return <div>...</div>
}
```

---

## 4. 再レンダリング最適化 【MEDIUM】

### ローディング状態は useTransition を使う

```tsx
// ❌ Bad: 手動でローディングstate管理
const [loading, setLoading] = useState(false)
const handleSubmit = async () => {
  setLoading(true)
  await submit()
  setLoading(false)
}

// ✅ Good: useTransition
const [isPending, startTransition] = useTransition()
const handleSubmit = () => {
  startTransition(async () => {
    await submit()
  })
}
```

**本プロジェクトでの適用:** Q&Aフォームの送信ボタンのローディング表示。

### setState は関数型アップデートを使う

```tsx
// ❌ Bad: 古いstateを参照する可能性
setCount(count + 1)

// ✅ Good: 常に最新のstateを参照
setCount(prev => prev + 1)
```

---

## 5. レンダリングパフォーマンス 【MEDIUM】

### 条件レンダリングは三項演算子を使う（&&は使わない）

```tsx
// ❌ Bad: 0やfalseが意図せず描画されることがある
{items.length && <List items={items} />}

// ✅ Good: 明示的な三項演算子
{items.length > 0 ? <List items={items} /> : null}
```

### 静的JSXはコンポーネント外に切り出す

```tsx
// ❌ Bad: 毎回新しいJSXオブジェクトが生成される
function Page() {
  const header = <Header title="固定タイトル" />
  return <div>{header}<Content /></div>
}

// ✅ Good: 定数として外に出す
const HEADER = <Header title="固定タイトル" />
function Page() {
  return <div>{HEADER}<Content /></div>
}
```

---

## 参考

- [Vercel React Best Practices（フル版）](~/.claude/skills/vercel-react-best-practices/AGENTS.md)
- [Next.js 公式ドキュメント](https://nextjs.org/docs)
