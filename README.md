# Costing & Pricing Model

A production-ready web app for a fashion / manufacturing business that calculates the **true cost per unit**
of a product and the **selling price required to hit a target gross profit margin**.

Three pages, one live model:

| Page | Purpose |
| --- | --- |
| **1 · Costing** | Product info & photo, Direct Cost, Sample Cost, Marketing Expenses, Indirect Cost → **Total Cost Per Unit** |
| **2 · Pricing** | Target gross margin → **Recommended Selling Price**, mark-up, scenario table |
| **3 · Card** | **Costing & Pricing Card** — one approval-ready page: photo, cost broken down per unit, selling price |

Everything recalculates on every keystroke; nothing is hard-coded; every visible button works.

---

## 1. Project structure

```
├── index.html
├── package.json
├── vite.config.ts
└── src/
    ├── main.tsx                     App entry (HashRouter + state provider)
    ├── App.tsx                      Routes: /costing, /pricing
    │
    ├── types/
    │   └── model.ts                 Data model (plain, serialisable interfaces)
    │
    ├── lib/                         ── framework-free core ──
    │   ├── calculations.ts          THE CALCULATION ENGINE (pure functions)
    │   ├── calculations.test.ts     Unit tests + the specification test case
    │   ├── validation.ts            Validation rules (pure)
    │   ├── format.ts                EGP / percentage / thousands formatting
    │   ├── image.ts                 Product photo: validation + downscaling
    │   ├── print.ts                 Chooses which document the browser prints
    │   ├── storage.ts               localStorage persistence + model migration
    │   └── id.ts                    Row id generator
    │
    ├── config/
    │   └── defaults.ts              Measurements, marketing types, VAT default, factories
    │
    ├── state/
    │   ├── store.ts                 Reducer (all state transitions)
    │   └── AppStateContext.tsx      React binding + derived results (memoised)
    │
    ├── hooks/
    │   └── useFormatters.ts         Formatting bound to the user's currency/locale
    │
    ├── components/
    │   ├── ui/                      Card, Field, NumericInput/PercentInput, Modal, Notice, Summary
    │   ├── costing/                 ProductInfoCard, ProductPhotoCard, CostLineTable,
    │   │                            MarketingTable, IndirectCostCard, CostSummaryCard
    │   ├── pricing/                 PricingSummaryCard, ScenarioTable
    │   ├── card/                    CostingPricingCard (screen + print)
    │   ├── settings/                SettingsDialog
    │   ├── print/                   CostSheet (printable / PDF cost sheet)
    │   ├── layout/                  AppShell (nav, New Costing, Print/Export, Settings)
    │   └── ValidationPanel.tsx
    │
    ├── pages/
    │   ├── CostingPage.tsx
    │   ├── PricingPage.tsx
    │   └── CardPage.tsx
    │
    └── styles/
        ├── global.css               Design system (dashboard UI + card)
        └── print.css                A4 cost sheet and A4 card layouts
```

**Architecture rule:** the UI never calculates. `src/lib/calculations.ts` has no React import and no DOM
access, so the same engine can be reused by an API, an export service or a batch job.

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

AppState      { costing, pricing, settings }     // persisted to localStorage
```

Calculated totals are **never stored** — they are derived from the model by the engine
(`CostingResult`, `PricingResult`), so the saved data can never drift from the arithmetic.
The model is plain JSON: ready for a database, versioning, or an export endpoint.

---

## 4. Running the application

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # calculation engine + specification test case
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
npm run lint
```

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

Both results below are produced by the app (unit-tested in `src/lib/calculations.test.ts` and verified in
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

`npm test` → **25 passing tests**.

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
9. **Persistence** is the browser's localStorage — one active model per browser, no backend yet.
10. **Currency** is a formatting label (default EGP); the app does not convert between currencies.

---

## 7. Future improvements

- Multiple photos per product (front / back / detail) and a photo gallery on the card.
- Save, list and load multiple costing models; costing versions with a side-by-side comparison view.
- Backend + database (the model is already plain JSON and the storage layer is isolated in `lib/storage.ts`).
- Supplier, fabric type, collection, user and approval workflow — fields already exist in `ProductInfo`.
- Native Excel/CSV export and a server-rendered PDF of the card (print-to-PDF is available today).
- Per-line VAT rates for mixed-rate purchases (today VAT is one rate plus a per-line on/off switch).
- Multi-currency with real exchange rates, per-material FX exposure instead of a single gross-up.
- Landed-cost extras: freight, customs duty, wastage %, and a per-line yield/consumption factor.
- Price ladders: wholesale vs retail margins, discount and markdown scenario planning.
- Break-even and contribution-margin analysis; sensitivity charts on cost drivers.
- Role-based access, audit trail, and approval sign-off on the printed cost sheet.
- i18n (Arabic / RTL) and per-user locale settings.
