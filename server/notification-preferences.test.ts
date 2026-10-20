import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NOTIFICATION_EVENT_CATALOG } from "../shared/notificationPreferences";

const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");
const routers = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

describe("preferências de avisos do sistema", () => {
  it("o catálogo cobre exatamente os tipos aceitos pelo banco", () => {
    const start = schema.indexOf('eventType: mysqlEnum("eventType", [');
    const block = schema.slice(start, schema.indexOf("]).notNull()", start));
    const dbTypes = Array.from(block.matchAll(/"([a-z_]+)"/g)).map((match) => match[1]).filter((value) => value !== "eventType");
    expect(NOTIFICATION_EVENT_CATALOG.map((item) => item.type).sort()).toEqual([...dbTypes].sort());
  });

  it("não repete tipos nem deixa texto vazio", () => {
    const types = NOTIFICATION_EVENT_CATALOG.map((item) => item.type);
    expect(new Set(types).size).toBe(types.length);
    for (const item of NOTIFICATION_EVENT_CATALOG) {
      expect(item.label.length).toBeGreaterThan(3);
      expect(item.description.length).toBeGreaterThan(10);
    }
  });

  it("só pastores e supervisores leem ou alteram as preferências", () => {
    const start = routers.indexOf("async function requireNotificationPreferenceManager");
    const block = routers.slice(start, start + 1800);
    expect(block).toContain("PASTOR_OR_SUPERVISOR_ROLES.has(role)");
    expect(block).toContain('code: "FORBIDDEN"');
    expect(routers).toContain("await requireNotificationPreferenceManager(ctx.user.id, input.churchId);");
  });

  it("a gravação é restrita à igreja e ao canal do sistema", () => {
    const db = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    const fn = db.slice(db.indexOf("export async function setSystemNotificationPreference"), db.indexOf("export async function getNotificationEventByDedupeKey"));
    expect(fn).toContain('channel: "sistema"');
    expect(fn).toContain("churchId: data.churchId");
    expect(fn).toContain("onDuplicateKeyUpdate");
  });
});
