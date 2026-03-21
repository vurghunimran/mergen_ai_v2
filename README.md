# MERGEN AI Landing Page

Next.js 14 App Router landing page for MERGEN AI, styled with Tailwind CSS and shadcn/ui primitives.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui base setup
- react-hook-form
- react-simple-maps
- framer-motion
- Resend (contact API)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template and fill values:

```bash
cp .env.local.example .env.local
```

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RESEND_API_KEY`
- `TO_EMAIL`

3. Run development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Build

```bash
npm run build
npm run start
```

## Notes

- Hero background video currently uses a placeholder URL. Replace with `/public/hero-bg.mp4` in `components/HeroSection.tsx`.
- Promo video iframe uses a placeholder YouTube ID. Replace in `components/PromoVideo.tsx`.
- Social links are placeholders in `components/Footer.tsx`.
- Auth page UI includes placeholders for Supabase integration in `app/auth/page.tsx`.
