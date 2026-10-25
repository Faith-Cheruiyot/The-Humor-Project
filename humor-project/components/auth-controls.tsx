"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type AuthControlsProps = {
  signedIn?: boolean;
  email?: string | null;
  returnTo?: string;
  variant?: "default" | "compact" | "text";
  label?: string;
};

export default function AuthControls({ signedIn = false, email, returnTo = "/", variant = "default", label }: AuthControlsProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function startGoogleSignIn(supabase: ReturnType<typeof createClient>) {
    const { data, error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`, queryParams: { prompt: "select_account" } },
    });
    if (authError || !data.url) {
      setError(authError?.message ?? "Google sign-in could not be started. Please try again.");
      setBusy(false);
      return;
    }
    window.location.assign(data.url);
  }

  async function signIn(switchAccount = false) {
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      if (switchAccount) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      await startGoogleSignIn(supabase);
    } catch {
      setError("Sign-in could not be started. Check your connection and try again.");
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
      router.replace("/");
      router.refresh();
    } catch {
      setError("Sign-out could not be completed. Please try again.");
    } finally { setBusy(false); }
  }

  if (signedIn) return (
    <details className="account-menu">
      <summary className="account-toggle"><span className="account-avatar" aria-hidden="true">{email?.[0]?.toUpperCase() ?? "M"}</span><span>Account</span><span className="account-chevron" aria-hidden="true">⌄</span></summary>
      <div className="account-dropdown">
        {email ? <p className="account-email">{email}</p> : null}
        <Link href="/profile">Edit profile</Link>
        <button type="button" disabled={busy} onClick={() => void signIn(true)}>Switch Google account</button>
        <button type="button" disabled={busy} onClick={() => void signOut()}>{busy ? "Please wait…" : "Sign out"}</button>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
      </div>
    </details>
  );

  return (
    <div className={`auth-control auth-${variant}`}>
      <button className={variant === "text" ? "text-button auth-text-button" : `button ${variant === "compact" ? "button-signin" : "button-primary"}`}
        type="button" disabled={busy} onClick={() => void signIn()}>
        {variant === "text" ? null : <GoogleMark />}{busy ? "Opening Google…" : label ?? (variant === "compact" ? "Sign in" : "Continue with Google")}
      </button>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="google-mark" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(4 4) scale(.83)" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.4-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.65 5.94c4.47-4.13 7.11-10.21 7.11-17.59Z" transform="translate(1 1) scale(.96)" />
      <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.75-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.88.93 7.57 2.56 10.78l7.97-6.19Z" transform="translate(5 5) scale(.8)" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.78l-7.65-5.94c-2.13 1.43-4.86 2.27-8.25 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(4 1) scale(.83)" />
    </svg>
  );
}
