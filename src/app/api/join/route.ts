import { randomUUID } from 'node:crypto';
import { getStore } from '@/lib/store';
import { cleanCity, cleanName, cleanState } from '@/lib/filter';
import { clientIp, makeToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Join with a name, city and state. No email, no password.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.name), city = cleanCity(body.city), state = cleanState(body.state);
  if (!name) return Response.json({ error: 'Use 2 to 20 letters for your name, with no numbers, links or rude words.' }, { status: 400 });
  if (!city) return Response.json({ error: 'Type the city you are celebrating from, using letters only.' }, { status: 400 });
  if (!state) return Response.json({ error: 'Pick your state from the list.' }, { status: 400 });
  const store = getStore();
  // Generous on purpose: Jio and Airtel put many phones behind one shared IP, and a family on one
  // WiFi shares one too. This only stops a script joining hundreds of times.
  const n = await store.hit(`ek:rl:join:${clientIp(req)}`, 600);
  if (n > 40) return Response.json({ error: 'Too many joins from this network. Try again in a while.' }, { status: 429 });
  const id = randomUUID();
  await store.createUser({ id, name, city, state });
  const token = makeToken({ i: id, n: name, c: city, s: state, t: Date.now() });
  return Response.json({ token, user: { id, name, city, state } });
}
