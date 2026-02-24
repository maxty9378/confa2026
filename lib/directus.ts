const DIRECTUS_URL = process.env.DIRECTUS_URL?.replace(/\/$/, '') || '';
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || '';

const COLLECTION = 'votes';

/** Таймаут запроса к Directus (мс). Снижает риск «зависания» при нестабильной сети. */
const FETCH_TIMEOUT_MS = 25000;
/** Число повторов при сетевой ошибке или таймауте. */
const FETCH_RETRIES = 3;

function headers(): HeadersInit {
  const h: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (DIRECTUS_TOKEN) {
    (h as Record<string, string>)['Authorization'] = `Bearer ${DIRECTUS_TOKEN}`;
  }
  return h;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < FETCH_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res;
    } catch (e) {
      clearTimeout(timeoutId);
      lastErr = e instanceof Error ? e : new Error(String(e));
      const isAbort = (e as { name?: string })?.name === 'AbortError';
      if (isAbort) lastErr = new Error('CONNECT_TIMEOUT');
      if (attempt === FETCH_RETRIES - 1) break;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr ?? new Error('Request failed');
}

export interface DirectusVote {
  id?: number;
  role: string;
  value: number;
  date_created?: string;
}

export async function createVote(role: string, value: number): Promise<DirectusVote> {
  try {
    const res = await fetchWithRetry(`${DIRECTUS_URL}/items/${COLLECTION}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ role, value }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Directus: ${res.status} ${err}`);
    }
    return res.json() as Promise<DirectusVote>;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'CONNECT_TIMEOUT') throw new Error('CONNECT_TIMEOUT');
    throw e;
  }
}

export async function getVotes(): Promise<{ role: string; value: number }[]> {
  try {
    const res = await fetchWithRetry(
      `${DIRECTUS_URL}/items/${COLLECTION}?fields=role,value&limit=-1`,
      { headers: headers() }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Directus: ${res.status} ${err}`);
    }
    const data = await res.json();
    const list = data?.data ?? data;
    return Array.isArray(list) ? list : [];
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'CONNECT_TIMEOUT') throw new Error('CONNECT_TIMEOUT');
    throw e;
  }
}

/** Удаляет все записи в коллекции votes (обнуление ответов на опрос). */
export async function deleteAllVotes(): Promise<void> {
  try {
    const resList = await fetchWithRetry(
      `${DIRECTUS_URL}/items/${COLLECTION}?fields=id&limit=-1`,
      { headers: headers() }
    );
    if (!resList.ok) {
      const err = await resList.text();
      throw new Error(`Directus: ${resList.status} ${err}`);
    }
    const data = await resList.json();
    const list = data?.data ?? data;
    const ids = Array.isArray(list) ? list.map((r: { id: number }) => r.id) : [];
    if (ids.length === 0) return;
    const resDelete = await fetchWithRetry(`${DIRECTUS_URL}/items/${COLLECTION}`, {
      method: 'DELETE',
      headers: headers(),
      body: JSON.stringify(ids),
    });
    if (!resDelete.ok) {
      const err = await resDelete.text();
      throw new Error(`Directus: ${resDelete.status} ${err}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'CONNECT_TIMEOUT') throw new Error('CONNECT_TIMEOUT');
    throw e;
  }
}

// Настройки конференции (результаты тестирования по ГДф и СВ) — одна запись в confa_settings
const SETTINGS_COLLECTION = 'confa_settings';

export interface ConfaSettings {
  id?: number;
  course_test_percent?: number | null;
  course_test_percent_gdf: number | null;
  course_test_percent_sv: number | null;
}

const SETTINGS_FIELDS = 'id,course_test_percent,course_test_percent_gdf,course_test_percent_sv';

export async function getSettings(): Promise<ConfaSettings> {
  try {
    const res = await fetchWithRetry(
      `${DIRECTUS_URL}/items/${SETTINGS_COLLECTION}?fields=${SETTINGS_FIELDS}&limit=1`,
      { headers: headers() }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Directus: ${res.status} ${err}`);
    }
    const data = await res.json();
    const list = data?.data ?? data;
    const row = Array.isArray(list) ? list[0] : list;
    if (!row)
      return { course_test_percent_gdf: null, course_test_percent_sv: null };
    return {
      id: row.id,
      course_test_percent: row.course_test_percent ?? null,
      course_test_percent_gdf: row.course_test_percent_gdf ?? null,
      course_test_percent_sv: row.course_test_percent_sv ?? null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'CONNECT_TIMEOUT') throw new Error('CONNECT_TIMEOUT');
    throw e;
  }
}

function clamp(n: number | null): number | null {
  if (n === null || n === undefined) return null;
  const v = Math.round(Number(n));
  return Number.isNaN(v) ? null : Math.max(0, Math.min(100, v));
}

export async function updateSettings(payload: {
  course_test_percent_gdf?: number | null;
  course_test_percent_sv?: number | null;
}): Promise<ConfaSettings> {
  const current = await getSettings();
  const body: Record<string, number | null> = {};
  if (payload.course_test_percent_gdf !== undefined)
    body.course_test_percent_gdf = clamp(payload.course_test_percent_gdf);
  if (payload.course_test_percent_sv !== undefined)
    body.course_test_percent_sv = clamp(payload.course_test_percent_sv);

  try {
    if (current.id != null) {
      const res = await fetchWithRetry(
        `${DIRECTUS_URL}/items/${SETTINGS_COLLECTION}/${current.id}`,
        {
          method: 'PATCH',
          headers: headers(),
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Directus: ${res.status} ${err}`);
      }
      const updated = (await res.json()) as { data?: ConfaSettings };
      return updated?.data ?? { ...current, ...body };
    }

    const res = await fetchWithRetry(`${DIRECTUS_URL}/items/${SETTINGS_COLLECTION}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        course_test_percent_gdf: body.course_test_percent_gdf ?? null,
        course_test_percent_sv: body.course_test_percent_sv ?? null,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Directus: ${res.status} ${err}`);
    }
    const created = (await res.json()) as { data?: ConfaSettings };
    const result: ConfaSettings = {
      course_test_percent_gdf: body.course_test_percent_gdf ?? null,
      course_test_percent_sv: body.course_test_percent_sv ?? null,
    };
    return created?.data ?? result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'CONNECT_TIMEOUT') throw new Error('CONNECT_TIMEOUT');
    throw e;
  }
}
