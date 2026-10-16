import { describe, expect, it } from "vitest";
import { PUBLIC_DONATION_MAX_FILE_SIZE, validatePublicDonationProof } from "./publicDonationUpload";

describe("upload de comprovante de doação pública", () => {
  it("aceita PDF e imagens permitidas", () => {
    expect(() => validatePublicDonationProof(new File(["pdf"], "comprovante.pdf", { type: "application/pdf" }))).not.toThrow();
    expect(() => validatePublicDonationProof(new File(["png"], "comprovante.png", { type: "image/png" }))).not.toThrow();
    expect(() => validatePublicDonationProof(new File(["jpg"], "comprovante.jpg", { type: "image/jpeg" }))).not.toThrow();
    expect(() => validatePublicDonationProof(new File(["webp"], "comprovante.webp", { type: "image/webp" }))).not.toThrow();
  });

  it("recusa tipo desconhecido, arquivo vazio e tamanho acima de 8 MB", () => {
    expect(() => validatePublicDonationProof(new File(["txt"], "comprovante.txt", { type: "text/plain" }))).toThrow("PDF, PNG, JPEG ou WebP");
    expect(() => validatePublicDonationProof(new File([], "vazio.pdf", { type: "application/pdf" }))).toThrow("vazio");
    expect(() => validatePublicDonationProof(new File([new Uint8Array(PUBLIC_DONATION_MAX_FILE_SIZE + 1)], "grande.pdf", { type: "application/pdf" }))).toThrow("8 MB");
  });
});
