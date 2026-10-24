import { createHmac, timingSafeEqual } from 'node:crypto';

// A small signed token kept in the visitor's browser. It says who they are (id, name, city, state).
// There are no accounts or passwords: anyone can join with a name, and the token stops people
// from posting points under someone else's id.
export type Who = { i: string; n: string; c: string; s: string; t: number };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET is not set. Add it in Vercel → Settings → Environment Variables.');
  return 'dev-only-secret-change-me';
}
const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const sign = (data: string) => b64(createHmac('sha256', secret()).update(data).digest());

export function makeToken(w: Who) {
  const body = b64(JSON.stringify(w));
  return `${body}.${sign(body)}`;
}
export function readToken(token: unknown): Who | null {
  if (typeof token !== 'string' || token.length > 600) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const want = Buffer.from(sign(body)), got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Who; } catch { return null; }
}
export function clientIp(req: Request) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
}
