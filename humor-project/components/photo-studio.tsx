"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import AuthControls from "@/components/auth-controls";
import { PHOTO_MAX_BYTES, PHOTO_MIME_TYPES, type PhotoGalleryPage, type PhotoGeneration } from "@/lib/photos";

type Props = { signedIn: boolean; initialGallery: PhotoGalleryPage; loadError: boolean };
type SelectedPhoto = { file: File; preview: string };

export default function PhotoStudio({ signedIn, initialGallery, loadError }: Props) {
  const [photo, setPhoto] = useState<SelectedPhoto | null>(null);
  const [context, setContext] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [generations, setGenerations] = useState(initialGallery.generations);
  const [nextCursor, setNextCursor] = useState(initialGallery.nextCursor);
  const [galleryError, setGalleryError] = useState(loadError ? "Your gallery could not be loaded. Try again to see your saved memes." : "");
  const [loadingMore, setLoadingMore] = useState(false);
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
      setGenerations((previous) => [generation, ...previous.filter((item) => item.id !== generation.id)]);
      setMessage("Your meme is ready and saved to your gallery. Generate again for another take.");
      resultHeading.current?.focus();
    } catch {
      setError("The connection was interrupted. Check your gallery before trying again in case your meme was saved.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function loadGallery(reset = false) {
    if (loadingMore) return;
    setLoadingMore(true);
    setGalleryError("");
    try {
      const response = await fetch(`/api/photos${!reset && nextCursor ? `?cursor=${encodeURIComponent(nextCursor)}` : ""}`, { cache: "no-store" });
      const result = await response.json() as PhotoGalleryPage & { error?: string };
      if (!response.ok || !Array.isArray(result.generations)) throw new Error(result.error ?? "Your gallery could not be loaded.");
      setGenerations((previous) => {
        const combined = reset ? result.generations : [...previous, ...result.generations];
        return [...new Map(combined.map((item) => [item.id, item])).values()];
      });
      setNextCursor(result.nextCursor);
    } catch (error) {
      setGalleryError(error instanceof Error ? error.message : "Your gallery could not be loaded. Please try again.");
    } finally {
      setLoadingMore(false);
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
                <Image className="photo-preview" src={photo.preview} alt="Your selected photo before adding a meme caption" width={800} height={600} unoptimized />
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
            {!signedIn ? <div className="photo-signin"><p>Sign in to generate memes and keep your gallery.</p><AuthControls returnTo="/photos" /></div> : null}
            <p className="caption-privacy-note">Your photo and context are sent to Gemini to write the caption. The finished meme is saved to your private gallery.</p>
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
            <li><span>3</span><div><strong>Keep the finished meme</strong><p>We put the caption on your photo and save it below, ready to download.</p></div></li>
          </ol>
        </aside>
      </div>

      <section className="photo-gallery" aria-labelledby="photo-gallery-title">
        <div className="section-heading">
          <div><p className="eyebrow">02 · Keep the good ones. And the weird ones.</p>
            <h2 id="photo-gallery-title" ref={resultHeading} tabIndex={-1}>Your meme gallery</h2>
          </div>
          {signedIn ? <button className="text-button" type="button" disabled={loadingMore || busy} onClick={() => void loadGallery(true)}>{loadingMore ? "Loading…" : "Refresh gallery"}</button> : null}
        </div>
        <p className="photo-gallery-description">Every generation gets its own card. Only you can see your gallery.</p>
        {galleryError ? <p className="form-message form-error" role="alert">{galleryError} <button className="text-button" type="button" disabled={loadingMore} onClick={() => void loadGallery(true)}>Try again</button></p> : null}
        {generations.length ? (
          <div className="photo-gallery-grid">
            {generations.map((generation) => (
              <article className="photo-meme-card" key={generation.id}>
                <a className="photo-meme-image-link" href={`/api/photos/${generation.id}/download`} aria-label={`Download meme: ${generation.caption}`}>
                  {generation.imageUrl ? <Image className="photo-meme-image" src={generation.imageUrl} alt={generation.caption}
                    width={generation.width} height={generation.height} unoptimized /> : <span className="photo-image-unavailable">Preview unavailable. Download your saved meme.</span>}
                </a>
                <div className="photo-meme-card-body">
                  <h3>{generation.caption}</h3>
                  <div className="photo-meme-card-footer">
                    <time dateTime={generation.created_at}>{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "America/New_York" }).format(new Date(generation.created_at))}</time>
                    <a className="text-link" href={`/api/photos/${generation.id}/download`}>Download <span aria-hidden="true">↓</span></a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : !galleryError ? <div className="photo-gallery-empty"><span aria-hidden="true">☺</span><h3>Your first meme belongs here.</h3><p>{signedIn ? "Upload a photo above. We’ll take care of the punchline." : "Sign in and turn a photo into your first meme."}</p></div> : null}
        {nextCursor ? <button className="button photo-load-more" type="button" disabled={loadingMore || busy} onClick={() => void loadGallery()}>{loadingMore ? "Loading memes…" : "Load more memes"}</button> : null}
      </section>
    </>
  );
}
