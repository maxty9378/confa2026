/**
 * Создаёт коллекцию "votes" в Directus с полями: role (string), value (integer).
 * Запуск: node scripts/create-votes-collection.mjs
 * Требуется .env.local с DIRECTUS_URL и DIRECTUS_TOKEN.
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

const payload = {
  collection: COLLECTION,
  schema: {},
  meta: {
    icon: 'how_to_vote',
    note: 'Голоса опроса конференции (роль + оценка 10–100%)',
  },
  fields: [
    {
      field: 'role',
      type: 'string',
      schema: {},
      meta: {
        collection: COLLECTION,
        field: 'role',
        interface: 'input',
        required: true,
        options: { placeholder: 'ГДф или СВ' },
      },
    },
    {
      field: 'value',
      type: 'integer',
      schema: {},
      meta: {
        collection: COLLECTION,
        field: 'value',
        interface: 'input',
        required: true,
        options: { min: 10, max: 100 },
      },
    },
  ],
};

async function main() {
  const res = await fetch(`${base}/collections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (res.ok) {
    console.log('Коллекция "%s" успешно создана.', COLLECTION);
    try {
      console.log(JSON.stringify(JSON.parse(text), null, 2));
    } catch {
      console.log(text);
    }
    return;
  }

  if (res.status === 403) {
    console.error('Ошибка 403: нет прав на создание коллекций. Нужен токен с правами администратора.');
    process.exit(1);
  }
  if (res.status === 409 || text.includes('already exists')) {
    console.log('Коллекция "%s" уже существует. Ничего не делаем.', COLLECTION);
    return;
  }
  console.error('Ошибка %d: %s', res.status, text);
  process.exit(1);
}

main();
