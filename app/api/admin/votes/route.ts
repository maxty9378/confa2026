import { NextResponse } from 'next/server';
import { getVotes } from '@/lib/directus';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const votes = await getVotes();
    // Возвращаем последние 50 для админки
    const recent = votes.sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 50);
    return NextResponse.json(recent);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Не удалось загрузить ответы' },
      { status: 500 }
    );
  }
}
