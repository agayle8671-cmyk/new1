/**
 * GrowthService.ts
 * 
 * Source of truth for all top-line revenue math in Runway DNA.
 * Implements SaaS MRR Engine with scenario-based forecasting.
 * 
 * @author Runway DNA Team
 * @version 1.0.0
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Growth scenario parameters for revenue forecasting
 */
export interface GrowthScenario {
  /** Unique identifier for the scenario */
  id: string;
  /** Display label */
  label: string;
  /** Monthly revenue growth rate (decimal: 0.08 = 8%) */
  monthlyGrowthRate: number;
  /** Monthly churn rate (decimal: 0.03 = 3%) */
  churnRate: number;
  /** Monthly expansion rate from existing customers (decimal: 0.02 = 2%) */
  expansionRate: number;
  /** Monthly contraction rate from downgrades (decimal: 0.01 = 1%) */
  contractionRate: number;
  /** Optional: multiplier for conservative/optimistic modeling */
  modifier?: number;
}

/**
 * Input parameters for MRR calculations
 */
export interface MRRInput {
  /** Current Monthly Recurring Revenue */
  currentMRR: number;
  /** Average Revenue Per Account */
  arpa: number;
  /** Number of new customers acquired per month */
  newCustomersPerMonth: number;
}

/**
 * Single month's MRR breakdown
 */
export interface MRRBreakdown {
  /** Month index (0-based) */
  monthIndex: number;
  /** Month label (e.g., "Jan Y1") */
  month: string;
  /** Starting MRR for this month */
  startingMRR: number;
  /** MRR from new customers */
  newMRR: number;
  /** MRR from expansion/upsells */
  expansionMRR: number;
  /** MRR lost to churn (cancellations) */
  churnMRR: number;
  /** MRR lost to contraction (downgrades) */
  contractionMRR: number;
  /** Net change in MRR */
  netNewMRR: number;
  /** Ending MRR for this month */
  endingMRR: number;
  /** Annualized Recurring Revenue */
  arr: number;
}

/**
 * Complete projection result
 */
export interface GrowthProjection {
  /** Scenario used for this projection */
  scenario: GrowthScenario;
  /** Monthly breakdown array */
  breakdown: MRRBreakdown[];
  /** Summary metrics */
  summary: GrowthSummary;
}

/**
 * Summary metrics for a projection
 */
export interface GrowthSummary {
  /** Starting MRR */
  startingMRR: number;
  /** MRR at month 12 */
  mrr12: number;
  /** MRR at month 24 */
  mrr24: number;
  /** ARR at month 12 */
  arr12: number;
  /** ARR at month 24 */
  arr24: number;
  /** CAGR over 1 year */
  cagr1Y: number;
  /** CAGR over 2 years */
  cagr2Y: number;
  /** Net Revenue Retention rate */
  nrr: number;
  /** Total MRR gained over projection period */
  totalGrowth: number;
  /** Total MRR lost to churn over projection period */
  totalChurn: number;
  /** Total MRR lost to contraction over projection period */
  totalContraction: number;
  /** Month index when target ARR is reached (-1 if never) */
  monthsToTarget: number;
}

/**
 * Multi-scenario comparison result
 */
