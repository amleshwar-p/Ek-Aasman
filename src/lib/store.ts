import { Redis } from '@upstash/redis';

// All shared data lives here: the India-wide light counter, who is online, the named-rocket feed,
// and the leaderboards. In production it is Upstash Redis. Without Upstash keys (local dev) it falls
// back to an in-memory store so the app still runs; that data resets when the server restarts.

export type FeedItem = { text: string; where: string; ts: number; uid: string };
export type Row = { name: string; sub: string; score: number; me?: boolean };
export type Board = 'today' | 'overall' | 'diyas' | 'cities' | 'states';
export const BOARDS: Board[] = ['today', 'overall', 'diyas', 'cities', 'states'];

export interface Store {
  createUser(u: { id: string; name: string; city: string; state: string }): Promise<void>;
  /** true the first time in `seconds`, false after that (one-shot rate limit) */
  once(key: string, seconds: number): Promise<boolean>;
  /** counts calls in a window, returns the new count */
  hit(key: string, seconds: number): Promise<number>;
  getJSON<T>(key: string): Promise<T | null>;
  setJSON(key: string, value: unknown, seconds: number): Promise<void>;
  addLights(p: { uid: string; place: string; state: string; lights: number; pts: number; diyas: number; day: string }): Promise<{ score: number; rank: number | null }>;
  pushFeed(item: FeedItem): Promise<void>;
  beat(anon: string): Promise<void>;
  sky(): Promise<{ lights: number; online: number; feed: FeedItem[] }>;
  ranks(board: Board, day: string): Promise<Row[]>;
  userExists(id: string): Promise<boolean>;
  /** records that browser `who` joined with `ref`'s invite link; returns how many distinct friends `ref` has */
  addInvite(ref: string, who: string): Promise<number>;
  invites(id: string): Promise<number>;
  // moderation (the admin page)
  recentJoins(): Promise<Joined[]>;
  allFeed(): Promise<FeedItem[]>;
  /** removes feed items matching `test`, returns how many went */
  removeFeed(test: (f: FeedItem) => boolean): Promise<number>;
  /** bans a player: off every leaderboard (`days` = daily boards to clear) and out of the feed */
  ban(uid: string, days: string[]): Promise<void>;
  unban(uid: string): Promise<void>;
  isBanned(uid: string): Promise<boolean>;
  banned(): Promise<Joined[]>;
  words(): Promise<string[]>;
  setWord(word: string, on: boolean): Promise<void>;
  /** takes a "City|State" entry off the Cities board */
  removeCity(member: string): Promise<void>;
}
export type Joined = { id: string; name: string; city: string; state: string; at: number };

const K = {
  lights: 'ek:lights', online: 'ek:online', feed: 'ek:feed', all: 'ek:lb:all', diyas: 'ek:lb:diyas',
  city: 'ek:lb:city', state: 'ek:lb:state', day: (d: string) => `ek:lb:day:${d}`, user: (id: string) => `ek:u:${id}`,
  inv: (id: string) => `ek:inv:${id}`, recent: 'ek:recent', banned: 'ek:banned', words: 'ek:words'
};
const ONLINE_WINDOW = 70_000;

export function istDay(now = Date.now()) {
  return new Date(now + 330 * 60_000).toISOString().slice(0, 10);
}

