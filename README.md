# Adde International L.L.C. — Natural Resin Trading Website

The website, catalogue, ordering system and admin dashboard for **Adde International L.L.C.** (established 2003). The company sources, grades and exports Somali frankincense, myrrh and other natural resins from Puntland, Somalia.

- **Public site** in English, Somali and Arabic (right-to-left).
- **Product catalogue** with search, filters and side-by-side comparison.
- **Two ways to buy:**
  - a **Request for Quotation** (RFQ) form, quoted in KG or MT to a destination port;
  - a **shopping cart** that submits an order or a cart quotation.
- **Reference numbers** like `ADI-RFQ-2026-00001` for every RFQ, order and inquiry.
- **Contact routes:** WhatsApp and email throughout, plus optional staff email alerts.
- **Secure admin** with role-based permissions covering products, categories, images, specifications, pricing, stock, customers, orders, RFQs, inquiries, website text, users, internal product research, reports and an activity log.

> **Sample data:** the catalogue is seeded with **sample products** that carry a visible "Sample data" label. Specifications read "To be confirmed", and no prices, minimum order quantities, certifications or stock are invented. Replace each listing with verified information in **Admin → Products**, then untick *Sample data*.

---

## Quick start (local)

Requirements: **Node.js 20+**. You do not need to install PostgreSQL: a real PostgreSQL server runs from `node_modules` for local work.

```bash
npm install
cp .env.example .env        # then set AUTH_SECRET and ADMIN_PASSWORD (see below)
npm run db:local            # terminal 1: starts PostgreSQL on port 5433 (data in ./.pgdata)
npx prisma migrate deploy   # terminal 2: creates the tables
npm run db:seed             # creates the first admin, settings and sample catalogue
npm run dev                 # http://localhost:3100
```

- `AUTH_SECRET`: at least 32 random characters, for example from `openssl rand -base64 48`.
- `ADMIN_PASSWORD`: at least 12 characters. The seed creates `ADMIN_EMAIL` as a **Super admin**.
- Admin: <http://localhost:3100/admin> (also linked as "Staff login" in the footer).

> In this working copy, `.env` is already filled with a generated local secret and admin password. Open `.env` to find them. It is git-ignored, so never commit it.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server on port 3100 |
| `npm run build` / `npm start` | Production build and server |
| `npm run db:local` | Local PostgreSQL (embedded) on port 5433 |
| `npm run db:migrate` | Create a new migration after editing `prisma/schema.prisma` |
| `npm run db:deploy` | Apply migrations (use in production) |
| `npm run db:seed` | Seed admin, settings and sample catalogue. Safe to re-run: existing records are never overwritten |
| `npm run db:studio` | Browse the database |
| `npm test` | Unit tests (validation, references, stock rules, permissions, i18n merging) |
| `npm run test:integration` | Runs against a running dev server and the database: RFQ, inquiry and order persistence, unique references under concurrency, server-side pricing, admin protection |
| `npm run typecheck` | TypeScript check |

---

## How it works

### Stack
Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 6 · PostgreSQL · next-intl · Zod · jose (JWT sessions) · bcrypt · sharp · Lucide icons.

### Structure
```
prisma/schema.prisma          Database schema (products, orders, RFQs, users, research, content…)
prisma/migrations/            SQL migrations
prisma/seed.ts                First admin + sample catalogue
src/app/[locale]/             Public pages (en at /, Somali at /so, Arabic at /ar)
src/app/api/{rfq,orders,inquiries}   Public form endpoints (validated, rate-limited)
src/app/admin/                Admin (own layout, login, protected (panel) routes, server actions)
src/lib/                      auth, permissions, workflows, validation, catalog, settings, seo…
src/messages/{en,so,ar}.json  Translations. English is the fallback for anything missing.
src/data/image-credits.json   Photo licence register (powers /image-credits)
public/assets/brand/          Official logo (unaltered, only the white margin trimmed)
public/assets/img/            Licensed, optimised WebP photography
scripts/fetch-images.mjs      Re-downloads the licensed photos and rebuilds the register
scripts/local-postgres.mjs    Local embedded PostgreSQL
tests/                        Unit and integration tests
```

