# Ek Aasmaan · एक आसमान

One shared Diwali night sky for all of India. People join with a name, city and state (no sign-up), light diyas and crackers from their rooftop, fly over the city in Sky view, draw a rangoli, and climb the leaderboards. Every 1,00,000 lights becomes 100 real diyas for families and mandirs.

- **Frontend:** Next.js (React) page with a three.js 3D scene.
- **Backend:** Next.js API routes running on Vercel.
- **Database:** Upstash Redis (counter, online count, named-rocket feed, leaderboards).

---

## 1. Run it on your laptop (Windows)

You only need this once.

1. Install **Node.js 22 LTS** from https://nodejs.org (the big green "LTS" button). Accept the defaults.
2. Open this folder in **VS Code**.
3. Open the terminal in VS Code (`Ctrl + \``) and run:

   ```
   npm install
   npm run dev
   ```

4. Open http://localhost:3000 in Chrome.

It works straight away **without any database**. The data is kept in memory and resets when you stop `npm run dev`. That's fine for trying things.

To try the time-of-day test button, open http://localhost:3000/?test

---

## 2. Put the code on GitHub

Easiest way: **GitHub Desktop** (https://desktop.github.com).

1. Open GitHub Desktop → File → **Add local repository** → pick this folder → it asks to "create a repository" → yes.
2. Write a summary like `First version` → **Commit to main**.
3. Click **Publish repository**. Keep it **Private** if you like (Vercel can still read it).

The `.gitignore` file already stops `node_modules`, `.next` and any `.env` secrets from being uploaded.

---

## 3. Put it live on Vercel

1. Go to https://vercel.com → **Add New… → Project**.
2. Pick the `ek-aasmaan` repository → **Import**. Vercel detects Next.js by itself. Don't change anything → **Deploy**.
3. After a minute you get a link like `ek-aasmaan.vercel.app`. The site is live, still in memory mode.

### 3a. Add the database (Upstash Redis)

Upstash Redis is a small, very fast online database. We use it for the shared counter, the online count, the named rockets and the leaderboards. Vercel sets it up for you:

1. In your Vercel project, open the **Storage** tab → **Create Database** (or **Browse Marketplace**).
2. Choose **Upstash** → **Upstash for Redis** → **Continue**.
3. Pick the **Free** plan and the region closest to India (**Mumbai / ap-south-1** if listed, otherwise Singapore).
4. Name it `ek-aasmaan` → **Create** → when asked, **connect it to the ek-aasmaan project** (all environments).

That adds the connection keys (`KV_REST_API_URL` / `KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) to the project automatically. The code accepts either name.

### 3b. Add the secret

1. Make a long random string. In the VS Code terminal:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Vercel project → **Settings → Environment Variables** → add `SESSION_SECRET` = that string (all environments) → **Save**.

### 3c. Redeploy

**Deployments** tab → the three dots on the latest one → **Redeploy**. Done: the site now shares one sky across everyone.

From now on, every time you push to GitHub (Commit + Push in GitHub Desktop), Vercel puts the new version live by itself.

### 3d. Your own domain (optional)

Buy a domain (for example `ekaasmaan.in`) from any registrar. In Vercel: **Settings → Domains → Add**, then copy the DNS records it shows into your registrar. It takes a few minutes to an hour.

---

## 4. Check after going live

- [ ] Open the site on your phone and laptop at the same time: the **online** count shows 2.
- [ ] Join on one, light some crackers: within ~30 seconds the **Lights across India** number goes up on the other.
- [ ] Send a named rocket: it flies up on the other screen within ~20 seconds and appears under "In the sky now".
- [ ] **Ranks** shows you on Today, Cities and States.
- [ ] Try joining with a rude name: it's refused.
- [x] `/privacy` has the contact email and says data is deleted after Diwali 2026: `src/app/privacy/page.tsx`.

---

## 5. How it works

```
Browser (3D page)                          Vercel (Next.js API)                 Upstash Redis
  every 10 s  GET  /api/sky   ───────────▶  cached 10 s at Vercel's edge ─────▶  lights, online, feed
  every 30 s  POST /api/beat  ───────────▶  "I'm here" ping, only while idle ──▶  online set
  every 15 s  POST /api/lights ──────────▶  checks kit refill rates, adds points, marks you online ▶ counter + leaderboards
  on join     POST /api/join  ───────────▶  checks name/city/state, signs a token
  named rocket POST /api/named ──────────▶  builds text from template, 1 per 20 s ▶ feed
  Ranks panel GET  /api/ranks ───────────▶  cached 10 s
```

- **No accounts.** On join the server signs a small token (name, city, state, random id) with `SESSION_SECRET`. The browser keeps it and sends it with points, so nobody can post points as someone else.
- **No cheating the board.** The server keeps its own copy of each player's free kit and only accepts what could have refilled (for example 1 rocket per 30 s). Points are worked out on the server.
- **Cheap at any scale.** `/api/sky` is cached at Vercel's edge, so 10 or 10,000 people watching cost the database the same few reads a minute. Lights are sent in batches every 15 seconds, and API functions run in Mumbai (`vercel.json`).
- **Names are filtered** (`src/lib/filter.ts`): letters only (Hindi works), 2–20 characters, plus a starter list of English and Hinglish abuse. Add words there as you see what people try.

### Files

| Path | What it is |
|---|---|
| `src/sky/engine.js` | The whole 3D sky: city, sun and time of day, fireworks, sound, panels, rangoli studio, and the calls to the API |
| `src/components/SkyUI.tsx` | The page markup (buttons, panels, join form). The engine finds elements by `id` |
| `src/app/globals.css` | All styles |
| `src/app/api/*/route.ts` | The backend endpoints |
| `src/lib/store.ts` | Database layer: Upstash in production, in-memory locally |
| `src/lib/filter.ts` | Name, city and state checks |
| `src/lib/items.ts` | Points and kit refill rules (server side) |
| `src/app/privacy/page.tsx` | Privacy page |

### Cost

- Vercel Hobby: free (personal, non-commercial use).
- Upstash Free: 500K commands a month, then $0.20 per 100K. A few thousand players over Diwali fits in the free plan. A viral 50K would cost roughly $10.
