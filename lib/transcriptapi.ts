const BASE_URL = 'https://transcriptapi.com/api/v2'

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.TRANSCRIPT_API_KEY}`,
  }
}

export type TranscriptResult = {
  videoId: string
  title: string
  transcript: string
}

export type ChannelVideo = {
  videoId: string
  title: string
  url: string
}

/** 動画1件の字幕を取得する（1クレジット消費） */
export async function fetchTranscript(videoUrl: string): Promise<TranscriptResult> {
  const params = new URLSearchParams({
    video_url: videoUrl,
    format: 'text',
    include_timestamp: 'false',
    send_metadata: 'true',
  })

  const res = await fetch(`${BASE_URL}/youtube/transcript?${params}`, {
    headers: authHeaders(),
  })

  if (res.status === 404) {
    throw new TranscriptApiError('no_captions', 404)
  }
  if (res.status === 402) {
    throw new TranscriptApiError('insufficient_credits', 402)
  }
  if (!res.ok) {
    throw new TranscriptApiError('api_error', res.status)
  }

  const data = await res.json()
  const title: string = data.metadata?.title ?? videoUrl
  const transcript: string = data.transcript ?? ''
  const videoId: string = data.video_id ?? ''

  if (!transcript) {
    throw new TranscriptApiError('no_captions', 404)
  }

  return { videoId, title, transcript }
}

/** チャンネルの最新15件動画一覧を取得する（クレジット消費なし） */
export async function fetchChannelLatest(channelHandle: string): Promise<ChannelVideo[]> {
  const params = new URLSearchParams({ channel: channelHandle })

  const res = await fetch(`${BASE_URL}/youtube/channel/latest?${params}`, {
    headers: authHeaders(),
  })

  if (!res.ok) {
    throw new TranscriptApiError('api_error', res.status)
  }

  const data = await res.json()
  const results = data.results ?? []

  return results.map((v: { videoId: string; title: string }) => ({
    videoId: v.videoId,
    title: v.title,
    url: `https://www.youtube.com/watch?v=${v.videoId}`,
  }))
}

/** チャンネルの全動画一覧を取得する（1クレジット/ページ） */
export async function fetchChannelAllVideos(channelHandle: string): Promise<ChannelVideo[]> {
  const videos: ChannelVideo[] = []
  let continuation: string | null = null
  let isFirst = true

  while (true) {
    const params = new URLSearchParams()
    if (isFirst) {
      params.set('channel', channelHandle)
      isFirst = false
    } else if (continuation) {
      params.set('continuation', continuation)
    } else {
      break
    }

    const res = await fetch(`${BASE_URL}/youtube/channel/videos?${params}`, {
      headers: authHeaders(),
    })

    if (res.status === 402) {
      throw new TranscriptApiError('insufficient_credits', 402)
    }
    if (!res.ok) {
      throw new TranscriptApiError('api_error', res.status)
    }

    const data = await res.json()
    const results = data.results ?? []

    for (const v of results) {
      videos.push({
        videoId: v.videoId,
        title: v.title,
        url: `https://www.youtube.com/watch?v=${v.videoId}`,
      })
    }

    if (!data.has_more || !data.continuation_token) break
    continuation = data.continuation_token
  }

  return videos
}

export class TranscriptApiError extends Error {
  constructor(
    public readonly code: 'no_captions' | 'insufficient_credits' | 'api_error',
    public readonly status: number,
  ) {
    super(code)
    this.name = 'TranscriptApiError'
  }
}
