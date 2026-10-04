import { describe, expect, it } from "vitest";
import {
  ONLINE_CONTRIBUTION_MAX_FILE_SIZE,
  validateOnlineContributionProof,
} from "./onlineContributionUpload";

describe("upload de comprovante de contribuição", () => {
  it("aceita PDF, imagens permitidas e o limite de 8 MB", () => {
    expect(() => validateOnlineContributionProof(new File(["pdf"], "comprovante.pdf", { type: "application/pdf" }))).not.toThrow();
    expect(() => validateOnlineContributionProof(new File(["png"], "comprovante.png", { type: "image/png" }))).not.toThrow();
    expect(() => validateOnlineContributionProof(new File([new Uint8Array(1)], "comprovante.webp", { type: "image/webp" }))).not.toThrow();
  });

  it("recusa formato não permitido, arquivo vazio e arquivo acima do limite", () => {
    expect(() => validateOnlineContributionProof(new File(["txt"], "comprovante.txt", { type: "text/plain" }))).toThrow("PDF, PNG, JPEG ou WebP");
    expect(() => validateOnlineContributionProof(new File([], "vazio.pdf", { type: "application/pdf" }))).toThrow("vazio");
    expect(() => validateOnlineContributionProof(new File([new Uint8Array(ONLINE_CONTRIBUTION_MAX_FILE_SIZE + 1)], "grande.pdf", { type: "application/pdf" }))).toThrow("8 MB");
  });
});
