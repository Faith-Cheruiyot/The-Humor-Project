import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { PHOTO_BUCKET } from "@/lib/photos";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headers = { "Cache-Control": "private, no-store" };
  const supabase = createClient(await cookies());
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to download your meme." }, { status: 401, headers });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Meme not found." }, { status: 404, headers });
  }
  const { data: generation, error } = await supabase.from("photo_generations").select("image_path")
    .eq("id", id).eq("created_by", user.id).single();
  if (error || !generation) return NextResponse.json({ error: "Meme not found." }, { status: 404, headers });
  const { data: image, error: downloadError } = await supabase.storage.from(PHOTO_BUCKET).download(generation.image_path);
  if (downloadError || !image) return NextResponse.json({ error: "Your meme could not be downloaded. Please try again." }, { status: 502, headers });
  return new NextResponse(new Uint8Array(await image.arrayBuffer()), {
    headers: { ...headers, "Content-Type": "image/jpeg", "Content-Disposition": `attachment; filename="humor-meme-${id}.jpg"` },
  });
}