class RedisStore implements Store {
  constructor(private r: Redis) {}
  async createUser(u: { id: string; name: string; city: string; state: string }) {
    const at = Date.now(), p = this.r.pipeline();
    p.hset(K.user(u.id), { name: u.name, city: u.city, state: u.state, at });
    // the newest 200 joins, for the admin page
    p.lpush(K.recent, { ...u, at }); p.ltrim(K.recent, 0, 199);
    await p.exec();
  }
  async once(key: string, seconds: number) {
    return (await this.r.set(key, 1, { nx: true, ex: seconds })) === 'OK';
  }
  async hit(key: string, seconds: number) {
    const p = this.r.pipeline(); p.incr(key); p.expire(key, seconds, 'NX');
    const [n] = await p.exec<[number, number]>();
    return n;
  }
  async getJSON<T>(key: string) { return (await this.r.get<T>(key)) ?? null; }
  async setJSON(key: string, value: unknown, seconds: number) { await this.r.set(key, value, { ex: seconds }); }
  async addLights({ uid, place, state, lights, pts, diyas, day }: { uid: string; place: string; state: string; lights: number; pts: number; diyas: number; day: string }) {
    const dk = K.day(day);
    const p = this.r.pipeline();
    p.incrby(K.lights, lights);
    p.zincrby(K.all, pts, uid);
    p.zincrby(dk, pts, uid);
    p.expire(dk, 4 * 86400);
    if (diyas > 0) p.zincrby(K.diyas, diyas, uid);
    p.zincrby(K.city, lights, place);
    p.zincrby(K.state, lights, state);
    p.zscore(dk, uid);
    p.zrevrank(dk, uid);
    const res = await p.exec();
    const rank = res[res.length - 1] as number | null;
    const score = Number(res[res.length - 2] ?? 0);
    return { score, rank: rank == null ? null : rank + 1 };
  }
  async pushFeed(item: FeedItem) {
    const p = this.r.pipeline(); p.lpush(K.feed, item); p.ltrim(K.feed, 0, 49); await p.exec();
  }
  async beat(anon: string) { await this.r.zadd(K.online, { score: Date.now(), member: anon }); }
  async sky() {
    const now = Date.now();
    const p = this.r.pipeline();
    p.get<number>(K.lights);
    p.zremrangebyscore(K.online, 0, now - ONLINE_WINDOW);
    p.zcard(K.online);
    p.lrange<FeedItem>(K.feed, 0, 11);
    const [lights, , online, feed] = await p.exec<[number | null, number, number, FeedItem[]]>();
    return { lights: Number(lights || 0), online: Number(online || 0), feed: feed || [] };
  }
  async ranks(board: Board, day: string) {
    const key = board === 'today' ? K.day(day) : board === 'overall' ? K.all : board === 'diyas' ? K.diyas : board === 'cities' ? K.city : K.state;
    const flat = await this.r.zrange<(string | number)[]>(key, 0, 19, { rev: true, withScores: true });
    const pairs: [string, number][] = [];
    for (let i = 0; i < flat.length; i += 2) pairs.push([String(flat[i]), Number(flat[i + 1])]);
    if (board === 'cities' || board === 'states') {
      return pairs.map(([m, s]) => { const [name, sub] = m.split('|'); return { name, sub: sub || '', score: s }; });
    }
    if (!pairs.length) return [];
    const p = this.r.pipeline();
    pairs.forEach(([id]) => p.hmget(K.user(id), 'name', 'city'));
    const users = await p.exec<({ name?: string; city?: string } | null)[]>();
    return pairs.map(([, s], i) => ({ name: users[i]?.name || 'Someone', sub: users[i]?.city || '', score: s }));
  }
  async userExists(id: string) { return (await this.r.exists(K.user(id))) === 1; }
  async addInvite(ref: string, who: string) {
    const p = this.r.pipeline(); p.sadd(K.inv(ref), who); p.expire(K.inv(ref), 30 * 86400); p.scard(K.inv(ref));
    const res = await p.exec();
    return Number(res[2] ?? 0);
  }
  async invites(id: string) { return Number(await this.r.scard(K.inv(id))); }
  async recentJoins() { return (await this.r.lrange<Joined>(K.recent, 0, 199)) || []; }
  async allFeed() { return (await this.r.lrange<FeedItem>(K.feed, 0, 49)) || []; }
  async removeFeed(test: (f: FeedItem) => boolean) {
    const all = await this.allFeed(), keep = all.filter((f) => !test(f));
    if (keep.length === all.length) return 0;
    const tx = this.r.multi(); tx.del(K.feed); if (keep.length) tx.rpush(K.feed, ...keep);
    await tx.exec();
    return all.length - keep.length;
  }
  async ban(uid: string, days: string[]) {
    const p = this.r.pipeline();
    p.sadd(K.banned, uid); p.zrem(K.all, uid); p.zrem(K.diyas, uid);
    days.forEach((d) => p.zrem(K.day(d), uid));
    await p.exec();
    await this.removeFeed((f) => f.uid === uid);
  }
  async unban(uid: string) { await this.r.srem(K.banned, uid); }
  async isBanned(uid: string) { return (await this.r.sismember(K.banned, uid)) === 1; }
  async banned() {
    const ids = await this.r.smembers(K.banned);
    if (!ids.length) return [];
    const p = this.r.pipeline();
    ids.forEach((id) => p.hmget(K.user(id), 'name', 'city', 'state'));
    const users = await p.exec<({ name?: string; city?: string; state?: string } | null)[]>();
    return ids.map((id, i) => ({ id, name: users[i]?.name || 'Someone', city: users[i]?.city || '', state: users[i]?.state || '', at: 0 }));
  }
  async words() { return (await this.r.smembers(K.words)) || []; }
  async setWord(word: string, on: boolean) { if (on) await this.r.sadd(K.words, word); else await this.r.srem(K.words, word); }
  async removeCity(member: string) { await this.r.zrem(K.city, member); }
}

