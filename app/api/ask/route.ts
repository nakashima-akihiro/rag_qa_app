import { NextRequest, NextResponse } from 'next/server'
import { generateEmbedding } from '@/lib/embedding'
import { supabase } from '@/lib/supabase'
import { streamAnswer } from '@/lib/claude'

function sseMessage(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const question = (body?.question as string | undefined)?.trim()

  if (!question) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const embedding = await generateEmbedding(question)

        const { data: chunks, error } = await supabase.rpc('match_chunks', {
          query_embedding: embedding,
          match_count: 5,
        })

        if (error) throw error

        const chunkList = chunks ?? []
        const contents = chunkList.map((c: { content: string }) => c.content)

        for await (const delta of streamAnswer(question, contents)) {
          controller.enqueue(encoder.encode(sseMessage({ type: 'text', delta })))
        }

        const sourceIds = [...new Set(chunkList.map((c: { source_id: string }) => c.source_id))]
        let sources: { id: string; title: string; url: string | null }[] = []
        if (sourceIds.length > 0) {
          const { data: sourcesData } = await supabase
            .from('sources')
            .select('id, title, url')
            .in('id', sourceIds)
          sources = sourcesData ?? []
        }

        controller.enqueue(encoder.encode(sseMessage({ type: 'sources', sources })))
        controller.enqueue(encoder.encode(sseMessage({ type: 'done' })))
      } catch (e) {
        console.error('[/api/ask]', e)
        controller.enqueue(
          encoder.encode(sseMessage({ type: 'error', error: 'Failed to generate answer' }))
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
