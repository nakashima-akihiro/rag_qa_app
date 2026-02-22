import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { chunkText } from '@/lib/chunking'
import { generateEmbedding } from '@/lib/embedding'
import {
  fetchChannelLatest,
  fetchChannelAllVideos,
  fetchTranscript,
  TranscriptApiError,
} from '@/lib/transcriptapi'

type ImportDetail = {
  videoId: string
  title: string | null
  status: 'imported' | 'skipped' | 'failed'
  reason: 'already_registered' | 'no_captions' | 'insufficient_credits' | null
}

export async function POST(req: NextRequest) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const { channelHandle, mode = 'latest' } = (body ?? {}) as {
    channelHandle?: string
    mode?: 'latest' | 'all'
  }

  if (!channelHandle) {
    return NextResponse.json({ error: 'channelHandle is required' }, { status: 400 })
  }

  // チャンネル動画一覧を取得
  let videos
  try {
    videos = mode === 'all'
      ? await fetchChannelAllVideos(channelHandle)
      : await fetchChannelLatest(channelHandle)
  } catch (e) {
    if (e instanceof TranscriptApiError && e.code === 'insufficient_credits') {
      return NextResponse.json({ error: 'クレジットが不足しています' }, { status: 402 })
    }
    return NextResponse.json({ error: 'チャンネル情報の取得に失敗しました' }, { status: 500 })
  }

  const details: ImportDetail[] = []
  let imported = 0
  let skipped = 0
  let failed = 0

  for (const video of videos) {
    // 重複チェック
    const { data: existing } = await supabaseAdmin
      .from('sources')
      .select('id')
      .eq('url', video.url)
      .maybeSingle()

    if (existing) {
      details.push({ videoId: video.videoId, title: video.title, status: 'skipped', reason: 'already_registered' })
      skipped++
      continue
    }

    // 字幕取得
    let transcript: string
    let title: string
    try {
      const result = await fetchTranscript(video.url)
      transcript = result.transcript
      title = result.title || video.title
    } catch (e) {
      if (e instanceof TranscriptApiError) {
        if (e.code === 'insufficient_credits') {
          // クレジット不足 → 即座に中断して途中結果を返す
          details.push({ videoId: video.videoId, title: video.title, status: 'failed', reason: 'insufficient_credits' })
          failed++
          break
        }
        details.push({ videoId: video.videoId, title: video.title, status: 'failed', reason: 'no_captions' })
        failed++
        continue
      }
      details.push({ videoId: video.videoId, title: video.title, status: 'failed', reason: null })
      failed++
      continue
    }

    // ソース登録 → チャンキング → Embedding
    try {
      const { data: source, error: sourceError } = await supabaseAdmin
        .from('sources')
        .insert({ title, body: transcript, url: video.url })
        .select('id')
        .single()

      if (sourceError || !source) throw sourceError

      const chunks = chunkText(transcript)
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

      details.push({ videoId: video.videoId, title, status: 'imported', reason: null })
      imported++
    } catch {
      details.push({ videoId: video.videoId, title: video.title, status: 'failed', reason: null })
      failed++
    }
  }

  return NextResponse.json({ imported, skipped, failed, details })
}
