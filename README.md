# CarcassIQ

A costing tool for independent butchers, farm shops and small meat businesses.
Answers one question: *"I bought this meat for this price — after trimming and
yield, what did it really cost me, what margin am I making, and what should I
sell it for?"*

Three pages: **New Costing** (fast entry form with live results), **Saved
Costings** (table of past costings), **Suppliers** (auto-derived stats per
supplier). Built with Vite + React + TypeScript + Tailwind, and Supabase for
auth + database (one account per shop, row-level security so each shop only
ever sees its own data).

## Calculations

- Total purchase cost = purchase weight × purchase price/kg
- Saleable yield % = saleable weight ÷ purchase weight
- True usable cost/kg = total purchase cost ÷ saleable weight
- Trim recovery value = trim weight × trim value/kg
- Adjusted cost = total purchase cost − trim recovery value
- Adjusted usable cost/kg = adjusted cost ÷ saleable weight
- Projected revenue = saleable weight × selling price/kg
- Gross profit = projected revenue − adjusted cost
- Gross margin % = gross profit ÷ projected revenue
- Required selling price/kg for target margin = adjusted cost ÷ (saleable weight × (1 − target margin %))

Verified against the worked example: 20kg sirloin @ £16.50/kg, 16.8kg
saleable, 2.1kg trim @ £10/kg, 1.1kg waste → £330 total cost, 84% yield,
£19.64/kg true cost, £18.39/kg adjusted cost. See `src/lib/calculations.ts`.

## 1. Install prerequisites (this Mac doesn't have them yet)

This machine is missing the tools needed to build/run the app. Install these
first:

1. **Xcode Command Line Tools** (provides `git`):
   ```bash
   xcode-select --install
   ```
   This opens a GUI installer — click through it, then re-open your terminal.

2. **Node.js** (v18 or newer — includes `npm`). Easiest via the official
   installer: https://nodejs.org (choose the LTS build), or with Homebrew
   once you have it:
   ```bash
   brew install node
   ```

3. **GitHub CLI** (optional, for step 4):
   ```bash
   brew install gh
   gh auth login
   ```

4. **Vercel CLI** (optional, for step 5):
   ```bash
   npm install -g vercel
   ```

## 2. Set up Supabase

1. Create a free project at https://supabase.com.
2. In the Supabase dashboard, go to **SQL Editor** and run the contents of
   [`supabase/schema.sql`](supabase/schema.sql). This creates the `costings`
   table with row-level security so each account only sees its own rows.
3. Under **Authentication → Providers**, make sure **Email** is enabled. For
   quick local testing you can disable "Confirm email" under
   **Authentication → Settings** so sign-up works instantly.
4. Under **Project Settings → API**, copy your **Project URL** and **anon
   public key**.

## 3. Run locally

```bash
cd /Users/jacmetcalfe/Documents/CarcassIQ
npm install
cp .env.example .env
```

Edit `.env` and paste in your Supabase URL and anon key:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Then start the dev server:

```bash
npm run dev
```

Open the printed localhost URL, create an account (email/password), and
start costing.

## 4. Push to GitHub

```bash
git init
git add .
git commit -m "Initial CarcassIQ build"
gh repo create carcassiq --private --source=. --remote=origin --push
```

(Or create the repo manually on GitHub and `git remote add origin <url> && git push -u origin main`.)

## 5. Deploy to Vercel

Easiest path — import the GitHub repo at https://vercel.com/new, or via CLI:

```bash
vercel login
vercel link
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel --prod
```

Vite projects are auto-detected (build command `vite build`, output `dist`).
`vercel.json` in this repo adds the SPA rewrite needed for client-side
routing (React Router) to work on refresh/direct links.

## What's deliberately not here

No inventory/stock management, invoice uploads, AI recommendations, complex
dashboards, recipes, accounting integrations, barcodes, multi-branch
management, or advanced carcass breakdowns — by design, to keep this a fast
weekly tool rather than accounting software.
