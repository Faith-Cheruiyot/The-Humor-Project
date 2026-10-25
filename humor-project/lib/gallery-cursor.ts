export type GalleryCursor = { createdAt: string; id: string };

export function parseGalleryCursor(value: string): GalleryCursor {
  if (value.length > 256) throw new Error("Invalid gallery cursor.");
  const cursor = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as GalleryCursor;
  if (typeof cursor?.createdAt !== "string" || !/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|\+00:00)$/.test(cursor.createdAt)
    || Number.isNaN(Date.parse(cursor.createdAt))
    || typeof cursor.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor.id)) {
    throw new Error("Invalid gallery cursor.");
  }
  return cursor;
}
