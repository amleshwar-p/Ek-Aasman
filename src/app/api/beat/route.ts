import { getStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

// "I'm here" ping every 30 seconds from each open page, used for the online count.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const anon = typeof body.anon === 'string' && /^[a-z0-9-]{8,48}$/i.test(body.anon) ? body.anon : null;
  if (!anon) return Response.json({ error: 'bad id' }, { status: 400 });
  await getStore().beat(anon);
  return Response.json({ ok: true });
}
