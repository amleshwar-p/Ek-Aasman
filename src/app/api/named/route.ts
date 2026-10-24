import { getStore } from '@/lib/store';
import { readToken } from '@/lib/auth';
import { cleanName } from '@/lib/filter';

export const dynamic = 'force-dynamic';

// A named rocket: the text is always built here from a fixed template, so people can only choose a name.
const TEMPLATES = [(n: string) => `${n} ki Rocket`, (n: string) => `Happy Diwali, ${n}`, (n: string) => `${n} + family`];

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const who = readToken(body.token);
  if (!who) return Response.json({ error: 'Join first' }, { status: 401 });
  const name = cleanName(body.name);
  if (!name) return Response.json({ error: 'That name can\'t go in the sky. Use letters only, and keep it friendly.' }, { status: 400 });
  const tpl = TEMPLATES[Math.max(0, Math.min(2, Number(body.tpl) || 0))];
  const store = getStore();
  if (!(await store.once(`ek:rl:named:${who.i}`, 20))) return Response.json({ error: 'One named rocket every 20 seconds' }, { status: 429 });
  const text = tpl(name);
  await store.pushFeed({ text, where: who.c, ts: Date.now(), uid: who.i });
  return Response.json({ ok: true, text });
}
