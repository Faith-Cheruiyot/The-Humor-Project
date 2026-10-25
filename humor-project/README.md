# The Humor Project

A small community comedy club with Google sign-in, member profiles, a private after-hours joke drawer, Caption Club, and photo memes.

## Photos / AI retrieval

The Photos section at `/photos` lets signed-in members upload a JPG, PNG, or WebP (up to 4 MB and 25 megapixels, at least 128 × 128 pixels). Gemini reads the photo and optional context to write a short caption. The original upload is saved unchanged, and the caption appears underneath it in a card. No caption overlay or downloadable composite image is created.

Every generation is posted to the public meme feed on the homepage. Anyone can browse cards and load older posts. Signed-in members can cast one upvote or downvote per meme; public totals and scores appear on each card, while individual votes remain private. Optional scene context is excluded from public database read privileges.

Photos are stored in `caption-memes`, with metadata and totals in `photo_generations` and ratings in `photo_votes`. The bucket remains private; storage policies allow signed previews of published posts. Original uploads are preserved, so members should choose photos they want to share publicly. Images generated before this change retain their baked-in text because their original uploads were not stored.

The server-only `GEMINI_API_KEY` used by Caption Club also powers photo captions. Apply the migrations in `supabase/migrations/` in order when setting up another deployment. The photo API uses the Node.js runtime; `sharp` validates uploads and prepares a bounded image for AI analysis.

Run `npm test` on Node.js 22.18+ for image-processing and caption-service checks. `tests/photo-gallery-rls.sql` verifies public reads, ownership, private votes, duplicate-vote protection, and score integrity in a rolled-back transaction. Build with `npm run build` (or `npm run build -- --webpack` where Turbopack worker ports are restricted).

## Caption Club

Signed-in members can give Gemini a campus or New York scene and publish its caption to the shared board. The scene prompt and generated caption are saved together in Supabase. Members can cast one upvote or downvote per caption; the board shows public totals without revealing individual voters.

The Caption Club uses Google's Gemini `generateContent` REST API from a server route. Set `GEMINI_API_KEY` in `.env.local` and in the deployment environment. Keep this key server-side; do not add a `NEXT_PUBLIC_` prefix. 

## Local development

```bash
npm install
npm run dev
```

The schema and RLS policies are in [`supabase/migrations/20261006180457_caption_club_and_rls.sql`](supabase/migrations/20261006180457_caption_club_and_rls.sql). This migration has already been applied to the connected Supabase project.
