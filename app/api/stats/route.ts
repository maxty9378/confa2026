import { NextResponse } from 'next/server';
import { getStatsSnapshot } from '@/lib/store';

export async function GET() {
  const stats = await getStatsSnapshot();
  return NextResponse.json(stats);
}
