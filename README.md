# Stork · שמות לתינוק

Stork is a Tinder-style baby-name picking app for couples. Two partners each swipe
on names; when both like the same name it's a "match". Hebrew + RTL.

**Live:** https://www.stork-app.com

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS + shadcn-ui (Radix)
- React Router + TanStack Query
- Supabase (auth, Postgres + RLS, realtime, edge functions)
- Deployed on Vercel

## Local development

```sh
npm install
npm run dev      # http://localhost:8080
```

Other scripts: `npm run build` (production build to `dist/`), `npm run preview`,
`npm run lint`.

## Configuration

The Supabase URL and anon (publishable) key are set in
`src/integrations/supabase/client.ts`. Only the public anon key is committed —
never the service-role key.

## Backend

Database schema and data live in `supabase/migrations/`. Apply them with:

```sh
supabase db push
```

Edge functions are under `supabase/functions/`.
