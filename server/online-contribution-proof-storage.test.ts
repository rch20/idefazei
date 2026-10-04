import { describe, expect, it } from "vitest";
import {
  isOnlineContributionProofKeyForActor,
  ONLINE_CONTRIBUTION_PROOF_REFERENCE_PREFIX,
  onlineContributionProofReferenceUrl,
} from "./onlineContributionProofStorage";

function cloudinaryKey(overrides: Record<string, unknown> = {}) {
  const reference = {
    v: 1,
    provider: "cloudinary",
    resourceType: "image",
    deliveryType: "authenticated",
    publicId: "idefazei/100/treasury/online-contributions/7/proof-id",
    format: "png",
    churchId: 100,
    churchUserId: 7,
    ...overrides,
  };
  return `${ONLINE_CONTRIBUTION_PROOF_REFERENCE_PREFIX}${Buffer.from(JSON.stringify(reference), "utf8").toString("base64url")}`;
}

describe("referência privada de comprovante PIX", () => {
  it("aceita apenas o tenant e usuário que originaram o asset Cloudinary", () => {
    const key = cloudinaryKey();
    expect(isOnlineContributionProofKeyForActor(key, 100, 7)).toBe(true);
    expect(isOnlineContributionProofKeyForActor(key, 101, 7)).toBe(false);
    expect(isOnlineContributionProofKeyForActor(key, 100, 8)).toBe(false);
    expect(
      isOnlineContributionProofKeyForActor(
        cloudinaryKey({
          publicId: "idefazei/101/treasury/online-contributions/7/proof-id",
        }),
        100,
        7
      )
    ).toBe(false);
  });

  it("mantém compatibilidade somente para referências legadas do mesmo tenant e usuário", () => {
    const legacy = "churches/100/treasury/online-contributions/7/old-proof.png";
    expect(isOnlineContributionProofKeyForActor(legacy, 100, 7)).toBe(true);
    expect(isOnlineContributionProofKeyForActor(legacy, 101, 7)).toBe(false);
    expect(isOnlineContributionProofKeyForActor(legacy, 100, 8)).toBe(false);
  });

  it("não transforma a referência Cloudinary em URL pública sem assinatura", () => {
    const key = cloudinaryKey();
    expect(onlineContributionProofReferenceUrl(key)).toBe(
      `cloudinary://${key}`
    );
    expect(
      onlineContributionProofReferenceUrl(
        "churches/100/treasury/online-contributions/7/old-proof.png"
      )
    ).toBe(
      "/manus-storage/churches/100/treasury/online-contributions/7/old-proof.png"
    );
  });
});
