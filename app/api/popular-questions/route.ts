import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('questions')
    .select('question')
    .eq('is_out_of_scope', false)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json([])
  }

  const WEATHER_KEYWORDS = ['天気', '気温', '天候', '気象', '風速', '降水', '晴れ', '雨', '雪', '曇り']
  const isWeatherQuestion = (q: string) => WEATHER_KEYWORDS.some(kw => q.includes(kw))

  const seen = new Set<string>()
  const unique: string[] = []
  for (const row of data ?? []) {
    if (!seen.has(row.question) && !isWeatherQuestion(row.question) && unique.length < 5) {
      seen.add(row.question)
      unique.push(row.question)
    }
  }

  return NextResponse.json(unique)
}
