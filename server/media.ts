import { randomUUID } from "node:crypto";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";

export type MediaProvider = "cloudinary" | "manus_storage";
export type MediaResourceType = "image" | "video" | "raw";
export type MediaPurpose =
  | "tenant_logo"
  | "tenant_pwa_icon"
  | "tenant_public_gallery"
  | "certificate_logo"
  | "treasury_attachment"
  | "public_video"
  | "other";

export interface UploadMediaInput {
  churchId: number;
  data: Buffer;
  mimeType: string;
  resourceType: MediaResourceType;
  purpose: MediaPurpose;
  originalFilename?: string | null;
  uploadedByChurchUserId?: number | null;
}

export interface UploadedMedia {
  provider: MediaProvider;
  resourceType: MediaResourceType;
  purpose: MediaPurpose;
  key: string;
  publicId: string | null;
  url: string;
  secureUrl: string | null;
  originalFilename: string | null;
  mimeType: string;
  bytes: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
}

let cloudinaryConfigured = false;

function hasCloudinaryConfig() {
  return Boolean(ENV.cloudinaryCloudName && ENV.cloudinaryApiKey && ENV.cloudinaryApiSecret);
}

export function isCloudinaryReady() {
  return hasCloudinaryConfig();
}

export function isCloudinaryEnabled() {
  return ENV.mediaProvider === "cloudinary" || (ENV.mediaProvider === "auto" && hasCloudinaryConfig());
}

function configureCloudinary() {
  if (!hasCloudinaryConfig()) {
    throw new Error("Cloudinary não configurado: defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET.");
  }
  if (!cloudinaryConfigured) {
    cloudinary.config({
      cloud_name: ENV.cloudinaryCloudName,
      api_key: ENV.cloudinaryApiKey,
      api_secret: ENV.cloudinaryApiSecret,
      secure: true,
    });
    cloudinaryConfigured = true;
  }
  return cloudinary;
}

function extensionForMimeType(mimeType: string) {
  const [, subtype] = mimeType.split("/");
  return (subtype || "bin").split(";")[0].replace(/[^a-z0-9]/gi, "") || "bin";
}

function resourceTypeForCloudinary(resourceType: MediaResourceType) {
  return resourceType === "raw" ? "raw" : resourceType;
}

async function uploadToCloudinary(input: UploadMediaInput): Promise<UploadedMedia> {
  const client = configureCloudinary();
  const publicId = randomUUID();
  const folder = `idefazei/${input.churchId}/${input.purpose}`;
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resourceTypeForCloudinary(input.resourceType),
        type: "upload",
        context: {
          church_id: String(input.churchId),
          purpose: input.purpose,
        },
      },
      (error, uploaded) => {
        if (error) return reject(error);
        if (!uploaded) return reject(new Error("Cloudinary não retornou os dados do asset."));
        resolve(uploaded);
      },
    );
    stream.end(input.data);
  });

  return {
    provider: "cloudinary",
    resourceType: input.resourceType,
    purpose: input.purpose,
    key: result.public_id,
    publicId: result.public_id,
    url: result.secure_url,
    secureUrl: result.secure_url,
    originalFilename: input.originalFilename ?? null,
    mimeType: input.mimeType,
    bytes: Number(result.bytes ?? input.data.length),
    width: result.width ? Number(result.width) : null,
    height: result.height ? Number(result.height) : null,
    durationSeconds: result.duration ? Math.round(Number(result.duration)) : null,
  };
}

async function uploadToManusStorage(input: UploadMediaInput): Promise<UploadedMedia> {
  const extension = extensionForMimeType(input.mimeType);
  const key = `churches/${input.churchId}/${input.purpose}/${Date.now()}-${randomUUID()}.${extension}`;
  const stored = await storagePut(key, input.data, input.mimeType);
  return {
    provider: "manus_storage",
    resourceType: input.resourceType,
    purpose: input.purpose,
    key: stored.key,
    publicId: null,
    url: stored.url,
    secureUrl: stored.url,
    originalFilename: input.originalFilename ?? null,
    mimeType: input.mimeType,
    bytes: input.data.length,
    width: null,
    height: null,
    durationSeconds: null,
  };
}

export async function uploadMedia(input: UploadMediaInput): Promise<UploadedMedia> {
  if (ENV.mediaProvider === "cloudinary" && !hasCloudinaryConfig()) {
    throw new Error("MEDIA_PROVIDER=cloudinary exige CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET.");
  }
  return isCloudinaryEnabled() ? uploadToCloudinary(input) : uploadToManusStorage(input);
}

export function getPwaIconUrls(media: Pick<UploadedMedia, "provider" | "publicId" | "url">) {
  if (media.provider !== "cloudinary" || !media.publicId || !hasCloudinaryConfig()) {
    return { icon192Url: media.url, icon512Url: media.url };
  }
  const client = configureCloudinary();
  const buildUrl = (size: number) => client.url(media.publicId!, {
    secure: true,
    resource_type: "image",
    type: "upload",
    format: "png",
    transformation: [{ width: size, height: size, crop: "fill", gravity: "auto", quality: "auto:good" }],
  });
  return { icon192Url: buildUrl(192), icon512Url: buildUrl(512) };
}

export async function destroyCloudinaryAsset(publicId: string, resourceType: MediaResourceType) {
  if (!hasCloudinaryConfig()) return false;
  const client = configureCloudinary();
  await client.uploader.destroy(publicId, {
    resource_type: resourceTypeForCloudinary(resourceType),
    type: "upload",
    invalidate: true,
  });
  return true;
}
