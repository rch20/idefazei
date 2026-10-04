import { randomUUID } from "node:crypto";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { ENV } from "./_core/env";
import { storageGetSignedUrl } from "./storage";

const REFERENCE_PREFIX = "cld-proof-v1.";
const SIGNED_URL_TTL_SECONDS = 5 * 60;

type CloudinaryProofReference = {
  v: 1;
  provider: "cloudinary";
  resourceType: "image" | "raw";
  deliveryType: "private" | "authenticated";
  publicId: string;
  format: string;
  churchId: number;
  churchUserId: number;
};

function hasCloudinaryConfig() {
  return Boolean(
    ENV.cloudinaryCloudName && ENV.cloudinaryApiKey && ENV.cloudinaryApiSecret
  );
}

function configureCloudinary() {
  if (!hasCloudinaryConfig()) {
    throw new Error(
      "Cloudinary não configurado: defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET."
    );
  }
  cloudinary.config({
    cloud_name: ENV.cloudinaryCloudName,
    api_key: ENV.cloudinaryApiKey,
    api_secret: ENV.cloudinaryApiSecret,
    secure: true,
  });
  return cloudinary;
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  throw new Error("Tipo de comprovante não suportado pelo Cloudinary.");
}

function encodeReference(reference: CloudinaryProofReference) {
  return `${REFERENCE_PREFIX}${Buffer.from(JSON.stringify(reference), "utf8").toString("base64url")}`;
}

function decodeReference(key: string): CloudinaryProofReference | null {
  if (!key.startsWith(REFERENCE_PREFIX)) return null;
  try {
    const value = JSON.parse(
      Buffer.from(key.slice(REFERENCE_PREFIX.length), "base64url").toString(
        "utf8"
      )
    ) as Partial<CloudinaryProofReference>;
    if (
      value.v !== 1 ||
      value.provider !== "cloudinary" ||
      (value.deliveryType !== "private" &&
        value.deliveryType !== "authenticated") ||
      (value.resourceType !== "image" && value.resourceType !== "raw") ||
      typeof value.publicId !== "string" ||
      !value.publicId ||
      typeof value.format !== "string" ||
      !/^[a-z0-9]+$/i.test(value.format) ||
      !Number.isInteger(value.churchId) ||
      !Number.isInteger(value.churchUserId)
    ) {
      return null;
    }
    return value as CloudinaryProofReference;
  } catch {
    return null;
  }
}

function expectedPublicIdPrefix(churchId: number, churchUserId: number) {
  return `idefazei/${churchId}/treasury/online-contributions/${churchUserId}/`;
}

export function isCloudinaryOnlineContributionProofKeyForActor(
  key: string,
  churchId: number,
  churchUserId: number
) {
  const reference = decodeReference(key);
  return Boolean(
    reference &&
      reference.churchId === churchId &&
      reference.churchUserId === churchUserId &&
      reference.publicId.startsWith(
        expectedPublicIdPrefix(churchId, churchUserId)
      )
  );
}

export function isLegacyOnlineContributionProofKeyForActor(
  key: string,
  churchId: number,
  churchUserId: number
) {
  return key.startsWith(
    `churches/${churchId}/treasury/online-contributions/${churchUserId}/`
  );
}

export function isOnlineContributionProofKeyForActor(
  key: string,
  churchId: number,
  churchUserId: number
) {
  return (
    isCloudinaryOnlineContributionProofKeyForActor(
      key,
      churchId,
      churchUserId
    ) || isLegacyOnlineContributionProofKeyForActor(key, churchId, churchUserId)
  );
}

export function onlineContributionProofReferenceUrl(key: string) {
  return decodeReference(key) ? `cloudinary://${key}` : `/manus-storage/${key}`;
}

export async function uploadOnlineContributionProof(input: {
  churchId: number;
  churchUserId: number;
  data: Buffer;
  mimeType: string;
}) {
  const client = configureCloudinary();
  const format = extensionForMimeType(input.mimeType);
  const resourceType = input.mimeType === "application/pdf" ? "raw" : "image";
  const publicId = `${expectedPublicIdPrefix(input.churchId, input.churchUserId)}${randomUUID()}${resourceType === "raw" ? `.${format}` : ""}`;

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: resourceType,
        type: "private",
        overwrite: false,
        context: {
          church_id: String(input.churchId),
          church_user_id: String(input.churchUserId),
          purpose: "online_contribution_proof",
        },
      },
      (error, uploaded) => {
        if (error) return reject(error);
        if (!uploaded)
          return reject(
            new Error("Cloudinary não retornou os dados do comprovante.")
          );
        resolve(uploaded);
      }
    );
    stream.end(input.data);
  });

  const reference = encodeReference({
    v: 1,
    provider: "cloudinary",
    resourceType,
    deliveryType: "private",
    publicId: result.public_id,
    format,
    churchId: input.churchId,
    churchUserId: input.churchUserId,
  });

  return {
    key: reference,
    proofUrl: onlineContributionProofReferenceUrl(reference),
  };
}

export async function getOnlineContributionProofSignedUrl(
  key: string,
  churchId: number
) {
  const reference = decodeReference(key);
  if (!reference) return storageGetSignedUrl(key);
  if (
    reference.churchId !== churchId ||
    !reference.publicId.startsWith(
      `idefazei/${churchId}/treasury/online-contributions/`
    )
  ) {
    throw new Error("Referência de comprovante não pertence a esta igreja.");
  }
  const client = configureCloudinary();
  return client.utils.private_download_url(
    reference.publicId,
    reference.format,
    {
      resource_type: reference.resourceType,
      type: reference.deliveryType,
      expires_at: Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS,
    }
  );
}

export const ONLINE_CONTRIBUTION_PROOF_REFERENCE_PREFIX = REFERENCE_PREFIX;
