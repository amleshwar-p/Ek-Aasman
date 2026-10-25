import { getStore, istDay } from '@/lib/store';
import { readToken } from '@/lib/auth';
import { cleanName } from '@/lib/filter';
import { POINTS } from '@/lib/items';
import { loadNamed, namedKey, namedView } from '@/lib/named';

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
  const now = Date.now();
  // every reply carries the player's named rockets, so the browser always shows the server's count
  const state = await loadNamed(store, who.i, now);
  if (state.kit.a < 1 && state.bonus < 1) {
    return Response.json({ error: 'Your next named rocket is on its way. Invite a friend to get one right away.', named: namedView(state) }, { status: 403 });
  }
  if (!(await store.once(`ek:rl:named:${who.i}`, 20))) {
    return Response.json({ error: 'One named rocket every 20 seconds', named: namedView(state) }, { status: 429 });
  }
  // spend a refilled one first, invite bonuses after
  if (state.kit.a >= 1) state.kit.a -= 1; else { state.kit.used += 1; state.bonus -= 1; }
  await store.setJSON(namedKey(who.i), state.kit, 30 * 86400);
  const text = tpl(name);
  await store.pushFeed({ text, where: who.c, ts: now, uid: who.i });
  const { score, rank } = await store.addLights({
    uid: who.i, place: `${who.c}|${who.s}`, state: who.s, lights: 1, pts: POINTS.named, diyas: 0, day: istDay(now)
  });
  return Response.json({ ok: true, text, today: score, rank, named: namedView(state) });
}
