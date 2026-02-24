import { NextResponse } from 'next/server';
import { addVote } from '@/lib/store';
import type { Role } from '@/lib/store';

const ROLES: Role[] = ['ГДф', 'СВ'];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { role, value } = body as { role?: string; value?: unknown };

    if (!role || !ROLES.includes(role as Role)) {
      return NextResponse.json(
        { error: 'Укажите роль: ГДф или СВ' },
        { status: 400 }
      );
    }

    const num = typeof value === 'number' ? value : parseInt(String(value), 10);
    if (Number.isNaN(num) || num < 10 || num > 100) {
      return NextResponse.json(
        { error: 'Оценка от 10 до 100' },
        { status: 400 }
      );
    }

    const stats = await addVote(role as Role, num);
    return NextResponse.json({ ok: true, stats });
  } catch {
    return NextResponse.json({ error: 'Ошибка запроса' }, { status: 400 });
  }
}
