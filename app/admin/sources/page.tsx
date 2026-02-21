'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Source = {
  id: string
  title: string
  created_at: string
}

type SourceDetail = Source & { body: string }

export default function SourcesPage() {
  const router = useRouter()
  const [sources, setSources] = useState<Source[]>([])
  const [tab, setTab] = useState<'text' | 'url'>('text')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [webUrl, setWebUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [detail, setDetail] = useState<SourceDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

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
      const payload = tab === 'url'
        ? { title: title || undefined, webUrl }
        : { title, body }

      const res = await fetch('/api/admin/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setTitle('')
        setBody('')
        setWebUrl('')
        await fetchSources()
      } else {
        const data = await res.json()
        setError(data.error ?? '登録に失敗しました')
      }
    })
  }

  const handleShowDetail = async (id: string) => {
    setIsLoadingDetail(true)
    setDetail(null)
    setIsEditing(false)
    setEditError(null)
    const res = await fetch(`/api/admin/sources/${id}`)
    if (res.ok) {
      const data = await res.json()
      setDetail(data)
    }
    setIsLoadingDetail(false)
  }

  const handleStartEdit = () => {
    if (!detail) return
    setEditTitle(detail.title)
    setEditBody(detail.body)
    setEditError(null)
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!detail) return
    setIsSaving(true)
    setEditError(null)
    const res = await fetch(`/api/admin/sources/${detail.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, body: editBody }),
    })
    if (res.ok) {
      const updated = await res.json()
      setDetail({ ...detail, title: editTitle, body: editBody, ...updated })
      setSources(prev => prev.map(s => s.id === detail.id ? { ...s, title: editTitle } : s))
      setIsEditing(false)
    } else {
      const data = await res.json()
      setEditError(data.error ?? '保存に失敗しました')
    }
    setIsSaving(false)
  }

  const handleCloseModal = () => {
    setDetail(null)
    setIsEditing(false)
    setEditError(null)
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

          {/* タブ切り替え */}
          <div className="flex border border-gray-200 rounded-md overflow-hidden mb-4">
            <button
              type="button"
              onClick={() => { setTab('text'); setError(null) }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === 'text'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              テキスト
            </button>
            <button
              type="button"
              onClick={() => { setTab('url'); setError(null) }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === 'url'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              WebページURL
            </button>
          </div>

          <form onSubmit={handleRegister}>
            {tab === 'url' ? (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL
                  </label>
                  <input
                    type="url"
                    value={webUrl}
                    onChange={e => setWebUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    タイトル
                    <span className="text-gray-400 font-normal ml-1">（省略するとページタイトルを自動取得）</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            ) : (
              <>
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
              </>
            )}

            {error !== null ? (
              <p className="text-red-600 text-sm mb-3">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending
                ? tab === 'url' ? 'ページ取得・登録中...' : '登録中...'
                : '登録する'}
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
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleShowDetail(source.id)}
                      disabled={isPending}
                      className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
                    >
                      内容確認
                    </button>
                    <button
                      onClick={() => handleDelete(source.id)}
                      disabled={isPending}
                      className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
                    >
                      削除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 内容確認・編集モーダル */}
      {(isLoadingDetail || detail) ? (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={isEditing ? undefined : handleCloseModal}
        >
          <div
            className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 truncate pr-4">
                {isLoadingDetail ? '読み込み中...' : isEditing ? '編集' : detail?.title}
              </h3>
              <div className="flex items-center gap-3 flex-shrink-0">
                {detail !== null && !isEditing ? (
                  <button
                    onClick={handleStartEdit}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    編集
                  </button>
                ) : null}
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  ✕
                </button>
              </div>
            </div>

            {isLoadingDetail ? (
              <div className="px-6 py-12 text-center text-gray-400 text-sm">読み込み中...</div>
            ) : detail !== null && !isEditing ? (
              /* 確認モード */
              <>
                <div className="px-6 py-2 border-b border-gray-100 flex items-center gap-4 text-xs text-gray-400">
                  <span>{new Date(detail.created_at).toLocaleString('ja-JP')}</span>
                  <span>{detail.body.length.toLocaleString()} 文字</span>
                </div>
                <div className="px-6 py-4 overflow-y-auto flex-1">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words font-sans leading-relaxed">
                    {detail.body}
                  </pre>
                </div>
              </>
            ) : detail !== null && isEditing ? (
              /* 編集モード */
              <div className="px-6 py-4 flex flex-col gap-3 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1 flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1">本文</label>
                  <textarea
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    className="flex-1 min-h-48 w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {editError !== null ? (
                  <p className="text-red-600 text-sm">{editError}</p>
                ) : null}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !editTitle || !editBody}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSaving ? '保存中（再Embedding処理中）...' : '保存する'}
                  </button>
                  <button
                    onClick={() => { setIsEditing(false); setEditError(null) }}
                    disabled={isSaving}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
