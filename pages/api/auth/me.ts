import type { NextApiRequest, NextApiResponse } from 'next';
import { readAdminClaims } from '../../../lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const claims = readAdminClaims(req);
  if (!claims) return res.status(401).json({ authenticated: false });
  return res.status(200).json({ authenticated: true, ...claims });
}
