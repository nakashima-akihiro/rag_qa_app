import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { chunkText } from '@/lib/chunking'
import { generateEmbedding } from '@/lib/embedding'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('sources')
    .select('id, title, body, created_at')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const { title, body: sourceBody } = (body ?? {}) as { title?: string; body?: string }

  if (!title || !sourceBody) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
  }

  try {
    // sourcesテーブルを更新
    const { data: source, error: updateError } = await supabaseAdmin
      .from('sources')
      .update({ title, body: sourceBody })
      .eq('id', id)
      .select('id, title, created_at')
      .single()

    if (updateError || !source) throw updateError

    // 既存チャンクを削除して再生成
    const { error: deleteError } = await supabaseAdmin
      .from('source_chunks')
      .delete()
      .eq('source_id', id)

    if (deleteError) throw deleteError

    const chunks = chunkText(sourceBody)
    const embeddings = await Promise.all(chunks.map(generateEmbedding))

    const chunkRows = chunks.map((content, i) => ({
      source_id: id,
      content,
      embedding: embeddings[i],
    }))

    const { error: chunkError } = await supabaseAdmin
      .from('source_chunks')
      .insert(chunkRows)

    if (chunkError) throw chunkError

    return NextResponse.json(source)
  } catch {
    return NextResponse.json({ error: 'Failed to update source' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { error, count } = await supabaseAdmin
    .from('sources')
    .delete({ count: 'exact' })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete source' }, { status: 500 })
  }

  if (count === 0) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
