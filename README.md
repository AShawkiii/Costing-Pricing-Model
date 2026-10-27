# Finance Support

A finance & accounting workspace built as a platform: each area of the finance function is a **module**, the
shell routes and presents them, and the home page is the launcher.

**Module 1 — Costing & Pricing** (built): the true cost per unit of a product and the selling price required
to hit a target gross profit margin.

| Page | Purpose |
| --- | --- |
| **1 · Costing** | Product info & photo, Direct Cost, Sample Cost, Marketing Expenses, Indirect Cost → **Total Cost Per Unit** |
| **2 · Pricing** | Target gross margin → **Recommended Selling Price**, mark-up, scenario table |
| **3 · Card** | **Costing & Pricing Card** — one approval-ready page: photo, cost broken down per unit, selling price |
| **4 · Library** | **Product Library** — every saved product in the database: search, filter, open, duplicate, delete |

**Planned modules** (listed on the home page, not built): Budgeting & Forecasting · Invoicing & Receivables ·
Purchasing & Payables · Inventory & Stock Valuation · General Ledger · Fixed Assets · Payroll ·
Cash & Treasury · Tax & VAT Returns · Financial Reporting. They appear as a roadmap only — nothing in the UI
links to or pretends to run a module that does not exist.

Everything recalculates on every keystroke; nothing is hard-coded; every visible button works. Products are
saved to a **SQLite database on the server**, so a costing you save is still there after a refresh, a browser
restart or a new machine pointed at the same server.

## Adding a module

1. Create `src/modules/<id>/` exporting an `AvailableModule` (pages, state provider, header actions, print
   documents, home-tile summary — see `src/modules/costing-pricing/index.tsx`).
2. Add it to `MODULES` in `src/shell/modules.ts`.

Routing, navigation, the module switcher and the home page all derive from that registry; the shell needs no
other change. Modules never import each other — they share only `@shared/*`.

---

## 1. Project structure

```
├── index.html
├── vite.config.ts               aliases + /api dev proxy
├── vite.standalone.config.ts    single-file build (no backend)
├── scripts/
│   ├── dev.mjs                  runs the API and Vite together
│   └── inline-standalone.mjs
├── data/                        the SQLite database lives here (git-ignored)
├── server/                      ── backend ──
│   ├── index.ts                 entry: serves /api and, in production, dist/
│   ├── app.ts                   Express routes, JSON errors
│   ├── db.ts                    node:sqlite connection + versioned migrations
│   ├── products.repository.ts   every SQL statement in the system
│   ├── validation.ts            server-side request validation
│   └── products.repository.test.ts
└── src/
    ├── main.tsx                 entry: router, system status, module providers
    ├── App.tsx                  routes derived from the module registry
    │
    ├── shell/                   ── the Finance Support platform ──
    │   ├── modules.ts           MODULE REGISTRY: available + planned modules
    │   ├── AppShell.tsx         brand, module switcher, module nav and actions
    │   └── HomePage.tsx         launcher: module tiles + roadmap
    │
    ├── shared/                  ── reusable by every module ──
    │   ├── ui/                  Card, Field, NumericInput, Modal, Notice, Summary
    │   ├── lib/                 format.ts, id.ts, print.ts, hash.ts
    │   ├── api/client.ts        fetch wrapper, ApiError, offline detection
    │   ├── contracts/products.ts  API types shared with the server
    │   └── state/SystemStatus.tsx  modules report issues, the shell shows them
    │
    ├── modules/
    │   └── costing-pricing/     ── module 1, self-contained ──
    │       ├── index.tsx        module definition handed to the registry
    │       ├── types/model.ts   data model
    │       ├── lib/             calculations.ts (engine) + tests, validation,
    │       │                    storage, image
    │       ├── config/defaults.ts
    │       ├── state/           store.ts (reducer), AppStateContext.tsx,
    │       │                    LibraryContext.tsx (saved products + save status)
    │       ├── hooks/useFormatters.ts
    │       ├── components/      costing/, pricing/, card/, print/, settings/, library/
    │       ├── pages/           CostingPage, PricingPage, CardPage, LibraryPage
    │       └── styles/module.css
    │
    └── styles/
        ├── global.css           design system + shell chrome
        └── print.css            page setup, print-target switching, print primitives
```

