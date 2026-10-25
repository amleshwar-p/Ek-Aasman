// Points per item. The server uses this table; the browser shows the same numbers.
export const POINTS: Record<string, number> = {
  rocket: 4, named: 20, skyshot: 12, anar: 3, chakri: 2, phuljhadi: 1, bomb: 3, ladi: 8, diya: 1
};
export const RANGOLI_POINTS = 15;

// Named rockets: a new player starts with 2, one more refills every 2 minutes (hold up to 2), and each friend
// who joins with your invite link adds one extra, up to 10. /api/named spends them and gives their points;
// /api/lights ignores them.
export const NAMED = { start: 2, cap: 2, every: 120, inviteMax: 10 };

// The free kit, mirrored on the server so nobody can light faster than the kit refills.
// start = what a new player has, cap = most they can hold, every = seconds to earn one more.
export const KIT_RULES: Record<string, { start: number; cap: number; every: number }> = {
  rocket: { start: 5, cap: 5, every: 30 },
  skyshot: { start: 1, cap: 1, every: 90 },
  anar: { start: 3, cap: 3, every: 45 },
  chakri: { start: 3, cap: 3, every: 45 },
  phuljhadi: { start: 3, cap: 3, every: 45 },
  bomb: { start: 3, cap: 3, every: 45 },
  ladi: { start: 2, cap: 2, every: 60 },
  diya: { start: 11, cap: 51, every: 600 / 11 }
};
