// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const token = req.cookies.get('accessToken')?.value

  // If no token, redirect to /login
  if (!token) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    // Optionally preserve the path you came from:
    loginUrl.searchParams.set('from', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
      Protect everything under "/" EXCEPT:
        - /login
        - /api/*
        - Next.js internals (_next/*, favicon.ico)
    */
    '/((?!_next/static|_next/image|favicon.ico|api|login).*)',
  ],
}
