// Processamento da foto de perfil no navegador, ANTES do upload:
// 1) valida tipo/tamanho de entrada;
// 2) recorta no centro em quadrado e redimensiona (avatar não precisa ser grande);
// 3) reexporta via <canvas>, o que REMOVE os metadados EXIF (inclusive a localização
//    GPS embutida por celulares) — passo de privacidade importante.
// O resultado é um JPEG pequeno, pronto para enviar em /api/media/upload (person_photo).

export const PROFILE_PHOTO_INPUT_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const PROFILE_PHOTO_MAX_INPUT_BYTES = 12 * 1024 * 1024; // entrada do celular pode ser grande
const OUTPUT_SIZE = 512; // quadrado final em px
const OUTPUT_QUALITY = 0.85;

export function validateProfilePhotoInput(file: File) {
  if (!PROFILE_PHOTO_INPUT_TYPES.includes(file.type as (typeof PROFILE_PHOTO_INPUT_TYPES)[number])) {
    throw new Error("Envie uma imagem PNG, JPEG ou WebP.");
  }
  if (file.size <= 0) throw new Error("A imagem está vazia.");
  if (file.size > PROFILE_PHOTO_MAX_INPUT_BYTES) throw new Error("A imagem deve ter no máximo 12 MB.");
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível ler a imagem.")); };
    img.src = url;
  });
}

export async function processProfilePhoto(file: File): Promise<File> {
  validateProfilePhotoInput(file);
  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  if (!side) throw new Error("Imagem inválida.");
  const sx = Math.max(0, (img.naturalWidth - side) / 2);
  const sy = Math.max(0, (img.naturalHeight - side) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não conseguiu processar a imagem.");
  ctx.imageSmoothingQuality = "high";
  // Fundo branco para PNGs com transparência não virarem preto no JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", OUTPUT_QUALITY));
  if (!blob) throw new Error("Não foi possível processar a imagem.");
  return new File([blob], "foto-perfil.jpg", { type: "image/jpeg" });
}
