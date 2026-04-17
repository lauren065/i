import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

/**
 * Start Google OAuth authorization code flow.
 * Redirects to Google's consent screen with scopes: openid email profile.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirect = process.env.GOOGLE_REDIRECT_URI; // e.g. https://cheolm.in/api/auth/callback
  if (!clientId || !redirect) {
    return res.status(500).json({ error: 'GOOGLE_CLIENT_ID / GOOGLE_REDIRECT_URI not configured' });
  }

  // CSRF state: random 32-byte token stored in HttpOnly cookie, echoed back in callback
  const state = crypto.randomBytes(32).toString('hex');
  res.setHeader(
    'Set-Cookie',
    `cheolm_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    access_type: 'online',
  });
  res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
