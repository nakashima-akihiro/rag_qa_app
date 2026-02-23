import { NextRequest, NextResponse } from 'next/server'

const CODE_DESC: Record<number, string> = {
  0: '快晴', 1: 'ほぼ晴れ', 2: '一部曇り', 3: '曇り',
  45: '霧', 48: '霧',
  51: '霧雨(弱)', 53: '霧雨', 55: '霧雨(強)',
  61: '小雨', 63: '雨', 65: '大雨',
  71: '小雪', 73: '雪', 75: '大雪',
  80: 'にわか雨(弱)', 81: 'にわか雨', 82: 'にわか雨(強)',
  95: '雷雨', 96: '激しい雷雨', 99: '激しい雷雨',
}

const CODE_EMOJI: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌦️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '❄️', 73: '❄️', 75: '❄️',
  80: '🌦️', 81: '🌦️', 82: '🌦️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lon = parseFloat(searchParams.get('lon') ?? '')

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: 'lat/lon required' }, { status: 400 })
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m&timezone=auto&forecast_days=1`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error('weather api failed')
    const data = await res.json()

    const c = data.current
    const curEmoji = CODE_EMOJI[c.weather_code as number] ?? '🌡️'
    const curDesc = CODE_DESC[c.weather_code as number] ?? '不明'

    const rows = [6, 9, 12, 15, 18, 21].map((h: number) => {
      const temp = (data.hourly.temperature_2m as number[])[h]
      const code = (data.hourly.weather_code as number[])[h]
      const precip = (data.hourly.precipitation_probability as number[])[h]
      const wind = (data.hourly.wind_speed_10m as number[])[h]
      const emoji = CODE_EMOJI[code] ?? '🌡️'
      const desc = CODE_DESC[code] ?? '不明'
      return `| ${String(h).padStart(2, '0')}時 | ${emoji} ${desc} | ${temp}°C | ${wind} km/h | ${precip}% |`
    }).join('\n')

    const markdown = `**現在**: ${curEmoji} ${curDesc} / ${c.temperature_2m}°C
湿度 ${c.relative_humidity_2m}%　風速 ${c.wind_speed_10m} km/h　降水量 ${c.precipitation} mm

| 時間 | 天気 | 気温 | 風速 | 降水確率 |
|:--:|:--:|:--:|:--:|:--:|
${rows}`

    return NextResponse.json({ markdown })
  } catch {
    return NextResponse.json({ error: 'failed to fetch weather' }, { status: 500 })
  }
}
