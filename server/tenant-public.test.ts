import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import { appRouter } from "./routers";

function publicContext(tenantSlug: string | null, tenantChurchId: number | null): TrpcContext {
  return {
    user: null,
    tenantSlug,
    tenantChurchId,
    req: { protocol: "https", headers: {} },
    res: {},
  } as unknown as TrpcContext;
}

describe("tenantPublic.current", () => {
  afterEach(() => vi.restoreAllMocks());

  it("resolve a página pública exclusivamente pelo slug vindo do host", async () => {
    const experience = {
      church: { id: 21, name: "Igreja A", slug: "igrejaa" },
      site: null,
      theme: null,
      sections: [],
    };
    const getExperience = vi.spyOn(db, "getPublishedTenantPublicExperienceBySlug").mockResolvedValue(experience as never);

    const caller = appRouter.createCaller(publicContext("igrejaa", 999));

    await expect(caller.tenantPublic.current()).resolves.toEqual(experience);
    expect(getExperience).toHaveBeenCalledTimes(1);
    expect(getExperience).toHaveBeenCalledWith("igrejaa");
    expect(getExperience).not.toHaveBeenCalledWith("999");
  });

  it("não retorna uma configuração pública no domínio principal sem tenant", async () => {
    const getExperience = vi.spyOn(db, "getPublishedTenantPublicExperienceBySlug");
    const caller = appRouter.createCaller(publicContext(null, null));

    await expect(caller.tenantPublic.current()).resolves.toBeNull();
    expect(getExperience).not.toHaveBeenCalled();
  });
});
