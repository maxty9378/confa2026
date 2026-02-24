import { createVote, getVotes } from '@/lib/directus';
import type { Role } from '@/lib/store-types';

export type { Role } from './store-types';
export type { Stats } from './store-types';

import type { Stats } from './store-types';
import { computeStats } from './store-utils';

const subscribers: Array<(stats: Stats) => void> = [];
let cachedStats: Stats | null = null;

function notify(stats: Stats) {
  cachedStats = stats;
  subscribers.forEach((cb) => cb(stats));
}

function applyVoteToStats(stats: Stats, role: Role, value: number): Stats {
  const nextCountGdf = role === 'ГДф' ? stats.countGdf + 1 : stats.countGdf;
  const nextCountSv = role === 'СВ' ? stats.countSv + 1 : stats.countSv;
  const nextTotalVotes = stats.totalVotes + 1;

  const prevSumAll = (stats.averageAll ?? 0) * stats.totalVotes;
  const nextAverageAll = Math.round(((prevSumAll + value) / nextTotalVotes) * 10) / 10;

  const prevSumGdf = (stats.averageGdf ?? 0) * stats.countGdf;
  const nextAverageGdf =
    nextCountGdf > 0
      ? Math.round(((prevSumGdf + (role === 'ГДф' ? value : 0)) / nextCountGdf) * 10) / 10
      : null;

  const prevSumSv = (stats.averageSv ?? 0) * stats.countSv;
  const nextAverageSv =
    nextCountSv > 0
      ? Math.round(((prevSumSv + (role === 'СВ' ? value : 0)) / nextCountSv) * 10) / 10
      : null;

  return {
    averageAll: nextAverageAll,
    averageGdf: nextAverageGdf,
    averageSv: nextAverageSv,
    totalVotes: nextTotalVotes,
    countGdf: nextCountGdf,
    countSv: nextCountSv,
  };
}

export async function addVote(role: Role, value: number): Promise<Stats> {
  await createVote(role, value);

  // Fast path: push dashboard update immediately from in-memory aggregate.
  if (cachedStats) {
    const optimistic = applyVoteToStats(cachedStats, role, value);
    notify(optimistic);

    // Background reconciliation with source of truth.
    void getVotes()
      .then((votes) => {
        const fresh = computeStats(votes);
        const changed =
          fresh.totalVotes !== optimistic.totalVotes ||
          fresh.averageAll !== optimistic.averageAll ||
          fresh.averageGdf !== optimistic.averageGdf ||
          fresh.averageSv !== optimistic.averageSv ||
          fresh.countGdf !== optimistic.countGdf ||
          fresh.countSv !== optimistic.countSv;
        if (changed) notify(fresh);
      })
      .catch(() => {
        // ignore; optimistic state remains until next snapshot/update
      });

    return optimistic;
  }

  const votes = await getVotes();
  const fresh = computeStats(votes);
  notify(fresh);
  return fresh;
}

export async function getStatsSnapshot(): Promise<Stats> {
  const votes = await getVotes();
  const stats = computeStats(votes);
  cachedStats = stats;
  return stats;
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
