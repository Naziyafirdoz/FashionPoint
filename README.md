# Fashion Point

Production-ready AI-powered Indian readymade blouse e-commerce platform.

## Stack

- **Frontend:** Next.js 15 (App Router), Tailwind CSS, Framer Motion
- **Database & Auth:** Supabase
- **Images:** Cloudinary
- **Payments:** Razorpay
- **AI:** Size Finder (logic), Google Vision (color), OpenAI GPT-4o (style), Replicate (try-on)
- **Notifications:** Resend (email), Twilio (WhatsApp)

## Setup

1. Install dependencies (run from project folder):

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.local.example .env.local
```

3. Run Supabase schema: `supabase/schema.sql` in Supabase SQL Editor.

4. Start dev server:

```bash
npm run dev
```

## Key Routes

| Store | Admin |
|-------|-------|
| `/` Home | `/admin/dashboard` |
| `/daily-wear` | `/admin/products` |
| `/product/[slug]` | `/admin/orders` |
| `/ai-features` | `/admin/settings` |
| `/cart`, `/checkout` | |

## Deploy

Deploy to Vercel and add all env vars from `.env.local.example`.
