type WebPage = {
  title: string
  content: string
}

function stripMarkdownLinks(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) → text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')     // ![alt](url) → 削除
    .replace(/\n{3,}/g, '\n\n')               // 3行以上の空行を2行に
    .trim()
}

export async function fetchWebPage(url: string): Promise<WebPage> {
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers: { 'Accept': 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`ページの取得に失敗しました (${res.status})`)
  }

  const json = await res.json()
  const data = json.data ?? json

  const title: string = data.title ?? url
  const content: string = data.content ?? ''

  if (!content) {
    throw new Error('ページからテキストを抽出できませんでした')
  }

  return { title, content: stripMarkdownLinks(content) }
}