**Architecture rules.** The UI never calculates: `src/modules/costing-pricing/lib/calculations.ts` has no
React import and no DOM access, so the same engine can be reused by an API, an export service or a batch job.
Modules never import one another — anything two modules need lives in `src/shared/`.

---

## 2. Calculation logic

### Line level (Direct & Sample cost tables)

```
Total            = Quantity × Unit Price                       (read-only)
VAT Rate         = Settings rate (14% by default) when the line's VAT box is ticked
                 = 0%              when it is not (the line is zero-rated)
VAT Amount       = Total × VAT Rate
Cost Incl. VAT   = Total + VAT Amount
Cost Base        = Cost Incl. VAT   (VAT treatment = inclusive, default)
                 = Total            (VAT treatment = recoverable)

Allocation = Yes → Total Price = Cost Base ÷ Quantity Produced   (spread over the run)
Allocation = No  → Total Price = Cost Base                       (not distributed)
```

### Marketing

Marketing is **always** allocated — there is no Yes/No dropdown:

```
Total Price = Cost Base ÷ Quantity Produced
```

### Indirect cost

```
Overheads Per Unit          fixed per-unit amount — never divided by Quantity Produced
Exchange Rate Adjustment    = Base Cost Per Unit × Exchange Rate %
```

### Totals

```
Base Cost Per Unit  = Direct Per Unit + Sample Per Unit + Marketing Per Unit + Overheads Per Unit
Total Cost Per Unit = Base Cost Per Unit + Exchange Rate Adjustment
                    = Base Cost Per Unit × (1 + Exchange Rate %)
Total Production Cost = Total Cost Per Unit × Quantity Produced
```

### Pricing — gross **margin**, not mark-up

```
Selling Price = Cost Per Unit ÷ (1 − Gross Profit Margin)
Gross Profit  = Selling Price − Cost Per Unit
Gross Margin  = Gross Profit ÷ Selling Price        (proves the target is met)
Mark-up %     = Gross Profit ÷ Cost Per Unit
```

Cost 184 EGP at a 40% target: `184 ÷ 0.60 = 306.67` — **not** `184 × 1.40 = 257.60`.
The Pricing page shows both figures side by side so the difference is explicit.

### Public engine functions

`calculateLineTotal` · `resolveVatRate` · `calculateVatAmount` · `calculateTotalIncludingVat` · `calculateCostBase` ·
`calculateAllocatedCost` · `calculateCostLine` · `calculateMarketingLine` · `calculateCostSection` ·
`calculateDirectCost` · `calculateSampleCost` · `calculateMarketingCost` · `calculateBaseCostPerUnit` ·
`calculateExchangeRateAdjustment` · `calculateTotalCostPerUnit` · `calculateCosting` ·
`calculateSellingPrice` · `calculateGrossProfit` · `calculateGrossMargin` · `calculateMarkup` ·
`calculateScenario` · `calculatePricing` · `buildCostBreakdown` · `safeDivide`

Every division goes through `safeDivide`, so a missing or zero Quantity Produced yields `0` — never
`NaN` or `Infinity` — while validation tells the user what is wrong.

---

## 2b. Saved products and the database

**Storage.** SQLite through Node's built-in `node:sqlite` — a real SQL database in a file
(`data/finance-support.db`), with no native module to compile and nothing to install or host. The schema is
created and upgraded by numbered migrations in `server/db.ts`, tracked with `PRAGMA user_version`, so an
existing database is migrated in place rather than recreated.

**What a saved product holds.** The denormalised figures the library list shows (name, code, category, date,
quantity, cost per unit, selling price, margin, currency, thumbnail) plus three JSON documents: the costing
model, the pricing inputs, and **the settings that were in force at save time**. That last one is what makes
a reopened product reproduce the figures it was approved with: VAT rate and treatment, currency and the
unallocated-cost rule travel with the product, even if the workspace defaults have changed since.

