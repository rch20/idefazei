export const PUBLIC_DONATION_MAX_FILE_SIZE = 8 * 1024 * 1024;
export const PUBLIC_DONATION_FILE_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"] as const;

export type PublicDonationProofUpload = {
  key: string;
  fileName: string;
  mimeType: (typeof PUBLIC_DONATION_FILE_TYPES)[number];
  sizeBytes: number;
  sha256: string;
};

export function validatePublicDonationProof(file: File) {
  if (!PUBLIC_DONATION_FILE_TYPES.includes(file.type as (typeof PUBLIC_DONATION_FILE_TYPES)[number])) {
    throw new Error("Envie um comprovante PDF, PNG, JPEG ou WebP.");
  }
  if (file.size <= 0) throw new Error("O comprovante está vazio.");
  if (file.size > PUBLIC_DONATION_MAX_FILE_SIZE) throw new Error("O comprovante deve ter no máximo 8 MB.");
}

export async function uploadPublicDonationProof(file: File): Promise<PublicDonationProofUpload> {
  validatePublicDonationProof(file);
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/public/donation-proof", {
    method: "POST",
    body: formData,
  });
  const result = (await response.json().catch(() => ({}))) as Partial<PublicDonationProofUpload> & { error?: string };
  if (!response.ok || !result.key || !result.fileName || !result.mimeType || typeof result.sizeBytes !== "number" || result.sizeBytes <= 0 || !result.sha256) {
    throw new Error(result.error ?? "Não foi possível enviar o comprovante.");
  }
  return result as PublicDonationProofUpload;
}
