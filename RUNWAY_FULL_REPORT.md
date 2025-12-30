# RUNWAY DNA
## The AI-Powered Strategic Finance Suite for SaaS Founders

---

**Version:** 1.0.0  
**Last Updated:** December 29, 2025  
**Classification:** Product Hunt Technical Dossier  
**Status:** Production Ready

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Feature Deep-Dive](#feature-deep-dive)
   - [DNA Lab](#dna-lab)
   - [Runway Simulator](#runway-simulator)
   - [Hiring Planner](#hiring-planner)
   - [Growth Simulator](#growth-simulator)
   - [SaaS Valuation Tool](#saas-valuation-tool)
   - [R&D Tax Credit Estimator](#rd-tax-credit-estimator)
   - [Dilution Shaper](#dilution-shaper)
4. [Deployment & Security](#deployment--security)
5. [2025 Product Hunt Launch Strategy](#2025-product-hunt-launch-strategy)
6. [Technical Specifications](#technical-specifications)

---

## Executive Summary

### The Mission: Sequence Your Financial DNA

Runway DNA was built on a singular vision: **founders shouldn't just track their burn—they should understand their financial genome.**

Every startup has a unique financial fingerprint. The interplay between burn rate, revenue growth, churn, and capital efficiency creates a complex pattern that determines survival. Traditional spreadsheets show you numbers; Runway DNA shows you your **trajectory**.

![[HERO_DASHBOARD_SCREENSHOT_HERE]]

### The Problem We Solve

SaaS founders face a critical blindspot: they can see today's metrics, but they can't simulate tomorrow's decisions. What happens if you hire two engineers next quarter? What if churn increases by 1%? What's your company actually worth right now?

These questions require sophisticated modeling that typically lives in expensive CFO software or fragmented spreadsheets. Runway DNA consolidates everything into a single, beautiful, intelligent dashboard.

### Core Value Proposition

| Traditional Tools | Runway DNA |
|-------------------|------------|
| Static spreadsheets | Real-time simulation |
| Manual calculations | AI-powered insights |
| Fragmented data | Unified financial DNA |
| Historical reports | Predictive modeling |
| Generic templates | Founder-specific toolkit |

### Key Metrics at Launch

- **Modules:** 7 integrated financial tools
- **Calculations:** 50+ real-time financial formulas
- **Persistence:** PostgreSQL with Supabase
- **Performance:** <1.2s LCP (Lighthouse optimized)
- **Design:** Deep Charcoal glassmorphism with Electric Cyan accents

---

## Architecture Overview

### System Topology

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   DNA Lab   │  │  Simulator  │  │   Growth    │  │   Toolkit   │    │
│  │  (Upload)   │  │ (Scenarios) │  │  (MRR/ARR)  │  │ (Val/Tax)   │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │                │            │
│         └────────────────┼────────────────┼────────────────┘            │
│                          ▼                                               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    ZUSTAND STATE STORE                             │  │
│  │  • currentAnalysis    • simulatorParams    • contextMode          │  │
│  │  • growthScenario     • alertHistory       • userPreferences      │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          SERVICE LAYER                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │ simulator-engine │  │  GrowthService   │  │   BurnMonitor    │      │
│  │  (Runway Math)   │  │  (MRR Waterfall) │  │  (Health Alerts) │      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │ValuationService  │  │ TaxCreditService │  │ DilutionService  │      │
│  │ (SaaS Multiples) │  │   (ASC Method)   │  │  (Equity Math)   │      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        PERSISTENCE LAYER                                 │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     SUPABASE (PostgreSQL)                          │  │
│  │  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────┐        │  │
│  │  │dna_snapshots│  │growth_scenarios │  │  alert_history  │        │  │
│  │  └─────────────┘  └─────────────────┘  └─────────────────┘        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### The Simulator Engine (`simulator-engine.ts`)

The core mathematical engine powering all runway projections. It implements a 24-month forward-looking cash flow model.

**Key Functions:**

```typescript
// Core projection algorithm
function simulateRunway(params: SimParams): ProjectionMonth[] {
  // Projects 24 months of cash flow
  // Accounts for revenue growth, expense growth, seasonality
  // Returns month-by-month breakdown
}

// Runway calculation
function calculateRunwayMonths(cashOnHand: number, monthlyBurn: number): number {
  return cashOnHand / Math.max(monthlyBurn, 1);
}

// Grade assignment
function calculateGrade(runwayMonths: number): Grade {
  if (runwayMonths >= 24) return 'A';
  if (runwayMonths >= 18) return 'B';
  if (runwayMonths >= 12) return 'C';
  if (runwayMonths >= 6) return 'D';
  return 'F';
}
```

### Zustand State Management (`store.ts`)

Centralized state that enables real-time synchronization between all modules.

```typescript
interface AppState {
  // Core analysis from DNA Lab
  currentAnalysis: FinancialAnalysis | null;
  
  // Simulator parameters
  simulatorParams: SimParams | null;
  
  // Growth scenario configuration
  growthScenarioParams: GrowthScenarioParams | null;
  
  // Context mode toggle (Analysis vs Strategy)
  contextMode: 'analysis' | 'strategy';
  
  // Actions
  setCurrentAnalysis: (analysis: FinancialAnalysis) => void;
  setSimulatorParams: (params: SimParams) => void;
  setContextMode: (mode: 'analysis' | 'strategy') => void;
}
```

**Data Flow:**
1. User uploads CSV in DNA Lab
2. `dna-processor.ts` parses and calculates metrics
3. Results stored in Zustand + Supabase
4. Simulator automatically hydrates from state
5. All Toolkit modules read from shared state

### Supabase Integration (`api.ts`)

Type-safe API layer with comprehensive error handling.

```typescript
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// All API calls follow this pattern
async function saveAnalysisSnapshot(analysis: FinancialAnalysis): Promise<ApiResponse<DnaSnapshot>> {
  try {
    const { data, error } = await supabase
      .from('dna_snapshots')
      .insert(transformToSnapshot(analysis))
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success('Snapshot Saved');
    return { data, error: null };
  } catch (err) {
    toast.error('Save Failed');
    return { data: null, error: err.message };
  }
}
```

---

## Feature Deep-Dive

### DNA Lab

The entry point for financial data ingestion. Users upload CSV bank statements or financial exports, and the system "sequences" their financial DNA.

![[DNA_LAB_SCREENSHOT_HERE]]

**Capabilities:**
- CSV parsing with intelligent column detection
- Automatic revenue vs. expense classification
- 6-month trend analysis
- Real-time grade calculation

**Core Metrics Calculated:**

| Metric | Formula |
|--------|---------|
| Monthly Burn | `Total Expenses - Total Revenue` |
| Runway Months | `Cash on Hand / Monthly Burn` |
| Profit Margin | `(Revenue - Expenses) / Revenue × 100` |
| Revenue Growth | `(Current - Previous) / Previous × 100` |
| Burn Multiple | `Net Burn / Net New ARR` |

**Grading Algorithm:**

```
Grade A: Runway ≥ 24 months (Excellent)
Grade B: Runway ≥ 18 months (Healthy)
Grade C: Runway ≥ 12 months (Caution)
Grade D: Runway ≥ 6 months (Warning)
Grade F: Runway < 6 months (Critical)
```

---

### Runway Simulator

The predictive modeling engine. Users adjust sliders to see how decisions impact their runway in real-time.

![[SIMULATOR_SCREENSHOT_HERE]]

**Interactive Parameters:**

| Lever | Range | Impact |
|-------|-------|--------|
| Monthly Revenue | $0 - $500K | Increases cash inflow |
| Monthly Expenses | $0 - $500K | Increases cash outflow |
| Revenue Growth % | 0% - 50% | Compounds monthly |
| Expense Growth % | 0% - 30% | Compounds monthly |
| Cash on Hand | $0 - $10M | Starting position |

**Projection Formula:**

```typescript
for (let month = 1; month <= 24; month++) {
  const projectedRevenue = baseRevenue * Math.pow(1 + revenueGrowth, month);
  const projectedExpenses = baseExpenses * Math.pow(1 + expenseGrowth, month);
  const netCashFlow = projectedRevenue - projectedExpenses;
  
  cashBalance = previousCash + netCashFlow;
  
  if (cashBalance <= 0) {
    runwayMonths = month;
    break;
  }
}
```

**Scenario Presets:**
- **Conservative:** -10% revenue, +10% expenses
- **Base Case:** Current trajectory
- **Optimistic:** +20% revenue, -5% expenses
- **Survival Mode:** Minimum viable expenses

---

### Hiring Planner

Models the runway impact of team growth decisions.

![[HIRING_PLANNER_SCREENSHOT_HERE]]

**Input Parameters:**

| Role Type | Default Cost | Ramp Period |
|-----------|--------------|-------------|
| Engineering | $150K/year | 3 months |
| Sales | $120K/year | 2 months |
| Marketing | $100K/year | 1 month |
| Operations | $80K/year | 1 month |

**Impact Calculation:**

```typescript
function calculateHiringImpact(hires: HirePlan[]): RunwayImpact {
  const totalAnnualCost = hires.reduce((sum, h) => {
    const annualCost = h.salary * (1 + h.benefitsMultiplier);
    return sum + annualCost;
  }, 0);
  
  const monthlyImpact = totalAnnualCost / 12;
  const newRunway = (cashOnHand) / (currentBurn + monthlyImpact);
  
  return {
    additionalMonthlyBurn: monthlyImpact,
    runwayReduction: currentRunway - newRunway,
    breakEvenPoint: calculateBreakEven(hires)
  };
}
```

**Visualization:**
- Before/After runway comparison chart
- Monthly burn trajectory
- Cumulative cost projection

---

### Growth Simulator

Top-line revenue forecasting with the complete SaaS MRR Waterfall.

![[GROWTH_SIMULATOR_SCREENSHOT_HERE]]

**MRR Waterfall Formula:**

```
Next Month MRR = Current MRR 
                + New MRR 
                + Expansion MRR 
                - Contraction MRR 
                - Churned MRR
```

**Detailed Calculations:**

```typescript
// Monthly calculations
const newMRR = newCustomers * ARPA;
const expansionMRR = currentMRR * expansionRate;
const contractionMRR = currentMRR * contractionRate;
const churnedMRR = currentMRR * churnRate;

const nextMRR = currentMRR + newMRR + expansionMRR - contractionMRR - churnedMRR;

// Net Revenue Retention
const NRR = ((currentMRR + expansionMRR - contractionMRR - churnedMRR) / currentMRR) * 100;

// CAGR calculation
const CAGR = Math.pow(endingMRR / startingMRR, 1 / years) - 1;
```

**Key Metrics:**

| Metric | Target | Formula |
|--------|--------|---------|
| Net Revenue Retention | >100% | `(MRR + Expansion - Contraction - Churn) / Starting MRR` |
| Logo Churn | <3% | `Lost Customers / Total Customers` |
| Revenue Churn | <5% | `Churned MRR / Total MRR` |
| Expansion Rate | >5% | `Expansion MRR / Total MRR` |

**Scenario Comparison:**
- Conservative: 5% growth, 3% churn
- Base Case: 10% growth, 2% churn
- Optimistic: 20% growth, 1% churn

---

### SaaS Valuation Tool

Real-time company valuation based on industry multiples.

![[VALUATION_TOOL_SCREENSHOT_HERE]]

**Valuation Formula:**

```typescript
function calculateValuation(metrics: SaaSMetrics): ValuationResult {
  // Base valuation
  let multiple = getBaseMultiple(metrics.ARR);
  
  // Growth adjustment (Rule of 40)
  const ruleOf40Score = metrics.revenueGrowth + metrics.profitMargin;
  if (ruleOf40Score > 40) {
    multiple *= 1 + ((ruleOf40Score - 40) * 0.02); // +2% per point above 40
  }
  
  // Churn penalty
  if (metrics.monthlyChurn > 0.03) {
    multiple *= 1 - ((metrics.monthlyChurn - 0.03) * 5); // -5% per 1% above 3%
  }
  
  // NRR bonus
  if (metrics.NRR > 120) {
    multiple *= 1.15; // 15% premium for excellent retention
  }
  
  return {
    valuation: metrics.ARR * multiple,
    multipleUsed: multiple,
    adjustments: [...]
  };
}
```

**Multiple Ranges:**

| ARR Range | Base Multiple | Growth Adjusted |
|-----------|---------------|-----------------|
| $0 - $1M | 3-5x | 4-8x |
| $1M - $5M | 5-8x | 8-15x |
| $5M - $20M | 8-12x | 15-25x |
| $20M+ | 10-15x | 20-40x |

---

### R&D Tax Credit Estimator

IRS Alternative Simplified Credit (ASC) calculator for qualified research expenses.

![[TAX_CREDIT_SCREENSHOT_HERE]]

**ASC Formula:**

```typescript
function calculateTaxCredit(input: TaxCreditInput): TaxCreditEstimate {
  // 80% Rule for wages
  const qualifiedWages = input.rdPercentage >= 80 
    ? input.engineeringWages 
    : input.engineeringWages * (input.rdPercentage / 100);
  
  // 65% of contractor costs
  const qualifiedContractors = input.usContractorCosts * 0.65;
  
  // 100% of R&D cloud costs
  const qualifiedCloud = input.monthlyCloudCosts * 12 * (input.cloudRdPercentage / 100);
  
  // Total QREs
  const totalQREs = qualifiedWages + qualifiedContractors + qualifiedCloud;
  
  // Credit calculation (6.6% - 10% of QREs)
  const creditRate = 0.066; // ASC rate
  const estimatedCredit = totalQREs * creditRate;
  
  // Annual cap for payroll tax offset
  const cappedCredit = Math.min(estimatedCredit, 500000);
  
  return { totalQREs, estimatedCredit, cappedCredit };
}
```

**Qualification Rules:**

| Expense Type | QRE Percentage | Notes |
|--------------|----------------|-------|
| Engineer Wages (≥80% R&D) | 100% | Full qualification |
| Engineer Wages (<80% R&D) | Actual % | Proportional |
| US Contractors | 65% | Statutory limit |
| Cloud (Dev/Staging) | 100% | Development only |
| Supplies | 100% | R&D supplies only |

---

### Dilution Shaper

Fundraising term sheet preview with equity dilution modeling.

![[DILUTION_SHAPER_SCREENSHOT_HERE]]

**Dilution Formula:**

```typescript
function calculateDilution(input: FundingRoundInput): FundingRoundResult {
  // Post-money valuation
  const postMoney = input.preMoneyValuation + input.raiseAmount;
  
  // Basic investor ownership
  const investorOwnership = input.raiseAmount / postMoney;
  
  // Option pool shuffle (if required)
  if (input.applyOptionPoolShuffle) {
    const poolExpansion = input.targetOptionPool - input.currentOptionPool;
    const shuffleImpact = poolExpansion / (1 - investorOwnership);
    // Founders absorb this dilution pre-money
  }
  
  // New shares issued
  const pricePerShare = input.preMoneyValuation / currentShares;
  const newShares = input.raiseAmount / pricePerShare;
  
  // Runway bridge
  const additionalRunway = input.raiseAmount / input.monthlyBurn;
  
  return {
    postMoneyValuation: postMoney,
    investorOwnership,
    founderOwnershipPost: ...,
    newRunwayMonths: currentRunway + additionalRunway
  };
}
```

**Key Outputs:**

| Metric | Description |
|--------|-------------|
| Post-Money Valuation | Pre-money + Raise amount |
| Investor Ownership | Raise / Post-money |
| Price Per Share | Pre-money / Total shares |
| Option Pool Shuffle | Additional founder dilution |
| Runway Bridge | Months added from new capital |

---

## Deployment & Security

### Environment Variables

```env
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: Analytics
VITE_ANALYTICS_ID=G-XXXXXXXXXX

# Optional: Error Tracking
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Database Schema

```sql
-- Core financial snapshots
CREATE TABLE dna_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  
  snapshot_type TEXT NOT NULL, -- 'analysis' | 'simulation' | 'valuation' | 'tax_credit'
  grade TEXT,
  runway_months NUMERIC,
  monthly_burn NUMERIC,
  monthly_revenue NUMERIC,
  cash_on_hand NUMERIC,
  profit_margin NUMERIC,
  burn_multiple NUMERIC,
  revenue_growth NUMERIC,
  expense_growth NUMERIC,
  insight TEXT,
  revenue_trend JSONB,
  projection_data JSONB,
  scenario_params JSONB,
  metadata JSONB
);

-- Growth scenario persistence
CREATE TABLE growth_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  
  scenario_name TEXT NOT NULL,
  baseline_mrr NUMERIC NOT NULL,
  growth_rate NUMERIC NOT NULL,
  churn_rate NUMERIC NOT NULL,
  expansion_rate NUMERIC DEFAULT 0,
  contraction_rate NUMERIC DEFAULT 0,
  arpa NUMERIC,
  projection_months INTEGER DEFAULT 24,
  metadata JSONB
);

-- System health alerts
CREATE TABLE alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL, -- 'info' | 'warning' | 'critical'
  title TEXT NOT NULL,
  message TEXT,
  metric_name TEXT,
  metric_value NUMERIC,
  threshold_value NUMERIC,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  metadata JSONB
);
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE dna_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own snapshots" 
ON dna_snapshots FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snapshots" 
ON dna_snapshots FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own snapshots" 
ON dna_snapshots FOR DELETE 
USING (auth.uid() = user_id);

-- Repeat for growth_scenarios and alert_history
```

### Security Measures

| Layer | Implementation |
|-------|----------------|
| Authentication | Supabase Auth (Magic Link, OAuth) |
| Authorization | Row Level Security (RLS) |
| Data Encryption | TLS 1.3 in transit, AES-256 at rest |
| API Security | Anon key with RLS (no server secrets exposed) |
| Input Validation | TypeScript types + runtime validation |
| XSS Prevention | React's built-in escaping |
| CORS | Supabase managed origins |

---

## 2025 Product Hunt Launch Strategy

### SEO Metadata

```html
<title>Runway DNA | The AI-Powered Strategic Finance Suite for SaaS Founders</title>

<meta name="description" content="Don't just track your burn. Sequence your 
financial DNA. Real-time runway simulation, growth forecasting, and tax credit 
optimization in one high-status dashboard." />

<meta property="og:title" content="Runway DNA | The AI-Powered Strategic 
Finance Suite for SaaS Founders" />

<meta property="og:description" content="Don't just track your burn. Sequence 
your financial DNA. Real-time runway simulation, growth forecasting, and tax 
credit optimization in one high-status dashboard." />

<meta property="og:image" content="https://runwaydna.app/og-image.png" />
```

### Maker's Comment (Product Hunt)

> **Hey Product Hunt! 👋**
> 
> I built Runway DNA because I was tired of switching between 7 different spreadsheets just to answer one question: "How long do we have?"
> 
> **What makes this different:**
> 
> 🧬 **DNA Lab** – Upload your bank CSV and get an instant "financial genome" with runway grade (A/B/C/D/F)
> 
> 📊 **Runway Simulator** – See exactly how hiring that next engineer affects your runway. In real-time. With charts.
> 
> 💰 **Founder Toolkit** – SaaS valuation calculator, R&D tax credit estimator, fundraising dilution shaper. All the tools VCs use, now in your pocket.
> 
> **The tech:**
> - React + TypeScript + Vite (fast)
> - Framer Motion (smooth)
> - Deep Charcoal glassmorphism (beautiful)
> - Supabase PostgreSQL (persistent)
> 
> **100% free.** No credit card. No "premium tier" upsell.
> 
> I'd love your feedback on what features to add next. Thinking: AI-generated board deck slides? Integration with QuickBooks?
> 
> Happy to answer any questions! 🚀
> 
> — [Your Name], Founder

### Launch Checklist

- [ ] OG image showing Grade A dashboard (1200x630px)
- [ ] Demo video (60-90 seconds)
- [ ] First 5 comments prepared
- [ ] Hunter secured
- [ ] Launch time: Tuesday 12:01 AM PST
- [ ] Twitter thread drafted
- [ ] LinkedIn post drafted

---

## Technical Specifications

### Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | React | 18.3.1 |
| Language | TypeScript | 5.5.3 |
| Build Tool | Vite | 5.4.2 |
| Styling | Tailwind CSS | 3.4.1 |
| Animation | Framer Motion | 12.x |
| Charts | Recharts | 3.6.0 |
| State | Zustand | 5.0.9 |
| Database | Supabase | 2.57.4 |
| Icons | Lucide React | 0.344.0 |
| Routing | React Router | 7.11.0 |
| Toasts | Sonner | Latest |

### Performance Metrics (Target)

| Metric | Target | Actual |
|--------|--------|--------|
| Lighthouse Performance | >90 | TBD |
| First Contentful Paint | <1.0s | TBD |
| Largest Contentful Paint | <1.2s | TBD |
| Time to Interactive | <2.0s | TBD |
| Cumulative Layout Shift | <0.1 | TBD |

### Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### File Structure

```
src/
├── App.tsx                 # Root component + routing
├── main.tsx                # Entry point
├── index.css               # Global styles + Tailwind
│
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx   # Main layout wrapper
│   │   ├── FloatingSidebar.tsx
│   │   └── FloatingOrbs.tsx
│   └── ui/
│       ├── MotionCard.tsx
│       ├── OnboardingOverlay.tsx
│       ├── SuccessConfetti.tsx
│       └── SkeletonScreens.tsx
│
├── pages/
│   ├── DNALab.tsx          # CSV upload + analysis
│   ├── Simulator.tsx       # Runway projections
│   ├── HiringPlanner.tsx   # Team growth modeling
│   ├── GrowthTracker.tsx   # MRR forecasting
│   ├── Archive.tsx         # Snapshot history
│   └── Toolkit/
│       ├── Valuation.tsx   # SaaS valuation
│       ├── TaxCredit.tsx   # R&D credit estimator
│       └── Dilution.tsx    # Fundraising dilution
│
└── lib/
    ├── api.ts              # Supabase API layer
    ├── store.ts            # Zustand state
    ├── supabase.ts         # Client config
    ├── dna-processor.ts    # CSV parsing + grading
    ├── simulator-engine.ts # Core math engine
    └── services/
        ├── GrowthService.ts
        ├── BurnMonitor.ts
        ├── ValuationService.ts
        ├── TaxCreditService.ts
        └── DilutionService.ts
```

---

## Appendix: Design System

### Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| Deep Charcoal | `#0D0D0D` | Background |
| Charcoal 50 | `#1A1A1A` | Card backgrounds |
| Electric Cyan | `#00D4FF` | Primary accent |
| Cyan Glow | `#00E5FF` | Highlights |
| Vivid Violet | `#8B5CF6` | Secondary accent |
| Success Green | `#00FF88` | Positive metrics |
| Warning Yellow | `#FFB800` | Caution states |
| Danger Red | `#FF4757` | Critical alerts |

### Typography

- **Headlines:** Inter 700-800
- **Body:** Inter 400-500
- **Code/Numbers:** JetBrains Mono 500

### Component Patterns

- **Glass Cards:** `backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl`
- **Buttons:** Gradient backgrounds with hover glow
- **Inputs:** Minimal borders, focus ring with cyan glow

---

**Document prepared for Product Hunt 2025 Launch**  
**Runway DNA v1.0.0**  
**© 2025 All Rights Reserved**



