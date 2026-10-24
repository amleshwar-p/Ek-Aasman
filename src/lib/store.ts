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
}

const K = {
  lights: 'ek:lights', online: 'ek:online', feed: 'ek:feed', all: 'ek:lb:all', diyas: 'ek:lb:diyas',
  city: 'ek:lb:city', state: 'ek:lb:state', day: (d: string) => `ek:lb:day:${d}`, user: (id: string) => `ek:u:${id}`
};
const ONLINE_WINDOW = 70_000;

export function istDay(now = Date.now()) {
  return new Date(now + 330 * 60_000).toISOString().slice(0, 10);
}

class RedisStore implements Store {
  constructor(private r: Redis) {}
  async createUser(u: { id: string; name: string; city: string; state: string }) {
    await this.r.hset(K.user(u.id), { name: u.name, city: u.city, state: u.state, at: Date.now() });
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
  async createUser(u: { id: string; name: string; city: string; state: string }) { this.users.set(u.id, u); }
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
