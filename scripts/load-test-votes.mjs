/**
 * Нагрузочный тест: эмуляция ~50 голосов за несколько секунд.
 * Запуск: node scripts/load-test-votes.mjs [baseUrl] [count]
 * Пример: node scripts/load-test-votes.mjs http://localhost:3000 50
 */
const BASE_URL = process.argv[2] || 'http://localhost:3000';
const COUNT = Math.max(1, parseInt(process.argv[3], 10) || 50);
const ROLES = ['ГДф', 'СВ'];
const SPREAD_MS = 5000;

function randomRole() {
  return ROLES[Math.floor(Math.random() * ROLES.length)];
}
function randomValue() {
  return 10 + Math.floor(Math.random() * 9) * 10;
}

async function sendVote(i) {
  const role = randomRole();
  const value = randomValue();
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, value }),
    });
    const data = await res.json().catch(() => ({}));
    const elapsed = Date.now() - start;
    if (!res.ok) {
      console.log(`  [${i + 1}/${COUNT}] ${res.status} ${data.error || res.statusText} (${elapsed}ms)`);
      return { ok: false, status: res.status, ms: elapsed };
    }
    console.log(`  [${i + 1}/${COUNT}] OK ${role} ${value}% (${elapsed}ms)`);
    return { ok: true, status: res.status, ms: elapsed };
  } catch (e) {
    const elapsed = Date.now() - start;
    console.log(`  [${i + 1}/${COUNT}] ERROR ${e.message} (${elapsed}ms)`);
    return { ok: false, status: 0, ms: elapsed };
  }
}

async function main() {
  console.log(`Load test: ${COUNT} votes → ${BASE_URL} (spread ${SPREAD_MS}ms)\n`);
  const delayPerRequest = SPREAD_MS / COUNT;
  const promises = [];
  for (let i = 0; i < COUNT; i++) {
    promises.push(
      (async () => {
        if (i > 0) await new Promise((r) => setTimeout(r, delayPerRequest * i));
        return sendVote(i);
      })()
    );
  }
  const results = await Promise.all(promises);
  const ok = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  const times = results.map((r) => r.ms);
  const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
  const maxMs = Math.max(...times);
  console.log(`\nDone: ${ok} OK, ${failed} failed. Avg: ${Math.round(avgMs)}ms, max: ${maxMs}ms`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
