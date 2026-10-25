import Link from "next/link";
import AuthControls from "@/components/auth-controls";

type Props = { user: { email?: string | null } | null; active?: "feed" | "create" | "profile" };

export default function SiteHeader({ user, active = "feed" }: Props) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="The Humor Project home">
          <span className="brand-mark" aria-hidden="true">ha!</span>
          <span className="brand-name">THE HUMOR<span>PROJECT</span></span>
        </Link>
        <nav className="header-nav" aria-label="Main navigation">
          <Link className="nav-link" href="/" aria-current={active === "feed" ? "page" : undefined}>The feed</Link>
          {active !== "feed" ? <Link className="nav-link" href="/photos" aria-current={active === "create" ? "page" : undefined}>Create</Link> : null}
          <AuthControls signedIn={Boolean(user)} email={user?.email} variant="compact" returnTo={active === "create" ? "/photos" : active === "profile" ? "/profile" : "/"} />
        </nav>
      </div>
    </header>
  );
}
