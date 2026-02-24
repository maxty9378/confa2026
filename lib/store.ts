import { createVote, getVotes } from '@/lib/directus';
import type { Role } from '@/lib/store-types';

export type { Role } from './store-types';
export type { Stats } from './store-types';

import type { Stats } from './store-types';
import { computeStats } from './store-utils';

const subscribers: Array<(stats: Stats) => void> = [];

function notify(stats: Stats) {
  subscribers.forEach((cb) => cb(stats));
}

export async function addVote(role: Role, value: number): Promise<Stats> {
  await createVote(role, value);
  const votes = await getVotes();
  const stats = computeStats(votes);
  notify(stats);
  return stats;
}

export async function getStatsSnapshot(): Promise<Stats> {
  const votes = await getVotes();
  return computeStats(votes);
}

/** Обновить статистику из БД и уведомить подписчиков (дашборд). */
export async function refreshAndNotify(): Promise<Stats> {
  const votes = await getVotes();
  const stats = computeStats(votes);
  notify(stats);
  return stats;
}

export function subscribe(cb: (stats: Stats) => void): () => void {
  subscribers.push(cb);
  return () => {
    const i = subscribers.indexOf(cb);
    if (i !== -1) subscribers.splice(i, 1);
  };
}
