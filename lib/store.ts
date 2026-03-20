import { createVote, getVotes, deleteVote as deleteVoteDirectus, getLastVoteId, createSessionRecord, getLatestSession } from '@/lib/directus';
import type { Role } from '@/lib/store-types';

export type { Role } from './store-types';
export type { Stats } from './store-types';

import type { Stats } from './store-types';
import { computeStats } from './store-utils';

const subscribers: Array<(stats: Stats) => void> = [];
let cachedStats: Stats | null = null;

export async function getActiveSessionLabel() {
  const latest = await getLatestSession();
  return latest ? latest.label : null;
}

function notify(stats: Stats) {
  cachedStats = stats;
  subscribers.forEach((cb) => cb(stats));
}

function mapVotesForStats(
  votes: { id?: number; role: string; value: number }[],
  minId: number | null
) {
  const threshold = minId ?? null;
  const filtered =
    threshold == null ? votes : votes.filter((v) => (v.id ?? 0) > threshold);
  return filtered.map((v) => ({ role: v.role, value: v.value }));
}

async function getVotesForCurrentSession() {
  const latest = await getLatestSession();
  const sessionStartFromId = latest ? latest.start_from_id : null;
  const votes = await getVotes();
  return mapVotesForStats(votes, sessionStartFromId);
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
    void getVotesForCurrentSession()
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

  const votes = await getVotesForCurrentSession();
  const fresh = computeStats(votes);
  notify(fresh);
  return fresh;
}

export async function deleteVote(id: number): Promise<Stats> {
  await deleteVoteDirectus(id);
  const votes = await getVotesForCurrentSession();
  const fresh = computeStats(votes);
  notify(fresh);
  return fresh;
}

export async function getStatsSnapshot(): Promise<Stats> {
  const votes = await getVotesForCurrentSession();
  const stats = computeStats(votes);
  cachedStats = stats;
  return stats;
}

/** Обновить статистику из БД и уведомить подписчиков (дашборд). */
export async function refreshAndNotify(): Promise<Stats> {
  const votes = await getVotesForCurrentSession();
  const stats = computeStats(votes);
  notify(stats);
  return stats;
}

export async function startNewSession(label: string): Promise<Stats> {
  const lastId = await getLastVoteId();

  // Сохраняем сессию в Directus
  await createSessionRecord({ label, start_from_id: lastId }).catch(() => {});

  const votes = await getVotesForCurrentSession();
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
