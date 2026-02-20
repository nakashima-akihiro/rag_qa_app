'use client'

import { useState, useTransition } from 'react'
import ReactMarkdown from 'react-markdown'

export default function Home() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return

    setAnswer(null)
    setError(null)

    startTransition(async () => {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      if (res.ok) {
        setAnswer(data.answer)
      } else {
        setError(data.error ?? '回答の生成に失敗しました')
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-8 text-center">Q&A</h1>

        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="質問を入力してください"
            rows={4}
            maxLength={500}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isPending || !question.trim()}
            className="mt-3 w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? '回答を生成中...' : '質問する'}
          </button>
        </form>

        {answer !== null ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-sm font-medium text-gray-500 mb-2">回答</p>
            <div className="prose prose-gray max-w-none text-gray-800">
              <ReactMarkdown>{answer}</ReactMarkdown>
            </div>
          </div>
        ) : null}

        {error !== null ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
