import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'

export async function proxy(req: NextRequest) {
  // ログインページ自体は保護しない
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

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
