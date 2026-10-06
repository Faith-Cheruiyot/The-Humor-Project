import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import AuthControls from "@/components/auth-controls";
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
  const needsName = !firstName.trim() || !lastName.trim();

  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="The Humor Project home">
          <span className="brand-mark" aria-hidden="true">ha!</span>
          <span>The Humor Project</span>
        </Link>
        <nav className="header-nav" aria-label="Main navigation">
          <Link href="/">Community</Link>
          <Link href="/after-hours">After hours</Link>
          <AuthControls signedIn email={user.email} />
        </nav>
      </header>

      <section className="profile-page-heading">
        <p className="eyebrow">Your corner of the comedy club</p>
        <h1>{needsName ? "Let’s get to know you." : "Your profile"}</h1>
        <p>
          {needsName
            ? "Add your name to finish setting up your profile. You can change it any time."
            : "A few details make it easier for the community to say hello."}
        </p>
      </section>

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

      <p className="back-link"><Link href="/">← Back to the community</Link></p>
    </main>
  );
}
