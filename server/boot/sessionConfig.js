export function getSessionCookieOptions(appOrigin) {
  const isHttps = String(appOrigin || '').startsWith('https://');
  return {
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 30,
  };
}
