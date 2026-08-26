import { getChurchToken } from "@/hooks/useChurchAuth";

export type ClientMediaPurpose = "tenant_logo" | "tenant_pwa_icon" | "tenant_public_gallery" | "certificate_logo" | "public_video";
export type ClientMediaResourceType = "image" | "video";

export type UploadedMediaResult = {
  url: string;
  key: string;
  provider: "cloudinary" | "manus_storage";
  publicId: string | null;
  resourceType: ClientMediaResourceType;
  purpose: ClientMediaPurpose;
  mediaAssetId: number | null;
  icon192Url?: string | null;
  icon512Url?: string | null;
};

export async function uploadChurchMedia(file: File, options: { purpose: ClientMediaPurpose; resourceType: ClientMediaResourceType }) {
  const token = getChurchToken();
  if (!token) throw new Error("Sua sessão expirou. Entre novamente para enviar mídia.");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", options.purpose);
  formData.append("resourceType", options.resourceType);
  const response = await fetch("/api/media/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
  const result = await response.json() as Partial<UploadedMediaResult> & { error?: string };
  if (!response.ok || !result.url || !result.key || !result.provider || !result.resourceType || !result.purpose) throw new Error(result.error ?? "Não foi possível enviar a mídia.");
  return result as UploadedMediaResult;
}
