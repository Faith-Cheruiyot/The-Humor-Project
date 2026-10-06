import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import AuthControls from "@/components/auth-controls";

const jokes = [
  { setup: "Why did the scarecrow get promoted?", punchline: "He was outstanding in his field." },
  { setup: "What do you call a bear with no teeth?", punchline: "A gummy bear." },
  { setup: "Why did the coffee file a police report?", punchline: "It got mugged." },
];

export default async function AfterHoursPage() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="The Humor Project home">
          <span className="brand-mark" aria-hidden="true">ha!</span>
          <span>The Humor Project</span>
        </Link>
        <nav className="header-nav" aria-label="Main navigation">
          <Link href="/">Community</Link>
          <Link href="/profile">Profile</Link>
          <AuthControls signedIn email={user.email} />
        </nav>
      </header>

      <section className="after-hours-heading">
        <p className="eyebrow">Members only · You’re in</p>
        <h1>Welcome{profile?.first_name ? `, ${profile.first_name}` : ""}.</h1>
        <p>The door’s closed. The jokes are open.</p>
      </section>

      <section className="joke-grid" aria-label="Members-only jokes">
        {jokes.map((joke, index) => (
          <article className="joke-card" key={joke.setup}>
            <span className="joke-number">JOKE {String(index + 1).padStart(2, "0")}</span>
            <h2>{joke.setup}</h2>
            <p>{joke.punchline}</p>
          </article>
        ))}
      </section>

      <p className="back-link"><Link href="/">← Back to the community</Link></p>
    </main>
  );
}