**The figures are never trusted from the screen.** Totals are recomputed by the calculation engine when a
product is saved and again when it is opened; the stored numbers exist only so the library can be listed and
sorted without loading every model. A test asserts the round trip (`lib/productsApi.test.ts`).

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | status and the number of saved products |
| `GET /api/products?q=&category=&sort=` | library list (no model payload), plus the categories in use |
| `GET /api/products/:id` | one product with its full model |
| `POST /api/products` | save the workspace as a new product |
| `PUT /api/products/:id` | update the linked product |
| `POST /api/products/:id/duplicate` | copy a product, server-side, as "… (copy)" |
| `DELETE /api/products/:id` | delete permanently |

Failures return `{ error: { code, message, details } }`; the client renders `message` and any field
`details` as they are. Search and sort are parameterised — the sort option is matched against a fixed list
rather than interpolated — so no user input reaches SQL as text.

**Saving in the app.** The header carries a Save button and a status chip that reads *Not in library*,
*Unsaved changes*, *Saving…*, *Saved HH:MM* or *Not saved*, and the page shows the result of the last save
with the product name or the reason it failed. Once a product is saved the workspace is linked to it, so
Save updates that row; **Save as new** stores a separate product. If the linked product was deleted from
another tab, Save keeps your work by writing it as a new product instead of failing.

**The Product Library page** loads from the database whenever the app opens. Search covers name, code and
category; results can be filtered by category and sorted five ways. Each product can be opened (it replaces
the workspace, then takes you to Costing), duplicated, or deleted behind a confirmation dialog that names
the product. Loading shows skeleton cards, an unreachable server shows the reason and a *Try again* button,
an empty database explains how to save the first product, and filters that match nothing offer to clear
themselves.

---

## 3. Data model

```ts
CostingModel {
  id, product { name, code, category, costingDate, photo?,
                supplier?, fabricType?, collection?, version?, createdBy?, approvalStatus? },
  quantityProduced,
  directCosts:       CostLine[]      // description, quantity, measurementId, unitPrice, vatable, allocate
  sampleCosts:       CostLine[]      // identical shape to directCosts
  marketingExpenses: MarketingLine[] // marketingTypeId, description, quantity, unitPrice, vatable
  overheadsPerUnit,
  exchangeRateValuation
}

ProductPhoto  { dataUrl, name, width, height, bytes }   // downscaled, stored in the model

PricingModel  { targetGrossMargin, scenarioMargins[] }

AppSettings   { currency, locale, vatRate, vatableByDefault, vatTreatment,
                unallocatedTreatment, measurements[], marketingTypes[] }

AppState      { costing, pricing, settings,
                savedProductId, savedAt, savedHash }  // the open product + change detection

// The draft workspace is mirrored to localStorage (finance-support:costing-pricing:v1)
// so a refresh never loses work in progress; saved products live in SQLite.
```

Calculated totals are **never stored** — they are derived from the model by the engine
(`CostingResult`, `PricingResult`), so the saved data can never drift from the arithmetic.
The model is plain JSON: ready for a database, versioning, or an export endpoint.

---

## 4. Running the application

```bash
npm install
npm start                # build + run everything on http://localhost:4000
```

That one command serves the app and the API from the same port, with the database in `data/`. For
development with hot reload:

```bash
npm run dev              # API on :4000 + Vite on http://localhost:5173 (proxies /api)
npm run dev:api          # the API alone
npm run dev:web          # the front end alone
```

Other scripts:

```bash
npm test                 # engine, saved-product round trip, repository and HTTP API
npm run build            # type-check + production build into dist/
npm run serve            # run the API (and dist/, if built) without rebuilding
npm run build:standalone # one self-contained .html file (no backend — see below)
npm run lint
npm run typecheck
```

`PORT` and `DATABASE_PATH` override the defaults (`4000` and `data/finance-support.db`).

**No-install option.** `npm run build:standalone` writes
`dist-standalone/finance-support.html` — the entire front end in a single file that runs by double-clicking
it: no server, no install, no network. It has no database, so the Product Library says so and the Save
button is hidden; the costing, pricing and card pages work exactly as they do in the full app, with the
current model kept in the browser. Use it to share the calculator; use `npm start` to build a product
library.

