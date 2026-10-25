"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import PhotoMemeCard from "@/components/photo-meme-card";
import AuthControls from "@/components/auth-controls";
import type { PhotoGalleryPage } from "@/lib/photos";

export default function PhotoFeed({ initialPage, userId, loadError }: { initialPage: PhotoGalleryPage; userId: string | null; loadError: boolean }) {
  const [generations, setGenerations] = useState(initialPage.generations);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [error, setError] = useState(loadError ? "The meme feed could not be loaded. Please try again." : "");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const inFlight = useRef(false);

  async function load(reset: boolean) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/photos${!reset && nextCursor ? `?cursor=${encodeURIComponent(nextCursor)}` : ""}`, { cache: "no-store" });
      const result = await response.json() as PhotoGalleryPage & { error?: string };
      if (!response.ok || !Array.isArray(result.generations)) throw new Error(result.error ?? "The meme feed could not be loaded.");
      setGenerations((previous) => [...new Map((reset ? result.generations : [...previous, ...result.generations]).map((item) => [item.id, item])).values()]);
      setNextCursor(result.nextCursor);
      if (reset) setRevision((previous) => previous + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : "The meme feed could not be loaded. Please try again.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="photo-gallery homepage-meme-feed" id="meme-feed" aria-labelledby="meme-feed-title">
      <div className="section-heading">
        <div><p className="eyebrow">The community meme feed</p><h2 id="meme-feed-title">Fresh photos. Fresh punchlines.</h2></div>
        <Link className="button button-dark" href="/photos">Add your photo <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="photo-feed-toolbar"><p>Photos from the club, captions from AI. Rate the ones that land.</p>
        <button className="text-button" type="button" disabled={busy} onClick={() => void load(true)}>{busy ? "Loading…" : "Refresh feed"}</button>
      </div>
      {!userId ? <div className="caption-signin"><p>Everyone can browse. Sign in with Google to rate a meme.</p><AuthControls returnTo="/#meme-feed" /></div> : null}
      {error ? <p className="form-message form-error" role="alert">{error} <button className="text-button" type="button" disabled={busy} onClick={() => void load(true)}>Try again</button></p> : null}
      {generations.length ? <div className="photo-gallery-grid">
        {generations.map((generation) => <PhotoMemeCard key={`${revision}:${generation.id}`} generation={generation} userId={userId} />)}
      </div> : !error ? <div className="photo-gallery-empty"><span aria-hidden="true">☺</span><h3>The feed is waiting for its first laugh.</h3><p>Upload a photo and share the first meme with the club.</p></div> : null}
      {nextCursor ? <button className="button photo-load-more" type="button" disabled={busy} onClick={() => void load(false)}>{busy ? "Loading memes…" : "Load more memes"}</button> : null}
    </section>
  );
}
