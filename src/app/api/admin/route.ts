import { timingSafeEqual } from 'node:crypto';
import { getStore, istDay } from '@/lib/store';
import { clientIp } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Moderation for the /admin page: hide a named rocket from the feed, ban a player (off every board and out of
// the feed), add blocked words, take a bad city name off the Cities board. Protected by ADMIN_SECRET.
function allowed(req: Request) {
  const secret = process.env.ADMIN_SECRET || '';
  const given = req.headers.get('x-admin-key') || '';
  if (secret.length < 16 || !given) return false;
  const a = Buffer.from(secret), b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const store = getStore();
  if (!process.env.ADMIN_SECRET || process.env.ADMIN_SECRET.length < 16) {
    return Response.json({ error: 'Admin is not set up yet. Add ADMIN_SECRET (16+ characters) in Vercel and redeploy.' }, { status: 503 });
  }
  if (!allowed(req)) {
    const tries = await store.hit(`ek:rl:admin:${clientIp(req)}`, 600);
    return Response.json({ error: tries > 20 ? 'Too many wrong tries. Wait 10 minutes.' : 'Wrong admin secret.' }, { status: tries > 20 ? 429 : 401 });
  }
  const body = await req.json().catch(() => ({}));
  const uid = typeof body.uid === 'string' && /^[0-9a-f-]{36}$/i.test(body.uid) ? body.uid : null;
  switch (body.action) {
    case 'load': {
      const [feed, recent, cities, banned, words] = await Promise.all([
        store.allFeed(), store.recentJoins(), store.ranks('cities', istDay()), store.banned(), store.words()
      ]);
      return Response.json({ feed, recent: recent.slice(0, 100), cities, banned, words: words.sort() });
    }
    case 'hide': {
      const ts = Number(body.ts);
      if (!uid || !ts) return Response.json({ error: 'Missing rocket' }, { status: 400 });
      return Response.json({ ok: true, removed: await store.removeFeed((f) => f.ts === ts && f.uid === uid) });
    }
    case 'ban': {
      if (!uid) return Response.json({ error: 'Missing player' }, { status: 400 });
      const days = [0, 1, 2, 3].map((d) => istDay(Date.now() - d * 86400000));
      await store.ban(uid, days);
      return Response.json({ ok: true });
    }
    case 'unban': {
      if (!uid) return Response.json({ error: 'Missing player' }, { status: 400 });
      await store.unban(uid);
      return Response.json({ ok: true });
    }
    case 'word': {
      const raw = typeof body.word === 'string' ? body.word.normalize('NFC').trim().replace(/\s+/g, ' ') : '';
      const word = /[a-z]/i.test(raw) ? raw.toLowerCase() : raw;
      if (word.length < 2 || word.length > 30 || !/^[\p{L}\p{M} ]+$/u.test(word)) return Response.json({ error: 'Use 2 to 30 letters' }, { status: 400 });
      await store.setWord(word, body.on !== false);
      return Response.json({ ok: true });
    }
    case 'city': {
      const member = typeof body.member === 'string' && body.member.includes('|') && body.member.length <= 80 ? body.member : null;
      if (!member) return Response.json({ error: 'Missing city' }, { status: 400 });
      await store.removeCity(member);
      return Response.json({ ok: true });
    }
    default:
      return Response.json({ error: 'Unknown action' }, { status: 400 });
  }
}
