import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import AuthControls from "@/components/auth-controls";
import CaptionFeed, { type CaptionCardData } from "@/components/caption-feed";
import CaptionMaker from "@/components/caption-maker";

const dailyScenes = [
  "A Columbia student trying to carry four coffees through the subway turnstile.",
  "A campus squirrel guarding a very ambitious lunch.",
  "A Midwest transplant learning that every New York block has a bagel opinion.",
  "Someone giving a confident walking tour while Google Maps spins in circles.",
  "A late-night study session that has turned into a full snack tasting.",
  "A New Yorker holding the door while the visitor is still half a block away.",
  "A pigeon sitting at an outdoor cafe like it owns the table.",
];

function getDailyScene() {
  const localDate = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const dayNumber = Math.floor(new Date(`${localDate}T00:00:00Z`).getTime() / 86_400_000);
  return dailyScenes[dayNumber % dailyScenes.length];
}

export default async function CaptionClubPage() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  const { data: generations, error } = await supabase
    .from("caption_generations")
    .select("id, prompt, caption, created_at, created_by, upvotes, downvotes")
    .order("created_at", { ascending: false })
    .limit(50);

  const generationIds = (generations ?? []).map((generation) => generation.id);
  const creatorIds = [...new Set((generations ?? []).map((generation) => generation.created_by))];

  let profiles: Array<{ user_id: string; first_name: string | null }> = [];
  if (creatorIds.length) {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, first_name")
      .in("user_id", creatorIds);
    profiles = data ?? [];
  }

  let myVotes: Array<{ generation_id: string; value: number }> = [];
  if (user && generationIds.length) {
    const { data } = await supabase
      .from("caption_votes")
      .select("generation_id, value")
      .eq("user_id", user.id)
      .in("generation_id", generationIds);
    myVotes = data ?? [];
  }

  const profileNames = new Map<string, string>(profiles.map((profile) => [
    profile.user_id,
    profile.first_name?.trim() || "Club member",
  ] as const));
  const voteByGeneration = new Map<string, -1 | 1>(myVotes.map((vote) => [
    vote.generation_id,
    vote.value as -1 | 1,
  ] as const));
  const captions: CaptionCardData[] = (generations ?? []).map((generation) => ({
    ...generation,
    authorName: profileNames.get(generation.created_by) ?? "Club member",
    myVote: voteByGeneration.get(generation.id) ?? null,
  }));

  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="The Humor Project home">
          <span className="brand-mark" aria-hidden="true">ha!</span>
          <span>The Humor Project</span>
        </Link>
        <nav className="header-nav" aria-label="Main navigation">
          <Link href="/">Community</Link>
          {user ? <Link href="/profile">Profile</Link> : null}
          {user ? <AuthControls signedIn /> : <AuthControls />}
        </nav>
      </header>

      <section className="caption-club-heading">
        <p className="eyebrow">Caption Club · made with Gemini 3.5 Lite</p>
        <h1>Everyday scenes, unnecessarily great captions.</h1>
        <p>Set up a campus or New York moment. Gemini writes one caption, the club keeps the prompt with it, and members vote for the line that lands.</p>
      </section>

      <div className="caption-club-layout">
        <section className="caption-maker-panel" aria-labelledby="caption-maker-title">
          <p className="eyebrow">Today’s scene</p>
          <h2 id="caption-maker-title">Make a new caption</h2>
          {user ? (
            <CaptionMaker dailyPrompt={getDailyScene()} />
          ) : (
            <>
              <p>Sign in to generate a caption and add it to the board.</p>
              <AuthControls />
              <p className="caption-privacy-note">Prompts and captions are public so the whole club can enjoy and rate them.</p>
            </>
          )}
        </section>

        <section className="caption-feed" aria-labelledby="caption-feed-title">
          {user ? null : (
            <div className="caption-signin">
              <p>Anyone can read the board. Sign in with Google to vote on a caption.</p>
              <AuthControls />
            </div>
          )}
          <CaptionFeed captions={captions} userId={user?.id ?? null} loadError={Boolean(error)} />
        </section>
      </div>
    </main>
  );
}
