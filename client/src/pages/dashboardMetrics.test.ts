import { describe, expect, it } from "vitest";
import { buildDashboardMetricValues } from "./dashboardMetrics";

describe("buildDashboardMetricValues", () => {
  it("não fornece métricas zeradas antes da resposta protegida estar disponível", () => {
    expect(buildDashboardMetricValues(undefined)).toBeNull();
  });

  it("preserva os valores reais retornados pelo Dashboard", () => {
    expect(buildDashboardMetricValues({
      totalMembers: 3,
      newSouls: 1,
      consolidated: 2,
      totalCells: 1,
      totalLeaders: 1,
      totalMinistries: 4,
    })).toEqual({
      totalMembers: 3,
      newSouls: 1,
      consolidated: 2,
      totalCells: 1,
      totalLeaders: 1,
      totalMinistries: 4,
    });
  });
});
