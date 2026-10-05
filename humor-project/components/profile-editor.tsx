"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type ProfileEditorProps = {
  userId: string;
  initialFirstName: string;
  initialLastName: string;
  initialAvatarUrl: string | null;
  initialAvatarPath: string | null;
};

const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export default function ProfileEditor({
  userId,
  initialFirstName,
  initialLastName,
  initialAvatarUrl,
  initialAvatarPath,
}: ProfileEditorProps) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [avatarPath, setAvatarPath] = useState(initialAvatarPath);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => () => {
    if (avatarUrl?.startsWith("blob:")) URL.revokeObjectURL(avatarUrl);
  }, [avatarUrl]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const supabase = createClient();
    let nextAvatarPath = avatarPath;

    if (photo) {
      if (!allowedTypes.includes(photo.type)) {
        setError("Choose a JPG, PNG, WebP, or GIF image.");
        setBusy(false);
        return;
      }
      if (photo.size > 5 * 1024 * 1024) {
        setError("Your photo must be 5 MB or smaller.");
        setBusy(false);
        return;
      }

      nextAvatarPath = `${userId}/avatar.${extensions[photo.type]}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(nextAvatarPath, photo, {
          cacheControl: "3600",
          contentType: photo.type,
          upsert: true,
        });

      if (uploadError) {
        setError(`Your photo could not be uploaded: ${uploadError.message}`);
        setBusy(false);
        return;
      }

      setAvatarPath(nextAvatarPath);
      setAvatarUrl(supabase.storage.from("avatars").getPublicUrl(nextAvatarPath).data.publicUrl);
      setPhoto(null);
    }

    const { error: saveError } = await supabase.from("profiles").upsert(
      {
        user_id: userId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        avatar_path: nextAvatarPath,
      },
      { onConflict: "user_id" },
    );

    if (saveError) {
      setError(`Your profile could not be saved: ${saveError.message}`);
      setBusy(false);
      return;
    }

    setMessage("Your profile is up to date.");
    setBusy(false);
    router.refresh();
  }

  return (
    <form className="profile-form" onSubmit={saveProfile}>
      <div className="avatar-editor">
        {avatarUrl ? (
          <div className="large-avatar avatar-photo" role="img" aria-label="Profile photo preview" style={{ backgroundImage: `url("${avatarUrl}")` }} />
        ) : (
          <div className="large-avatar avatar-placeholder" aria-hidden="true">
            {`${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "☺"}
          </div>
        )}
        <div>
          <label className="field-label" htmlFor="profile-photo">Profile photo</label>
          <input
            className="file-input"
            id="profile-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => {
              const selectedPhoto = event.target.files?.[0] ?? null;
              setPhoto(selectedPhoto);
              setAvatarUrl(selectedPhoto ? URL.createObjectURL(selectedPhoto) : initialAvatarUrl);
            }}
          />
          <p className="field-hint">JPG, PNG, WebP, or GIF · up to 5 MB</p>
        </div>
      </div>

      <div className="field-grid">
        <label className="field">
          <span className="field-label">First name</span>
          <input
            autoComplete="given-name"
            className="text-input"
            maxLength={80}
            name="first_name"
            onChange={(event) => setFirstName(event.target.value)}
            required
            value={firstName}
          />
        </label>
        <label className="field">
          <span className="field-label">Last name</span>
          <input
            autoComplete="family-name"
            className="text-input"
            maxLength={80}
            name="last_name"
            onChange={(event) => setLastName(event.target.value)}
            required
            value={lastName}
          />
        </label>
      </div>

      {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
      {message ? <p className="form-message form-success" role="status">{message}</p> : null}

      <button className="button button-dark save-button" type="submit" disabled={busy}>
        {busy ? "Saving your profile…" : "Save profile"}
        {!busy ? <span aria-hidden="true">→</span> : null}
      </button>
    </form>
  );
}
