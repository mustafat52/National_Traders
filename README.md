# National Traders – Business System (Frontend Demo)

Hussaini Automations · Next.js 14 (App Router) · TypeScript · Tailwind · Zustand · PWA-ready

A complete, working **frontend** with fake data (6,780 products, 60 categories, 3 locations, 4 price lists, ~570 bills,
14 vendors, 6 salesmen with 30 days of attendance). All data lives in the browser (localStorage). Only the backend is missing.

## Run
```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production check
```
Open `/login`. **Admin** = laptop layout. **Salesman** = phone layout (use browser device mode, or open on a phone over HTTPS/LAN).
Settings → *Reset demo data* restores the original data.

## What to demo
| Flow | Where |
|---|---|
| Dashboard, sales chart, **salesman points leaderboard** (monthly) | Admin → Dashboard |
| 6,780-product price list, 4 customer tiers, stock per location, QR label, stock adjustment | Admin → Products |
| **Stock In (incoming stock)**: add to shop, a godown, or split across all three; direct-to-shop products go to Main Shop automatically | Admin → Stock In, or "+ Add incoming stock" on a product page |
| Transfers between shop / godowns | Admin → Stock Transfers |
| Low-stock alerts (custom minimum per product) | Admin → Low Stock |
| Vendors, payables, ageing, payments, purchase returns | Admin → Vendors |
| Purchase entry (split across locations, price-change margin flag) | Admin → Purchases → New |
| Attendance, leave approval, add staff | Admin → Staff |
| Five reports (Billing, Attendance, Sales, Purchase, Stock) + CSV export, damaged stock | Admin → Reports |
| Location rule: login blocked outside shop, auto-logout when "leaving" | Login page / staff header (simulated) |
| Customer phone lookup, category pick, QR scan, **dispatch-location picker**, estimate vs quotation, cash/online/split payment | Staff → New bill |
| **WhatsApp link** to the customer's chat + public bill page (ESTIMATE / QUOTATION heading) | After saving a bill |
| History shows **points only** (no bill values); estimate → sale conversion with refreshed prices | Staff → History |
| Sales return (back to stock) and damage return (not restocked, logged at purchase price) | Staff → Returns |
| **Repeat purchase alert** (same product, same customer, within 15 days) | Staff → New bill with phone `9876500001` and scan product SKU `NT-00-005` or `NT-10-070` |

## Business rules implemented (see `src/lib/rules.ts` and `src/lib/store.ts`)
- Estimate: sendable before payment, no stock effect, no points, valid 7 days, converts to a sale with today's prices.
- Quotation (the sale bill): created only with payment recorded; reduces stock, awards points (10 per 1,000, configurable).
- Dispatch picker appears only when a product has stock in more than one location; single-location products deduct automatically.
- Salesmen never see purchase prices, vendor data, reports, or past bill values (points only).
- Products marked **direct to shop** (product page checkbox) always receive stock into Main Shop in Stock In and Purchases; no location is asked.
- Sales return reverses points proportionally; damage return is not added back to stock.

## Architecture (built to become the real product)
```
src/lib/types.ts      data model          -> becomes Postgres tables
src/lib/rules.ts      business rules      -> keep as-is / port into DB functions
src/lib/selectors.ts  reports, ledgers    -> become SQL views / RPC
src/lib/store.ts      DATA LAYER (actions)-> REPLACE with Supabase calls (screens stay unchanged)
src/lib/seed.ts       fake data generator -> demo only
src/app/admin/*       admin web panel     src/app/staff/*  salesman phone PWA     src/app/bill/[code]  public customer bill link
```

## Remaining work (backend, after approval)
1. **Supabase**: schema from `types.ts`, Auth (admin / salesman), **Row-Level Security** so salesmen cannot read purchase prices, vendors, or bill values.
2. Stock deduction, payment approval and returns as **single database transactions** (prevents two salesmen selling the last unit).
3. **Real location check**: server-side shop IP check (primary) + GPS (secondary) + heartbeat; the demo uses a toggle.
4. Public bill link served from a random code with expiry; PDF generated on demand (nothing stored).
5. Excel import (products, opening stock, prices), nightly backup job, yearly cleanup/export tool, audit log table.
6. Replace the demo QR "Demo scan" button and test the camera scanner on the shop's real phones and printed labels.

## If something looks wrong after copying files
Stop the server (Ctrl+C), delete the `.next` folder, run `npm run dev`, hard refresh (Ctrl+Shift+R). If data looks odd, Chrome DevTools → Application → Clear site data (or Settings → Reset demo data).
File locations matter: `src/app/layout.tsx` is the root layout; the admin one is `src/app/admin/layout.tsx`.

## Known demo limits
Data is per-browser (the public bill page works in the same browser only); camera scanning needs HTTPS; the service worker only caches static assets (billing needs internet by design); no audit-log screen yet; no Excel import yet.
