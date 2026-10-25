import type { Store } from './store';
import { NAMED } from './items';

// A player's named rockets. `a` refills by itself (1 per NAMED.every seconds, up to NAMED.cap) and is worked
// out from the time it was last saved, so reading it needs no write. Invite bonuses are counted separately:
// each friend who joined with your link is one extra rocket (up to NAMED.inviteMax), and `used` counts the
// ones already spent.
export type NamedKit = { t: number; a: number; used: number };
export const namedKey = (id: string) => `ek:nk:${id}`;

export async function loadNamed(store: Store, id: string, now: number) {
  const [saved, friends] = await Promise.all([store.getJSON<NamedKit>(namedKey(id)), store.invites(id)]);
  const kit = saved || { t: now, a: NAMED.start, used: 0 };
  kit.a = Math.min(NAMED.cap, kit.a + Math.max(0, now - kit.t) / 1000 / NAMED.every);
  kit.t = now;
  const bonus = Math.max(0, Math.min(NAMED.inviteMax, friends) - kit.used);
  return { kit, friends, bonus };
}

// What the browser needs: how many are ready, when the next refills, and the invite bonus.
export function namedView({ kit, friends, bonus }: { kit: NamedKit; friends: number; bonus: number }) {
  const left = Math.floor(kit.a + 1e-9);
  const nextIn = left >= NAMED.cap ? 0 : Math.ceil((1 - (kit.a - left)) * NAMED.every * 1000);
  return { left, nextIn, bonus, friends };
}
