import { NextResponse } from 'next/server';
import { deleteAllVotes } from '@/lib/directus';
import { refreshAndNotify } from '@/lib/store';

export async function POST() {
  try {
    await deleteAllVotes();
    const stats = await refreshAndNotify();
    return NextResponse.json({ ok: true, totalVotes: stats.totalVotes });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Не удалось обнулить ответы' },
      { status: 500 }
    );
  }
}