export interface ScenarioComparison {
  conservative: GrowthProjection;
  base: GrowthProjection;
  optimistic: GrowthProjection;
  /** Delta between optimistic and conservative at month 24 */
  spreadAt24: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Default growth scenarios
 */
export const DEFAULT_SCENARIOS: Record<'conservative' | 'base' | 'optimistic', GrowthScenario> = {
  conservative: {
    id: 'conservative',
    label: 'Conservative',
    monthlyGrowthRate: 0.05,
    churnRate: 0.04,
    expansionRate: 0.01,
    contractionRate: 0.02, // Higher contraction in conservative
    modifier: 0.7,
  },
  base: {
    id: 'base',
    label: 'Base Case',
    monthlyGrowthRate: 0.08,
    churnRate: 0.03,
    expansionRate: 0.02,
    contractionRate: 0.01, // Moderate contraction
    modifier: 1.0,
  },
  optimistic: {
    id: 'optimistic',
    label: 'Optimistic',
    monthlyGrowthRate: 0.12,
    churnRate: 0.02,
    expansionRate: 0.03,
    contractionRate: 0.005, // Low contraction in optimistic
    modifier: 1.4,
  },
};

// ============================================================================
// CORE CALCULATION ENGINE
// ============================================================================

/**
 * Calculate Next Month MRR using full SaaS Waterfall formula:
 * EndingMRR = StartingMRR + NewMRR + ExpansionMRR - ChurnMRR - ContractionMRR
 * 
 * @param currentMRR - Current month's MRR (starting)
 * @param newMRR - MRR from new customers
 * @param expansionMRR - MRR from expansion/upsells
 * @param churnMRR - MRR lost to churn (cancellations)
 * @param contractionMRR - MRR lost to contraction (downgrades)
 * @returns Next month's ending MRR
 */
export function calculateNextMonthMRR(
  currentMRR: number,
  newMRR: number,
  expansionMRR: number,
  churnMRR: number,
  contractionMRR: number = 0
): number {
  return Math.max(0, currentMRR + newMRR + expansionMRR - churnMRR - contractionMRR);
}

/**
 * MRR Waterfall components returned by calculateMRRComponents
 */
export interface MRRWaterfallComponents {
  newMRR: number;
  expansionMRR: number;
  churnMRR: number;
  contractionMRR: number;
}

/**
 * Calculate MRR components for a single month
 * 
 * @param mrr - Current MRR
 * @param input - MRR input parameters
 * @param scenario - Growth scenario parameters
 * @returns Object with newMRR, expansionMRR, churnMRR, contractionMRR
 */
export function calculateMRRComponents(
  mrr: number,
  input: MRRInput,
  scenario: GrowthScenario
): MRRWaterfallComponents {
  const newMRR = input.newCustomersPerMonth * input.arpa;
  const expansionMRR = mrr * scenario.expansionRate;
  const churnMRR = mrr * scenario.churnRate;
  const contractionMRR = mrr * (scenario.contractionRate || 0);

  return { newMRR, expansionMRR, churnMRR, contractionMRR };
}

/**
 * Apply compound monthly growth to MRR
 * 
 * @param mrr - Current MRR
 * @param monthlyGrowthRate - Monthly growth rate (decimal)
 * @returns MRR with growth applied
 */
export function applyMonthlyGrowth(mrr: number, monthlyGrowthRate: number): number {
  // Convert annual-equivalent growth to true monthly compound
  return mrr * (1 + monthlyGrowthRate / 12);
}

/**
 * Calculate CAGR (Compound Annual Growth Rate)
 * Formula: CAGR = (EndValue / StartValue)^(1/years) - 1
 * 
 * @param startValue - Starting value
 * @param endValue - Ending value
 * @param years - Number of years
 * @returns CAGR as decimal (0.25 = 25%)
 */
export function calculateCAGR(startValue: number, endValue: number, years: number): number {
  if (startValue <= 0 || years <= 0) return 0;
  if (endValue <= 0) return -1; // 100% decline
  return Math.pow(endValue / startValue, 1 / years) - 1;
}

/**
 * Calculate Net Revenue Retention (NRR)
 * Formula: NRR = (Starting MRR + Expansion - Churn - Contraction) / Starting MRR
 * Simplified: NRR = 1 + expansionRate - churnRate - contractionRate
 * 
 * @param expansionRate - Monthly expansion rate (decimal)
 * @param churnRate - Monthly churn rate (decimal)
 * @param contractionRate - Monthly contraction rate (decimal)
 * @returns NRR as decimal (1.05 = 105%)
 */
export function calculateNRR(
  expansionRate: number, 
  churnRate: number,
  contractionRate: number = 0
): number {
  return 1 + expansionRate - churnRate - contractionRate;
}

/**
 * Calculate annualized churn from monthly rate
 * Formula: AnnualChurn = 1 - (1 - monthlyChurn)^12
 * 
 * @param monthlyChurnRate - Monthly churn rate (decimal)
 * @returns Annual churn rate (decimal)
 */
export function calculateAnnualChurn(monthlyChurnRate: number): number {
  return 1 - Math.pow(1 - monthlyChurnRate, 12);
}

// ============================================================================
// PROJECTION ENGINE
// ============================================================================

/**
 * MRR Trajectory result from calculateMRRTrajectory
 */
export interface MRRTrajectoryResult {
  /** Monthly breakdown of the MRR waterfall */
  months: MRRBreakdown[];
  /** Final ending MRR */
  endingMRR: number;
  /** Final ARR (MRR * 12) */
  endingARR: number;
  /** CAGR over the projection period */
  cagr: number;
  /** Net Revenue Retention */
  nrr: number;
}

/**
 * Calculate MRR Trajectory using the full SaaS Waterfall:
 * EndingMRR = StartingMRR + New + Expansion - Churn - Contraction
 * 
 * This is the primary function for MRR forecasting, providing both
 * month-by-month breakdown and a 24-month projection helper.
 * 
 * @param params - Trajectory parameters
 * @returns Complete MRR trajectory with monthly breakdown and summary
 */
export function calculateMRRTrajectory(params: {
  startingMRR: number;
  arpa: number;
  newCustomersPerMonth: number;
  monthlyGrowthRate: number;
  churnRate: number;
  expansionRate: number;
  contractionRate: number;
  months?: number;
}): MRRTrajectoryResult {
  const {
    startingMRR,
    arpa,
    newCustomersPerMonth,
    monthlyGrowthRate,
    churnRate,
    expansionRate,
    contractionRate,
    months = 24,
  } = params;

  // Create MRRInput and GrowthScenario for the projection
  const input: MRRInput = {
    currentMRR: startingMRR,
    arpa,
    newCustomersPerMonth,
  };

  const scenario: GrowthScenario = {
    id: 'custom-trajectory',
    label: 'Custom Trajectory',
    monthlyGrowthRate,
    churnRate,
    expansionRate,
    contractionRate,
    modifier: 1.0,
  };

  // Run the full projection
  const projection = generateProjection(input, scenario, months);

  return {
    months: projection.breakdown,
    endingMRR: projection.summary.mrr24,
    endingARR: projection.summary.arr24,
    cagr: projection.summary.cagr2Y,
    nrr: projection.summary.nrr,
  };
}

/**
 * Generate a complete MRR projection for a given scenario
 * 
 * @param input - MRR input parameters
 * @param scenario - Growth scenario parameters
 * @param months - Number of months to project (default: 24)
 * @param targetARR - Target ARR to track (optional)
 * @returns Complete growth projection
 */
export function generateProjection(
  input: MRRInput,
  scenario: GrowthScenario,
  months: number = 24,
  targetARR?: number
): GrowthProjection {
  const breakdown: MRRBreakdown[] = [];
  let mrr = input.currentMRR;
  let totalGrowth = 0;
  let totalChurn = 0;
  let totalContraction = 0;
  let monthsToTarget = -1;

  const startMonth = new Date().getMonth();

  for (let i = 0; i < months; i++) {
    const startingMRR = mrr;

    // Calculate MRR Waterfall components (New + Expansion - Churn - Contraction)
    const { newMRR, expansionMRR, churnMRR, contractionMRR } = calculateMRRComponents(mrr, input, scenario);

    // Calculate next month's MRR using the full SaaS Waterfall formula
    mrr = calculateNextMonthMRR(mrr, newMRR, expansionMRR, churnMRR, contractionMRR);

    // Apply compound growth
    mrr = applyMonthlyGrowth(mrr, scenario.monthlyGrowthRate);

    const netNewMRR = mrr - startingMRR;

    // Track totals
    totalGrowth += newMRR + expansionMRR;
    totalChurn += churnMRR;
    totalContraction += contractionMRR;

    // Check target
    if (targetARR && monthsToTarget === -1 && mrr * 12 >= targetARR) {
      monthsToTarget = i + 1;
    }

    // Generate month label
    const monthName = MONTH_LABELS[(startMonth + i) % 12];
    const year = Math.floor((startMonth + i) / 12);

    breakdown.push({
      monthIndex: i,
      month: year > 0 ? `${monthName} Y${year + 1}` : monthName,
      startingMRR,
      newMRR,
      expansionMRR,
      churnMRR,
      contractionMRR,
      netNewMRR,
      endingMRR: mrr,
      arr: mrr * 12,
    });
  }

  // Calculate summary metrics
  const mrr12 = breakdown[11]?.endingMRR || mrr;
  const mrr24 = breakdown[23]?.endingMRR || mrr;
  const arr12 = mrr12 * 12;
  const arr24 = mrr24 * 12;
  const startingARR = input.currentMRR * 12;

  const summary: GrowthSummary = {
    startingMRR: input.currentMRR,
    mrr12,
    mrr24,
    arr12,
    arr24,
    cagr1Y: calculateCAGR(startingARR, arr12, 1),
    cagr2Y: calculateCAGR(startingARR, arr24, 2),
    nrr: calculateNRR(scenario.expansionRate, scenario.churnRate, scenario.contractionRate),
    totalGrowth,
    totalChurn,
    totalContraction,
    monthsToTarget,
  };

  return { scenario, breakdown, summary };
}

/**
 * Generate projections for all three scenarios (Conservative, Base, Optimistic)
 * 
 * @param input - MRR input parameters
 * @param customScenarios - Optional custom scenarios (uses defaults if not provided)
 * @param months - Number of months to project
 * @param targetARR - Target ARR to track
 * @returns Comparison of all three scenarios
 */
export function generateScenarioComparison(
  input: MRRInput,
  customScenarios?: Partial<typeof DEFAULT_SCENARIOS>,
  months: number = 24,
  targetARR?: number
): ScenarioComparison {
  const scenarios = { ...DEFAULT_SCENARIOS, ...customScenarios };

  const conservative = generateProjection(input, scenarios.conservative, months, targetARR);
  const base = generateProjection(input, scenarios.base, months, targetARR);
  const optimistic = generateProjection(input, scenarios.optimistic, months, targetARR);

  const spreadAt24 = optimistic.summary.arr24 - conservative.summary.arr24;

  return { conservative, base, optimistic, spreadAt24 };
}

/**
 * Create a custom scenario from base with modifiers
 * 
 * @param base - Base scenario to modify
 * @param overrides - Properties to override
 * @returns New scenario with overrides applied
 */
export function createCustomScenario(
  base: GrowthScenario,
  overrides: Partial<GrowthScenario>
): GrowthScenario {
  return {
    ...base,
    ...overrides,
    id: overrides.id || `${base.id}-custom`,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format MRR/ARR for display
 * 
 * @param value - Value to format
 * @param compact - Use compact notation (e.g., $1.2M)
 * @returns Formatted string
 */
export function formatRevenue(value: number, compact: boolean = false): string {
  if (compact) {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage for display
 * 
 * @param value - Value as decimal (0.08 = 8%)
 * @param decimals - Number of decimal places
 * @returns Formatted string (e.g., "8.0%")
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Calculate the required growth rate to hit a target ARR
 * 
 * @param currentMRR - Current MRR
 * @param targetARR - Target ARR
 * @param months - Months to reach target
 * @returns Required monthly growth rate (decimal)
 */
export function calculateRequiredGrowthRate(
  currentMRR: number,
  targetARR: number,
  months: number
): number {
  if (currentMRR <= 0 || months <= 0) return 0;
  const targetMRR = targetARR / 12;
  // Monthly growth rate needed: targetMRR = currentMRR * (1 + r)^months
  // r = (targetMRR / currentMRR)^(1/months) - 1
  return Math.pow(targetMRR / currentMRR, 1 / months) - 1;
}

/**
 * Merge projection data for chart display
 * 
 * @param comparison - Scenario comparison result
 * @returns Array suitable for Recharts
 */
export function mergeProjectionsForChart(
  comparison: ScenarioComparison
): Array<{
  month: string;
  conservative: number;
  base: number;
  optimistic: number;
  conservativeARR: number;
  baseARR: number;
  optimisticARR: number;
}> {
  return comparison.base.breakdown.map((point, i) => ({
    month: point.month,
    conservative: comparison.conservative.breakdown[i]?.endingMRR || 0,
    base: point.endingMRR,
    optimistic: comparison.optimistic.breakdown[i]?.endingMRR || 0,
    conservativeARR: (comparison.conservative.breakdown[i]?.endingMRR || 0) * 12,
    baseARR: point.arr,
    optimisticARR: (comparison.optimistic.breakdown[i]?.endingMRR || 0) * 12,
  }));
}

// ============================================================================
// EXPORT DEFAULT SERVICE OBJECT
// ============================================================================

const GrowthService = {
  // Core calculations
  calculateNextMonthMRR,
  calculateMRRComponents,
  applyMonthlyGrowth,
  calculateCAGR,
  calculateNRR,
  calculateAnnualChurn,

  // Projection engine
  calculateMRRTrajectory,
  generateProjection,
  generateScenarioComparison,
  createCustomScenario,

  // Utilities
  formatRevenue,
  formatPercent,
  calculateRequiredGrowthRate,
  mergeProjectionsForChart,

  // Constants
  DEFAULT_SCENARIOS,
};

export default GrowthService;

