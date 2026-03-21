# MERGEN AI

Next.js 14 App Router project for the MERGEN landing page, auth flows, client dashboard, and community dashboard.

## Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- react-hook-form
- react-simple-maps
- Supabase Auth + Postgres
- Resend

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy the env template:

```bash
cp .env.local.example .env.local
```

3. Fill these variables in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RESEND_API_KEY`
- `TO_EMAIL`
- `RESEND_FROM_EMAIL`

4. In Supabase SQL Editor, run one SQL file:

```sql
-- file: supabase/schema.sql
```

Use:

- [supabase/schema.sql](/Users/vurghun1903/Desktop/mergen_ai_v2/supabase/schema.sql) for a fresh Supabase setup
- [supabase/migrate-separate-profiles.sql](/Users/vurghun1903/Desktop/mergen_ai_v2/supabase/migrate-separate-profiles.sql) if you already created the older mixed profile structure

This creates:

- `public.profiles` for shared account/auth data
- `public.client_profiles` for client-only data
- `public.community_profiles` for community-only data
- row-level security policies
- the auth trigger that stores sign-up data automatically

5. Start development:

```bash
npm run dev
```

## Vercel deployment

This repo is ready for Vercel as a standard Next.js project.

### Build settings

- Framework preset: `Next.js`
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: leave default

### Environment variables

Add these in the Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RESEND_API_KEY`
- `TO_EMAIL`
- `RESEND_FROM_EMAIL`

If you do not configure the Supabase variables, sign-up, login, dashboard protection, and profile storage will fail. If you do not configure the Resend variables, the contact form API will deploy, but sending email will return a server error.

### Supabase auth settings

Set these in Supabase Auth:

- Site URL: your Vercel production URL
- Redirect URL: `https://your-domain.com/auth/confirm`
- Local redirect URL: `http://localhost:3000/auth/confirm`

The app now uses:

- email/password sign-up and login
- role-based redirect to `/dashboard/client` or `/dashboard/community`
- shared profile persistence in `public.profiles`
- client-only data in `public.client_profiles`
- community-only data in `public.community_profiles`
- server-side dashboard route protection through Supabase session cookies

### Notes

- The Supabase schema is in [supabase/schema.sql](/Users/vurghun1903/Desktop/mergen_ai_v2/supabase/schema.sql).
- The migration for existing mixed-profile setups is in [supabase/migrate-separate-profiles.sql](/Users/vurghun1903/Desktop/mergen_ai_v2/supabase/migrate-separate-profiles.sql).
- Browser/server Supabase helpers are in [lib/supabase/client.ts](/Users/vurghun1903/Desktop/mergen_ai_v2/lib/supabase/client.ts) and [lib/supabase/server.ts](/Users/vurghun1903/Desktop/mergen_ai_v2/lib/supabase/server.ts).
- Route session refresh runs in [middleware.ts](/Users/vurghun1903/Desktop/mergen_ai_v2/middleware.ts).
- The contact API uses Resend in [app/api/contact/route.ts](/Users/vurghun1903/Desktop/mergen_ai_v2/app/api/contact/route.ts).
- Remote images are already allowed for `images.unsplash.com` in [next.config.mjs](/Users/vurghun1903/Desktop/mergen_ai_v2/next.config.mjs).
- `vercel.json` is included for explicit Next.js detection.
- Supabase currently expects Node 20+, so Vercel should use Node 20 or later.

## Deploy Refresh

After updating Supabase and pushing the repo:

1. Update Vercel environment variables if needed
2. Confirm Supabase Auth URLs:
   - Site URL = your production domain
   - Redirect URL = `https://your-domain.com/auth/confirm`
3. Redeploy the latest commit in Vercel

If Vercel still shows old auth behavior, it is previewing an older commit, not the current code.

## Verification

```bash
npm run lint
npm run build
```
