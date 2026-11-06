# Adde International L.L.C. — Natural Resin Trading Website

The website, catalogue, ordering system and admin dashboard for **Adde International L.L.C.** (established 2003). The company sources, grades and exports Somali frankincense, myrrh and other natural resins from Puntland, Somalia.

- **Public site** in English, Somali and Arabic (right-to-left).
- **Product catalogue** with search, filters and side-by-side comparison.
- **Two ways to buy:**
  - a **Request for Quotation** (RFQ) form, quoted in KG or MT to a destination port;
  - a **shopping cart** with a short form that **generates a quotation document** (print or save as PDF), or submits an order as a pro-forma invoice;
  - a **Send this cart on WhatsApp** button that opens WhatsApp with the cart and the customer's details.
- **Online tracking sheet:** every quotation, order, RFQ and WhatsApp cart click is copied to a Google Sheet. See [docs/GOOGLE-SHEET.md](docs/GOOGLE-SHEET.md).
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
- `ADMIN_PASSWORD`: at least 8 characters. The seed creates `ADMIN_EMAIL` as a **Super admin**.
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
- **Quotation documents:** after the cart form, the customer lands on their quotation (or pro-forma invoice for orders) at `/quotation/REFERENCE?k=…`. The link holds a random key, so references can't be guessed to view someone else's document. Unpriced lines show "Price on request". The document says it is not a tax invoice, and that Adde International confirms prices in writing before payment. Staff open it from the order page in the admin.
- **Bulk orders:** a cart above the bulk threshold (Admin → Settings, default 1,000 kg) suggests sending it as a quotation request instead.
- **Stock** is optional per product. When tracked, it is deducted when an order moves to *Confirmed* (or later) and returned if the order is cancelled. Every change is logged.
- **Statuses:** Pending → Under Review → Quotation Sent → Confirmed → Processing → Ready for Shipment → Shipped → Delivered, or Cancelled. Each change is recorded on a timeline with the staff member's name.

### Roles

| Role | Access |
|---|---|
| **Super admin** | Everything, including users, settings and the activity log |
| **Manager** | Catalogue, pricing, stock, website requests, customers, sales, purchases, accounting, website text, research, reports |
| **Sales** | Dashboard, website requests, customers, quotations and invoices. Cannot record payments |
| **Content editor** | Products, categories, website text (no prices or finance) |
| **Accountant** | Customers, quotations and invoices, purchases and suppliers, payments, expenses, accounts, reports |

Every admin page and server action checks the role on the server. Changing a user's role or password, or deactivating them, signs them out immediately. Five failed logins lock an account for 15 minutes.

### Sales, purchasing and accounting (admin)
- **Customers:** website visitors are added automatically. Staff add walk-in, phone, WhatsApp and referral customers in **Customers**. Email is optional for these.
- **Quotations & invoices** (`/admin/sales`):
  - Make one for any customer, or start one from a website order or RFQ with **Create quotation / Create invoice**.
  - Prices are per kg, and quantities can be in KG or MT. Discount, shipping and tax are added on top.
  - Documents start as drafts. A quotation can be marked sent, accepted or declined, then **converted to an invoice**.
  - **Issuing** an invoice deducts tracked stock. If a confirmed website order already took the stock, it isn't taken twice.
  - Each document has a printable page (`/invoice/NUMBER?k=…`) that staff can send to the customer on WhatsApp. Bank and mobile money details come from **Settings → Invoices**.
- **Payments:** record full or part payments on an invoice by cash, bank transfer, EVC Plus, Zaad, eDahab, Sahal, cheque or card. The invoice moves to *Part paid* or *Paid* automatically. A payment can't be more than the balance due. To void an invoice, delete its payments first.
- **Purchases and suppliers:** each purchase goes draft → ordered → received. **Receiving adds the goods to stock** and starts stock tracking for that product. Supplier payments are recorded on the purchase. Cancelling a received purchase removes the stock again.
- **Accounting:**
  - **Expenses** (transport, customs, packaging, wages, rent and so on).
  - **Accounts** for your cash box, bank and mobile money wallets, with live balances.
  - **Overview:** profit estimate, cash flow, money owed to you (with how late it is), money you owe suppliers, and expenses by category, for any period.
  - **CSV exports** of invoices, payments, purchases and expenses. They open in Excel.
- **Numbers:** `ADI-QUO-` quotations, `ADI-INV-` invoices, `ADI-PO-` purchases, `ADI-RCT-` receipts, `ADI-PAY-` payments out, `ADI-EXP-` expenses.
- The profit figure is a management estimate (sales − purchases − expenses in the period). It isn't a substitute for formal accounts.

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
5. **Tracking sheet:** connect the Google Sheet (docs/GOOGLE-SHEET.md) so every quotation is logged.
6. **Email alerts:** configure SMTP in `.env` so staff receive new RFQs, orders and inquiries. Submissions are saved either way.

See **[DEPLOYMENT.md](DEPLOYMENT.md)** to put the site online.
