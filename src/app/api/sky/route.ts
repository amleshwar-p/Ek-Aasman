import { getStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

// The shared state every page polls: total lights, people online, latest named rockets.
// Vercel's edge caches it for 4 seconds, so the database is read a few times a minute however many people are watching.
export async function GET() {
  const data = await getStore().sky();
  return Response.json(
    { ...data, feed: data.feed.map(({ text, where, ts }) => ({ text, where, ts })) },
    { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=4, stale-while-revalidate=8' } }
  );
}
