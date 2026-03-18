import { NextResponse } from 'next/server';
import { getSessions, getVotesForAdmin } from '@/lib/directus';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [votes, sessions] = await Promise.all([getVotesForAdmin(), getSessions()]);

    const sortedSessions = [...sessions].sort((a, b) => (a.start_from_id ?? 0) - (b.start_from_id ?? 0));
    const findSessionForVote = (voteId: number | undefined) => {
      if (!voteId) return { label: '', date_created: '' };
      let found: { label: string; date_created: string } | null = null;
      for (const s of sortedSessions) {
        const sid = s.start_from_id ?? 0;
        // Граница сессии: start_from_id хранит ID "на момент старта" (последний до новой сессии),
        // поэтому сам этот голос НЕ должен попадать в новую сессию.
        if (sid < voteId) found = { label: s.label, date_created: s.date_created ?? '' };
        else break;
      }
      return found ?? { label: '', date_created: '' };
    };

    // Возвращаем последние 50 для админки
    const recent = votes
      .filter((v) => v.id != null)
      .sort((a, b) => (b.id || 0) - (a.id || 0))
      .slice(0, 50)
      .map((v) => {
        const session = findSessionForVote(v.id);
        return {
          id: v.id as number,
          role: v.role,
          value: v.value,
          date_created: v.date_created ?? null,
          session_label: session.label,
          session_started_at: session.date_created || null,
        };
      });

    return NextResponse.json(recent);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Не удалось загрузить ответы' },
      { status: 500 }
    );
  }
}
