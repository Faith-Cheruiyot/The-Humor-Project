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
    <>
      <div className="photo-studio-layout">
        <section className="caption-maker-panel photo-maker" aria-labelledby="photo-maker-title">
          <p className="eyebrow">01 · Bring the photo</p>
          <h2 id="photo-maker-title">Make it a meme</h2>
          <p>A funny little moment deserves a punchline.</p>
          <form className="caption-form" onSubmit={generateMeme} aria-busy={busy}>
            <div className={`photo-dropzone${dragging ? " is-dragging" : ""}${photo ? " has-photo" : ""}`}
              onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }}
              onDragLeave={() => setDragging(false)} onDrop={dropPhoto}>
              {photo ? (
                <Image className="photo-preview" src={photo.preview} alt="Your selected photo" width={800} height={600} unoptimized />
              ) : <span className="photo-upload-icon" aria-hidden="true">↥</span>}
              <label className="photo-upload-label" htmlFor="meme-photo">{photo ? "Choose a different photo" : "Choose a photo or drop it here"}</label>
              <input ref={input} className="file-input photo-file-input" id="meme-photo" name="photo" type="file"
                accept="image/jpeg,image/png,image/webp" disabled={busy} aria-describedby="photo-file-help"
                onChange={(event) => { choosePhoto(event.target.files?.[0]); event.target.value = ""; }} />
              <p className="field-hint" id="photo-file-help">JPG, PNG, or WebP · up to 4 MB · at least 128 × 128 px</p>
              {photo ? (
                <div className="photo-file-details">
                  <span title={photo.file.name}>{photo.file.name}</span>
                  <button className="text-button" type="button" disabled={busy} onClick={() => { setPhoto(null); setError(""); setMessage(""); }}>Remove</button>
                </div>
              ) : null}
            </div>
            <label className="field-label" htmlFor="photo-context">A little context <span className="field-optional">(optional)</span></label>
            <textarea className="caption-textarea photo-context" id="photo-context" name="context" maxLength={500}
              placeholder="For example: me pretending I understood the lecture" value={context}
              disabled={busy} onChange={(event) => setContext(event.target.value)} />
            <div className="caption-form-footer">
              <span>{context.length}/500</span>
              <button className="button button-primary" type="submit" disabled={busy || !photo || !signedIn}>
                {busy ? "Making your meme…" : "Generate meme"}
              </button>
            </div>
            {!signedIn ? <div className="photo-signin"><p>Sign in to generate a caption and share your photo.</p><AuthControls returnTo="/photos" /></div> : null}
            <p className="caption-privacy-note">Your photo and context are sent to Gemini to write the caption. Your photo and generated caption will be public on the homepage.</p>
            {message ? <p className="form-message form-success" role="status">{message}</p> : null}
            {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
          </form>
        </section>

        <aside className="photo-how-it-works" aria-labelledby="photo-how-title">
          <div className="photo-sticker" aria-hidden="true">ha!</div>
          <p className="eyebrow">Photo in. Punchline out.</p>
          <h2 id="photo-how-title">Your moment,<br />with a little extra ha.</h2>
          <ol>
            <li><span>1</span><div><strong>Upload a photo</strong><p>Campus chaos, a dramatic pet, or your everyday comedy.</p></div></li>
            <li><span>2</span><div><strong>Let AI find the funny</strong><p>Gemini writes a caption inspired by what’s in the picture.</p></div></li>
            <li><span>3</span><div><strong>Share with the club</strong><p>Your photo and caption appear together in the homepage feed, where members can rate them.</p></div></li>
          </ol>
        </aside>
      </div>

      <section className="photo-gallery" aria-labelledby="photo-result-title">
        <div className="section-heading">
          <div><p className="eyebrow">02 · Share the laugh</p><h2 id="photo-result-title" ref={resultHeading} tabIndex={-1}>Your latest post</h2></div>
          <Link className="text-link" href="/#meme-feed">See the community feed →</Link>
        </div>
        {latest ? <div className="photo-result-card"><PhotoMemeCard key={latest.id} generation={latest} userId={userId} /></div>
          : <div className="photo-gallery-empty"><span aria-hidden="true">☺</span><h3>Your captioned photo belongs here.</h3><p>Every generation gets its own card in the community feed.</p></div>}
      </section>
    </>
  );
}
