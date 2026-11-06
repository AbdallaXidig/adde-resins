# Deployment Guide

The site is a standard Node.js application (Next.js) backed by PostgreSQL. It needs:

- a **Node.js 20+ server** that stays running (VPS, Render, Railway, Fly.io or similar);
- a **managed PostgreSQL** database (Neon, Supabase, Render, AWS RDS, DigitalOcean and others);
- a **persistent disk** for images uploaded in the admin, or a host with a mounted volume.

> **Serverless hosts** (for example Vercel) work for the pages, but their file system is not persistent, so admin image uploads would be lost. Use a host with a disk, or move uploads to object storage (S3/R2) by changing `src/lib/upload.ts` and `src/app/media/[name]/route.ts`.

## 1. Create the database
Create a PostgreSQL 14+ database and copy its connection string. Most providers require SSL:
```
postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require
```

## 2. Environment variables
Set these on the host (never commit them):

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Connection string from step 1 |
| `AUTH_SECRET` | yes | 32+ random characters, from `openssl rand -base64 48`. Changing it signs everyone out |
| `NEXT_PUBLIC_SITE_URL` | yes | Public address, e.g. `https://www.addeinternational.com`. Used in canonical URLs, the sitemap and Open Graph tags. Must be set **before** `npm run build` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | first deploy | Used by the seed to create the first Super admin (password 12+ characters). Remove `ADMIN_PASSWORD` once you have signed in and changed it |
| `UPLOAD_DIR` | recommended | Absolute path on the persistent disk, e.g. `/var/data/uploads` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `NOTIFY_EMAIL` | optional | Staff email alerts for new submissions |
| `PAYMENT_PROVIDER` | optional | Keep `none`. No payment provider is implemented yet |

## 3. Build and release
```bash
npm ci
npx prisma migrate deploy     # applies prisma/migrations
npm run db:seed               # first deploy only: admin, settings, sample catalogue
npm run build
npm start                     # serves on port 3100. Set PORT, or edit the start script for your host
```

On later releases: `npm ci && npx prisma migrate deploy && npm run build && npm start`.

### Example: Render
- **Web Service:**
  - Build command: `npm ci && npx prisma migrate deploy && npm run build`
  - Start command: `npx next start -p $PORT`
- **Disk:** mount at `/var/data` and set `UPLOAD_DIR=/var/data/uploads`.
- **Database:** add a Render PostgreSQL and paste its *Internal Database URL* into `DATABASE_URL`.
- **Seed:** run `npm run db:seed` once from the Render shell.

### Example: VPS (Ubuntu)
- Install Node 20+ and run the commands above under a process manager (`pm2` or a systemd service).
- Put **Nginx or Caddy** in front for HTTPS. Pass `X-Forwarded-For` so rate limiting sees real visitor addresses.

## 4. After going live
1. Sign in at `/admin`, then change the admin password in **Users & roles**.
2. In **Settings**, confirm the phone, WhatsApp, email, location and hours.
3. In **Products**, replace the sample listings with verified information and untick *Sample data* on each one.
4. Submit a test quotation from the live site and check that it appears in the admin (and arrives by email, if SMTP is configured).
5. Submit `https://YOUR-DOMAIN/sitemap.xml` in Google Search Console.

## Operations
- **Backups:** turn on daily automated backups in your PostgreSQL provider, and back up `UPLOAD_DIR`.
- **Scaling:** the public-form and login rate limiter is in memory per server process. If you run more than one instance, move it to Redis (`src/lib/rate-limit.ts`).
- **Updating photos:** `node scripts/fetch-images.mjs` re-downloads the licensed set and rebuilds the credit register. Add new entries to its manifest with the licence verified first.
- **Schema changes:** edit `prisma/schema.prisma`, run `npm run db:migrate -- --name what_changed` locally, commit the new migration, and deploy with `prisma migrate deploy`.
