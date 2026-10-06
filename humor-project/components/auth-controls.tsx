"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type AuthControlsProps = {
  signedIn?: boolean;
  email?: string | null;
};

export default function AuthControls({ signedIn = false, email }: AuthControlsProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function startGoogleSignIn(supabase: ReturnType<typeof createClient>) {
    const { data, error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });

    if (authError) {
      setError(authError.message);
      setBusy(false);
      return;
    }

    if (data.url) {
      window.location.assign(data.url);
      return;
    }

    setError("Google sign-in could not be started. Please try again.");
    setBusy(false);
  }

  async function signInWithGoogle() {
    setBusy(true);
    setError("");
    await startGoogleSignIn(createClient());
  }

  async function switchGoogleAccount() {
    setBusy(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signOut();
    if (authError) {
      setError(authError.message);
      setBusy(false);
      return;
    }

    await startGoogleSignIn(supabase);
  }

  async function signOut() {
    setBusy(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signOut();
    if (authError) {
      setError(authError.message);
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  if (signedIn) {
    return (
      <div className="auth-control">
        {email ? <span className="account-email" title={email}>{email}</span> : null}
        <button className="text-button" type="button" onClick={switchGoogleAccount} disabled={busy}>
          {busy ? "Opening Google…" : "Use another Google account"}
        </button>
        <button className="text-button" type="button" onClick={signOut} disabled={busy}>
          {busy ? "Signing out…" : "Sign out"}
        </button>
        {error ? <span className="auth-error" role="alert">{error}</span> : null}
      </div>
    );
  }

  return (
    <div className="auth-control">
      <button className="button button-primary" type="button" onClick={signInWithGoogle} disabled={busy}>
        <GoogleMark />
        {busy ? "Opening Google…" : "Continue with Google"}
      </button>
      {error ? <span className="auth-error" role="alert">{error}</span> : null}
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
