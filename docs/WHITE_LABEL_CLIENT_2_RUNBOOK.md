# White-label Client #2 deployment runbook

This repository is a **single-client-at-a-time** ecommerce template. Fashion Point values in `src/lib/site-config.ts` are **intentional template defaults**. They must not be deleted from source. Client #2 overrides them with **new services, new environment variables, and Admin Store Information** — not by cloning Fashion Point production.

**Template branch:** `white-label-pr`  
**Identity wiring (Phase 4D):** commit `f97fc9b` — `feat: complete reusable storefront identity wiring`

Do **not** copy `mobile/` into Client #2 unless that work is explicitly in scope. It is unrelated to this web template.

---

## Isolation (mandatory)

| Client #1 (Fashion Point) | Client #2 (new store) |
|---------------------------|------------------------|
| Deployment A (Vercel / host A) | Deployment B (new project) |
| Supabase A | Supabase B (new project) |
| Cloudinary A | Cloudinary B (new cloud; recommended) |
| Razorpay A | Razorpay B (new merchant) |
| Resend A | Resend B (new account + verified domain) |

**Never:**

- Clone or restore the Fashion Point **production database**.
- Copy Fashion Point `.env.local` into Client #2.
- Copy Client #1 **Vercel environment variables** into Client #2.
- Reuse Client #1 **Razorpay** keys.
- Reuse Client #1 **Resend** API keys or sending domain.
- Reuse Client #1 **Supabase** URL or keys.
- Copy customers, orders, addresses, reviews, notification logs, push subscriptions, or production admin users.

Reusing Client #1 **Cloudinary** credentials is only acceptable if you **intentionally** share that cloud. Default recommendation: a **new** Cloudinary cloud. Folder names such as `fashionpoint/products` are **technical identifiers** in code. Do **not** rename existing Fashion Point folders merely to white-label the template. A separate Client #2 cloud can use those folder names as-is.

---

## URL precedence (do not change application behavior)

Configured in `src/lib/site-config.ts` and `src/lib/server/notifications/email-app-url.ts`.

### Public site URL (`SITE_URL`)

```
NEXT_PUBLIC_SITE_URL  →  if unset: https://fashionpointvijayawada.com
```

Used for:

- Root layout **metadata** (`metadataBase`)
- **sitemap** (`src/app/sitemap.ts`)
- **robots** sitemap link (`src/app/robots.ts`)
- Terms page host display
- **Last fallback** for production **email action links** when `APP_URL` / `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` are missing or rejected (preview/localhost in production)

If Client #2 does not set `NEXT_PUBLIC_SITE_URL`, SEO and (in production) some email links can still point at the **Fashion Point domain**. Client #2 **must** set its own HTTPS origin.

### Email action links (`getEmailAppUrl`)

Checked **in order**; first **valid** value wins:

1. `APP_URL`
2. `NEXT_PUBLIC_APP_URL`
3. `NEXT_PUBLIC_SITE_URL`

Rejected (treated as unset): Vercel **preview** hosts, private LAN hosts, and **localhost** when the runtime is production or `VERCEL=1`.

If none are valid:

- **Non-production:** `http://localhost:3000`
- **Production:** `SITE_URL` from site-config (which itself falls back to `https://fashionpointvijayawada.com` unless `NEXT_PUBLIC_SITE_URL` is set)

Staff email CTAs (approve/remind, view order) use this base via `emailAppUrl()`.

### Other URL uses

| Surface | Variables | If missing |
|---------|-----------|------------|
| Web Push payload URLs (`src/lib/server/push.ts`) | `NEXT_PUBLIC_APP_URL` then `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` (even in production) |
| FCM helper calling `/api/push/send` | `APP_URL` then `NEXT_PUBLIC_APP_URL` then `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` |
| Admin in-app new-order alert links | `NEXT_PUBLIC_APP_URL` then `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` |

