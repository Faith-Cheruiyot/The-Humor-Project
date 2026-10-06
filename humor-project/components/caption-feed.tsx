"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export type CaptionCardData = {
  id: string;
  prompt: string;
  caption: string;
  created_at: string;
  created_by: string;
  upvotes: number;
  downvotes: number;
  authorName: string;
  myVote: -1 | 1 | null;
};

type CaptionFeedProps = {
  captions: CaptionCardData[];
  userId: string | null;
  loadError: boolean;
};

type VoteState = {
  upvotes: number;
  downvotes: number;
  myVote: -1 | 1 | null;
};

export default function CaptionFeed({ captions, userId, loadError }: CaptionFeedProps) {
  const [sort, setSort] = useState<"newest" | "top">("newest");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [voteMessage, setVoteMessage] = useState("");
  const [voteError, setVoteError] = useState("");
  const [voteState, setVoteState] = useState<Record<string, VoteState>>({});
  const router = useRouter();

  const sortedCaptions = [...captions].sort((left, right) => {
    if (sort === "top") {
      const scoreDifference = (getVoteState(right).upvotes - getVoteState(right).downvotes)
        - (getVoteState(left).upvotes - getVoteState(left).downvotes);
      if (scoreDifference !== 0) return scoreDifference;
    }
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });

  function getVoteState(caption: CaptionCardData): VoteState {
    return voteState[caption.id] ?? {
      upvotes: caption.upvotes,
      downvotes: caption.downvotes,
      myVote: caption.myVote,
    };
  }

  async function submitVote(caption: CaptionCardData, value: -1 | 1) {
    if (!userId || pendingId) return;

    setPendingId(caption.id);
    setVoteMessage("");
    setVoteError("");

    const supabase = createClient();
    const { error } = await supabase.from("caption_votes").insert({
      generation_id: caption.id,
      user_id: userId,
      value,
    });

    if (error) {
      setVoteError(error.code === "23505"
        ? "You’ve already voted on this caption."
        : "Your vote could not be saved. Please sign in again and retry.");
      setPendingId(null);
      return;
    }

    const current = getVoteState(caption);
    setVoteState((previous) => ({
      ...previous,
      [caption.id]: {
        upvotes: current.upvotes + (value === 1 ? 1 : 0),
        downvotes: current.downvotes + (value === -1 ? 1 : 0),
        myVote: value,
      },
    }));
    setVoteMessage("Vote saved. Thanks for helping pick the club favorites!");
    setPendingId(null);
    router.refresh();
  }

  return (
    <>
      <div className="caption-feed-heading">
        <div>
          <p className="eyebrow">The community board</p>
          <h2 id="caption-feed-title">Fresh off the prompt list</h2>
          <p>Top scores rise as members rate each caption.</p>
        </div>
        <div className="caption-sort" aria-label="Sort captions">
          <button type="button" aria-pressed={sort === "newest"} onClick={() => setSort("newest")}>Newest</button>
          <button type="button" aria-pressed={sort === "top"} onClick={() => setSort("top")}>Top scores</button>
        </div>
      </div>

      {voteMessage ? <p className="caption-feed-note" role="status">{voteMessage}</p> : null}
      {voteError ? <p className="caption-feed-note" role="alert">{voteError}</p> : null}

      {loadError ? (
        <p className="notice">The caption board is taking a little break. Try again soon.</p>
      ) : sortedCaptions.length ? (
        <div className="caption-list">
          {sortedCaptions.map((caption) => {
            const current = getVoteState(caption);
            const score = current.upvotes - current.downvotes;
            const isPending = pendingId === caption.id;

            return (
              <article className="caption-card" key={caption.id}>
                <div className="caption-card-meta">
                  <span className="caption-card-byline">{caption.authorName}</span>
                  <time dateTime={caption.created_at}>{formatDate(caption.created_at)}</time>
                </div>
                <p className="caption-source-prompt">Prompt: {caption.prompt}</p>
                <h3 className="caption-output">{caption.caption}</h3>
                <div className="caption-vote-row">
                  <div className="caption-vote-controls" aria-label="Rate caption">
                    <button
                      className={`caption-vote-button${current.myVote === 1 ? " is-selected" : ""}`}
                      type="button"
                      aria-label={`Upvote caption, ${current.upvotes} upvotes`}
                      aria-pressed={current.myVote === 1}
                      disabled={!userId || Boolean(current.myVote) || isPending}
                      onClick={() => void submitVote(caption, 1)}
                    >
                      <span aria-hidden="true">↑</span> {current.upvotes}
                    </button>
                    <button
                      className={`caption-vote-button${current.myVote === -1 ? " is-selected" : ""}`}
                      type="button"
                      aria-label={`Downvote caption, ${current.downvotes} downvotes`}
                      aria-pressed={current.myVote === -1}
                      disabled={!userId || Boolean(current.myVote) || isPending}
                      onClick={() => void submitVote(caption, -1)}
                    >
                      <span aria-hidden="true">↓</span> {current.downvotes}
                    </button>
                  </div>
                  <span className="caption-score">Score {score > 0 ? `+${score}` : score}</span>
                </div>
                {!userId ? <p className="caption-feed-note">Sign in to rate this caption.</p> : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="notice">No captions yet. Add the first scene and start the board.</p>
      )}
    </>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "America/New_York",
  }).format(new Date(value));
}
