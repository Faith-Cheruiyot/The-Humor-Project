# The Humor Project

A small community comedy club with Google sign-in, member profiles, a private after-hours joke drawer, and Caption Club.

## Caption Club

Signed-in members can give Gemini a campus or New York scene and publish its caption to the shared board. The scene prompt and generated caption are saved together in Supabase. Members can cast one upvote or downvote per caption; the board shows public totals without revealing individual voters.

The Caption Club uses Google's Gemini `generateContent` REST API from a server route. Set `GEMINI_API_KEY` in `.env.local` and in the deployment environment. Keep this key server-side; do not add a `NEXT_PUBLIC_` prefix. 

## Local development

```bash
npm install
npm run dev
```

The schema and RLS policies are in [`supabase/migrations/20261006180457_caption_club_and_rls.sql`](supabase/migrations/20261006180457_caption_club_and_rls.sql). This migration has already been applied to the connected Supabase project.
