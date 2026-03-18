import { NextResponse } from 'next/server';
import { deleteVote } from '@/lib/store';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stats = await deleteVote(Number(id));
    return NextResponse.json({ ok: true, stats });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Не удалось удалить ответ' },
      { status: 500 }
    );
  }
}
