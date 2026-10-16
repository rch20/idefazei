export type DashboardStatsSnapshot = {
  totalMembers: number;
  newSouls: number;
  consolidated: number;
  totalCells: number;
  totalLeaders: number;
  totalMinistries: number;
};

export function buildDashboardMetricValues(stats: DashboardStatsSnapshot | null | undefined) {
  if (!stats) return null;

  return {
    totalMembers: stats.totalMembers,
    newSouls: stats.newSouls,
    consolidated: stats.consolidated,
    totalCells: stats.totalCells,
    totalLeaders: stats.totalLeaders,
    totalMinistries: stats.totalMinistries,
  };
}
