import { NextRequest, NextResponse } from 'next/server'
import { generateEmbedding } from '@/lib/embedding'
import { supabase } from '@/lib/supabase'
import { generateAnswer } from '@/lib/claude'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const question = (body?.question as string | undefined)?.trim()

  if (!question) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 })
  }

  try {
    const embedding = await generateEmbedding(question)

    const { data: chunks, error } = await supabase.rpc('match_chunks', {
      query_embedding: embedding,
      match_count: 5,
    })

    if (error) throw error

    const contents = (chunks ?? []).map((c: { content: string }) => c.content)
    const answer = await generateAnswer(question, contents)

    return NextResponse.json({ answer })
  } catch (e) {
    console.error('[/api/ask]', e)
    return NextResponse.json({ error: 'Failed to generate answer' }, { status: 500 })
  }
}