### Ordering rules
- **Prices** always come from the database. The browser's cart never sends a price. Products without a published price show **"Price on request"** and are quoted by staff.
- **No online payment is taken.** Checkout saves the order and staff follow up with an invoice. A payment provider can be added later through `PAYMENT_PROVIDER` and `src/lib/payments.ts`.
- **Bulk orders:** a cart above the bulk threshold (Admin → Settings, default 1,000 kg) suggests sending it as a quotation request instead.
- **Stock** is optional per product. When tracked, it is deducted when an order moves to *Confirmed* (or later) and returned if the order is cancelled. Every change is logged.
- **Statuses:** Pending → Under Review → Quotation Sent → Confirmed → Processing → Ready for Shipment → Shipped → Delivered, or Cancelled. Each change is recorded on a timeline with the staff member's name.

### Roles

| Role | Access |
|---|---|
| **Super admin** | Everything, including users, settings and the activity log |
| **Manager** | Catalogue, pricing, stock, all orders/RFQs/inquiries, customers, website text, research, reports |
| **Sales** | Dashboard, RFQs, orders, inquiries, customers |
| **Content editor** | Products, categories, website text (no prices) |

Every admin page and server action checks the role on the server. Changing a user's role or password, or deactivating them, signs them out immediately. Five failed logins lock an account for 15 minutes.

### Editing the website without code
- **Products, categories, images, specifications, translations, SEO:** Admin → Products / Categories.
- **Availability, stock, prices:** Admin → Inventory & pricing.
- **Homepage, About and footer text, in all three languages:** Admin → Website content.
- **Phone, email, WhatsApp, location, hours, social links:** Admin → Settings.

### Languages
English is the default. Somali (`/so`) and Arabic (`/ar`, right-to-left) cover all navigation, forms, cart, catalogue, homepage and page headings. Longer sections without a translation fall back to English. **Somali and Arabic text should be reviewed by a native speaker before launch.** To add a language, add its code in `src/i18n/routing.ts` and create `src/messages/<code>.json`.

### SEO
Per-page titles and descriptions target the agreed keywords (Somali Frankincense Exporter, Boswellia Carterii Somalia, Somali Myrrh Exporter, and others). The site also provides:
- canonical URLs and `hreflang` alternates;
- Open Graph and Twitter tags;
- Organization and Product structured data (an `Offer` is included only when a real price is published);
- `/sitemap.xml` and `/robots.txt`;
- AVIF/WebP images with lazy loading;
- a real 404 for unpublished products.

---

## Content honesty and images

- **Photography** comes from Wikimedia Commons under open licences (CC BY, CC BY-SA, CC0 or public domain). Each photo is credited at `/image-credits` with its author, licence and real location. Photos taken outside Somalia (such as Boswellia trees in Oman) are captioned *representative* and are never presented as Adde International's own sites, stock or staff. Somali location photos include Bosaso port, Karin near Bosaso, Bosaso beach and the Golis mountains.
- **Replace with company photos** whenever possible. Upload them in Admin → Products and untick *Stock photo*. Entries marked `replaceWithCompanyPhoto` in `src/data/image-credits.json` are first in line.
- Unsplash, Pexels and Pixabay block automated downloads, so none of their images are used. To add some, download them by hand under their licence and record them in the register.
- **Reference websites** (densoma.com, kobacgt.so) were studied for industry structure only. `kulanc.com` did not resolve during research. No text, images, prices or branding were copied. Use **Admin → Product research** to record verified product data, suppliers, source links and purchase costs. That data is internal and never shown publicly.
- **Not claimed anywhere:** certifications, lab results, staff numbers, client names, export volumes or a specific harvesting site. Add these only once you can document them.

---

## Things to confirm before launch

1. **Phone and WhatsApp:** seeded as `+252 617 794 700`, taken from the company's existing website. The design mockup shows `+252 907 775 555`. Set the correct number in Admin → Settings.
2. **Location wording:** the site says *Puntland, Somalia*. The existing solar site lists a Mogadishu head office with branches. Adjust in Settings and Website content if needed.
3. **Product facts:** verify every sample listing, especially *Frankincense Premium / Hojari*. It is an unpublished draft because Hojari is an Omani trade name; publish it only for a verified supply.
4. **Translations:** have native speakers review Somali and Arabic.
5. **Email alerts:** configure SMTP in `.env` so staff receive new RFQs, orders and inquiries. Submissions are saved either way.

See **[DEPLOYMENT.md](DEPLOYMENT.md)** to put the site online.
