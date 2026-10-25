import { createClient } from "@/utils/supabase/server";
import { PHOTO_BUCKET, PHOTO_PAGE_SIZE, photoFeedSince, type PhotoGalleryPage, type PhotoFeedOptions } from "@/lib/photos";
import type { GalleryCursor } from "@/lib/gallery-cursor";

export const PHOTO_COLUMNS = "id, caption, created_at, created_by, image_path, width, height, upvotes, downvotes";
type GalleryRow = {
  id: string; caption: string; created_at: string; created_by: string;
  image_path: string; width: number; height: number;
  upvotes: number; downvotes: number;
};
export async function loadPhotoGallery(supabase: ReturnType<typeof createClient>, userId: string | null, cursor?: GalleryCursor,
  options: PhotoFeedOptions = { period: "week", limit: PHOTO_PAGE_SIZE }): Promise<PhotoGalleryPage> {
  let query = supabase.from("photo_generations").select(PHOTO_COLUMNS)
    .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(options.limit + 1);
  const since = photoFeedSince(options.period);
  if (since) query = query.gte("created_at", since);
  if (cursor) {
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }
  const { data, error } = await query;
  if (error) throw new Error("The meme feed could not be loaded. Please try again.");
  const rows = (data ?? []) as GalleryRow[];
  const page = rows.slice(0, options.limit);
  const { data: signedUrls } = page.length
    ? await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(page.map((row) => row.image_path), 3600)
    : { data: [] };
  const urls = new Map((signedUrls ?? []).map((item) => [item.path, item.signedUrl]));
  const creatorIds = [...new Set(page.map((row) => row.created_by))];
  const [{ data: profiles }, { data: votes }] = await Promise.all([
    creatorIds.length ? supabase.from("profiles").select("user_id, first_name").in("user_id", creatorIds) : Promise.resolve({ data: [] }),
    userId && page.length ? supabase.from("photo_votes").select("generation_id, value")
      .eq("user_id", userId).in("generation_id", page.map((row) => row.id)) : Promise.resolve({ data: [] }),
  ]);
  const names = new Map<string, string>((profiles ?? []).map((profile) => [profile.user_id, profile.first_name?.trim() || "Club member"]));
  const myVotes = new Map<string, -1 | 1>((votes ?? []).map((vote) => [vote.generation_id, vote.value as -1 | 1]));
  const lastRow = page.at(-1);
  return {
    generations: page.map(({ image_path, ...row }) => ({ ...row, imageUrl: urls.get(image_path) || null,
      authorName: names.get(row.created_by) ?? "Club member", myVote: myVotes.get(row.id) ?? null })),
    nextCursor: rows.length > options.limit && lastRow
      ? Buffer.from(JSON.stringify({ createdAt: lastRow.created_at, id: lastRow.id })).toString("base64url") : null,
  };
}
