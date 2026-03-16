import { NextResponse } from 'next/server';
import { startNewSession } from '@/lib/store';

const SESSION_OPTIONS = ['СЗФО', 'ЮФО', 'ДВФО', 'ПФО', 'ЦФО', 'СФО+УФО'] as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const label = String(body.session_label || '').trim();

    if (!label || !SESSION_OPTIONS.includes(label as (typeof SESSION_OPTIONS)[number])) {
      return NextResponse.json(
        { error: 'Укажите корректную сессию' },
        { status: 400 }
      );
    }

    const stats = await startNewSession(label);

    return NextResponse.json({ ok: true, stats });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Не удалось начать новую сессию' },
      { status: 500 }
    );
  }
}

