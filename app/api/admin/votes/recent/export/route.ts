import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getSessions, getVotesForAdmin } from '@/lib/directus';

export const dynamic = 'force-dynamic';

function asDate(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatMsk(d: Date | null): string {
  if (!d) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export async function GET() {
  try {
    const [votes, sessions] = await Promise.all([getVotesForAdmin(), getSessions()]);

    const sortedSessions = [...sessions].sort(
      (a, b) => (a.start_from_id ?? 0) - (b.start_from_id ?? 0)
    );
    const findSessionForVote = (voteId: number | undefined) => {
      if (!voteId) return { label: '', date_created: '' };
      let found: { label: string; date_created: string } | null = null;
      for (const s of sortedSessions) {
        const sid = s.start_from_id ?? 0;
        if (sid < voteId) found = { label: s.label, date_created: s.date_created ?? '' };
        else break;
      }
      return found ?? { label: '', date_created: '' };
    };

    const all = votes
      .filter((v) => v.id != null)
      .sort((a, b) => (b.id || 0) - (a.id || 0))
      .map((v) => {
        const s = findSessionForVote(v.id);
        const voteCreatedAt = asDate(v.date_created ?? null);
        const sessionStartedAt = asDate(s.date_created || null);
        return {
          id: v.id as number,
          session: s.label || null,
          time: voteCreatedAt,
          // Если нет прав на date_created у голоса — в админке показываем старт сессии
          time_fallback: !voteCreatedAt ? sessionStartedAt : null,
          role: v.role,
          value: v.value,
        };
      });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'confa2026';
    wb.created = new Date();
    const ws = wb.addWorksheet('Ответы', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    ws.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Округ / сессия', key: 'session', width: 16 },
      { header: 'Время (МСК)', key: 'time', width: 18 },
      { header: 'Роль', key: 'role', width: 10 },
      { header: 'Значение, %', key: 'value', width: 14 },
    ];

    // Header style
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF374151' } },
        left: { style: 'thin', color: { argb: 'FF374151' } },
        bottom: { style: 'thin', color: { argb: 'FF374151' } },
        right: { style: 'thin', color: { argb: 'FF374151' } },
      };
    });

    // Data rows
    for (const r of all) {
      const excelTime = r.time ?? r.time_fallback ?? null;
      ws.addRow({
        id: r.id,
        session: r.session ?? '',
        time: formatMsk(excelTime),
        role: r.role,
        value: r.value,
      });
    }

    // Format columns
    ws.getColumn('id').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getColumn('session').alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getColumn('role').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getColumn('value').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getColumn('value').numFmt = '0.0';
    ws.getColumn('time').alignment = { horizontal: 'left', vertical: 'middle' };

    // Table-like borders for data
    const lastRow = ws.lastRow?.number ?? 1;
    for (let i = 2; i <= lastRow; i++) {
      const row = ws.getRow(i);
      row.height = 18;
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    }

    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, lastRow), column: ws.columns.length },
    };

    const buf = await wb.xlsx.writeBuffer();
    const filename = `votes-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Не удалось экспортировать Excel' },
      { status: 500 }
    );
  }
}

