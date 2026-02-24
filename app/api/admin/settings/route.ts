import { NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/directus';

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const gdf =
      body.course_test_percent_gdf === undefined
        ? undefined
        : body.course_test_percent_gdf === null
          ? null
          : Number(body.course_test_percent_gdf);
    const sv =
      body.course_test_percent_sv === undefined
        ? undefined
        : body.course_test_percent_sv === null
          ? null
          : Number(body.course_test_percent_sv);
    if (gdf !== undefined && gdf !== null && (Number.isNaN(gdf) || gdf < 0 || gdf > 100)) {
      return NextResponse.json({ error: 'ГДф: укажите число от 0 до 100' }, { status: 400 });
    }
    if (sv !== undefined && sv !== null && (Number.isNaN(sv) || sv < 0 || sv > 100)) {
      return NextResponse.json({ error: 'СВ: укажите число от 0 до 100' }, { status: 400 });
    }
    const payload: { course_test_percent_gdf?: number | null; course_test_percent_sv?: number | null } = {};
    if (gdf !== undefined) payload.course_test_percent_gdf = gdf;
    if (sv !== undefined) payload.course_test_percent_sv = sv;
    const settings = await updateSettings(payload);
    return NextResponse.json(settings);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Ошибка сохранения' }, { status: 500 });
  }
}
