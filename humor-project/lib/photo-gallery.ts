import { createClient } from "@/utils/supabase/server";
import { PHOTO_BUCKET, PHOTO_PAGE_SIZE, type PhotoGalleryPage } from "@/lib/photos";
import type { GalleryCursor } from "@/lib/gallery-cursor";

export const PHOTO_COLUMNS = "id, caption, context, created_at, image_path, width, height";
type GalleryRow = {
  id: string; caption: string; context: string; created_at: string;
  image_path: string; width: number; height: number;
};
export async function loadPhotoGallery(supabase: ReturnType<typeof createClient>, userId: string, cursor?: GalleryCursor): Promise<PhotoGalleryPage> {
  let query = supabase.from("photo_generations").select(PHOTO_COLUMNS).eq("created_by", userId)
    .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(PHOTO_PAGE_SIZE + 1);
  if (cursor) {
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }
  const { data, error } = await query;
  if (error) throw new Error("Your gallery could not be loaded. Please try again.");
  const rows = (data ?? []) as GalleryRow[];
  const page = rows.slice(0, PHOTO_PAGE_SIZE);
  const { data: signedUrls } = page.length
    ? await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(page.map((row) => row.image_path), 3600)
    : { data: [] };
  const urls = new Map((signedUrls ?? []).map((item) => [item.path, item.signedUrl]));
  const lastRow = page.at(-1);
  return {
    generations: page.map(({ image_path, ...row }) => ({ ...row, imageUrl: urls.get(image_path) || null })),
    nextCursor: rows.length > PHOTO_PAGE_SIZE && lastRow
      ? Buffer.from(JSON.stringify({ createdAt: lastRow.created_at, id: lastRow.id })).toString("base64url") : null,
  };
}
