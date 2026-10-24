import { getStore, istDay } from '@/lib/store';
import { readToken } from '@/lib/auth';
import { cleanName } from '@/lib/filter';
import { NAMED_FREE, POINTS } from '@/lib/items';

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
  // named rockets are earned, not refilled: count how many this player has sent
  const used = await store.hit(`ek:nr:${who.i}`, 30 * 86400);
  if (used > NAMED_FREE) return Response.json({ error: 'Invite a friend to earn another named rocket' }, { status: 403 });
  const now = Date.now();
  const text = tpl(name);
  await store.pushFeed({ text, where: who.c, ts: now, uid: who.i });
  const { score, rank } = await store.addLights({
    uid: who.i, place: `${who.c}|${who.s}`, state: who.s, lights: 1, pts: POINTS.named, diyas: 0, day: istDay(now)
  });
  return Response.json({ ok: true, text, today: score, rank });
}