The app version is shown in the header (e.g. `v1.1.0 · Total cost per unit · …`), so you can always tell
which build you are looking at.

Requires Node 18+ (developed on Node 22). No backend or database — the model persists in the browser.

**Print / Export:** two printable documents share the same live model —

* *Print / Export* in the header prints the **full cost sheet**: product info and photo, all four sections,
  costing summary, pricing summary, scenarios and sign-off lines.
* *Print / Export card* on page 3 prints the **Costing & Pricing Card**: one page with the photo, the cost
  breakdown per unit and the selling price.

Choosing *Save as PDF* in the print dialog produces the PDF export.

**Product photo:** add it in the *Product Photo* section on the Costing page (click or drag and drop, JPG /
PNG / WebP up to 10 MB). The picture is downscaled to 1,200px on its longest edge, re-encoded as JPEG and
stored inside the model, so it appears on the card and both printed documents with no upload or server.

---

## 5. Test results — specification test case

Input: Quantity Produced 1,000 · Milton Fabric 2.5 Meter @200 (Alloc **Yes**) · Zipper 1 Piece @30 (Alloc **Yes**)
· Production Expense 5,000 @1 (Alloc **No**) · Sample Fabric 2 Meter @200 (Alloc **Yes**) · UGC Fees 10,000
· Shooting Expense 5,000 · Overheads 20 · Exchange Rate 15% · Target margin 40%.

Both results below are produced by the app (unit-tested in `src/modules/costing-pricing/lib/calculations.test.ts` and verified in
the browser).

**A · VAT recoverable (net costing)** — isolates the allocation and gross-up rules:

| Figure | Value |
| --- | --- |
| Milton Fabric — Total / Total Price | 500.00 / **0.50** (500 ÷ 1,000) |
| Zipper — Total / Total Price | 30.00 / **0.03** (30 ÷ 1,000) |
| Production Expense — Total / Total Price | 5,000.00 / **5,000.00** (Allocation = No) |
| Direct Cost Per Unit | **5,000.53** |
| Sample Cost Per Unit | **0.40** (400 ÷ 1,000) |
| Marketing Per Unit | **15.00** (15,000 ÷ 1,000) |
| Overheads Per Unit | **20.00** |
| Base Cost Per Unit | **5,035.93** |
| Exchange Rate Adjustment (15%) | **755.39** |
| **Total Cost Per Unit** | **5,791.32 EGP** |
| Recommended Selling Price @ 40% | **9,652.20 EGP** |
| Gross Profit / Realised Margin / Mark-up | 3,860.88 · **40.00%** · 66.67% |

**B · VAT inclusive (app default, 14% on every line):**

| Figure | Value |
| --- | --- |
| Direct / Sample / Marketing Per Unit | 5,700.60 · 0.46 · 17.10 |
| Base Cost Per Unit | 5,738.16 |
| Exchange Rate Adjustment (15%) | 860.72 |
| **Total Cost Per Unit** | **6,598.88 EGP** |
| Recommended Selling Price @ 40% | **10,998.14 EGP** |

**Read the numbers before you trust them.** The test case marks the 5,000 EGP *Production Expense*
(a batch cost) as **Allocation = No** and the per-garment fabric and zipper as **Allocation = Yes**, which is
the reverse of how those costs behave. Applying the specified rules literally, the batch expense is charged in
full to every unit (5,000/unit) while the fabric is spread to half a piastre — hence the ~5,791 EGP unit cost.
The arithmetic is correct for the flags given; the flags are the thing to check.

**C · Same data with the flags following cost behaviour** (fabric & zipper `No` = incurred per garment,
production expense `Yes` = spread over 1,000 units, net costing):

| Figure | Value |
| --- | --- |
| Direct Cost Per Unit | 535.00 (500 + 30 + 5) |
| Sample / Marketing / Overheads Per Unit | 0.40 · 15.00 · 20.00 |
| Base Cost Per Unit | 570.40 |
| **Total Cost Per Unit** (×1.15) | **655.96 EGP** |
| Recommended Selling Price @ 40% | **1,093.27 EGP** (gross profit 437.31, mark-up 66.67%) |