**Auth redirects** do **not** read these env vars. Signup and password reset use `window.location.origin` + `/auth/callback`. The auth callback uses the request `origin`. Client #2 must still allow that origin in **Supabase Auth** (see Auth setup).

**Razorpay** checkout verifies on the same deployment (`/api/payment/verify`). There is no env-based payment callback URL. Admin UI `webhookConfigured` is hardcoded **false**; the live flow does **not** depend on a Razorpay webhook.

**Why Client #2 must set HTTPS domain env vars:** otherwise metadata, sitemap, robots, and production email fallbacks can advertise Fashion Point’s domain, and push/alert helpers may use localhost.

Recommended production set (same origin, no trailing slash):

```
APP_URL=https://YOUR-CLIENT-DOMAIN.com
NEXT_PUBLIC_SITE_URL=https://YOUR-CLIENT-DOMAIN.com
NEXT_PUBLIC_APP_URL=https://YOUR-CLIENT-DOMAIN.com
```

Never use a password-protected Vercel **preview** URL (`*-projects.vercel.app` or `*-git-*-*` hosts) as `APP_URL`.

---

## Environment variable matrix

Copy `.env.local.example` → `.env.local` for local work. Set the **same names** on Client #2’s host. Never commit filled secrets.

| Variable | Required | Client-specific | Used by | Documented | Action |
|----------|----------|-----------------|---------|------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Middleware, Supabase browser/server clients | Yes | New project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Yes | Same | Yes | New anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server) | Yes | Service client, admin APIs, one-off scripts | Yes | Server-only; new project |
| `APP_URL` | Yes in production (email) | Yes | Email action links (first) | Yes | Client #2 HTTPS origin |
| `NEXT_PUBLIC_APP_URL` | Optional fallback | Yes | Email (2nd), push, in-app alerts | Yes | Same origin recommended |
| `NEXT_PUBLIC_SITE_URL` | Yes in production (SEO) | Yes | `SITE_URL`, sitemap, robots, metadata, email (3rd) | Yes | Client #2 HTTPS origin |
| `RESEND_API_KEY` | If email enabled | Yes | Resend sends | Yes | Client #2 Resend account |
| `RESEND_FROM_EMAIL` | Yes for branded production mail | Yes | Mailbox in From header | Yes | Verified Client #2 domain |
| `ADMIN_EMAIL` | If staff email alerts | Yes | New-order / staff email recipients | Yes | Client #2 inbox |
| `WORKER_EMAILS` | Optional | Yes | Extra staff inboxes (comma-separated) | Yes | Client #2 |
| `ADMIN_PHONE` | If Twilio/SMS/WA dest default | Yes | WhatsApp/SMS destination default | Yes | Client #2 |
| `ADMIN_WHATSAPP_TO` | Optional | Yes | Overrides WhatsApp dest | Yes | Client #2 |
| `RAZORPAY_KEY_ID` | If online pay | Yes | Server Razorpay SDK | Yes | Client #2 (test then live) |
| `RAZORPAY_KEY_SECRET` | If online pay | Yes | Signature verify, order create | Yes | Never reuse Client #1 |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | If online pay | Yes | Checkout.js key | Yes | Same merchant as server keys |
| `CLOUDINARY_CLOUD_NAME` | If uploads | Yes | Uploads, some email image URLs | Yes | New cloud recommended |
| `CLOUDINARY_API_KEY` | If uploads | Yes | Cloudinary SDK | Yes | |
| `CLOUDINARY_API_SECRET` | If uploads | Yes | Cloudinary SDK | Yes | |
| `TWILIO_ACCOUNT_SID` | If Twilio WhatsApp | Yes | Twilio WhatsApp send | Yes | Optional feature |
| `TWILIO_AUTH_TOKEN` | If Twilio WhatsApp | Yes | Twilio | Yes | |
| `TWILIO_WHATSAPP_FROM` | If Twilio WhatsApp | Yes | Sender (alias of number) | Yes | |
| `TWILIO_WHATSAPP_NUMBER` | If Twilio WhatsApp | Yes | Preferred sender env | Yes | |
| `WHATSAPP_API_URL` | If Meta Cloud API path | Yes | `src/lib/notifications/whatsapp.ts` | Yes | Optional; not Twilio |
| `WHATSAPP_ACCESS_TOKEN` | If Meta Cloud API path | Yes | Same | Yes | |
| `WHATSAPP_PHONE_NUMBER_ID` | If Meta Cloud API path | Yes | Same | Yes | |
| `SMS_API_URL` | If SMS alerts | Yes | `src/lib/notifications/sms.ts` | Yes | Optional |
| `SMS_API_KEY` | If SMS alerts | Yes | Same | Yes | |
| `SMS_SENDER_ID` | If SMS alerts | Yes | Same | Yes | |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | If FCM client | Yes | Firebase client / push banner | Yes | Optional |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | If FCM client | Yes | Firebase config | Yes | |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | If FCM client | Yes | Firebase config | Yes | |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | If FCM client | Yes | Firebase config | Yes | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | If FCM client | Yes | Firebase config | Yes | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | If FCM client | Yes | Firebase config | Yes | |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | If FCM / web-push | Yes | Client subscribe + web-push public | Yes | |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | If Admin FCM | Yes | `firebase-admin.ts` | Yes | JSON string; optional |
| `FIREBASE_SERVER_KEY` | If legacy FCM HTTP | Yes | `push.ts` | Yes | Optional |
| `FCM_SERVER_KEY` | If legacy FCM HTTP | Yes | Alias of server key | Yes | Optional |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | If web-push without Firebase VAPID | Yes | `push.ts` | Yes | Optional |
| `VAPID_PRIVATE_KEY` | If web-push | Yes | `push.ts` | Yes | Optional |
| `CRON_SECRET` | If cron jobs enabled | Yes | `/api/cron/*` Bearer check | Yes | Optional until cron is on |
| `REMINDER_DELAY_MINUTES` | Optional | Ops | Approval reminder delay | Yes | Default 120 if unset |
| `OPENAI_API_KEY` | If product-generator API | Yes | `/api/ai/product-generator` | Yes | Optional |
| `REPLICATE_API_TOKEN` | If smart-preview API | Yes | `/api/ai/smart-preview` | Yes | Optional |
| `NEXT_PUBLIC_GA_ID` | If GA | Yes | `Analytics.tsx` | Yes | Optional |
| `NEXT_PUBLIC_META_PIXEL_ID` | If Meta Pixel | Yes | `Analytics.tsx` | Yes | Optional (`META_PIXEL` is not a code name) |
| `NEXT_PUBLIC_CLARITY_ID` | If Clarity | Yes | `Analytics.tsx` | Yes | Optional |
| `DELIVERY_PROVIDER` | Optional | Maybe | Default shipping provider id (`mock` if unset) | Yes | Optional; Admin shipping can override stored settings |
| `RAPIDO_API_KEY` | If Rapido | Yes | Env fallback for Rapido | Yes | Optional; also Admin shipping settings |
| `RAPIDO_API_SECRET` | If Rapido | Yes | Same | Yes | Optional |
| `DRY_RUN` | Scripts only | n/a | Cloudinary migrate / inventory reset scripts | Yes | Dev/ops scripts; never against Client #1 prod by accident |
| `NODE_ENV` | Platform | No | Next.js | n/a | Set by Node |
| `VERCEL` | Platform | No | Email URL “production” detection | n/a | Set by Vercel |

