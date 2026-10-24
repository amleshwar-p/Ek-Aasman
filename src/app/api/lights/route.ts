import { getStore, istDay } from '@/lib/store';
import { readToken } from '@/lib/auth';
import { KIT_RULES, POINTS, RANGOLI_POINTS } from '@/lib/items';

export const dynamic = 'force-dynamic';

// The browser sends what it lit in the last few seconds, e.g. { rocket: 2, diya: 3 }.
// The server works out the points itself and only accepts what the free kit could have refilled,
// so a modified browser can't pump the leaderboard.
type Kit = { t: number; a: Record<string, number> };

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const who = readToken(body.token);
  if (!who) return Response.json({ error: 'Join first' }, { status: 401 });
  const store = getStore();
  const now = Date.now();
  const key = `ek:kit:${who.i}`;
  const kit = (await store.getJSON<Kit>(key)) || { t: now, a: Object.fromEntries(Object.entries(KIT_RULES).map(([k, r]) => [k, r.start])) };
  const elapsed = Math.max(0, (now - kit.t) / 1000);

  let lights = 0, pts = 0, diyas = 0;
  const counts = (body.counts && typeof body.counts === 'object') ? body.counts as Record<string, unknown> : {};
  for (const [k, rule] of Object.entries(KIT_RULES)) {
    // refill, with one spare for timing differences between the browser and the server
    let have = Math.min(rule.cap + 1, (kit.a[k] ?? rule.start) + elapsed / rule.every);
    const want = Math.max(0, Math.min(60, Math.floor(Number(counts[k]) || 0)));
    const take = Math.min(want, Math.floor(have));
    if (take > 0) {
      have -= take; lights += take; pts += take * POINTS[k];
      if (k === 'diya') diyas += take;
    }
    kit.a[k] = have;
  }
  kit.t = now;
  if (body.rangoli === true && await store.once(`ek:rg:${who.i}`, 60)) pts += RANGOLI_POINTS;
  // sending lights also counts as being online, so active players don't need a separate /api/beat
  const anon = typeof body.anon === 'string' && /^[a-z0-9-]{8,48}$/i.test(body.anon) ? body.anon : null;
  await Promise.all([store.setJSON(key, kit, 3 * 86400), anon ? store.beat(anon) : null]);
  if (lights === 0 && pts === 0) return Response.json({ ok: true, added: 0 });
  const { score, rank } = await store.addLights({
    uid: who.i, place: `${who.c}|${who.s}`, state: who.s, lights, pts, diyas, day: istDay(now)
  });
  return Response.json({ ok: true, added: lights, today: score, rank });
}
