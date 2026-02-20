import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const OUT_OF_SCOPE_MESSAGE = '提供された情報の範囲外のため、お答えできません。'

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
