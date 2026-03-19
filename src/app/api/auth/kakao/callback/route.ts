import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/?error=kakao_auth_failed', request.url));
  }

  // Exchange code for access token
  const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.NEXT_PUBLIC_KAKAO_JS_KEY!,
      redirect_uri: `${request.nextUrl.origin}/api/auth/kakao/callback`,
      code,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/?error=kakao_token_failed', request.url));
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // Redirect back to app with token in cookie (httpOnly for security)
  const response = NextResponse.redirect(new URL('/?kakao=connected', request.url));
  response.cookies.set('kakao_access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: tokenData.expires_in,
    path: '/',
  });

  return response;
}
