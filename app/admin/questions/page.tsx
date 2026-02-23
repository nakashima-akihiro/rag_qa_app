'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Question = {
  id: string
  question: string
  answer: string
  is_out_of_scope: boolean
  created_at: string
}

type Filter = 'all' | 'answered' | 'out_of_scope'

export default function QuestionsPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/questions')
      .then(res => {
        if (res.status === 401) {
          router.push('/admin/login')
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data) setQuestions(data)
        setIsLoading(false)
      })
  }, [router])

  const filtered = questions.filter(q => {
    if (filter === 'answered') return !q.is_out_of_scope
    if (filter === 'out_of_scope') return q.is_out_of_scope
    return true
  })

  const outOfScopeCount = questions.filter(q => q.is_out_of_scope).length

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">質問ログ</h1>
            <p className="text-sm text-gray-500 mt-0.5">直近200件</p>
          </div>
          <button
            onClick={() => router.push('/admin/sources')}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← ソース管理
          </button>
        </div>

        {/* サマリー */}
        {!isLoading && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{questions.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">総質問数</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-green-600">{questions.length - outOfScopeCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">回答済み</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-red-500">{outOfScopeCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">スコープ外</p>
            </div>
          </div>
        )}

        {/* フィルター */}
        <div className="flex border border-gray-200 rounded-md overflow-hidden mb-4 bg-white">
          {(['all', 'answered', 'out_of_scope'] as Filter[]).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                filter === f ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'すべて' : f === 'answered' ? '回答済み' : 'スコープ外'}
            </button>
          ))}
        </div>

        {/* リスト */}
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {isLoading ? (
            <p className="text-sm text-gray-400 p-6">読み込み中...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 p-6">該当する質問はありません</p>
          ) : (
            filtered.map(q => (
              <div key={q.id} className="px-5 py-4">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded ${
                      q.is_out_of_scope
                        ? 'bg-red-100 text-red-600'
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {q.is_out_of_scope ? '範囲外' : 'OK'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-snug">{q.question}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(q.created_at).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    <span className="text-gray-300 text-sm flex-shrink-0">
                      {expanded === q.id ? '▲' : '▼'}
                    </span>
                  </div>
                </button>

                {expanded === q.id && (
                  <div className="mt-3 ml-9 pl-3 border-l-2 border-gray-200">
                    <p className="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed">{q.answer}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
