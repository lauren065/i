import type { NextApiRequest, NextApiResponse } from 'next';
import { clearAdminCookie } from '../../../lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  clearAdminCookie(res);
  return res.redirect(302, '/');
}
