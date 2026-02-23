'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Source = {
  id: string
  title: string
  created_at: string
}

type SourceDetail = Source & { body: string }

type ImportDetail = {
  videoId: string
  title: string | null
  status: 'imported' | 'skipped' | 'failed'
  reason: 'already_registered' | 'no_captions' | 'insufficient_credits' | 'api_error' | null
}

type ChannelImportResult = {
  imported: number
  skipped: number
  failed: number
  details: ImportDetail[]
}

export default function SourcesPage() {
  const router = useRouter()
  const [sources, setSources] = useState<Source[]>([])
  const [tab, setTab] = useState<'text' | 'url' | 'youtube'>('text')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [webUrl, setWebUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // モーダル
  const [detail, setDetail] = useState<SourceDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // YouTube タブ
  const [youtubeSubTab, setYoutubeSubTab] = useState<'video' | 'channel'>('video')
  // 単一動画
  const [ytVideoUrl, setYtVideoUrl] = useState('')
  const [ytVideoTitle, setYtVideoTitle] = useState('')
  const [ytVideoResult, setYtVideoResult] = useState<{ status: string; title: string | null; reason: 'no_captions' | 'insufficient_credits' | 'api_error' | null } | null>(null)
  const [ytVideoError, setYtVideoError] = useState<string | null>(null)
  const [isYtVideoLoading, setIsYtVideoLoading] = useState(false)
  // チャンネル一括
  const [ytChannel, setYtChannel] = useState('@d-chan4997')
  const [ytChannelMode, setYtChannelMode] = useState<'latest' | 'all'>('latest')
  const [ytChannelResult, setYtChannelResult] = useState<ChannelImportResult | null>(null)
  const [ytChannelError, setYtChannelError] = useState<string | null>(null)
  const [isYtChannelLoading, setIsYtChannelLoading] = useState(false)

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

  const handleYtVideoImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setYtVideoResult(null)
    setYtVideoError(null)
    setIsYtVideoLoading(true)

    const res = await fetch('/api/admin/youtube/import/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl: ytVideoUrl, title: ytVideoTitle || undefined }),
    })

    const data = await res.json()

    if (!res.ok) {
      setYtVideoError(data.error ?? 'インポートに失敗しました')
    } else {
      setYtVideoResult(data)
      if (data.status === 'imported') {
        setYtVideoUrl('')
        setYtVideoTitle('')
        await fetchSources()
      }
    }
    setIsYtVideoLoading(false)
  }

  const handleYtChannelImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setYtChannelResult(null)
    setYtChannelError(null)
    setIsYtChannelLoading(true)

    const res = await fetch('/api/admin/youtube/import/channel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelHandle: ytChannel, mode: ytChannelMode }),
    })

    const data = await res.json()

    if (!res.ok) {
      setYtChannelError(data.error ?? 'インポートに失敗しました')
    } else {
      setYtChannelResult(data)
      if (data.imported > 0) await fetchSources()
    }
    setIsYtChannelLoading(false)
  }

  const handleOpenModal = async (id: string) => {
    setIsLoadingDetail(true)
    setDetail(null)
    setEditError(null)
    const res = await fetch(`/api/admin/sources/${id}`)
    if (res.ok) {
      const data: SourceDetail = await res.json()
      setDetail(data)
      setEditTitle(data.title)
      setEditBody(data.body)
    }
    setIsLoadingDetail(false)
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
    } else {
      const data = await res.json()
      setEditError(data.error ?? '保存に失敗しました')
    }
    setIsSaving(false)
  }

  const handleCloseModal = () => {
    setDetail(null)
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
          <div className="flex items-center gap-4">
            <a
              href="/admin/questions"
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              質問ログ
            </a>
            <button
              onClick={handleLogout}
              disabled={isPending}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>

        {/* 新規登録フォーム */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">新規登録</h2>

          {/* メインタブ */}
          <div className="flex border border-gray-200 rounded-md overflow-hidden mb-4">
            <button
              type="button"
              onClick={() => { setTab('text'); setError(null) }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === 'text' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              テキスト
            </button>
            <button
              type="button"
              onClick={() => { setTab('url'); setError(null) }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === 'url' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              WebページURL
            </button>
            <button
              type="button"
              onClick={() => { setTab('youtube'); setError(null) }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === 'youtube' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              YouTube
            </button>
          </div>

          {tab === 'youtube' ? (
            <div>
              {/* YouTubeサブタブ */}
              <div className="flex border border-gray-100 rounded-md overflow-hidden mb-4 bg-gray-50">
                <button
                  type="button"
                  onClick={() => { setYoutubeSubTab('video'); setYtVideoResult(null); setYtVideoError(null) }}
                  className={`flex-1 py-1.5 text-sm transition-colors ${
                    youtubeSubTab === 'video' ? 'bg-white text-gray-900 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  単一動画
                </button>
                <button
                  type="button"
                  onClick={() => { setYoutubeSubTab('channel'); setYtChannelResult(null); setYtChannelError(null) }}
                  className={`flex-1 py-1.5 text-sm transition-colors ${
                    youtubeSubTab === 'channel' ? 'bg-white text-gray-900 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  チャンネル一括
                </button>
              </div>

              {youtubeSubTab === 'video' ? (
                <form onSubmit={handleYtVideoImport}>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">動画URL</label>
                    <input
                      type="text"
                      value={ytVideoUrl}
                      onChange={e => setYtVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">YouTube URL・短縮URL・動画ID（11文字）のいずれも可</p>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      タイトル
                      <span className="text-gray-400 font-normal ml-1">（省略すると動画タイトルを自動取得）</span>
                    </label>
                    <input
                      type="text"
                      value={ytVideoTitle}
                      onChange={e => setYtVideoTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {ytVideoError !== null ? (
                    <p className="text-red-600 text-sm mb-3">{ytVideoError}</p>
                  ) : null}

                  {ytVideoResult !== null ? (
                    <div className={`text-sm mb-3 px-3 py-2 rounded-md ${
                      ytVideoResult.status === 'imported' ? 'bg-green-50 text-green-700' :
                      ytVideoResult.status === 'skipped' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {ytVideoResult.status === 'imported' && `「${ytVideoResult.title}」を登録しました`}
                      {ytVideoResult.status === 'skipped' && 'この動画はすでに登録済みです'}
                      {ytVideoResult.status === 'failed' && ytVideoResult.reason === 'no_captions' && '字幕が見つかりませんでした'}
                      {ytVideoResult.status === 'failed' && ytVideoResult.reason === 'insufficient_credits' && 'クレジットが不足しています'}
                      {ytVideoResult.status === 'failed' && ytVideoResult.reason === 'api_error' && 'APIキーが無効です。TRANSCRIPT_API_KEYを確認してください'}
                      {ytVideoResult.status === 'failed' && ytVideoResult.reason === null && 'インポートに失敗しました'}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isYtVideoLoading}
                    className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {isYtVideoLoading ? '字幕取得・登録中...' : 'インポートする'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleYtChannelImport}>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">チャンネル</label>
                    <input
                      type="text"
                      value={ytChannel}
                      onChange={e => setYtChannel(e.target.value)}
                      placeholder="@channel-handle"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">取得範囲</label>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="ytChannelMode"
                          value="latest"
                          checked={ytChannelMode === 'latest'}
                          onChange={() => setYtChannelMode('latest')}
                          className="text-blue-600"
                        />
                        <span className="text-sm text-gray-700">最新15件のみ</span>
                        <span className="text-xs text-green-600 font-medium">（無料）</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="ytChannelMode"
                          value="all"
                          checked={ytChannelMode === 'all'}
                          onChange={() => setYtChannelMode('all')}
                          className="text-blue-600"
                        />
                        <span className="text-sm text-gray-700">全件取得</span>
                        <span className="text-xs text-orange-500 font-medium">（クレジット消費）</span>
                      </label>
                    </div>
                  </div>

                  {ytChannelError !== null ? (
                    <p className="text-red-600 text-sm mb-3">{ytChannelError}</p>
                  ) : null}

                  {ytChannelResult !== null ? (
                    <div className="mb-3 border border-gray-200 rounded-md overflow-hidden">
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex gap-4 text-sm">
                        <span className="text-green-600 font-medium">登録: {ytChannelResult.imported}件</span>
                        <span className="text-yellow-600 font-medium">スキップ: {ytChannelResult.skipped}件</span>
                        <span className="text-red-600 font-medium">失敗: {ytChannelResult.failed}件</span>
                      </div>
                      <ul className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                        {ytChannelResult.details.map(d => (
                          <li key={d.videoId} className="px-3 py-2 flex items-center gap-2 text-sm">
                            <span className={
                              d.status === 'imported' ? 'text-green-600' :
                              d.status === 'skipped' ? 'text-yellow-600' :
                              'text-red-500'
                            }>
                              {d.status === 'imported' ? '✓' : d.status === 'skipped' ? '–' : '✗'}
                            </span>
                            <span className="text-gray-700 truncate flex-1">{d.title ?? d.videoId}</span>
                            {d.reason === 'already_registered' ? (
                              <span className="text-xs text-gray-400 flex-shrink-0">登録済み</span>
                            ) : d.reason === 'no_captions' ? (
                              <span className="text-xs text-gray-400 flex-shrink-0">字幕なし</span>
                            ) : d.reason === 'insufficient_credits' ? (
                              <span className="text-xs text-orange-500 flex-shrink-0">クレジット不足</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isYtChannelLoading}
                    className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {isYtChannelLoading ? 'インポート中...' : 'インポート実行'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleRegister}>
              {tab === 'url' ? (
                <>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
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
          )}
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
                      onClick={() => handleOpenModal(source.id)}
                      disabled={isPending}
                      className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
                    >
                      確認・編集
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

      {/* 確認・編集モーダル */}
      {(isLoadingDetail || detail) ? (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={isSaving ? undefined : handleCloseModal}
        >
          <div
            className="bg-white rounded-lg w-full max-w-2xl h-[88vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <span className="text-sm font-medium text-gray-500">確認・編集</span>
              <button
                onClick={handleCloseModal}
                disabled={isSaving}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                読み込み中...
              </div>
            ) : detail !== null ? (
              <>
                {/* 編集フォーム */}
                <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                  <div className="flex items-center gap-3 text-xs text-gray-400 -mb-1">
                    <span>{new Date(detail.created_at).toLocaleString('ja-JP')}</span>
                    <span>{editBody.length.toLocaleString()} 文字</span>
                  </div>
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
                      className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ minHeight: '400px' }}
                    />
                  </div>
                </div>

                {/* フッター */}
                <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
                  {editError !== null ? (
                    <p className="text-red-600 text-sm mb-3">{editError}</p>
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !editTitle || !editBody}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSaving ? '保存中（Embedding再生成中）...' : '保存する'}
                    </button>
                    <button
                      onClick={handleCloseModal}
                      disabled={isSaving}
                      className="px-5 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
