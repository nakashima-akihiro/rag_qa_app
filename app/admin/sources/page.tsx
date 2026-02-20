'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Source = {
  id: string
  title: string
  created_at: string
}

export default function SourcesPage() {
  const router = useRouter()
  const [sources, setSources] = useState<Source[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const fetchSources = useCallback(async () => {
    const res = await fetch('/api/admin/sources')
    if (res.ok) {
      const data = await res.json()
      setSources(data)
    }
  }, [])

  useEffect(() => {
    fetchSources()
  }, [fetchSources])

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const res = await fetch('/api/admin/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      })
      if (res.ok) {
        setTitle('')
        setBody('')
        await fetchSources()
      } else {
        const data = await res.json()
        setError(data.error ?? '登録に失敗しました')
      }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/sources/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSources(prev => prev.filter(s => s.id !== id))
      }
    })
  }

  const handleLogout = () => {
    startTransition(async () => {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.push('/admin/login')
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">ソース管理</h1>
          <button
            onClick={handleLogout}
            disabled={isPending}
            className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors"
          >
            ログアウト
          </button>
        </div>

        {/* 新規登録フォーム */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">新規登録</h2>
          <form onSubmit={handleRegister}>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">テキスト</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {error !== null ? (
              <p className="text-red-600 text-sm mb-3">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? '登録中...' : '登録する'}
            </button>
          </form>
        </div>

        {/* ソース一覧 */}
        <div className="bg-white rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 p-6 border-b border-gray-200">
            登録済みソース
          </h2>
          {sources.length === 0 ? (
            <p className="text-sm text-gray-500 p-6">登録されたソースはありません</p>
          ) : (
            <ul>
              {sources.map((source, i) => (
                <li
                  key={source.id}
                  className={`flex items-center justify-between px-6 py-4 ${
                    i < sources.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div>
                    <p className="font-medium text-gray-900">{source.title}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(source.created_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(source.id)}
                    disabled={isPending}
                    className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
