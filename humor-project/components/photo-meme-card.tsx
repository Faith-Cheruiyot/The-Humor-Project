"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { PhotoGeneration } from "@/lib/photos";

export default function PhotoMemeCard({ generation, userId }: { generation: PhotoGeneration; userId: string | null }) {
  const [counts, setCounts] = useState({ upvotes: generation.upvotes, downvotes: generation.downvotes });
  const [myVote, setMyVote] = useState(generation.myVote);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);

  async function rate(value: -1 | 1) {
    if (!userId || myVote || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const supabase = createClient();
      const { error: voteError } = await supabase.from("photo_votes").insert({ generation_id: generation.id, user_id: userId, value });
      if (voteError) {
        if (voteError.code !== "23505") throw new Error("Your rating could not be saved. Please try again.");
        const { data: existing } = await supabase.from("photo_votes").select("value")
          .eq("generation_id", generation.id).eq("user_id", userId).single();
        if (existing) setMyVote(existing.value as -1 | 1);
        setMessage("You’ve already rated this meme.");
      } else {
        setMyVote(value);
        setCounts((previous) => ({ upvotes: previous.upvotes + (value === 1 ? 1 : 0), downvotes: previous.downvotes + (value === -1 ? 1 : 0) }));
        setMessage("Rating saved. Thanks for weighing in!");
      }
      const { data: totals } = await supabase.from("photo_generations").select("upvotes, downvotes").eq("id", generation.id).single();
      if (totals) setCounts(totals);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Your rating could not be saved. Please try again.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const score = counts.upvotes - counts.downvotes;
  return (
    <article className="photo-meme-card">
      <div className="photo-meme-image-link">
        {generation.imageUrl ? <Image className="photo-meme-image" src={generation.imageUrl} alt={`Photo shared by ${generation.authorName}`}
          width={generation.width} height={generation.height} unoptimized /> : <span className="photo-image-unavailable">Photo preview unavailable. Refresh the feed to try again.</span>}
      </div>
      <div className="photo-meme-card-body">
        <h3>{generation.caption}</h3>
        <div className="photo-meme-card-footer">
          <span className="caption-card-byline">{generation.authorName}</span>
          <time dateTime={generation.created_at}>{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "America/New_York" }).format(new Date(generation.created_at))}</time>
        </div>
        <div className="caption-vote-row photo-rating-row">
          <div className="caption-vote-controls" aria-label={`Rate meme: ${generation.caption}`}>
            <button className={`caption-vote-button${myVote === 1 ? " is-selected" : ""}`} type="button"
              aria-label={`Upvote meme, ${counts.upvotes} upvotes`} aria-pressed={myVote === 1}
              disabled={!userId || Boolean(myVote) || busy} onClick={() => void rate(1)}><span aria-hidden="true">↑</span> {counts.upvotes}</button>
            <button className={`caption-vote-button${myVote === -1 ? " is-selected" : ""}`} type="button"
              aria-label={`Downvote meme, ${counts.downvotes} downvotes`} aria-pressed={myVote === -1}
              disabled={!userId || Boolean(myVote) || busy} onClick={() => void rate(-1)}><span aria-hidden="true">↓</span> {counts.downvotes}</button>
          </div>
          <span className="caption-score">Score {score > 0 ? `+${score}` : score}</span>
        </div>
        {message ? <p className="caption-feed-note" role="status">{message}</p> : null}
        {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
        {!userId ? <p className="caption-feed-note">Sign in to rate this meme.</p> : null}
      </div>
    </article>
  );
}
