import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import ProfileEditor from "@/components/profile-editor";

export default async function ProfilePage() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, avatar_path")
    .eq("user_id", user.id)
    .maybeSingle();

  const firstName = profile?.first_name ?? user.user_metadata?.given_name ?? user.user_metadata?.first_name ?? "";
  const lastName = profile?.last_name ?? user.user_metadata?.family_name ?? user.user_metadata?.last_name ?? "";
  const avatarUrl = profile?.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl
    : (user.user_metadata?.avatar_url as string | undefined) ?? null;
  return (
    <div className="app-page">
      <SiteHeader user={user} active="profile" />
      <main className="profile-shell">
      <div className="page-heading"><p className="eyebrow">YOUR ACCOUNT</p><h1>Your profile.</h1><p>The name and photo behind your posts.</p></div>

      <section className="profile-panel" aria-labelledby="edit-profile-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Profile details</p>
            <h2 id="edit-profile-title">Make it yours</h2>
          </div>
          <span className="account-pill">Signed in with Google</span>
        </div>
        <ProfileEditor
          userId={user.id}
          initialFirstName={firstName}
          initialLastName={lastName}
          initialAvatarUrl={avatarUrl}
          initialAvatarPath={profile?.avatar_path ?? null}
        />
      </section>

      <p className="back-link"><Link href="/">← Back to the feed</Link></p>
      </main>
      <SiteFooter />
    </div>
  );
}
