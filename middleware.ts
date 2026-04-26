import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const HOLDING_MODE = process.env.NEXT_PUBLIC_HOLDING_MODE === 'true';

export function middleware(request: NextRequest) {
  if (!HOLDING_MODE) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Always allow:
  if (
    pathname === '/holding' ||                 // the holding page itself
    pathname.startsWith('/mint/') ||           // collectors must still mint
    pathname.startsWith('/api/') ||            // all APIs (snap endpoint, etc.)
    pathname.startsWith('/_next/') ||          // Next.js internals
    pathname.startsWith('/.well-known/') ||    // FC manifest
    /\.(png|jpg|jpeg|gif|svg|ico|webp)$/.test(pathname) // static assets
  ) {
    return NextResponse.next();
  }

  // Everything else (/, /create, /drops, /drops/[id]) → holding
  return NextResponse.redirect(new URL('/holding', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};