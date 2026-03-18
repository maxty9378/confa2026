/**
 * Проставляет date_created всем существующим голосам (votes), где оно пустое.
 * Цель: 15.03.2026 12:00 (МСК) => 2026-03-15T09:00:00.000Z (UTC).
 *
 * Запуск: node scripts/backfill-votes-date-created-2026-03-15-1200-msk.mjs
 * Требуется .env.local с DIRECTUS_URL и DIRECTUS_TOKEN (токен с правами admin на items/fields).
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  const env = { ...process.env };
  for (const envFile of [resolve(root, '.env.local'), resolve(process.cwd(), '.env.local')]) {
    if (!existsSync(envFile)) continue;
    const content = readFileSync(envFile, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (key) env[key] = val;
    }
    break;
  }
  return env;
}

const { DIRECTUS_URL, DIRECTUS_TOKEN } = loadEnv();
const base = (DIRECTUS_URL || '').replace(/\/$/, '');
if (!base || !DIRECTUS_TOKEN) {
  console.error('В .env.local задайте DIRECTUS_URL и DIRECTUS_TOKEN.');
  process.exit(1);
}

const COLLECTION = 'votes';
const TARGET_UTC_ISO = '2026-03-15T09:00:00.000Z';

async function directusJson(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      ...(options?.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  return { res, text, json };
}

async function main() {
  const listUrl = `${base}/items/${COLLECTION}?fields=id,date_created&limit=-1`;
  const { res: listRes, text: listText, json: listJson } = await directusJson(listUrl, {
    method: 'GET',
  });
  if (!listRes.ok) {
    console.error('Не удалось получить список votes (%d): %s', listRes.status, listText);
    process.exit(1);
  }

  const rows = listJson?.data ?? listJson;
  const list = Array.isArray(rows) ? rows : [];
  const toUpdate = list.filter((r) => !r?.date_created).map((r) => r.id).filter((id) => id != null);

  console.log('Всего votes: %d', list.length);
  console.log('Без date_created: %d', toUpdate.length);
  if (toUpdate.length === 0) {
    console.log('Нечего обновлять.');
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const id of toUpdate) {
    const patchUrl = `${base}/items/${COLLECTION}/${encodeURIComponent(id)}`;
    const { res: patchRes, text: patchText } = await directusJson(patchUrl, {
      method: 'PATCH',
      body: JSON.stringify({ date_created: TARGET_UTC_ISO }),
    });
    if (patchRes.ok) {
      ok++;
      if (ok % 50 === 0) console.log('Обновлено: %d/%d', ok, toUpdate.length);
    } else {
      fail++;
      console.error('Ошибка PATCH id=%s (%d): %s', String(id), patchRes.status, patchText);
      // продолжаем, чтобы обновить максимум
    }
  }

  console.log('Готово. Успешно: %d, ошибок: %d.', ok, fail);
}

main();