**Not used by application source (do not set expecting an effect):** `GOOGLE_CLOUD_VISION_API_KEY`, env named `RESEND_FROM_ALERTS` (the code exports a **constant** From string; mailbox is `RESEND_FROM_EMAIL`).

If Razorpay keys are missing, payment create can return a **demo** response. That is not a substitute for Client #2’s merchant account.

---

## Supabase (Client #2)

1. Create a **new** Supabase project (Supabase B).
2. In SQL Editor, run `supabase/schema.sql`.
3. Apply every file in `supabase/migrations/` in **filename order** (34 timestamped SQL files).
4. Optionally run `supabase/seed-categories.sql` (blouse vertical category slugs — template catalog, not Fashion Point customers).
5. Create a **new** Auth user for Client #2 admin (email/password in Auth).
6. Insert a matching row in `admin_users` (`user_id` = Auth user UUID, `role` typically `admin`). No admin row is seeded by schema.
7. Configure Auth URLs (below).
8. Confirm RLS / Realtime as for any new project.

**Do not** dump Fashion Point production and restore it here.

### Branch seed warning (do not skip)

Migration **`supabase/migrations/202608140001_branches.sql`** may insert **operational** branches:

- **Vijayawada** (`slug` `vijayawada`) as default, with local PINs `520001`–`520016`, and a Fashion Point pickup address fallback if store shipping settings are empty.
- **Bangalore** (`slug` `bangalore`), active branch without those PIN rows until configured.

