import { NextResponse } from 'next/server';
import { getDistricts, updateDistrict } from '@/lib/directus';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const districts = await getDistricts();
    return NextResponse.json(districts);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Ошибка загрузки округов' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, gdf, sv } = body as { id: string; gdf: number | null; sv: number | null };
    
    if (!id) {
      return NextResponse.json({ error: 'ID округа обязателен' }, { status: 400 });
    }

    await updateDistrict(id, {
      course_test_percent_gdf: gdf,
      course_test_percent_sv: sv,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Ошибка сохранения округа' }, { status: 500 });
  }
}
