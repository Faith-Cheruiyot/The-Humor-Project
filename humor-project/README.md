# The Humor Project

A small community comedy club with Google sign-in, member profiles, a private after-hours joke drawer, Caption Club, and photo memes.

## Photos / AI retrieval

The Photos section at `/photos` lets signed-in members upload a JPG, PNG, or WebP (up to 4 MB and 25 megapixels, at least 128 × 128 pixels). Gemini reads the photo and optional context to write a short caption. The server renders that caption directly onto the picture in white text with a black outline and saves the finished JPEG to the member’s private card gallery. Each generation is a separate card with an authenticated download; older cards are available with **Load more memes**.

Original uploads are processed in memory and are not stored. Finished memes are stored in the private `caption-memes` Supabase Storage bucket, with metadata in `photo_generations`. Both use ownership policies. Image previews use short-lived signed URLs; downloads verify the user again. The same server-only `GEMINI_API_KEY` used by Caption Club powers photo captions. No additional key is needed.

Apply `supabase/migrations/20261025223704_photo_meme_gallery.sql` to any other deployment’s Supabase project before using Photos. `sharp` handles orientation, image-size limits, metadata removal, and meme rendering; the photo API uses the Node.js runtime.

Run `npm test` on Node.js 22.18+ for the photo-processing and caption-service checks, and `npm run build` to verify the application.

## Caption Club

Signed-in members can give Gemini a campus or New York scene and publish its caption to the shared board. The scene prompt and generated caption are saved together in Supabase. Members can cast one upvote or downvote per caption; the board shows public totals without revealing individual voters.

The Caption Club uses Google's Gemini `generateContent` REST API from a server route. Set `GEMINI_API_KEY` in `.env.local` and in the deployment environment. Keep this key server-side; do not add a `NEXT_PUBLIC_` prefix. 

## Local development

```bash
npm install
npm run dev
```

The schema and RLS policies are in [`supabase/migrations/20261006180457_caption_club_and_rls.sql`](supabase/migrations/20261006180457_caption_club_and_rls.sql). This migration has already been applied to the connected Supabase project.
