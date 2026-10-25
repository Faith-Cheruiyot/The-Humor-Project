# The Humor Project

A photo meme feed with AI-written captions, Google sign-in, and member voting. The UI centers on a compact header, time filters, a responsive card grid, and a create button.

## Browse and create

The homepage shows public memes from the past week, month, year, or all time. Members can choose 8, 12, or 24 cards per page and load older posts. Signed-in members can cast one upvote or downvote per meme. Public scores appear on each card; individual votes remain private.

At `/photos`, upload a JPG, PNG, or WebP (up to 4 MB, at least 128 × 128 pixels, up to 25 megapixels). Gemini reads the photo and optional scene context, then writes a short caption. The original photo is stored unchanged and the caption appears beneath it. Every generation is published to the feed. Optional context is excluded from public reads.

The account menu provides profile editing, account switching, and sign-out. The retired `/caption-club` and `/after-hours` URLs redirect to the photo creator and feed.

## Configuration

Set these in `.env.local` and the deployment environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `GEMINI_API_KEY` (server only)

Apply the migrations in `supabase/migrations/` in order when setting up a database. Photos are stored in `caption-memes`, metadata in `photo_generations`, and ratings in `photo_votes`. Storage policies allow signed previews of published posts. The photo API uses the Node.js runtime; `sharp` validates images and prepares a bounded image for AI analysis.

Older images generated before the original-photo flow retain baked-in text because their source uploads were not stored.

## Development

```bash
npm install
npm run dev
npm test
npm run build
```

Use `npm run dev -- --webpack` or `npm run build -- --webpack` where Turbopack worker ports are restricted. Tests require Node.js 22.18+. `tests/photo-gallery-rls.sql` verifies public reads, ownership, private votes, duplicate-vote protection, and score integrity in a rolled-back transaction.
