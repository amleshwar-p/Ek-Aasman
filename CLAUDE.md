# Ek Aasmaan: notes for Claude Code

Read this first. It records what the project is and the decisions already made with Aditya (the owner).

## What it is
A free, desktop-first (also works on phones) 3D web app for Diwali 2026. Everyone shares one night sky over a stylised Indian city. You stand on your decorated rooftop, light diyas and crackers, launch rockets (including "named rockets" that write your name in the sky for everyone), fly over the city in Sky view, draw a rangoli, decorate your home, and climb leaderboards. Inspired by the "Ravan Dahan" virtual Dussehra site.

- Diwali 2026: Dhanteras 6 Nov, Choti Diwali 7 Nov, **Lakshmi Puja 8 Nov** (Mahadeep moment 6:29 pm IST), Govardhan 9 Nov, Bhai Dooj 10 Nov. Target launch: 4–5 Nov.
- Promotion: family WhatsApp groups first, then Aditya's Instagram (100–200K monthly reach). Expect hundreds to a few thousand users. Plan for a viral spike without breaking.

## Decisions (don't undo without asking Aditya)
- **No sign-up / no Google login.** Join = name + city + state. A server-signed token in localStorage identifies the player.
- **No money anywhere.** No coins, no shop, no payments, no paid boosts. Points and ranks can't be bought.
- **Free kit with short refill timers:** rocket 1/30 s (hold 5), anar/chakri/phuljhadi/bomb 1/45 s (hold 3), ladi 1/60 s (hold 2), sky shot 1/90 s, diya 11 per 10 min (hold 51), named rocket earned. Mirrored on the server in `src/lib/items.ts`.
- **Support / charity:** "Every 1,00,000 lights = 100 real diyas for families and mandirs." The UPI or support link will come later. Until then the panel says "Support details are coming soon."
- **Realistic goals:** no 1 crore target. Milestone ladder: 11,000 → 51,000 → 1,01,000 → 5,01,000 → 11,00,000 → 26,17,000 (Ayodhya Deepotsav 2025 record of 26.17 lakh diyas).
- **Honesty:** never show invented people, names, counts or online numbers as if real. Ambient fireworks are fine, but only real named rockets get name labels. The leaderboards and counters come from the API.
- **Time of day follows IST** (sun position for central India). The "Daylight" test button is hidden unless the URL has `?test`.
- Hosting: **Vercel**. Database: **Upstash Redis** (via the Vercel Marketplace). Don't push or deploy without Aditya asking.

## Architecture
- Next.js 16 App Router, TypeScript for server code. `reactStrictMode: false` because the engine must start once.
- `src/components/SkyUI.tsx` renders all markup once. `src/sky/engine.js` (large vanilla JS module, three.js) grabs elements by id and drives everything: scene, fireworks, sound (Web Audio, synthesised), drawers, rangoli studio, polling. It was ported from a single-file prototype, so it is long; keep changes surgical.
- API routes in `src/app/api/*`: `join`, `lights` (batched counts → server-computed points, per-item kit caps), `named` (template-only text, 1 per 20 s), `beat` (online presence while idle; `lights` also marks you online), `sky` (edge-cached 10 s, polled every 10 s), `ranks` (edge-cached 10 s).
- `src/lib/store.ts`: `RedisStore` (Upstash) or `MemoryStore` fallback when keys are missing (local dev). Redis keys are prefixed `ek:`.
- Functions run in Mumbai (`vercel.json` regions `bom1`), next to the Upstash database. Returning players (token in localStorage) skip the welcome screen.
- Env: `SESSION_SECRET` (required in production), Upstash keys `UPSTASH_REDIS_REST_URL/TOKEN` or `KV_REST_API_URL/TOKEN`.

## Commands
- `npm install`, `npm run dev` (http://localhost:3000, add `?test` for the time control), `npm run build`.

## Next steps (Stage B, before 4 Nov)
1. Moderation: an admin view (protected by a secret) to hide a feed item or ban a name; a bigger Hindi/Hinglish blocklist.
2. Rangoli sharing: save the rangoli image (Vercel Blob) and show other players' rangolis on their terraces in Sky view; likes for a "Rangoli" leaderboard.
3. Family Sky links (`/s/<code>`): a private group with its own leaderboard, for WhatsApp groups.
4. Share card image (`/api/og`) with name, points, rank, city. Also an Open Graph image for link previews.
5. Daily streak and invite rewards (named rockets), server-tracked.
6. Bot protection on join (Cloudflare Turnstile) if spam appears.
7. Phone performance: a low-power mode (fewer buildings, no shadows, lower particle counts) chosen automatically.
8. Better sounds: replace synthesised booms with CC0 recordings.
9. Mahadeep moment on 8 Nov 6:29 pm IST: a synced countdown and everyone lights one diya together. Load-test `/api/lights` and `/api/sky` before then.
10. `/privacy` promises deletion after Diwali 2026 once totals are announced (no fixed date). Contact: amleshwar.pa@gmail.com. When the time comes, delete the `ek:*` keys in Upstash.

## Style
Dark night palette (marigold `#F6A93B`, rose `#FF8DA3`), fonts Tiro Devanagari Hindi (display) + Mukta (UI). Plain, friendly English copy. No emoji in the UI. Explain things to Aditya simply but keep the technical details.
