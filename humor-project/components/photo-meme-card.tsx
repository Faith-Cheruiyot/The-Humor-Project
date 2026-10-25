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
    <article className="meme-card">
      <div className="meme-card-header">
        <div className="meme-author"><span className="meme-avatar" aria-hidden="true">{generation.authorName[0]?.toUpperCase() ?? "H"}</span>
          <div><span className="meme-author-name">{generation.authorName}</span><time dateTime={generation.created_at}>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }).format(new Date(generation.created_at))}</time></div>
        </div>
        <div className="meme-votes" role="group" aria-label={`Rate meme: ${generation.caption}`}>
          <button className={`vote-arrow${myVote === 1 ? " is-selected" : ""}`} type="button" title={userId ? `${counts.upvotes} upvotes` : "Sign in to vote"}
            aria-label={`Upvote meme, ${counts.upvotes} upvotes`} aria-pressed={myVote === 1} disabled={!userId || Boolean(myVote) || busy} onClick={() => void rate(1)}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 12 5-5 5 5" /></svg>
          </button>
          <span className={`meme-score${myVote ? " has-vote" : ""}`} aria-label={`Score ${score}`}>{score}</span>
          <button className={`vote-arrow${myVote === -1 ? " is-selected" : ""}`} type="button" title={userId ? `${counts.downvotes} downvotes` : "Sign in to vote"}
            aria-label={`Downvote meme, ${counts.downvotes} downvotes`} aria-pressed={myVote === -1} disabled={!userId || Boolean(myVote) || busy} onClick={() => void rate(-1)}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 8 5 5 5-5" /></svg>
          </button>
        </div>
      </div>
      <div className="meme-image-frame">
        {generation.imageUrl ? <Image className="meme-image" src={generation.imageUrl} alt={`Photo shared by ${generation.authorName}`} width={generation.width} height={generation.height} unoptimized />
          : <span className="photo-image-unavailable">The photo couldn’t load. Try refreshing the feed.</span>}
      </div>
      <div className="meme-card-caption"><h3>{generation.caption}</h3></div>
      {message ? <p className="card-message" role="status">{message}</p> : null}
      {error ? <p className="card-message card-error" role="alert">{error}</p> : null}
    </article>
  );
}
