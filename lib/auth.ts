import { SignJWT, jwtVerify } from 'jose'
import { cache } from 'react'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
const COOKIE_NAME = 'admin_token'
const EXPIRES_IN = '24h'

/**
 * 管理者用 JWT を生成する。
 */
export async function generateToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(JWT_SECRET)
}

/**
 * JWT を検証し、ペイロードを返す。無効な場合は null を返す。
 * React.cache() により同一リクエスト内での重複検証を排除する。
 */
export const verifyToken = cache(async (token: string): Promise<{ role: string } | null> => {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as { role: string }
  } catch {
    return null
  }
})

/**
 * Cookie から JWT を取得して検証する。
 * API Route / Server Action 内で呼び出す。
 */
export const verifySession = cache(async (): Promise<boolean> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return false
  const payload = await verifyToken(token)
  return payload?.role === 'admin'
})

export { COOKIE_NAME }
