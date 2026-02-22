import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const OUT_OF_SCOPE_MESSAGE = '提供された情報の範囲外のため、お答えできません。'

/**
 * 質問とコンテキストチャンクをもとに Claude でストリーミング回答を生成する。
 * チャンクが空の場合はスコープ外メッセージを1回 yield して終了。
 */
export async function* streamAnswer(
  question: string,
  chunks: string[]
): AsyncGenerator<string, void, unknown> {
  if (chunks.length === 0) {
    yield OUT_OF_SCOPE_MESSAGE
    return
  }

  const context = chunks.join('\n\n---\n\n')
  const stream = anthropic.messages.stream({
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
