import { NextRequest, NextResponse } from 'next/server'
import { generateEmbedding } from '@/lib/embedding'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { streamAnswer, generateSuggestions, OUT_OF_SCOPE_MESSAGE } from '@/lib/claude'

function sseMessage(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

const WEATHER_CODE_MAP: Record<number, string> = {
  0: '快晴', 1: 'ほぼ晴れ', 2: '一部曇り', 3: '曇り',
  45: '霧', 48: '霧',
  51: '霧雨(弱)', 53: '霧雨', 55: '霧雨(強)',
  61: '小雨', 63: '雨', 65: '大雨',
  71: '小雪', 73: '雪', 75: '大雪',
  80: 'にわか雨(弱)', 81: 'にわか雨', 82: 'にわか雨(強)',
  95: '雷雨', 96: '激しい雷雨', 99: '激しい雷雨',
}

async function fetchWeatherContext(lat: number, lon: number): Promise<string | undefined> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code&hourly=temperature_2m,weather_code,precipitation_probability&timezone=auto&forecast_days=1`
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return undefined
    const data = await res.json()
    const c = data.current
    const weatherDesc = WEATHER_CODE_MAP[c.weather_code as number] ?? '不明'

    const hourlyLines = [6, 9, 12, 15, 18, 21].map(h => {
      const temp = (data.hourly.temperature_2m as number[])[h]
      const code = (data.hourly.weather_code as number[])[h]
      const precip = (data.hourly.precipitation_probability as number[])[h]
      const desc = WEATHER_CODE_MAP[code] ?? '不明'
      return `${String(h).padStart(2, '0')}時: ${desc} ${temp}°C 降水確率${precip}%`
    }).join('\n')

    return `天気: ${weatherDesc}\n気温: ${c.temperature_2m}°C\n湿度: ${c.relative_humidity_2m}%\n風速: ${c.wind_speed_10m} km/h\n降水量: ${c.precipitation} mm\n\n【時間帯別予報】\n${hourlyLines}`
  } catch {
    return undefined
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const question = (body?.question as string | undefined)?.trim()
  const lat = typeof body?.lat === 'number' ? body.lat : undefined
  const lon = typeof body?.lon === 'number' ? body.lon : undefined

  if (!question) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const [embedding, weatherContext] = await Promise.all([
          generateEmbedding(question),
          lat !== undefined && lon !== undefined ? fetchWeatherContext(lat, lon) : Promise.resolve(undefined),
        ])

        const { data: chunks, error } = await supabase.rpc('match_chunks', {
          query_embedding: embedding,
          match_count: 5,
        })

        if (error) throw error

        const chunkList = chunks ?? []
        const contents = chunkList.map((c: { content: string }) => c.content)

        let fullAnswer = ''
        for await (const delta of streamAnswer(question, contents, weatherContext)) {
          controller.enqueue(encoder.encode(sseMessage({ type: 'text', delta })))
          fullAnswer += delta
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

        if (contents.length > 0 && fullAnswer !== OUT_OF_SCOPE_MESSAGE) {
          const suggestions = await generateSuggestions(question, fullAnswer, contents)
          if (suggestions.length > 0) {
            controller.enqueue(encoder.encode(sseMessage({ type: 'suggestions', suggestions })))
          }
        }

        controller.enqueue(encoder.encode(sseMessage({ type: 'done' })))

        // 質問ログを非同期保存（ストリームをブロックしない）
        supabaseAdmin.from('questions').insert({
          question,
          answer: fullAnswer,
          is_out_of_scope: (contents.length === 0 && !weatherContext) || fullAnswer === OUT_OF_SCOPE_MESSAGE,
        }).then(({ error }) => {
          if (error) console.error('[questions log]', error)
        })
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
