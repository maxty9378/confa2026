import { NextResponse } from 'next/server';
import { getSettings, getDistricts } from '@/lib/directus';
import { getActiveSessionLabel } from '@/lib/store';

export async function GET() {
  try {
    const [settings, districts, activeLabel] = await Promise.all([
      getSettings(),
      getDistricts(),
      getActiveSessionLabel(),
    ]);

    const activeDistrict = activeLabel ? districts.find(d => d.id === activeLabel) : null;

    // Решаем, какие проценты отдать дашборду
    // Если сессия запущена, приоритет у данных округа (даже если там 0%)
    const useDistrict = activeDistrict != null;

    return NextResponse.json({
      course_test_percent: settings.course_test_percent ?? null,
      course_test_percent_gdf: useDistrict 
        ? (activeDistrict.course_test_percent_gdf ?? 0) 
        : (settings.course_test_percent_gdf ?? null),
      course_test_percent_sv: useDistrict 
        ? (activeDistrict.course_test_percent_sv ?? 0) 
        : (settings.course_test_percent_sv ?? null),
      active_session: activeLabel,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { course_test_percent: null, course_test_percent_gdf: null, course_test_percent_sv: null },
      { status: 200 }
    );
  }
}
