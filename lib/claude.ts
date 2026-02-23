import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const OUT_OF_SCOPE_MESSAGE = '提供された情報の範囲外のため、お答えできません。'

/**
 * 質問とコンテキストチャンクをもとに Claude でストリーミング回答を生成する。
 * weatherContext が指定されている場合は天候ベースの回答を優先する。
 * チャンクが空かつ天候情報もない場合はスコープ外メッセージを1回 yield して終了。
 */
export async function* streamAnswer(
  question: string,
  chunks: string[],
  weatherContext?: string
): AsyncGenerator<string, void, unknown> {
  if (chunks.length === 0 && !weatherContext) {
    yield OUT_OF_SCOPE_MESSAGE
    return
  }

  const context = chunks.join('\n\n---\n\n')

  let userContent: string
  if (weatherContext && chunks.length > 0) {
    userContent = `以下の参考情報をもとに質問に回答してください。参考情報に含まれていない内容については回答しないでください。天候情報は補足として活用し、参考情報の内容を中心にアドバイスしてください。

## 現在の天候情報（補足）
${weatherContext}

## 参考情報（登録ソースより）
${context}

## 質問
${question}`
  } else if (weatherContext) {
    userContent = `以下の天候情報をもとに、今日の天気を時間帯別にわかりやすくまとめてください。釣りへの影響があれば一言触れてください。

## 天候情報
${weatherContext}

## 質問
${question}`
  } else {
    userContent = `以下の情報をもとに質問に回答してください。情報に含まれていない内容については回答しないでください。

## 参考情報
${context}

## 質問
${question}`
  }

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: userContent }],
  })

  const textChunks: string[] = []
  let resolveNext: (() => void) | null = null
  let streamEnded = false

  stream.on('text', (textDelta: string) => {
    textChunks.push(textDelta)
    resolveNext?.()
  })

  stream.on('end', () => {
    streamEnded = true
    resolveNext?.()
  })

  stream.on('error', () => {
    streamEnded = true
    resolveNext?.()
  })

  while (!streamEnded || textChunks.length > 0) {
    while (textChunks.length > 0) {
      yield textChunks.shift()!
    }
    if (!streamEnded) {
      await new Promise<void>(resolve => {
        resolveNext = resolve
      })
    }
  }
}

/**
 * 質問・回答・チャンクをもとに関連質問を3件生成する。
 * 生成失敗時は空配列を返す。
 */
export async function generateSuggestions(
  question: string,
  answer: string,
  chunks: string[]
): Promise<string[]> {
  const context = chunks.slice(0, 3).join('\n\n---\n\n').slice(0, 2000)

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `ユーザーが以下の質問をして回答を受け取りました。次に聞きたくなりそうな関連質問を3つ、JSON配列で返してください。質問は簡潔に（30文字以内）。配列以外の文字は不要です。

## 質問
${question}

## 回答
${answer.slice(0, 500)}

## 参考情報のテーマ
${context}`,
      },
    ],
  })

  const block = message.content[0]
  if (block.type !== 'text') return []

  try {
    const match = block.text.match(/\[[\s\S]*?\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0])
    if (!Array.isArray(parsed)) return []
    return parsed.filter((s): s is string => typeof s === 'string').slice(0, 3)
  } catch {
    return []
  }
}

/**
 * 質問とコンテキストチャンクをもとに Claude で回答を生成する。
 * チャンクが空の場合はスコープ外メッセージを返す。
 */
export async function generateAnswer(question: string, chunks: string[]): Promise<string> {
  if (chunks.length === 0) {
    return OUT_OF_SCOPE_MESSAGE
  }

  const context = chunks.join('\n\n---\n\n')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `以下の情報をもとに質問に回答してください。情報に含まれていない内容については回答しないでください。

## 参考情報
${context}

## 質問
${question}`,
      },
    ],
  })

  const block = message.content[0]
  if (block.type !== 'text') {
    return OUT_OF_SCOPE_MESSAGE
  }

  return block.text
}
