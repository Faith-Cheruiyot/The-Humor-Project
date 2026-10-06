"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type CaptionMakerProps = {
  dailyPrompt: string;
};

const exampleScenes = [
  "A first-year looking for the right subway exit in Times Square.",
  "The library printer choosing the exact moment to take a personal day.",
];

export default function CaptionMaker({ dailyPrompt }: CaptionMakerProps) {
  const [prompt, setPrompt] = useState(dailyPrompt);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function generateCaption(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/caption-club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const result = await response.json() as { error?: string; caption?: string };

      if (!response.ok || !result.caption) {
        setError(result.error ?? "Your caption could not be created. Please try again.");
        return;
      }

      setPrompt(dailyPrompt);
      setMessage("Caption saved to the board. Go see how the club rates it!");
      router.refresh();
    } catch {
      setError("Your caption could not be created. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="caption-form" onSubmit={generateCaption}>
      <label className="field-label" htmlFor="caption-scene">Describe the scene</label>
      <textarea
        className="caption-textarea"
        id="caption-scene"
        maxLength={500}
        minLength={5}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="What happened on campus or around the city?"
        required
        value={prompt}
      />
      <div className="caption-presets" aria-label="Scene ideas">
        <button className="caption-preset" type="button" onClick={() => setPrompt(dailyPrompt)}>
          Use today’s scene
        </button>
        {exampleScenes.map((scene) => (
          <button className="caption-preset" key={scene} type="button" onClick={() => setPrompt(scene)}>
            Try this scene
          </button>
        ))}
      </div>
      <div className="caption-form-footer">
        <span>{prompt.length}/500</span>
        <button className="button button-primary" type="submit" disabled={busy || prompt.trim().length < 5}>
          {busy ? "Gemini is writing…" : "Generate caption"}
        </button>
      </div>
      <p className="caption-privacy-note">Your prompt and caption will be public on the board. Leave out personal details.</p>
      {message ? <p className="form-message form-success" role="status">{message}</p> : null}
      {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
    </form>
  );
}
