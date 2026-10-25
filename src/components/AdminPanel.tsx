'use client';
import { useEffect, useState } from 'react';

// The moderation page. The admin secret is typed here and kept only in this tab (sessionStorage).
type Feed = { text: string; where: string; ts: number; uid: string };
type Player = { id: string; name: string; city: string; state: string; at: number };
type City = { name: string; sub: string; score: number };
type Data = { feed: Feed[]; recent: Player[]; cities: City[]; banned: Player[]; words: string[] };

const ago = (ts: number) => { const s = Math.max(0, (Date.now() - ts) / 1000); return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)} min ago` : s < 86400 ? `${Math.floor(s / 3600)} h ago` : `${Math.floor(s / 86400)} d ago`; };
const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--line)' };
const small: React.CSSProperties = { height: 34, padding: '0 12px', fontSize: 13 };
const h2: React.CSSProperties = { fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, margin: '32px 0 4px' };

export default function AdminPanel() {
  const [key, setKey] = useState('');
  const [typed, setTyped] = useState('');
  const [data, setData] = useState<Data | null>(null);
  const [msg, setMsg] = useState('');
  const [word, setWord] = useState('');

  async function call(action: string, extra: Record<string, unknown> = {}, k = key) {
    const r = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': k }, body: JSON.stringify({ action, ...extra }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.error || 'Something went wrong');
      if (r.status === 401) { setKey(''); setData(null); try { sessionStorage.removeItem('ek-admin'); } catch { /* blocked */ } }
      return null;
    }
    return j;
  }
  async function load(k = key) {
    const d = await call('load', {}, k);
    if (d) { setData(d); setKey(k); try { sessionStorage.setItem('ek-admin', k); } catch { /* blocked */ } }
  }
  async function act(action: string, extra: Record<string, unknown>, done: string) {
    if (await call(action, extra)) { setMsg(done); await load(); }
  }
  useEffect(() => {
    let saved = '';
    try { saved = sessionStorage.getItem('ek-admin') || ''; } catch { /* blocked */ }
    if (saved) load(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ban = (id: string, name: string) => { if (confirm(`Ban ${name}? They come off every leaderboard and the feed, and nothing they light will count.`)) act('ban', { uid: id }, `${name} is banned.`); };

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '40px max(16px, env(safe-area-inset-left, 0px)) 80px', color: 'var(--ink)', overflow: 'auto', height: '100%', lineHeight: 1.5 }}>
      <p className="eyebrow">Ek Aasmaan</p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 40, margin: '0 0 8px' }}>Moderation</h1>
      {!data ? (
        <form onSubmit={(e) => { e.preventDefault(); load(typed.trim()); }} style={{ display: 'grid', gap: 12, maxWidth: 420, marginTop: 20 }}>
          <div className="field"><label htmlFor="adminKey">Admin secret</label>
            <input id="adminKey" type="password" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} /></div>
          <button className="btn btn--primary" type="submit">Open</button>
          {msg && <p style={{ color: 'var(--rose)', margin: 0 }}>{msg}</p>}
        </form>
      ) : (
        <>
          <p style={{ color: 'var(--ink-soft)', margin: 0 }}>Changes reach everyone within about 20 seconds. {msg && <b style={{ color: 'var(--marigold-soft)' }}>{msg}</b>}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn--ghost" style={small} onClick={() => { setMsg(''); load(); }}>Refresh</button>
            <button className="btn btn--ghost" style={small} onClick={() => { try { sessionStorage.removeItem('ek-admin'); } catch { /* blocked */ } setKey(''); setData(null); setTyped(''); }}>Lock</button>
          </div>

          <h2 style={h2}>Named rockets in the sky</h2>
          {!data.feed.length && <p style={{ color: 'var(--muted)' }}>None yet.</p>}
          {data.feed.map((f) => (
            <div key={f.ts + f.uid} style={row}>
              <span style={{ flex: 1, minWidth: 0 }}><b>{f.text}</b> <span style={{ color: 'var(--muted)' }}>· {f.where} · {ago(f.ts)}</span></span>
              <button className="btn btn--ghost" style={small} onClick={() => act('hide', { ts: f.ts, uid: f.uid }, 'Rocket hidden.')}>Hide</button>
              <button className="btn btn--ghost" style={small} onClick={() => ban(f.uid, f.text)}>Ban player</button>
            </div>
          ))}

          <h2 style={h2}>Newest players</h2>
          {data.recent.map((p) => (
            <div key={p.id} style={row}>
              <span style={{ flex: 1, minWidth: 0 }}><b>{p.name}</b> <span style={{ color: 'var(--muted)' }}>· {p.city}, {p.state} · {ago(p.at)}</span></span>
              {data.banned.some((b) => b.id === p.id) ? <span style={{ color: 'var(--rose)', fontSize: 13 }}>Banned</span>
                : <button className="btn btn--ghost" style={small} onClick={() => ban(p.id, p.name)}>Ban</button>}
            </div>
          ))}

          <h2 style={h2}>Cities board</h2>
          {data.cities.map((c) => (
            <div key={c.name + c.sub} style={row}>
              <span style={{ flex: 1 }}><b>{c.name}</b> <span style={{ color: 'var(--muted)' }}>· {c.sub} · {c.score} lights</span></span>
              <button className="btn btn--ghost" style={small} onClick={() => { if (confirm(`Take "${c.name}" off the Cities board?`)) act('city', { member: `${c.name}|${c.sub}` }, `${c.name} removed from the board.`); }}>Remove</button>
            </div>
          ))}

          <h2 style={h2}>Blocked words</h2>
          <p style={{ color: 'var(--muted)', margin: '0 0 8px' }}>Added on top of the built-in list. New names, cities and named rockets with these words are refused. Hindi script works too.</p>
          <form onSubmit={(e) => { e.preventDefault(); if (word.trim()) { act('word', { word, on: true }, `"${word.trim()}" blocked.`); setWord(''); } }} style={{ display: 'flex', gap: 8, maxWidth: 420 }}>
            <div className="field" style={{ flex: 1 }}><input aria-label="Word to block" value={word} onChange={(e) => setWord(e.target.value)} /></div>
            <button className="btn btn--primary" style={{ height: 46 }} type="submit">Block</button>
          </form>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {data.words.map((w) => <button key={w} className="btn btn--ghost" style={small} onClick={() => act('word', { word: w, on: false }, `"${w}" unblocked.`)}>{w} ×</button>)}
          </div>

          <h2 style={h2}>Banned players</h2>
          {!data.banned.length && <p style={{ color: 'var(--muted)' }}>Nobody.</p>}
          {data.banned.map((p) => (
            <div key={p.id} style={row}>
              <span style={{ flex: 1 }}><b>{p.name}</b> <span style={{ color: 'var(--muted)' }}>· {p.city}</span></span>
              <button className="btn btn--ghost" style={small} onClick={() => act('unban', { uid: p.id }, `${p.name} unbanned.`)}>Unban</button>
            </div>
          ))}
        </>
      )}
    </main>
  );
}
