import { BOARDS, getStore, istDay, type Board } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const b = new URL(req.url).searchParams.get('board') as Board;
  const board: Board = BOARDS.includes(b) ? b : 'today';
  const rows = await getStore().ranks(board, istDay());
  return Response.json({ board, rows }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=20' } });
}
