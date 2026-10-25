"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import PhotoMemeCard from "@/components/photo-meme-card";
import AuthControls from "@/components/auth-controls";
import { PHOTO_PAGE_SIZE, PHOTO_PAGE_SIZES, PHOTO_PERIODS, type PhotoGalleryPage, type PhotoPeriod } from "@/lib/photos";

export default function PhotoFeed({ initialPage, userId, loadError }: { initialPage: PhotoGalleryPage; userId: string | null; loadError: boolean }) {
  const [generations, setGenerations] = useState(initialPage.generations);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [period, setPeriod] = useState<PhotoPeriod>("week");
  const [pageSize, setPageSize] = useState<number>(PHOTO_PAGE_SIZE);
  const [error, setError] = useState(loadError ? "The feed could not be loaded. Please try again." : "");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const inFlight = useRef(false);

  async function load(reset: boolean, nextPeriod = period, nextSize = pageSize) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const parameters = new URLSearchParams({ period: nextPeriod, limit: String(nextSize) });
      if (!reset && nextCursor) parameters.set("cursor", nextCursor);
      const response = await fetch(`/api/photos?${parameters}`, { cache: "no-store" });
      const result = await response.json() as PhotoGalleryPage & { error?: string };
      if (!response.ok || !Array.isArray(result.generations)) throw new Error(result.error ?? "The feed could not be loaded.");
      setGenerations((previous) => [...new Map((reset ? result.generations : [...previous, ...result.generations]).map((item) => [item.id, item])).values()]);
      setNextCursor(result.nextCursor);
      setPeriod(nextPeriod);
      setPageSize(nextSize);
      if (reset) setRevision((previous) => previous + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : "The feed could not be loaded. Please try again.");
    } finally { inFlight.current = false; setBusy(false); }
  }

  return (
    <section className="meme-feed" id="meme-feed" aria-labelledby="meme-feed-title">
      <h1 id="meme-feed-title" className="visually-hidden">The meme feed</h1>
      <div className="feed-controls">
        <div className="period-tabs" role="group" aria-label="Time period">
          {PHOTO_PERIODS.map((item) => <button key={item.value} type="button" aria-pressed={period === item.value}
            aria-controls="feed-grid" disabled={busy} onClick={() => void load(true, item.value)}>{item.label}</button>)}
        </div>
        <div className="feed-display-controls"><label htmlFor="feed-page-size">Show</label>
          <select id="feed-page-size" value={pageSize} disabled={busy} onChange={(event) => void load(true, period, Number(event.target.value))}>
            {PHOTO_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select><span>at a time</span>
          <button className={`icon-button refresh-button${busy ? " is-loading" : ""}`} type="button" disabled={busy} aria-label="Refresh feed" onClick={() => void load(true)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.6-2L20 8M4 16l2.3 3A7 7 0 0 0 18 17" /></svg>
          </button>
        </div>
      </div>
      <div className="feed-status"><span role="status">{busy ? "Loading the good stuff…" : `${generations.length} ${generations.length === 1 ? "meme" : "memes"} to make your day`}</span>
        {!userId ? <AuthControls variant="text" label="Sign in to vote ↗" returnTo="/#meme-feed" /> : <span className="feed-vote-hint">Find a favorite. Give it a vote.</span>}
      </div>
      {error ? <p className="form-message form-error" role="alert">{error} <button className="text-button" type="button" disabled={busy} onClick={() => void load(true)}>Try again</button></p> : null}
      <div id="feed-grid" className={`meme-grid${busy ? " is-loading" : ""}`} aria-busy={busy}>
        {generations.map((generation) => <PhotoMemeCard key={`${revision}:${generation.id}`} generation={generation} userId={userId} />)}
      </div>
      {!generations.length && !error ? <div className="feed-empty"><span className="empty-smile" aria-hidden="true">:)</span><h2>Quiet in here. For now.</h2><p>Be the first to post a photo from this stretch of time.</p>
        {period !== "all" ? <button className="text-button" type="button" disabled={busy} onClick={() => void load(true, "all")}>See all memes →</button> : <Link className="text-link" href="/photos">Make the first one →</Link>}
      </div> : null}
      {nextCursor ? <button className="button button-secondary load-more" type="button" disabled={busy} onClick={() => void load(false)}>{busy ? "Loading…" : "Load more"}<span aria-hidden="true">↓</span></button> : null}
    </section>
  );
}
