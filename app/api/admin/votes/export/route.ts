import { NextResponse } from 'next/server';
import { getVotesForExport, getSessions } from '@/lib/directus';

export async function GET() {
  try {
    const [votes, sessions] = await Promise.all([
      getVotesForExport(),
      getSessions(),
    ]);

    const sep = ';';
    const quote = (v: unknown) => {
      const s = String(v ?? '');
      const escaped = s.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    // Отсортируем сессии по start_from_id по возрастанию,
    // чтобы для каждого ответа найти ближайшую "последнюю" сессию.
    const sortedSessions = [...sessions].sort((a, b) => {
      const aId = a.start_from_id ?? 0;
      const bId = b.start_from_id ?? 0;
      return aId - bId;
    });

    const findSessionForVote = (voteId: number | undefined) => {
      if (!voteId) return { label: '', started_at: '' };
      let found: { label: string; started_at: string } | null = null;
      for (const s of sortedSessions) {
        const sid = s.start_from_id ?? 0;
        if (sid <= voteId) {
          found = {
            label: s.label,
            started_at: s.started_at ?? '',
          };
        } else {
          break;
        }
      }
      return found ?? { label: '', started_at: '' };
    };

    const header = ['id', 'role', 'value', 'session_label', 'session_started_at'];
    const rows = votes.map((v) => {
      const session = findSessionForVote(v.id);
      return [v.id ?? '', v.role, v.value, session.label, session.started_at];
    });

    const csvWithoutBom = [
      header.map(quote).join(sep),
      ...rows.map((r) => r.map(quote).join(sep)),
    ].join('\r\n');

    const csv = `\uFEFF${csvWithoutBom}`;

    const filename = `votes-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Не удалось экспортировать ответы' },
      { status: 500 }
    );
  }
}

