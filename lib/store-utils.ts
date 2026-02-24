import type { Stats } from '@/lib/store-types';

export function computeStats(
  votes: { role: string; value: number }[]
): Stats {
  if (votes.length === 0) {
    return {
      averageAll: null,
      averageGdf: null,
      averageSv: null,
      totalVotes: 0,
      countGdf: 0,
      countSv: 0,
    };
  }
  const gdf = votes.filter((v) => v.role === 'ГДф');
  const sv = votes.filter((v) => v.role === 'СВ');
  const sumAll = votes.reduce((s, v) => s + v.value, 0);
  const sumGdf = gdf.reduce((s, v) => s + v.value, 0);
  const sumSv = sv.reduce((s, v) => s + v.value, 0);
  return {
    averageAll: Math.round((sumAll / votes.length) * 10) / 10,
    averageGdf: gdf.length ? Math.round((sumGdf / gdf.length) * 10) / 10 : null,
    averageSv: sv.length ? Math.round((sumSv / sv.length) * 10) / 10 : null,
    totalVotes: votes.length,
    countGdf: gdf.length,
    countSv: sv.length,
  };
}
