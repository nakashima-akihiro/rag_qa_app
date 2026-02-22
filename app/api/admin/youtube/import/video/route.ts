import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { chunkText } from '@/lib/chunking'
import { generateEmbedding } from '@/lib/embedding'
import { fetchTranscript, TranscriptApiError } from '@/lib/transcriptapi'

export async function POST(req: NextRequest) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const { videoUrl, title: customTitle } = (body ?? {}) as {
    videoUrl?: string
    title?: string
  }

  if (!videoUrl) {
    return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 })
  }

  // 動画URLを正規化してvideoIdを抽出
  const videoId = extractVideoId(videoUrl)
  if (!videoId) {
    return NextResponse.json({ error: '有効なYouTube URLまたは動画IDを入力してください' }, { status: 400 })
  }

  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`

  // 重複チェック
  const { data: existing } = await supabaseAdmin
    .from('sources')
    .select('id')
    .eq('url', canonicalUrl)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      status: 'skipped',
      reason: 'already_registered',
      videoId,
      title: null,
    })
  }

  // 字幕取得
  let result
  try {
    result = await fetchTranscript(canonicalUrl)
  } catch (e) {
    if (e instanceof TranscriptApiError) {
      return NextResponse.json({
        status: 'failed',
        reason: e.code,
        videoId,
        title: null,
      })
    }
    throw e
  }

  const title = customTitle?.trim() || result.title

  try {
    // sources テーブルに登録
    const { data: source, error: sourceError } = await supabaseAdmin
      .from('sources')
      .insert({ title, body: result.transcript, url: canonicalUrl })
      .select('id')
      .single()

    if (sourceError || !source) throw sourceError

    // チャンキング → Embedding → source_chunks 登録
    const chunks = chunkText(result.transcript)
    const embeddings = await Promise.all(chunks.map(generateEmbedding))

    const chunkRows = chunks.map((content, i) => ({
      source_id: source.id,
      content,
      embedding: embeddings[i],
    }))

    const { error: chunkError } = await supabaseAdmin
      .from('source_chunks')
      .insert(chunkRows)

    if (chunkError) throw chunkError

    return NextResponse.json({
      status: 'imported',
      reason: null,
      videoId,
      title,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to register source' }, { status: 500 })
  }
}

function extractVideoId(input: string): string | null {
  // 11文字の動画IDそのまま
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input

  try {
    const url = new URL(input)
    // https://www.youtube.com/watch?v=xxx
    const v = url.searchParams.get('v')
    if (v) return v
    // https://youtu.be/xxx
    if (url.hostname === 'youtu.be') return url.pathname.slice(1)
    // https://www.youtube.com/shorts/xxx
    const shortsMatch = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/)
    if (shortsMatch) return shortsMatch[1]
  } catch {
    // URL パース失敗
  }

  return null
}
