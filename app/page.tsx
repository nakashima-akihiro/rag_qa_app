'use client'

import { useState, useTransition, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const WEATHER_CHIP = '今日の天気は？'

export default function Home() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [sources, setSources] = useState<{ id: string; title: string; url: string | null }[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isGeoLoading, setIsGeoLoading] = useState(false)
  const [quickQuestions, setQuickQuestions] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/popular-questions')
      .then(res => res.json())
      .then((data: string[]) => setQuickQuestions(data))
      .catch(() => {})
  }, [])

  const answerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const userScrolledRef = useRef(false)
  const isProgrammaticScrollRef = useRef(false)

  // ユーザーの手動スクロールのみ検知（プログラム的スクロールは無視）
  useEffect(() => {
    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return
      const distanceFromBottom =
        document.documentElement.scrollHeight - window.scrollY - window.innerHeight
      userScrolledRef.current = distanceFromBottom > 50
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToBottom = useCallback(() => {
    isProgrammaticScrollRef.current = true
    bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior })
    requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = false
    })
  }, [])

  const scrollToSuggestions = useCallback(() => {
    // 2フレーム待ってDOMが確定してからスクロール
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isProgrammaticScrollRef.current = true
        window.scrollTo({ top: 999999, behavior: 'smooth' })
        setTimeout(() => {
          isProgrammaticScrollRef.current = false
        }, 800)
      })
    })
  }, [])

  // ストリーミング中、手動スクロール済みでなければ最下部へ追従
  useEffect(() => {
    if (answer !== null && !userScrolledRef.current) {
      scrollToBottom()
    }
  }, [answer, scrollToBottom])

  // 回答が出揃い「次に聞く」が表示されたらそこへスクロール
  useEffect(() => {
    if (suggestions.length > 0) {
      scrollToSuggestions()
    }
  }, [suggestions, scrollToSuggestions])

  const submitQuestion = (q: string, coords?: { lat: number; lon: number }) => {
    if (!q.trim()) return

    userScrolledRef.current = false
    setQuestion(q)
    setAnswer('')
    setSources([])
    setSuggestions([])
    setError(null)

    startTransition(async () => {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, ...coords }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data.error as string) ?? '回答の生成に失敗しました')
        return
      }

      if (!res.body) {
        setError('回答の生成に失敗しました')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6)) as {
                  type: string
                  delta?: string
                  sources?: { id: string; title: string; url: string | null }[]
                  suggestions?: string[]
                  error?: string
                }
                if (data.type === 'text' && data.delta) {
                  setAnswer(prev => (prev ?? '') + data.delta)
                } else if (data.type === 'sources' && data.sources) {
                  setSources(data.sources)
                } else if (data.type === 'suggestions' && data.suggestions) {
                  setSuggestions(data.suggestions)
                } else if (data.type === 'error' && data.error) {
                  setError(data.error)
                  setAnswer(null)
                }
              } catch {
                // JSON parse 失敗は無視
              }
            }
          }
        }
      } catch {
        setError('回答の取得中にエラーが発生しました')
        setAnswer(null)
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitQuestion(question)
  }

  const handleGeoQuestion = async (q: string) => {
    if (!navigator.geolocation) {
      setError('このブラウザでは位置情報がサポートされていません')
      return
    }
    setIsGeoLoading(true)
    setError(null)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, maximumAge: 60000 })
      })
      const { latitude: lat, longitude } = position.coords
      setIsGeoLoading(false)
      submitQuestion(q, { lat, lon: longitude })
    } catch {
      setIsGeoLoading(false)
      setError('位置情報の取得に失敗しました。ブラウザの位置情報アクセスを許可してください。')
    }
  }

  const handleWeatherQuestion = () => {
    const month = new Date().getMonth() + 1
    const season = month >= 3 && month <= 5 ? '春' : month >= 6 && month <= 8 ? '夏' : month >= 9 && month <= 11 ? '秋' : '冬'
    handleGeoQuestion(`今日（${month}月・${season}）のおすすめのバス釣りを教えて`)
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: '#eef6fa', paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
    >
      {/* 固定ヘッダー */}
      <header
        className="fixed top-0 left-0 right-0 z-10"
        style={{ background: '#eef6fa', borderBottom: '1px solid #d0e8f4' }}
      >
        <div className="h-1" style={{ background: '#00A8E8' }} />
        <div className="px-4 py-3 flex items-baseline gap-3">
          <h1 className="text-xl font-black italic" style={{ color: '#0d1e2a' }}>
            バス釣り <span style={{ color: '#00A8E8' }}>Q&A</span>
          </h1>
          <span className="text-xs tracking-widest uppercase hidden sm:block" style={{ color: '#7aaabf' }}>
            For All Mad Anglers.
          </span>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="pt-20 px-4 max-w-xl mx-auto">

        {/* 今日のおすすめ釣りボタン */}
        <button
          type="button"
          onClick={handleWeatherQuestion}
          disabled={isPending || isGeoLoading}
          className="w-full rounded-2xl mb-5 text-left transition-opacity disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, #00A8E8 0%, #0072b1 100%)',
            padding: '16px 20px',
            boxShadow: '0 4px 16px rgba(0,168,232,0.35)',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎣</span>
            <div className="flex-1">
              <p className="font-black text-base leading-tight" style={{ color: '#ffffff' }}>
                今日のおすすめ釣りを教えて
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {isGeoLoading ? '📍 現在地を取得中...' : '現在地の天候をもとにAIがアドバイス'}
              </p>
            </div>
            <span className="text-2xl">{isGeoLoading ? '⏳' : '🌤️'}</span>
          </div>
        </button>

        {/* クイック質問チップ */}
        <div className="mb-4">
          <p className="text-xs font-semibold mb-2" style={{ color: '#7aaabf' }}>よくある質問</p>
          <div
            className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4"
            style={{ scrollbarWidth: 'none' }}
          >
            {[WEATHER_CHIP, ...quickQuestions].map(q => (
              <button
                key={q}
                type="button"
                disabled={isPending || isGeoLoading}
                onClick={() => q === WEATHER_CHIP ? handleGeoQuestion('今日の天気を教えて') : setQuestion(q)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors disabled:opacity-60"
                style={{
                  background: q === WEATHER_CHIP ? '#0072b1' : question === q ? '#00A8E8' : '#ffffff',
                  color: q === WEATHER_CHIP || question === q ? '#ffffff' : '#0d1e2a',
                  border: `1px solid ${q === WEATHER_CHIP ? '#0072b1' : question === q ? '#00A8E8' : '#c0d8e8'}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {q === WEATHER_CHIP ? `🌤️ ${q}` : q}
              </button>
            ))}
          </div>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="mb-5">
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="例：ラバージグのカラー選びはどうすれば？"
            rows={3}
            maxLength={500}
            className="w-full px-4 py-3 resize-none focus:outline-none rounded-xl"
            style={{
              background: '#ffffff',
              color: '#0d1e2a',
              border: '1px solid #c0d8e8',
              fontFamily: 'inherit',
              fontSize: '16px', // iOS zoom防止
              lineHeight: '1.5',
            }}
          />
          <button
            type="submit"
            disabled={isPending || !question.trim()}
            className="mt-3 w-full rounded-xl font-bold tracking-wide transition-colors"
            style={{
              padding: '14px',
              fontSize: '1rem',
              background: isPending || !question.trim() ? '#c8dde8' : '#00A8E8',
              color: isPending || !question.trim() ? '#7a9aaa' : '#ffffff',
              border: 'none',
              cursor: isPending || !question.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {isPending ? '回答を生成中...' : '質問する'}
          </button>
        </form>

        {/* 回答 */}
        {answer !== null ? (
          <div
            ref={answerRef}
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid #c0d8e8' }}
          >
            <div className="h-1" style={{ background: '#00A8E8' }} />
            <div className="px-4 py-4" style={{ background: '#ffffff' }}>
              <p className="text-xs font-bold mb-3 tracking-widest uppercase" style={{ color: '#00A8E8' }}>
                Answer
              </p>
              <div className="prose prose-sm max-w-none" style={{ color: '#0d1e2a', fontSize: '15px', lineHeight: '1.7' }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-3">
                        <table className="w-full border-collapse text-sm">{children}</table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="px-3 py-2 text-left font-semibold border" style={{ background: '#eef6fa', borderColor: '#c0d8e8' }}>{children}</th>
                    ),
                    td: ({ children }) => (
                      <td className="px-3 py-2 border" style={{ borderColor: '#c0d8e8' }}>{children}</td>
                    ),
                    tr: ({ children }) => (
                      <tr className="even:bg-blue-50/30">{children}</tr>
                    ),
                  }}
                >{answer}</ReactMarkdown>
              </div>

              {sources.length > 0 ? (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid #d8eaf4' }}>
                  <p className="text-xs font-bold mb-2 tracking-widest uppercase" style={{ color: '#7aaabf' }}>
                    Sources
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {sources.map(source => (
                      <li key={source.id} className="text-sm" style={{ color: '#4a6a80' }}>
                        {source.url !== null ? (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            style={{ color: '#00A8E8' }}
                          >
                            · {source.title}
                          </a>
                        ) : (
                          <span>· {source.title}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* 関連質問サジェスト */}
        {suggestions.length > 0 && !isPending ? (
          <div ref={suggestionsRef} className="mt-4">
            <p className="text-xs font-semibold mb-2" style={{ color: '#7aaabf' }}>次に聞く</p>
            <div
              className="flex flex-col gap-2"
            >
              {suggestions.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submitQuestion(s)}
                  className="text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    background: '#ffffff',
                    color: '#0d1e2a',
                    border: '1px solid #c0d8e8',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* エラー */}
        {error !== null ? (
          <div
            className="rounded-xl px-4 py-3"
            style={{ background: '#fff0f0', border: '1px solid #f0c0c0' }}
          >
            <p className="text-sm" style={{ color: '#c03030' }}>{error}</p>
          </div>
        ) : null}

        {/* スクロール追従用センチネル */}
        <div ref={bottomRef} />

      </main>
    </div>
  )
}
