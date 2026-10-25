import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import PhotoFeed from "@/components/photo-feed";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { loadPhotoGallery } from "@/lib/photo-gallery";
import type { PhotoGalleryPage } from "@/lib/photos";

export default async function Home() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  let page: PhotoGalleryPage = { generations: [], nextCursor: null };
  let loadError = false;
  try { page = await loadPhotoGallery(supabase, user?.id ?? null); }
  catch { loadError = true; }

  return (
    <div className="app-page home-page">
      <SiteHeader user={user} />
      <main className="feed-shell">
        <PhotoFeed key={user?.id ?? "guest"} initialPage={page} userId={user?.id ?? null} loadError={loadError} />
      </main>
      <Link className="floating-create" href="/photos"><span aria-hidden="true">＋</span> Create a meme <span aria-hidden="true">↗</span></Link>
      <SiteFooter />
    </div>
  );
}
