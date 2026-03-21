# MERGEN AI

Next.js 14 App Router project for the MERGEN landing page, auth flows, client dashboard, and community dashboard.

## Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- react-hook-form
- react-simple-maps
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

- `RESEND_API_KEY`
- `TO_EMAIL`
- `RESEND_FROM_EMAIL`

4. Start development:

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

- `RESEND_API_KEY`
- `TO_EMAIL`
- `RESEND_FROM_EMAIL`

If you do not configure these, the contact form API will deploy, but sending email will return a server error.

### Notes

- The contact API uses Resend in [app/api/contact/route.ts](/Users/vurghun1903/Desktop/Mergen%20AI%20Education/app/api/contact/route.ts).
- Remote images are already allowed for `images.unsplash.com` in [next.config.mjs](/Users/vurghun1903/Desktop/Mergen%20AI%20Education/next.config.mjs).
- `vercel.json` is included for explicit Next.js detection.

## Verification

```bash
npm run lint
npm run build
```
