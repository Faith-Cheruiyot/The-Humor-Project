import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import AuthControls from "@/components/auth-controls";
import PhotoStudio from "@/components/photo-studio";
import { loadPhotoGallery } from "@/lib/photo-gallery";
import type { PhotoGalleryPage } from "@/lib/photos";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Photos & AI Memes | The Humor Project",
  description: "Upload a photo, let AI write the punchline, and keep every finished meme in your own gallery.",
};

export default async function PhotosPage() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  let gallery: PhotoGalleryPage = { generations: [], nextCursor: null };
  let loadError = false;
  if (user) {
    try { gallery = await loadPhotoGallery(supabase, user.id); }
    catch { loadError = true; }
  }
  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="The Humor Project home"><span className="brand-mark" aria-hidden="true">ha!</span><span>The Humor Project</span></Link>
        <nav className="header-nav" aria-label="Main navigation">
          <Link href="/">Community</Link>
          <Link href="/caption-club">Caption Club</Link>
          <Link href="/photos" aria-current="page">Photos</Link>
          {user ? <AuthControls signedIn email={user.email} /> : <AuthControls returnTo="/photos" />}
        </nav>
      </header>
      <section className="caption-club-heading photo-page-heading">
        <p className="eyebrow">AI retrieval · Photos</p>
        <h1>A photo’s worth a thousand laughs.</h1>
        <p>Upload a moment. AI finds the punchline. Get a finished meme with the caption right on your picture, and keep every take in your gallery.</p>
      </section>
      <PhotoStudio key={user?.id ?? "guest"} signedIn={Boolean(user)} initialGallery={gallery} loadError={loadError} />
      <footer className="site-footer"><span>Keep it kind. Keep it funny.</span><Link href="/caption-club">Prefer to start with words? Try Caption Club →</Link></footer>
    </main>
  );
}
