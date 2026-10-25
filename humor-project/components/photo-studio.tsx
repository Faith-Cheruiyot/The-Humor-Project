"use client";

import Image from "next/image";
import Link from "next/link";
import PhotoMemeCard from "@/components/photo-meme-card";
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import AuthControls from "@/components/auth-controls";
import { PHOTO_MAX_BYTES, PHOTO_MIME_TYPES, type PhotoGeneration } from "@/lib/photos";

type Props = { userId: string | null };
type SelectedPhoto = { file: File; preview: string };

export default function PhotoStudio({ userId }: Props) {
  const signedIn = Boolean(userId);
  const [photo, setPhoto] = useState<SelectedPhoto | null>(null);
  const [context, setContext] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [latest, setLatest] = useState<PhotoGeneration | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const inFlight = useRef(false);

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.preview); }, [photo]);

  function choosePhoto(file?: File) {
    if (!file || inFlight.current) return;
    setError("");
    setMessage("");
    if (!PHOTO_MIME_TYPES.includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP photo.");
      return;
    }
    if (!file.size || file.size > PHOTO_MAX_BYTES) {
      setError("Choose a photo smaller than 4 MB that is not empty.");
      return;
    }
    setPhoto({ file, preview: URL.createObjectURL(file) });
  }

  function dropPhoto(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    choosePhoto(event.dataTransfer.files[0]);
  }

  async function generateMeme(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photo || !signedIn || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData();
    form.set("photo", photo.file);
    form.set("context", context);
    try {
      const response = await fetch("/api/photos", { method: "POST", body: form });
      const result = await response.json().catch(() => null) as { error?: string; generation?: PhotoGeneration } | null;
      if (!response.ok || !result?.generation) {
        setError(result?.error ?? "Your meme could not be created. Please try again.");
        return;
      }
      const generation = result.generation;
      setLatest(generation);
      setMessage("Your meme is posted to the community feed. Generate again for another take.");
      resultHeading.current?.focus();
    } catch {
      setError("The connection was interrupted. Check the homepage feed before trying again in case your meme was posted.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="studio-layout">
      <section className="studio-panel" aria-labelledby="photo-maker-title">
        <div className="studio-panel-heading"><span className="step-number">01</span><div><h2 id="photo-maker-title">Bring the photo.</h2><p>We’ll take care of the punchline.</p></div></div>
        <form className="caption-form" onSubmit={generateMeme} aria-busy={busy}>
          <div className={`upload-zone${dragging ? " is-dragging" : ""}${photo ? " has-photo" : ""}`}
            onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={dropPhoto}>
            {photo ? <Image className="photo-preview" src={photo.preview} alt="Your selected photo" width={800} height={600} unoptimized />
              : <><svg className="upload-illustration" viewBox="0 0 80 80" fill="none" aria-hidden="true"><rect x="13" y="17" width="54" height="46" rx="6"/><circle cx="29" cy="32" r="5"/><path d="m15 56 17-16 12 11 9-8 13 13M55 9v16M47 17h16"/></svg><p className="upload-title">Drop something funny.</p><p className="upload-subtitle">Or something that could be.</p></>}
            <label className={photo ? "upload-change" : "button button-secondary upload-choice"} htmlFor="meme-photo">{photo ? "Choose a different photo" : "Choose a photo"}</label>
            <input ref={input} className="visually-hidden" id="meme-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp"
              disabled={busy} aria-describedby="photo-file-help" onChange={(event) => { choosePhoto(event.target.files?.[0]); event.target.value = ""; }} />
            <p className="field-hint" id="photo-file-help">JPG, PNG or WebP · Max 4 MB · Min 128 × 128 px</p>
            {photo ? <div className="upload-selected-meta"><span title={photo.file.name}>{photo.file.name}</span><button className="text-button" type="button" disabled={busy}
              onClick={() => { setPhoto(null); setError(""); setMessage(""); }}>Remove</button></div> : null}
          </div>
          <div className="field-heading"><label className="field-label" htmlFor="photo-context">Set the scene</label><span>Optional</span></div>
          <textarea className="caption-textarea" id="photo-context" name="context" maxLength={500} placeholder="Me pretending I understood the lecture…"
            value={context} disabled={busy} onChange={(event) => setContext(event.target.value)} />
          <div className="character-count">{context.length} / 500</div>
          <button className="button button-primary generate-button" type="submit" disabled={busy || !photo || !signedIn}>
            {busy ? "Finding the punchline…" : "Generate & post"}<span aria-hidden="true">↗</span>
          </button>
          {!signedIn ? <div className="studio-signin"><p>Sign in to post your photo and join the feed.</p><AuthControls returnTo="/photos" /></div> : null}
          <p className="caption-privacy-note">Gemini reads your photo and context to write the caption. Your photo and caption will be public; optional context stays private.</p>
          {message ? <p className="form-message form-success" role="status">{message}</p> : null}
          {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
        </form>
      </section>
      <section className="studio-preview" aria-labelledby="photo-result-title">
        <div className="preview-heading"><span className="eyebrow">THE FINAL TAKE</span><h2 id="photo-result-title" ref={resultHeading} tabIndex={-1}>{latest ? "That’s a keeper." : "Your next post."}</h2></div>
        {latest ? <PhotoMemeCard key={latest.id} generation={latest} userId={userId} /> : <div className="studio-empty-preview">
          <div className="preview-mock-image"><span className="empty-smile" aria-hidden="true">:)</span><span>Your photo here</span></div>
          <div className="preview-mock-caption"><span /><span /><p>One photo. One fresh punchline.</p></div>
        </div>}
        <p className="preview-note">Original photo. Caption underneath. Always.</p>
        <Link className="text-link preview-feed-link" href="/#meme-feed">Back to the feed <span aria-hidden="true">→</span></Link>
      </section>
    </div>
  );
}
