/**
 * Helpers para processar imagens no client antes do upload.
 * Recorta para 16:10, redimensiona para no máx 1600x1000 e re-encoda em WebP (fallback JPEG).
 */

const TARGET_RATIO = 16 / 10;
const MAX_W = 1600;
const MAX_H = 1000;

export interface ProcessedImage {
  blob: Blob;
  mime: "image/webp" | "image/jpeg";
  ext: "webp" | "jpg";
  width: number;
  height: number;
  previewUrl: string;
}

export async function processServiceImage(file: File): Promise<ProcessedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Arquivo não é uma imagem.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Imagem maior que 8 MB.");
  }

  const bitmap = await loadBitmap(file);

  // Crop centralizado para 16:10
  const srcRatio = bitmap.width / bitmap.height;
  let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height;
  if (srcRatio > TARGET_RATIO) {
    sw = Math.round(bitmap.height * TARGET_RATIO);
    sx = Math.round((bitmap.width - sw) / 2);
  } else if (srcRatio < TARGET_RATIO) {
    sh = Math.round(bitmap.width / TARGET_RATIO);
    sy = Math.round((bitmap.height - sh) / 2);
  }

  // Resize para caber em 1600x1000
  let dw = sw, dh = sh;
  if (dw > MAX_W) { dh = Math.round(dh * (MAX_W / dw)); dw = MAX_W; }
  if (dh > MAX_H) { dw = Math.round(dw * (MAX_H / dh)); dh = MAX_H; }

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não disponível.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, dw, dh);

  const webp = await canvasToBlob(canvas, "image/webp", 0.82);
  if (webp && webp.size > 0) {
    return {
      blob: webp,
      mime: "image/webp",
      ext: "webp",
      width: dw,
      height: dh,
      previewUrl: URL.createObjectURL(webp),
    };
  }

  const jpeg = await canvasToBlob(canvas, "image/jpeg", 0.85);
  if (!jpeg) throw new Error("Falha ao codificar imagem.");
  return {
    blob: jpeg,
    mime: "image/jpeg",
    ext: "jpg",
    width: dw,
    height: dh,
    previewUrl: URL.createObjectURL(jpeg),
  };
}

async function loadBitmap(file: File): Promise<HTMLImageElement | ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(file); } catch { /* fallback below */ }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}