This is **template/operational geography**, not Client #2’s store. Before go-live, Client #2 must **review, replace, or remove** those rows in Admin (or SQL), then configure:

- Their own branches
- Their own service-area PINs
- Their own local/outstation shipping rates

Do **not** edit this migration in the template repo to “fix” white-label. Change **data** on Client #2’s database after apply.

Do **not** run `supabase/scripts/cleanup_all_test_orders.sql`, `reset_test_orders.sql`, or `scripts/cleanup-all-orders.mjs` / `scripts/reset-inventory-for-testing.mjs` against a database unless you intend to destroy that project’s data. Those scripts use whatever `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are loaded.

---

## Auth setup (Client #2)

Implementation (unchanged by this doc):

- Signup: `emailRedirectTo` = `{window.location.origin}/auth/callback?next=/account/dashboard`
- Forgot password: `redirectTo` = `{window.location.origin}/auth/callback?next=/reset-password`
- Callback route `src/app/auth/callback/route.ts`: exchanges `code`, redirects to `{request origin}{next}`

In **Supabase → Authentication → URL configuration** for project B:

- **Site URL:** `https://YOUR-CLIENT-DOMAIN.com` (and `http://localhost:3000` for local dev if needed)
- **Redirect URLs** must include:
  - `https://YOUR-CLIENT-DOMAIN.com/auth/callback`
  - `https://YOUR-CLIENT-DOMAIN.com/auth/callback?next=/account/dashboard`
  - `https://YOUR-CLIENT-DOMAIN.com/auth/callback?next=/reset-password`
  - matching `http://localhost:3000/...` URLs for local testing

Also add the production Vercel alias if you use it before custom DNS.

---

## Resend

| Variable | Role |
|----------|------|
| `RESEND_API_KEY` | Client #2 API key |
| `RESEND_FROM_EMAIL` | **Mailbox only** (e.g. `orders@YOUR-CLIENT-DOMAIN.com`) |

After Phase 4D, the **display name** in the From header comes from **Admin → Store Information** (`getStoreInformation()`), not from the mailbox env. The mailbox is **never** read from Store Information.

If `RESEND_FROM_EMAIL` is unset, the mailbox defaults to `onboarding@resend.dev` (Resend test sender). That is **not** a production branded mailbox. Production: verify Client #2’s domain in Resend and set `RESEND_FROM_EMAIL`.

---

## Razorpay

| Variable | Role |
|----------|------|
| `RAZORPAY_KEY_ID` | Server |
| `RAZORPAY_KEY_SECRET` | Server secret |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Browser Checkout |

Client #2 needs its **own** Razorpay account. Never reuse Fashion Point live keys. Use **test** keys first, complete a test checkout, then switch to **live** keys after validation.

