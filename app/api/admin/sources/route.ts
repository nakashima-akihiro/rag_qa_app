import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { chunkText } from '@/lib/chunking'
import { generateEmbedding } from '@/lib/embedding'
import { fetchWebPage } from '@/lib/web'

export async function GET() {
  if (!(await verifySession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('sources')
    .select('id, title, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const { title, body: sourceBody, webUrl } = (body ?? {}) as {
    title?: string
    body?: string
    webUrl?: string
  }

  if (!title && !webUrl) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
  }

  try {
    let resolvedTitle = title ?? ''
    let resolvedBody = sourceBody ?? ''

    if (webUrl) {
      const page = await fetchWebPage(webUrl)
      resolvedBody = page.content
      if (!resolvedTitle) resolvedTitle = page.title
    }

    if (!resolvedTitle || !resolvedBody) {
      return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
    }

    // sourcesテーブルに登録
    const { data: source, error: sourceError } = await supabaseAdmin
      .from('sources')
      .insert({ title: resolvedTitle, body: resolvedBody })
      .select('id, title, created_at')
      .single()

    if (sourceError || !source) throw sourceError

    // チャンキング → 全チャンクのEmbeddingを並列生成
    const chunks = chunkText(resolvedBody)
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

    return NextResponse.json(source, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to register source'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
