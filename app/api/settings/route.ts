import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/directus';

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({
      course_test_percent: settings.course_test_percent ?? null,
      course_test_percent_gdf: settings.course_test_percent_gdf ?? null,
      course_test_percent_sv: settings.course_test_percent_sv ?? null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { course_test_percent: null, course_test_percent_gdf: null, course_test_percent_sv: null },
      { status: 200 }
    );
  }
}
