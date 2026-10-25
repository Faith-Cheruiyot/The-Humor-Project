import sharp from "sharp";

// Prepare a bounded, metadata-free image for AI analysis. The uploaded file is
// stored separately, without rendering the caption onto it.
export async function preparePhoto(input: Buffer) {
  const image = sharp(input, { limitInputPixels: 25_000_000, failOn: "warning" });
  const metadata = await image.metadata();
  const mimeTypes: Record<string, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
  const mimeType = mimeTypes[metadata.format ?? ""];
  if (!mimeType || (metadata.pages ?? 1) > 1) throw new Error("Choose a still JPG, PNG, or WebP photo.");
  if (!metadata.width || !metadata.height || metadata.width < 128 || metadata.height < 128) {
    throw new Error("Choose a photo at least 128 pixels wide and tall.");
  }
  const { data } = await image.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" }).jpeg({ quality: 90 }).toBuffer({ resolveWithObject: true });
  const rotated = [5, 6, 7, 8].includes(metadata.orientation ?? 1);
  return {
    data,
    mimeType,
    extension: metadata.format === "jpeg" ? "jpg" : metadata.format!,
    width: rotated ? metadata.height : metadata.width,
    height: rotated ? metadata.width : metadata.height,
  };
}
