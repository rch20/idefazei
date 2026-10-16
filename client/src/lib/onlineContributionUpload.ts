import { getChurchToken } from "@/hooks/useChurchAuth";

export const ONLINE_CONTRIBUTION_MAX_FILE_SIZE = 8 * 1024 * 1024;
export const ONLINE_CONTRIBUTION_FILE_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"] as const;

export type OnlineContributionProofUpload = {
  key: string;
  fileName: string;
  mimeType: (typeof ONLINE_CONTRIBUTION_FILE_TYPES)[number];
  sizeBytes: number;
  sha256: string;
};

export function validateOnlineContributionProof(file: File) {
  if (!ONLINE_CONTRIBUTION_FILE_TYPES.includes(file.type as (typeof ONLINE_CONTRIBUTION_FILE_TYPES)[number])) {
    throw new Error("Envie um comprovante PDF, PNG, JPEG ou WebP.");
  }
  if (file.size <= 0) throw new Error("O comprovante está vazio.");
  if (file.size > ONLINE_CONTRIBUTION_MAX_FILE_SIZE) throw new Error("O comprovante deve ter no máximo 8 MB.");
}

export async function uploadOnlineContributionProof(file: File): Promise<OnlineContributionProofUpload> {
  validateOnlineContributionProof(file);
  const token = getChurchToken();
  if (!token) throw new Error("Sua sessão expirou. Entre novamente para enviar o comprovante.");

  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/treasury/online-contribution-proof", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const result = (await response.json().catch(() => ({}))) as Partial<OnlineContributionProofUpload> & { error?: string };
  if (!response.ok || !result.key || !result.fileName || !result.mimeType || typeof result.sizeBytes !== "number" || result.sizeBytes <= 0 || !result.sha256) {
    throw new Error(result.error ?? "Não foi possível enviar o comprovante.");
  }
  return result as OnlineContributionProofUpload;
}
