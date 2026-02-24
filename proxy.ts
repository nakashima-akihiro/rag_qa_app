import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'

function basicAuth(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get('authorization')

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ')
    if (scheme === 'Basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8')
      const [user, pass] = decoded.split(':')
      const expectedUser = process.env.BASIC_AUTH_USER ?? 'nakashima'
      const expectedPass = process.env.BASIC_AUTH_PASSWORD ?? 'akkknrsyyy'
      if (user === expectedUser && pass === expectedPass) {
        return null // 認証OK
      }
    }
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  })
}

export async function proxy(req: NextRequest) {
  // Basic認証チェック
  const authResponse = basicAuth(req)
  if (authResponse) return authResponse

  // 管理画面の JWT 認証
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (req.nextUrl.pathname === '/admin/login') {
      return NextResponse.next()
    }

    const token = req.cookies.get(COOKIE_NAME)?.value
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
