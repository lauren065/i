import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminEmail, issueAdminToken, setAdminCookie } from '../../../lib/auth';

/**
 * Google OAuth callback. Exchanges code for tokens, verifies email,
 * issues our own JWT cookie if email is in allowlist, then redirects to /admin.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state, error } = req.query as Record<string, string>;
  if (error) return res.status(400).send(`oauth error: ${error}`);
  if (!code) return res.status(400).send('missing code');

  // CSRF: state cookie must match query state
  const cookieState = (req.headers.cookie || '')
    .split(/;\s*/)
    .find((c) => c.startsWith('cheolm_oauth_state='))
    ?.split('=')[1];
  if (!cookieState || cookieState !== state) {
    return res.status(400).send('state mismatch (CSRF protection)');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirect = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirect) {
    return res.status(500).send('google oauth not configured');
  }

  // Exchange code for tokens
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirect,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenResp.ok) {
    const body = await tokenResp.text();
    return res.status(500).send(`token exchange failed: ${body}`);
  }
  const tokens = (await tokenResp.json()) as {
    access_token: string;
    id_token?: string;
    expires_in: number;
  };

  // Fetch userinfo to get email + verified
  const userResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userResp.ok) {
    return res.status(500).send('userinfo fetch failed');
  }
  const user = (await userResp.json()) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  if (!user.email || user.email_verified === false) {
    return res.status(403).send('email not verified');
  }
  if (!isAdminEmail(user.email)) {
    return res.status(403).send(`access denied for ${user.email}`);
  }

  // Issue our JWT cookie
  const token = issueAdminToken({ email: user.email, name: user.name, picture: user.picture });
  setAdminCookie(res, token);

  // Clear state cookie
  res.setHeader('Set-Cookie', [
    `cheolm_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    res.getHeader('Set-Cookie') as string,
  ]);

  return res.redirect(302, '/admin');
}