type Z = Map<string, number>;
class MemoryStore implements Store {
  kv = new Map<string, { v: unknown; until: number }>();
  z = new Map<string, Z>();
  users = new Map<string, { name: string; city: string; state: string }>();
  feed: FeedItem[] = [];
  lights = 0;
  private zs(k: string) { let m = this.z.get(k); if (!m) { m = new Map(); this.z.set(k, m); } return m; }
  private zinc(k: string, by: number, m: string) { const z = this.zs(k); const v = (z.get(m) || 0) + by; z.set(m, v); return v; }
  private top(k: string) { return [...this.zs(k).entries()].sort((a, b) => b[1] - a[1]); }
  private live(k: string) { const e = this.kv.get(k); if (!e || e.until < Date.now()) { this.kv.delete(k); return undefined; } return e; }
  recent: Joined[] = [];
  async createUser(u: { id: string; name: string; city: string; state: string }) {
    this.users.set(u.id, u); this.recent.unshift({ ...u, at: Date.now() }); this.recent.length = Math.min(this.recent.length, 200);
  }
  async once(key: string, seconds: number) { if (this.live(key)) return false; this.kv.set(key, { v: 1, until: Date.now() + seconds * 1000 }); return true; }
  async hit(key: string, seconds: number) {
    const e = this.live(key); const n = ((e?.v as number) || 0) + 1;
    this.kv.set(key, { v: n, until: e?.until ?? Date.now() + seconds * 1000 }); return n;
  }
  async getJSON<T>(key: string) { return (this.live(key)?.v as T) ?? null; }
  async setJSON(key: string, value: unknown, seconds: number) { this.kv.set(key, { v: value, until: Date.now() + seconds * 1000 }); }
  async addLights({ uid, place, state, lights, pts, diyas, day }: { uid: string; place: string; state: string; lights: number; pts: number; diyas: number; day: string }) {
    this.lights += lights;
    this.zinc(K.all, pts, uid);
    const score = this.zinc(K.day(day), pts, uid);
    if (diyas > 0) this.zinc(K.diyas, diyas, uid);
    this.zinc(K.city, lights, place); this.zinc(K.state, lights, state);
    const rank = this.top(K.day(day)).findIndex(([m]) => m === uid);
    return { score, rank: rank < 0 ? null : rank + 1 };
  }
  async pushFeed(item: FeedItem) { this.feed.unshift(item); this.feed.length = Math.min(this.feed.length, 50); }
  async beat(anon: string) { this.zs(K.online).set(anon, Date.now()); }
  async sky() {
    const z = this.zs(K.online), cut = Date.now() - ONLINE_WINDOW;
    for (const [m, t] of z) if (t < cut) z.delete(m);
    return { lights: this.lights, online: z.size, feed: this.feed.slice(0, 12) };
  }
  async ranks(board: Board, day: string) {
    const key = board === 'today' ? K.day(day) : board === 'overall' ? K.all : board === 'diyas' ? K.diyas : board === 'cities' ? K.city : K.state;
    const top = this.top(key).slice(0, 20);
    if (board === 'cities' || board === 'states') return top.map(([m, s]) => { const [name, sub] = m.split('|'); return { name, sub: sub || '', score: s }; });
    return top.map(([id, s]) => ({ name: this.users.get(id)?.name || 'Someone', sub: this.users.get(id)?.city || '', score: s }));
  }
  sets = new Map<string, Set<string>>();
  async userExists(id: string) { return this.users.has(id); }
  async addInvite(ref: string, who: string) {
    let s = this.sets.get(K.inv(ref)); if (!s) { s = new Set(); this.sets.set(K.inv(ref), s); }
    s.add(who); return s.size;
  }
  async invites(id: string) { return this.sets.get(K.inv(id))?.size || 0; }
  private set(k: string) { let s = this.sets.get(k); if (!s) { s = new Set(); this.sets.set(k, s); } return s; }
  async recentJoins() { return this.recent.slice(); }
  async allFeed() { return this.feed.slice(); }
  async removeFeed(test: (f: FeedItem) => boolean) { const before = this.feed.length; this.feed = this.feed.filter((f) => !test(f)); return before - this.feed.length; }
  async ban(uid: string, days: string[]) {
    this.set(K.banned).add(uid); this.zs(K.all).delete(uid); this.zs(K.diyas).delete(uid);
    days.forEach((d) => this.zs(K.day(d)).delete(uid));
    await this.removeFeed((f) => f.uid === uid);
  }
  async unban(uid: string) { this.set(K.banned).delete(uid); }
  async isBanned(uid: string) { return this.set(K.banned).has(uid); }
  async banned() { return [...this.set(K.banned)].map((id) => ({ id, name: this.users.get(id)?.name || 'Someone', city: this.users.get(id)?.city || '', state: this.users.get(id)?.state || '', at: 0 })); }
  async words() { return [...this.set(K.words)]; }
  async setWord(word: string, on: boolean) { if (on) this.set(K.words).add(word); else this.set(K.words).delete(word); }
  async removeCity(member: string) { this.zs(K.city).delete(member); }
}

let store: Store | null = null;
export function getStore(): Store {
  if (store) return store;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) store = new RedisStore(new Redis({ url, token }));
  else {
    if (process.env.NODE_ENV === 'production') console.warn('Upstash keys missing: using in-memory store. Data will not be shared between servers.');
    const g = globalThis as unknown as { __ekMem?: MemoryStore };
    store = g.__ekMem ??= new MemoryStore();
  }
  return store;
}
