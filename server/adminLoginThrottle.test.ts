import { describe, expect, it } from "vitest";
import { clientIpFromRequest, createLoginThrottle } from "./adminLoginThrottle";

describe("limite de tentativas do login do Super Admin", () => {
  it("bloqueia a origem após 5 falhas seguidas e libera após a janela", () => {
    let t = 0;
    const throttle = createLoginThrottle({ now: () => t });
    for (let i = 0; i < 4; i++) throttle.recordFailure("1.1.1.1", "root@x.com");
    expect(throttle.retryAfterSeconds("1.1.1.1", "root@x.com")).toBe(0);
    throttle.recordFailure("1.1.1.1", "root@x.com");
    expect(throttle.retryAfterSeconds("1.1.1.1", "root@x.com")).toBe(900);
    t = 14 * 60 * 1000;
    expect(throttle.retryAfterSeconds("1.1.1.1", "root@x.com")).toBe(60);
    t = 15 * 60 * 1000;
    expect(throttle.retryAfterSeconds("1.1.1.1", "root@x.com")).toBe(0);
  });

  it("não bloqueia outra origem nem outra conta por causa de uma origem", () => {
    const throttle = createLoginThrottle();
    for (let i = 0; i < 5; i++) throttle.recordFailure("1.1.1.1", "root@x.com");
    expect(throttle.retryAfterSeconds("2.2.2.2", "root@x.com")).toBe(0);
    expect(throttle.retryAfterSeconds("1.1.1.1", "outro@x.com")).toBe(0);
  });

  it("bloqueia a conta quando muitos IPs diferentes erram a senha", () => {
    const throttle = createLoginThrottle();
    for (let i = 0; i < 20; i++) throttle.recordFailure(`10.0.0.${i}`, "Root@X.com");
    expect(throttle.retryAfterSeconds("9.9.9.9", "root@x.com")).toBeGreaterThan(0);
  });

  it("login correto zera a contagem da origem", () => {
    const throttle = createLoginThrottle();
    for (let i = 0; i < 4; i++) throttle.recordFailure("1.1.1.1", "root@x.com");
    throttle.recordSuccess("1.1.1.1", "root@x.com");
    throttle.recordFailure("1.1.1.1", "root@x.com");
    expect(throttle.retryAfterSeconds("1.1.1.1", "root@x.com")).toBe(0);
  });

  it("descobre o IP pelo Cloudflare, depois X-Forwarded-For, depois a conexão", () => {
    expect(clientIpFromRequest({ headers: { "cf-connecting-ip": "5.5.5.5", "x-forwarded-for": "6.6.6.6" } })).toBe("5.5.5.5");
    expect(clientIpFromRequest({ headers: { "x-forwarded-for": "6.6.6.6, 7.7.7.7" } })).toBe("6.6.6.6");
    expect(clientIpFromRequest({ headers: {}, socket: { remoteAddress: "8.8.8.8" } })).toBe("8.8.8.8");
    expect(clientIpFromRequest({ headers: {} })).toBe("unknown");
  });
});
