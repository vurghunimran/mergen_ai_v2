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
- Google Gemini API
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
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_BASE_URL`
- `GEMINI_API_KEY`
- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL` or the legacy `TO_EMAIL`
- `RESEND_FROM_EMAIL`
- `POLAR_ACCESS_TOKEN`
- `POLAR_SURVEY_PRODUCT_ID`
- `POLAR_SERVER`

`POLAR_SURVEY_PRODUCT_ID` must point to a Polar one-time product. Do not use a recurring subscription product for survey payments.

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
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_BASE_URL`
- `GEMINI_API_KEY`
- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL` or the legacy `TO_EMAIL`
- `RESEND_FROM_EMAIL`
- `POLAR_ACCESS_TOKEN`
- `POLAR_SURVEY_PRODUCT_ID`
- `POLAR_SERVER`

If you do not configure the Supabase variables, sign-up, login, dashboard protection, and profile storage will fail. If you do not configure `SUPABASE_SERVICE_ROLE_KEY`, survey publish will still work locally in the client dashboard, but the server cannot read matching community profiles to send launch emails. `APP_BASE_URL` should be set to your production site, for example `https://mergen-ai.com`, so email links stay on the custom domain. If you do not configure the Gemini key, the survey builder can still fall back to template questions locally, but the server-side AI assistant will not generate tailored survey content. If you do not configure the Resend variables, the contact form API and community notification API will deploy, but sending email will return a server error. If you do not configure the Polar variables, the payment button cannot create a checkout session. `POLAR_SURVEY_PRODUCT_ID` must be a one-time product, not a recurring monthly subscription product.

Custom uploaded avatar images are intentionally kept in browser local storage, not Supabase auth metadata. Supabase exposes `raw_user_meta_data` in JWTs, so storing large base64 images there can make cookies too large for Vercel requests.

### Supabase auth settings

Set these in Supabase Auth:

- Site URL: `https://mergen-ai.com`
- Redirect URL: `https://mergen-ai.com/auth/confirm`
- Local redirect URL: `http://localhost:3000/auth/confirm`

### Domain and email setup

For the current production setup:

- Vercel project: `mergen-ai-v2`
- Production domain: `mergen-ai.com`
- Recommended email sender: `MERGEN AI <hello@mergen-ai.com>`

Current Vercel DNS status on March 26, 2026:

- `mergen-ai.com` is attached to the Vercel project and already configured with external A records.
- `www.mergen-ai.com` is attached to the Vercel project but still needs a DNS record at the registrar.

Recommended DNS record for `www`:

- `A www.mergen-ai.com 76.76.21.21`

Resend domain verification checklist:

- Create the domain `mergen-ai.com` in Resend
- Add the DKIM and SPF records Resend returns at your registrar
- Verify the domain in Resend
- Set `RESEND_FROM_EMAIL=MERGEN AI <hello@mergen-ai.com>`
- Set `CONTACT_TO_EMAIL` to the mailbox that should receive contact inquiries

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
- The server-side survey AI route lives in [app/api/survey-assistant/route.ts](/Users/vurghun1903/Desktop/mergen_ai_v2/app/api/survey-assistant/route.ts).
- Route session refresh runs in [middleware.ts](/Users/vurghun1903/Desktop/mergen_ai_v2/middleware.ts).
- The contact API uses Resend in [app/api/contact/route.ts](/Users/vurghun1903/Desktop/mergen_ai_v2/app/api/contact/route.ts).
- Community launch emails are sent from [app/api/surveys/notify-community/route.ts](/Users/vurghun1903/Desktop/mergen_ai_v2/app/api/surveys/notify-community/route.ts).
- Polar checkout creation and verification live in [app/api/polar/checkout/route.ts](/Users/vurghun1903/Desktop/mergen_ai_v2/app/api/polar/checkout/route.ts) and [app/api/polar/checkout/[checkoutId]/route.ts](/Users/vurghun1903/Desktop/mergen_ai_v2/app/api/polar/checkout/[checkoutId]/route.ts).
- Remote images are already allowed for `images.unsplash.com` in [next.config.mjs](/Users/vurghun1903/Desktop/mergen_ai_v2/next.config.mjs).
- `vercel.json` is included for explicit Next.js detection.
- Supabase currently expects Node 20+, so Vercel should use Node 20 or later.

## Deploy Refresh

After updating Supabase and pushing the repo:

1. Update Vercel environment variables if needed
2. Confirm Supabase Auth URLs:
   - Site URL = `https://mergen-ai.com`
   - Redirect URL = `https://mergen-ai.com/auth/confirm`
3. Redeploy the latest commit in Vercel

If Vercel still shows old auth behavior, it is previewing an older commit, not the current code.

## Verification

```bash
npm run lint
npm run build
```
