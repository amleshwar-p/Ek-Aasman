import { getStore } from '@/lib/store';
import { readToken } from '@/lib/auth';
import { loadNamed, namedView } from '@/lib/named';

export const dynamic = 'force-dynamic';

// The player's own server-side state that the browser can't work out alone: named rockets and invite friends.
// Asked for on page load and when My kit opens.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const who = readToken(body.token);
  if (!who) return Response.json({ error: 'Join first' }, { status: 401 });
  return Response.json({ named: namedView(await loadNamed(getStore(), who.i, Date.now())) });
}
