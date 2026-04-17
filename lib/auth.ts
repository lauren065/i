import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { IncomingMessage, ServerResponse } from 'http';

const JWT_SECRET = process.env.JWT_SECRET || '';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'cheolmin0651@gmail.com,i@cheolm.in')
  .split(',')
  .map((s) => s.trim().toLowerCase());
const COOKIE_NAME = 'cheolm_admin';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type AdminClaims = { email: string; name?: string; picture?: string };

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function issueAdminToken(claims: AdminClaims): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET must be set');
  return jwt.sign(claims, JWT_SECRET, { expiresIn: MAX_AGE });
}

export function setAdminCookie(res: ServerResponse | NextApiResponse, token: string): void {
  const cookie = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${MAX_AGE}`,
  ].join('; ');
  res.setHeader('Set-Cookie', cookie);
}

export function clearAdminCookie(res: ServerResponse | NextApiResponse): void {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  );
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  header.split(/;\s*/).forEach((kv) => {
    const eq = kv.indexOf('=');
    if (eq > 0) out[kv.slice(0, eq)] = decodeURIComponent(kv.slice(eq + 1));
  });
  return out;
}

export function readAdminClaims(req: IncomingMessage | NextApiRequest): AdminClaims | null {
  if (!JWT_SECRET) return null;
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const claims = jwt.verify(token, JWT_SECRET) as AdminClaims;
    if (!claims.email || !isAdminEmail(claims.email)) return null;
    return claims;
  } catch {
    return null;
  }
}

/** Guard an API route — responds 401 if not authed. */
export function requireAdmin(req: NextApiRequest, res: NextApiResponse): AdminClaims | null {
  const claims = readAdminClaims(req);
  if (!claims) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  return claims;
}
