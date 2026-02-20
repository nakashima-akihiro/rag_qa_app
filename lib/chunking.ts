const CHUNK_SIZE = 500
const OVERLAP = 50

/**
 * テキストを約500文字ずつ、50文字のオーバーラップでチャンキングする。
 * 句点（。）や改行を優先して自然な区切りで分割する。
 */
export function chunkText(text: string): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length)
    let splitPos = end

    if (end < text.length) {
      // 末尾100文字を後ろから検索し、句点・改行で分割
      const segment = text.slice(start, end)
      for (let i = segment.length - 1; i >= segment.length - 100 && i >= 0; i--) {
        if (segment[i] === '。' || segment[i] === '\n') {
          splitPos = start + i + 1
          break
        }
      }
    }

    const chunk = text.slice(start, splitPos).trim()
    if (chunk.length > 0) chunks.push(chunk)

    if (splitPos >= text.length) break

    // 次チャンクは末尾50文字手前から開始（オーバーラップ）
    start = Math.max(start + 1, splitPos - OVERLAP)
  }

  return chunks
}
