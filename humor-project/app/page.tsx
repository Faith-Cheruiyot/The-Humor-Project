import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import AuthControls from "@/components/auth-controls";

export default async function Home() {
  const supabase = createClient(await cookies());
  const [{ data: userData }, { data: profiles, error }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, avatar_path")
      .order("created_at", { ascending: true }),
  ]);
  const user = userData.user;

  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="The Humor Project home">
          <span className="brand-mark" aria-hidden="true">ha!</span>
          <span>The Humor Project</span>
        </Link>
        <nav className="header-nav" aria-label="Main navigation">
          {user ? (
            <>
              <Link href="/caption-club">Caption Club</Link>
              <Link href="/profile">Profile</Link>
              <Link href="/after-hours">After hours</Link>
              <AuthControls signedIn email={user.email} />
            </>
          ) : (
            <>
              <Link href="/caption-club">Caption Club</Link>
              <Link href="#community">Community</Link>
              <AuthControls />
            </>
          )}
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">A little joy, shared</p>
          <h1>The punchline is better together.</h1>
          <p className="hero-description">
            Make a scene into a Gemini-written caption, then help the community
            decide which punchlines deserve an encore.
          </p>
          {user ? (
            <div className="hero-actions">
              <Link className="button button-primary" href="/caption-club">
                Make today’s caption <span aria-hidden="true">↗</span>
              </Link>
              <Link className="text-link" href="/after-hours">
                Open the members room
              </Link>
            </div>
          ) : (
            <div className="hero-actions">
              <AuthControls />
              <span className="fine-print">New here? Google sign-in creates your account.</span>
            </div>
          )}
        </div>
        <div className="hero-art" role="img" aria-label="A cheerful illustrated burst">
          <span className="burst burst-one" aria-hidden="true">ha!</span>
          <span className="burst burst-two" aria-hidden="true">hee</span>
          <span className="burst burst-three" aria-hidden="true">☺</span>
          <span className="burst-caption">GOOD MOOD<br />CLUB</span>
        </div>
      </section>

      <section className="members-card" aria-labelledby="members-title">
        <div className="members-lock" aria-hidden="true">✳</div>
        <div>
          <p className="eyebrow">A little something extra</p>
          <h2 id="members-title">The after-hours joke drawer</h2>
          <p>There’s a members-only room tucked behind this door.</p>
        </div>
        {user ? (
          <Link className="button button-dark" href="/after-hours">Come on in <span aria-hidden="true">→</span></Link>
        ) : (
          <span className="members-note">Sign in with Google to unlock it</span>
        )}
      </section>

      <section className="caption-promo" aria-labelledby="caption-promo-title">
        <div>
          <p className="eyebrow">New on the club board</p>
          <h2 id="caption-promo-title">One scene. A hundred possible punchlines.</h2>
          <p>Bring a campus or city moment to Caption Club, let Gemini take a swing, and vote for the line that lands.</p>
        </div>
        <Link className="button button-dark" href="/caption-club">Open Caption Club <span aria-hidden="true">→</span></Link>
      </section>

      <section className="community-section" id="community" aria-labelledby="community-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">The good company</p>
            <h2 id="community-title">Meet the community</h2>
          </div>
          <p>Every great bit starts with good people.</p>
        </div>

        {error ? (
          <p className="notice" role="status">The community list is taking a little break. Try again soon.</p>
        ) : profiles?.length ? (
          <ul className="profiles-grid" aria-label="Community profiles">
            {profiles.map((profile, index) => {
              const firstName = profile.first_name?.trim() ?? "";
              const lastName = profile.last_name?.trim() ?? "";
              const name = [firstName, lastName].filter(Boolean).join(" ");
              const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
              const avatarUrl = profile.avatar_path
                ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl
                : null;

              return (
                <li className="profile-card" key={profile.id}>
                  {avatarUrl ? (
                    <div className="profile-avatar avatar-photo" role="img" aria-label={`${name || "Community member"}'s photo`} style={{ backgroundImage: `url("${avatarUrl}")` }} />
                  ) : (
                    <span className="profile-avatar" aria-hidden="true">{initials || "☺"}</span>
                  )}
                  <span className="profile-number">{String(index + 1).padStart(2, "0")}</span>
                  <p className="profile-label">Community member</p>
                  <h3>{name || "Name to come"}</h3>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="notice">No profiles yet. Be the first to join the fun.</p>
        )}
      </section>

      <footer className="site-footer">
        <span>Keep it kind. Keep it funny.</span>
        <span>Made for the love of a good laugh.</span>
      </footer>
    </main>
  );
}
