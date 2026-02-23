import Link from 'next/link'

export const metadata = {
  title: 'このサービスについて | BASS FISHING Q&A',
  description: 'バス釣りに特化したAI Q&Aサービスの仕組みと使い方',
}

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#eef6fa' }}>
      <header
        className="sticky top-0 left-0 right-0 z-10"
        style={{ background: '#eef6fa', borderBottom: '1px solid #d0e8f4' }}
      >
        <div className="h-1" style={{ background: '#00A8E8' }} />
        <div className="px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-black italic hover:opacity-80 transition-opacity"
            style={{ color: '#0d1e2a' }}
          >
            バス釣り <span style={{ color: '#00A8E8' }}>Q&A</span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: '#00A8E8', border: '1px solid #00A8E8' }}
          >
            質問する
          </Link>
        </div>
      </header>

      <main className="px-4 py-8 max-w-xl mx-auto pb-16">
        <h1
          className="text-2xl font-black mb-2"
          style={{ color: '#0d1e2a' }}
        >
          このサービスについて
        </h1>
        <p className="text-sm mb-8" style={{ color: '#4a6a80' }}>
          バス釣りに特化したAI Q&Aの仕組みと使い方をご説明します。
        </p>

        <section className="mb-8">
          <h2
            className="text-sm font-bold tracking-widest uppercase mb-3"
            style={{ color: '#00A8E8' }}
          >
            サービス概要
          </h2>
          <div
            className="rounded-xl px-4 py-4"
            style={{ background: '#ffffff', border: '1px solid #c0d8e8' }}
          >
            <p className="text-sm leading-relaxed mb-3" style={{ color: '#0d1e2a' }}>
              本サービスは<strong>バス釣りに特化したAI Q&A</strong>です。
              登録されたテキスト（ルアー解説・釣り方・フィールド情報など）をもとに、
              質問に答えます。
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#0d1e2a' }}>
              ログイン不要で、誰でもURLにアクセスするだけで質問→回答を得られます。
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2
            className="text-sm font-bold tracking-widest uppercase mb-3"
            style={{ color: '#00A8E8' }}
          >
            できること
          </h2>
          <ul
            className="rounded-xl px-4 py-4 space-y-2"
            style={{ background: '#ffffff', border: '1px solid #c0d8e8' }}
          >
            <li className="text-sm flex gap-2" style={{ color: '#0d1e2a' }}>
              <span style={{ color: '#00A8E8' }}>·</span>
              ルアー・リグの選び方や使い方の質問
            </li>
            <li className="text-sm flex gap-2" style={{ color: '#0d1e2a' }}>
              <span style={{ color: '#00A8E8' }}>·</span>
              季節・フィールドに合わせた釣り方の相談
            </li>
            <li className="text-sm flex gap-2" style={{ color: '#0d1e2a' }}>
              <span style={{ color: '#00A8E8' }}>·</span>
              現在地の天気をもとにした「今日のおすすめ釣り」のアドバイス
            </li>
            <li className="text-sm flex gap-2" style={{ color: '#0d1e2a' }}>
              <span style={{ color: '#00A8E8' }}>·</span>
              回答後に表示される「次に聞く」質問からの深掘り
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2
            className="text-sm font-bold tracking-widest uppercase mb-3"
            style={{ color: '#00A8E8' }}
          >
            回答の仕組み
          </h2>
          <div
            className="rounded-xl px-4 py-4"
            style={{ background: '#ffffff', border: '1px solid #c0d8e8' }}
          >
            <p className="text-sm leading-relaxed mb-3" style={{ color: '#0d1e2a' }}>
              質問文はAIが理解しやすい形（ベクター）に変換され、
              登録済みのテキストのなかから<strong>関連する部分だけ</strong>を自動で検索します。
              その内容を踏まえてAIが回答を生成するため、
              登録された情報の範囲内で正確な答えが返ります。
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#0d1e2a' }}>
              登録されていない話題や範囲外の質問には
              「提供された情報の範囲外のため、お答えできません。」と返答します。
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2
            className="text-sm font-bold tracking-widest uppercase mb-3"
            style={{ color: '#00A8E8' }}
          >
            ご利用上の注意
          </h2>
          <ul
            className="rounded-xl px-4 py-4 space-y-2"
            style={{ background: '#ffffff', border: '1px solid #c0d8e8' }}
          >
            <li className="text-sm flex gap-2" style={{ color: '#0d1e2a' }}>
              <span style={{ color: '#7aaabf' }}>·</span>
              回答は毎回独立しています（会話の続きは引き継がれません）
            </li>
            <li className="text-sm flex gap-2" style={{ color: '#0d1e2a' }}>
              <span style={{ color: '#7aaabf' }}>·</span>
              内容は登録されたソースに依存するため、分野外の質問には答えられません
            </li>
            <li className="text-sm flex gap-2" style={{ color: '#0d1e2a' }}>
              <span style={{ color: '#7aaabf' }}>·</span>
              天気・おすすめ釣りは現在地情報を使用します（許可するとより精度が上がります）
            </li>
          </ul>
        </section>

        <div className="flex justify-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl font-bold w-full max-w-xs py-3 transition-colors"
            style={{
              background: '#00A8E8',
              color: '#ffffff',
              border: 'none',
            }}
          >
            質問を始める
          </Link>
        </div>
      </main>
    </div>
  )
}