Payment verification is `POST /api/payment/verify` (signature check). The project does **not** require a Razorpay webhook for that flow. Admin settings may show webhook as not configured (`webhookConfigured: false`). Do not implement webhooks as part of this runbook.

---

## Cloudinary

Required for production image uploads: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

Used for product/media uploads (`uploadImage`, default folder `fashionpoint/products`), store logo (`fashionpoint/store-logo`), and related folder constants. Without Cloudinary, admin upload may fall back to data URLs in development.

**Do not rename** existing Fashion Point Cloudinary folders in Client #1’s cloud just to white-label the template. Client #2 on a **new** cloud can keep code folder names containing `fashionpoint`.

---

## Optional services

Configure only if the feature is needed. All credentials are **client-specific**. None of these are auto-provisioned.

| Service | When required | Where configured | Admin UI | Env required |
|---------|---------------|------------------|----------|--------------|
| Firebase / PWA push | Admin push notifications | Env (`NEXT_PUBLIC_FIREBASE_*`, optional service account / VAPID / server key) | Push subscribe in admin; status via env presence | Yes, if enabled |
| Twilio WhatsApp | Staff WhatsApp alerts | Env Twilio vars + `ADMIN_PHONE` / `ADMIN_WHATSAPP_TO` | Integration status reads env | Yes, if enabled |
| Meta WhatsApp Cloud | Alternate new-order WhatsApp path | Env `WHATSAPP_*` + `ADMIN_PHONE` | Not a separate Admin form for these keys | Yes, if enabled |
| SMS gateway | Staff SMS alerts | Env `SMS_*` + `ADMIN_PHONE` | No | Yes, if enabled |
| Rapido | Rapido delivery provider | Env `RAPIDO_*` and/or **Admin → Settings → Shipping** | Yes (shipping provider + keys can live in `store_settings`) | Env optional if Admin stores keys |
| OpenAI | Admin product-generator route | Env | No | Yes, if that API is used |
| Replicate | Smart-preview API route | Env | Storefront smart-preview UI redirects away; API still exists | Yes, if that API is used |
| Google Analytics | Storefront analytics | Env `NEXT_PUBLIC_GA_ID` | No | Yes, if enabled |
| Meta Pixel | Storefront analytics | Env `NEXT_PUBLIC_META_PIXEL_ID` | No | Yes, if enabled |
| Microsoft Clarity | Storefront analytics | Env `NEXT_PUBLIC_CLARITY_ID` | No | Yes, if enabled |
| Cron | Order / delivery reminders | Host scheduler + `CRON_SECRET`; no `vercel.json` crons in repo | No | Yes, if jobs are scheduled |

Cron routes (POST, `Authorization: Bearer <CRON_SECRET>`):

- `/api/cron/order-reminders`
- `/api/cron/delivery-due-reminders`
- `/api/cron/delivery-follow-up-reminders`

Configure jobs in the **host dashboard** (e.g. Vercel Cron). They are not created automatically.

---

## Step-by-step Client #2 runbook

Tags: **[CODE]** template already in git · **[ENV]** host/local secrets · **[ADMIN]** logged-in admin UI · **[EXTERNAL ACCOUNT]** new vendor project · **[DNS]** domain · **[DATABASE]** Supabase B

`npm run build` compiles the Next.js app only. It does **not** create accounts, apply SQL, or fill Store Information.

