# Samo Što Nije

Mobile-first queue management for a single fast-food location. Staff create free-text orders, show a QR code, and move orders from ordered to ready to collected. Customers open the unguessable tracking link without an account and see only their order, its live progress, and the estimated number of orders ahead, highlighted by daisyUI Aura.

## Local preview

Install dependencies and start Next.js:

```bash
pnpm install
pnpm dev
```

Without Supabase environment variables, the app intentionally runs a local demonstration:

- staff dashboard: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- customer tracking: [http://localhost:3000/track/demo](http://localhost:3000/track/demo)

Demo changes live only in the browser and are meant for product review. Production fails closed if Supabase is not configured.

## Supabase setup

1. Create a Supabase project and disable public email sign-up.
2. Copy `.env.example` to `.env.local` and add the project URL and publishable key.
3. Link the CLI and apply the migration:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The migrations create the order lifecycle, atomic daily numbering, token-scoped tracking RPC, RLS policies, sanitized public Realtime table, owner-scoped public location-image storage, and a five-minute cron job that expires active orders after 24 hours.

Provision each location manually:

1. In Supabase Authentication, create an email/password user.
2. Copy that user's UUID and run this in the SQL editor:

```sql
insert into public.locations (owner_user_id, display_name)
values ('AUTH_USER_UUID', 'Naziv lokacije');
```

One authentication user maps to one location. There is no public registration or separate location-management screen; staff change the public location image directly from the dashboard avatar.

## Environment

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Set `NEXT_PUBLIC_APP_URL` to the public Railway URL in production so generated QR links use the correct origin. Deploy the repository as a Node service with `pnpm build` and `pnpm start`; Railway and Supabase provide the MVP's operational logs.

## Verification

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm test:e2e
```

`pnpm test:e2e` builds with webpack before running the mobile and desktop Chromium journeys. Database contract tests live in `supabase/tests/database` and run with `supabase test db` when Docker is available.

Set `E2E_STAFF_EMAIL` and `E2E_STAFF_PASSWORD` alongside the Supabase variables to enable the production-backed staff → customer → ready → collected browser journey. Without those credentials, Playwright runs the deterministic local-demo journeys and reports the production journey as skipped.

The public/private boundary is deliberate: anonymous clients can read only `public_queue` and execute the scoped `track_order` function. Descriptions, tracking tokens, counters, and staff writes remain protected by grants and row-level security.
