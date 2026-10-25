import sharp from "sharp";

// Decode before contacting the AI, limit decompression, strip metadata, and
// normalize orientation so the AI and the finished meme see the same picture.
export async function preparePhoto(input: Buffer) {
  const image = sharp(input, { limitInputPixels: 25_000_000, failOn: "warning" });
  const metadata = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1) {
    throw new Error("Choose a still JPG, PNG, or WebP photo.");
  }
  if (!metadata.width || !metadata.height || metadata.width < 128 || metadata.height < 128) {
    throw new Error("Choose a photo at least 128 pixels wide and tall.");
  }
  if (Math.max(metadata.width, metadata.height) / Math.min(metadata.width, metadata.height) > 12.5) {
    throw new Error("Choose a photo with a less extreme aspect ratio so the caption remains readable.");
  }
  return image.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" }).jpeg({ quality: 90 }).toBuffer({ resolveWithObject: true });
}

function escapeXml(text: string) {
  return text.replace(/[<>&"']/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  })[character]!);
}

export function memeOverlay(caption: string, width: number, height: number) {
  const text = caption.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
  const margin = Math.max(8, Math.round(width * 0.045));
  const availableWidth = width - margin * 2;
  let fontSize = Math.max(12, Math.min(width * 0.075, height * 0.115));
  let lines: string[] = [];

  // Reflow and shrink for portraits, long words, and unusually long responses.
  for (let attempt = 0; attempt < 30; attempt++) {
    const maxCharacters = Math.max(5, Math.floor(availableWidth / (fontSize * 0.72)));
    lines = [];
    let line = "";
    for (const word of text.split(" ")) {
      const pieces = Array.from(word).reduce<string[]>((parts, letter, index) => {
        const part = Math.floor(index / maxCharacters);
        parts[part] = (parts[part] ?? "") + letter;
        return parts;
      }, []);
      for (const piece of pieces) {
        if (line && Array.from(`${line} ${piece}`).length > maxCharacters) {
          lines.push(line);
          line = piece;
        } else {
          line = line ? `${line} ${piece}` : piece;
        }
      }
    }
    if (line) lines.push(line);
    if (lines.length * fontSize * 1.15 <= height * 0.42) break;
    fontSize *= 0.91;
  }

  const lineHeight = fontSize * 1.15;
  const baseline = height - margin - fontSize * 0.22;
  const stroke = Math.max(1.3, fontSize * 0.09);
  const textElements = lines.map((line, index) => {
    const y = baseline - (lines.length - 1 - index) * lineHeight;
    return `<text x="${width / 2}" y="${y}" text-anchor="middle" textLength="${Math.min(availableWidth, Array.from(line).length * fontSize * 0.64)}" lengthAdjust="spacingAndGlyphs">${escapeXml(line)}</text>`;
  }).join("");

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="black" stop-opacity="0"/><stop offset="1" stop-color="black" stop-opacity="0.55"/></linearGradient></defs>
    <rect x="0" y="${Math.max(0, baseline - lines.length * lineHeight - margin)}" width="${width}" height="${lines.length * lineHeight + margin * 2}" fill="url(#shade)"/>
    <g font-family="Impact, Arial, Helvetica, sans-serif" font-weight="900" font-size="${fontSize}" fill="white" stroke="black" stroke-width="${stroke}" stroke-linejoin="round" paint-order="stroke fill">${textElements}</g>
  </svg>`);
}

export async function renderMeme(image: Buffer, caption: string, width: number, height: number) {
  return sharp(image).composite([{ input: memeOverlay(caption, width, height) }]).jpeg({ quality: 92 }).toBuffer();
}