1. Use template branch `white-label-pr`. **[CODE]**
2. Confirm Phase 4D commit `f97fc9b` is in history. **[CODE]**
3. Create Client #2 **deployment** (new Vercel/Git project). **[EXTERNAL ACCOUNT]**
4. Create a **new** Supabase project. **[EXTERNAL ACCOUNT]** **[DATABASE]**
5. Apply `schema.sql` then migrations in filename order. **[DATABASE]**
6. Review/replace seeded Vijayawada/Bangalore branches (`202608140001_branches.sql`). **[DATABASE]** **[ADMIN]**
7. Create Client #2 Auth admin user. **[DATABASE]** **[EXTERNAL ACCOUNT]**
8. Insert `admin_users` row for that user. **[DATABASE]**
9. Set Auth Site URL and Redirect URLs for Client #2 HTTPS + `/auth/callback`. **[EXTERNAL ACCOUNT]**
10. Create Client #2 Cloudinary (recommended new cloud). **[EXTERNAL ACCOUNT]** **[ENV]**
11. Create Client #2 Resend account; verify sending domain; set `RESEND_FROM_EMAIL`. **[EXTERNAL ACCOUNT]** **[ENV]**
12. Create Client #2 Razorpay account (test keys first). **[EXTERNAL ACCOUNT]** **[ENV]**
13. Set Client #2 environment variables (never copy Client #1). **[ENV]**
14. Deploy (`npm run build` on the host). **[CODE]** **[ENV]**
15. Admin → **Store Information** (name, address, phones, email, logo). **[ADMIN]**
16. Admin → **Branding** (as needed; live CSS colors are a later phase). **[ADMIN]**
17. Configure branches, PINs, shipping rates. **[ADMIN]**
18. Configure notification recipients (Admin settings / `notification_recipients`). Do not leave Client #1 emails. **[ADMIN]** **[ENV]** (`ADMIN_EMAIL` / `WORKER_EMAILS`)
19. Import Client #2 catalog (products, images). **[ADMIN]**
20. Point custom domain / DNS at deployment B. **[DNS]**
21. Run the smoke-test checklist below. **[ADMIN]**
22. Switch Razorpay (and other pay/email) to production credentials after tests. **[ENV]**
23. Go live.

---

## Smoke-test checklist

### Identity

- [ ] Store name on navbar, footer, auth pages matches Store Information (not leftover Client #1 unless still using template defaults on purpose)
- [ ] Logo on auth and chrome
- [ ] Phone, email, address on contact/footer as configured
- [ ] Chatbot / stylist replies use Client #2 store name

### Customer

- [ ] Signup (email confirm if enabled)
- [ ] Login
- [ ] Password reset (callback on Client #2 origin)
- [ ] Browse categories/products
- [ ] Cart
- [ ] Checkout

### Payment

- [ ] Razorpay Checkout shows Client #2 merchant/display name
- [ ] Test payment succeeds
- [ ] Failed/cancelled payment pages
- [ ] Order success page

### Orders

- [ ] Customer order history
- [ ] Admin order detail
- [ ] Invoice store name
- [ ] Fulfillment actions (pack/ship as used)
- [ ] Shipping quote / pickup copy is not Client #1 geography unless still seeded

### Communication

- [ ] Customer email (confirmation / shipping as enabled)
- [ ] Admin new-order email
- [ ] Resend **display name** = Store Information name
- [ ] Resend **mailbox** = `RESEND_FROM_EMAIL` (not Client #1 domain)
- [ ] WhatsApp/SMS only if those env vars are set for Client #2

### SEO

- [ ] Page metadata uses Client #2 name/URL
- [ ] `/sitemap.xml` absolute URLs use Client #2 host
- [ ] `/robots.txt` sitemap URL uses Client #2 host
- [ ] Email action links use Client #2 HTTPS origin

### Admin

- [ ] Store Information saved
- [ ] Branding saved
- [ ] Branches and PINs are Client #2
- [ ] Notification recipients are Client #2
- [ ] Catalog is Client #2

### Security / isolation

- [ ] No Fashion Point customers in the database
- [ ] No Fashion Point orders
- [ ] No Fashion Point production admin users
- [ ] No Fashion Point credentials in this deployment’s env
- [ ] Supabase URL is project B, not Fashion Point production
- [ ] Razorpay keys are merchant B
- [ ] Resend is account/domain B
- [ ] No accidental `fashionpointvijayawada.com` in sitemap, robots, metadata, or email links