The specification's own illustration is also asserted in the tests: base 160 → +15% → **184.00**, and
184 ÷ (1 − 40%) → **306.67** with a 122.67 gross profit and a 66.67% mark-up.

`npm test` → **48 passing tests** (engine, saved-product round trip, repository, HTTP API).

---

## 6. Assumptions

1. **VAT is a per-line checkbox.** Ticked, the line is taxed at the single rate configured in Settings
   (14% by default); unticked, it is zero-rated and carries no VAT at all. Net, VAT amount and VAT-inclusive
   amount are shown on every line, and changing the Settings rate immediately re-prices every ticked line.
2. **Allocation = No.** The spec defines `Total Price = Total` for these lines, so by default the line is
   treated as a cost incurred **for every unit** and enters the cost per unit at its full amount
   (setting: *Count in full per unit*). Because that reading charges a lump-sum batch cost to each unit, the
   alternative — *Keep as lump sum*, which excludes it from the cost per unit and reports it separately as a
   total production cost — is available in **Settings** and shown in the summary as
   *Unallocated lump-sum costs*.
3. **VAT treatment.** Defaults to **inclusive** (VAT is a real cost). If the business reclaims input VAT,
   switch to **recoverable** in Settings: cost bases become net and VAT is reported for information only.
4. **Exchange Rate Valuation** is a gross-up on the *whole* base cost per unit (direct + sample + marketing +
   overheads), exactly as specified — it is not restricted to imported materials.
5. **Overheads Per Unit** is taken as already per-unit and is never divided by Quantity Produced.
6. **Quantity Produced = 0** blocks nothing but yields 0 for allocated lines, with an explicit error message
   instead of a division-by-zero result.
7. **Rounding** happens only at display time (2 decimals). Totals are computed at full precision, so summed
   columns cannot drift by a piastre.
8. **The product photo lives inside the model** as a compressed data URL (typically well under 300 KB), so it
   survives a reload and travels with an export. If the browser refuses to store the model, the app says so
   rather than losing the work silently.
9. **Two levels of persistence.** Saved products live in the server's SQLite database and are the system of
   record. The workspace you are editing is also mirrored to localStorage, so a refresh mid-costing loses
   nothing even before you press Save. Clearing site data only discards the unsaved draft.
10. **No authentication yet**, so every product in the database is visible to anyone who can reach the
   server. The repository and API are already shaped to take an owner column when accounts arrive.
11. **Currency** is a formatting label (default EGP); the app does not convert between currencies.

---

## 7. Future improvements

- Accounts and per-user libraries, then sharing and approval of a saved costing.
- Costing versions: keep the history of a product instead of overwriting it, and compare two versions.
- Server-side export (PDF/Excel) of any saved product, and bulk export of the library.
- The planned modules above, starting with the one the business needs next.
- A shared company/entity record (name, logo, currency, fiscal year) used by every module and its documents.
- Cross-module links once a second module exists — a costing feeding a budget line, an invoice priced from a
  costing card.
- Multiple photos per product (front / back / detail) and a photo gallery on the card.
- Save, list and load multiple costing models; costing versions with a side-by-side comparison view.
- Backend + database (the model is already plain JSON and the storage layer is isolated in the module's `lib/storage.ts`).
- Supplier, fabric type, collection, user and approval workflow — fields already exist in `ProductInfo`.
- Native Excel/CSV export and a server-rendered PDF of the card (print-to-PDF is available today).
- Per-line VAT rates for mixed-rate purchases (today VAT is one rate plus a per-line on/off switch).
- Multi-currency with real exchange rates, per-material FX exposure instead of a single gross-up.
- Landed-cost extras: freight, customs duty, wastage %, and a per-line yield/consumption factor.
- Price ladders: wholesale vs retail margins, discount and markdown scenario planning.
- Break-even and contribution-margin analysis; sensitivity charts on cost drivers.
- Role-based access, audit trail, and approval sign-off on the printed cost sheet.
- i18n (Arabic / RTL) and per-user locale settings.
