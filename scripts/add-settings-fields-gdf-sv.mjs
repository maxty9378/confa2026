/**
 * Добавляет в коллекцию confa_settings поля: course_test_percent_gdf, course_test_percent_sv.
 * Запуск: node scripts/add-settings-fields-gdf-sv.mjs
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

const COLLECTION = 'confa_settings';

const fields = [
  {
    field: 'course_test_percent_gdf',
    type: 'integer',
    schema: {},
    meta: {
      collection: COLLECTION,
      field: 'course_test_percent_gdf',
      interface: 'input',
      required: false,
      options: { min: 0, max: 100 },
    },
  },
  {
    field: 'course_test_percent_sv',
    type: 'integer',
    schema: {},
    meta: {
      collection: COLLECTION,
      field: 'course_test_percent_sv',
      interface: 'input',
      required: false,
      options: { min: 0, max: 100 },
    },
  },
];

async function main() {
  for (const field of fields) {
    const res = await fetch(`${base}/fields/${COLLECTION}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      },
      body: JSON.stringify(field),
    });
    const text = await res.text();
    if (res.ok) {
      console.log('Поле "%s" добавлено.', field.field);
    } else if (res.status === 409 || text.includes('already exists') || text.includes('Duplicate')) {
      console.log('Поле "%s" уже существует.', field.field);
    } else {
      console.error('Ошибка %d для %s: %s', res.status, field.field, text);
      process.exit(1);
    }
  }
  console.log('Готово.');
}

main();
