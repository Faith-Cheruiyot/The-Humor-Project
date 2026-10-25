import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { PHOTO_BUCKET, PHOTO_MAX_BYTES, PHOTO_MIME_TYPES } from "@/lib/photos";
import { generatePhotoCaption, PHOTO_MODEL, PhotoCaptionError } from "@/lib/gemini-photo";
import { preparePhoto } from "@/lib/photo-processing";
import { loadPhotoGallery, PHOTO_COLUMNS } from "@/lib/photo-gallery";
import { parseGalleryCursor } from "@/lib/gallery-cursor";

export const runtime = "nodejs";
export const maxDuration = 60;
const privateHeaders = { "Cache-Control": "private, no-store" };

class UploadError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

async function readPhotoForm(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    throw new UploadError("Upload a photo using the photo form.");
  }
  const maxBodySize = PHOTO_MAX_BYTES + 16_384;
  if (Number(request.headers.get("content-length")) > maxBodySize) {
    throw new UploadError("Choose a photo smaller than 4 MB.", 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new UploadError("Choose a photo first.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBodySize) {
        await reader.cancel();
        throw new UploadError("Choose a photo smaller than 4 MB.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return await new Response(new Uint8Array(Buffer.concat(chunks)), { headers: { "Content-Type": contentType } }).formData();
  } catch {
    throw new UploadError("The photo upload could not be read. Please choose your photo again.");
  }
}

export async function GET(request: Request) {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  const rawCursor = new URL(request.url).searchParams.get("cursor");
  let cursor;
  try {
    cursor = rawCursor ? parseGalleryCursor(rawCursor) : undefined;
  } catch {
    return NextResponse.json({ error: "The gallery page is invalid. Refresh and try again." }, { status: 400, headers: privateHeaders });
  }
  try {
    return NextResponse.json(await loadPhotoGallery(supabase, user?.id ?? null, cursor), { headers: privateHeaders });
  } catch {
    return NextResponse.json({ error: "The meme feed could not be loaded. Please try again." }, { status: 500, headers: privateHeaders });
  }
}

export async function POST(request: Request) {
  const supabase = createClient(await cookies());
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to make a photo meme." }, { status: 401, headers: privateHeaders });

  try {
    const form = await readPhotoForm(request);
    const photo = form.get("photo");
    const rawContext = form.get("context");
    const context = typeof rawContext === "string" ? rawContext.trim() : "";
    if (!(photo instanceof File) || !photo.size) throw new UploadError("Choose a photo first.");
    if (photo.size > PHOTO_MAX_BYTES) throw new UploadError("Choose a photo smaller than 4 MB.", 413);
    if (!PHOTO_MIME_TYPES.includes(photo.type)) throw new UploadError("Choose a JPG, PNG, or WebP photo.");
    if (rawContext instanceof File || context.length > 500) throw new UploadError("Keep the optional context under 500 characters.");

    let prepared: Awaited<ReturnType<typeof preparePhoto>>;
    const sourcePhoto = Buffer.from(await photo.arrayBuffer());
    try {
      prepared = await preparePhoto(sourcePhoto);
    } catch {
      throw new UploadError("This photo could not be read. Use a still JPG, PNG, or WebP at least 128 pixels wide and tall (up to 25 megapixels).");
    }
    const caption = await generatePhotoCaption(prepared.data, context);
    const { width, height } = prepared;
    const id = randomUUID();
    const imagePath = `${user.id}/${id}.${prepared.extension}`;
    const bucket = supabase.storage.from(PHOTO_BUCKET);
    const { error: uploadError } = await bucket.upload(imagePath, sourcePhoto, { contentType: prepared.mimeType, upsert: false });
    if (uploadError) {
      console.error("Meme image could not be saved", { code: uploadError.name });
      return NextResponse.json({ error: "Your meme could not be saved. Please try again." }, { status: 500, headers: privateHeaders });
    }

    const { data: saved, error: saveError } = await supabase.from("photo_generations").insert({
      id, created_by: user.id, caption, context, image_path: imagePath, model: PHOTO_MODEL, width, height,
    }).select(PHOTO_COLUMNS).single();
    if (saveError || !saved) {
      const { error: cleanupError } = await bucket.remove([imagePath]);
      if (cleanupError) console.error("Meme upload cleanup failed", { code: cleanupError.name });
      return NextResponse.json({ error: "Your meme could not be added to the gallery. Please try again." }, { status: 500, headers: privateHeaders });
    }
    const { data: signed } = await bucket.createSignedUrl(imagePath, 3600);
    const { image_path: savedPath, ...generation } = saved;
    void savedPath;
    return NextResponse.json({ generation: { ...generation, imageUrl: signed?.signedUrl ?? null, authorName: "You", myVote: null } }, { status: 201, headers: privateHeaders });
  } catch (error) {
    if (error instanceof UploadError || error instanceof PhotoCaptionError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: privateHeaders });
    }
    console.error("Photo meme generation failed", { name: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: "Your meme could not be created. Please try again." }, { status: 500, headers: privateHeaders });
  }
}
