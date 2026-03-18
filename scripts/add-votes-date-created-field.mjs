/**
 * Добавляет в коллекцию votes системное поле date_created (автозаполняется при создании).
 * Запуск: node scripts/add-votes-date-created-field.mjs
 * Требуется .env.local с DIRECTUS_URL и DIRECTUS_TOKEN (токен с правами администратора).
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

const field = {
  field: 'date_created',
  type: 'timestamp',
  schema: {
    is_nullable: true,
  },
  meta: {
    collection: COLLECTION,
    field: 'date_created',
    special: ['date-created'],
    readonly: true,
    hidden: false,
    interface: 'datetime',
  },
};

async function main() {
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
    console.log('Поле "%s" добавлено в "%s".', field.field, COLLECTION);
    return;
  }
  if (res.status === 409 || text.includes('already exists') || text.includes('Duplicate')) {
    console.log('Поле "%s" уже существует в "%s".', field.field, COLLECTION);
    return;
  }
  if (res.status === 403) {
    console.error('Ошибка 403: нет прав на создание полей. Нужен токен с правами администратора.');
    process.exit(1);
  }

  console.error('Ошибка %d: %s', res.status, text);
  process.exit(1);
}

main();

