import { getSessionCookieOptions } from '../server/boot/sessionConfig.js';

describe('session cookie configuration', () => {
  test('allows OAuth state cookies on local production HTTP deployments', () => {
    expect(getSessionCookieOptions('http://localhost:3002')).toMatchObject({
      secure: false,
      sameSite: 'lax',
      httpOnly: true,
    });
  });

  test('uses cross-site-safe secure cookies behind HTTPS proxies', () => {
    expect(getSessionCookieOptions('https://app.example.com')).toMatchObject({
      secure: true,
      sameSite: 'none',
      httpOnly: true,
    });
  });
});
