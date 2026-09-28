import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export default async function Home() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: profiles, error } = await supabase
    .from("Profiles")
    .select("id, first_name, last_name")
    .order("created_at", { ascending: true });

  return (
    <main className="profiles-page">
      <section className="profiles-shell" aria-labelledby="profiles-title">
        <header className="profiles-header">
          <p className="profiles-kicker">The Humor Project</p>
          <h1 id="profiles-title">Profiles</h1>
          <p className="profiles-subtitle">
            Meet the people behind the punchlines.
          </p>
        </header>

        {error ? (
          <p className="profiles-state" role="alert">
            Profiles couldn’t be loaded right now.
          </p>
        ) : profiles?.length ? (
          <>
            <p className="profiles-count">
              {profiles.length} {profiles.length === 1 ? "profile" : "profiles"}
            </p>
            <ul className="profiles-grid" aria-label="Profiles">
              {profiles.map((profile, index) => {
                const firstName = profile.first_name?.trim() ?? "";
                const lastName = profile.last_name?.trim() ?? "";
                const name = [firstName, lastName].filter(Boolean).join(" ");
                const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`;

                return (
                  <li className="profile-card" key={profile.id}>
                    <div className="profile-card-topline">
                      <span className="profile-avatar" aria-hidden="true">
                        {initials.toUpperCase() || "?"}
                      </span>
                      <span className="profile-card-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="profile-card-label">Community member</p>
                    <h2 className="profile-card-name">
                      {name || "Unnamed profile"}
                    </h2>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="profiles-state">
            No profiles are available to this page yet. Check the Supabase read
            policy if you expected results.
          </p>
        )}
      </section>
    </main>
  );
}
