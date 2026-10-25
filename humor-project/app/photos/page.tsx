import type { Metadata } from "next";
import { cookies } from "next/headers";
import PhotoStudio from "@/components/photo-studio";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Create a meme | The Humor Project",
  description: "Bring the photo. Let AI find the punchline. Share your next meme with the feed.",
};

export default async function PhotosPage() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <div className="app-page">
      <SiteHeader user={user} active="create" />
      <main className="studio-shell">
        <div className="page-heading"><p className="eyebrow">YOUR TURN</p><h1>Make the next good one.</h1><p>A photo, a little AI, and a punchline worth sharing.</p></div>
        <PhotoStudio key={user?.id ?? "guest"} userId={user?.id ?? null} />
      </main>
      <SiteFooter />
    </div>
  );
}
