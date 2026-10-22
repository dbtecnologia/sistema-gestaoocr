import { NextResponse, type NextRequest } from 'next/server';
export function middleware(request: NextRequest) {
  if (!request.cookies.has('mr_access') && !request.cookies.has('mr_refresh')) return NextResponse.redirect(new URL('/login', request.url));
  return NextResponse.next();
}
export const config = { matcher: ['/', '/dashboard/:path*'] };
