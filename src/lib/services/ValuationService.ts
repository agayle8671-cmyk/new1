/**
 * ValuationService.ts
 * 
 * SaaS Valuation Engine for Runway DNA Founder Toolkit.
 * Implements revenue multiple valuation with growth and churn adjustments.
 * 
 * Key Concepts:
 * - Revenue Multiple: Valuation = ARR × Multiple
 * - Rule of 40: Growth Rate + Profit Margin ≥ 40% = Premium multiple
 * - Churn Penalty: High churn (>3% monthly) reduces multiple
 * 
 * @author Runway DNA Team
 * @version 1.0.0
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * SaaS company stage for multiple benchmarking
 */
export type CompanyStage = 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'growth';

/**
 * Valuation input parameters
 */
export interface ValuationInput {
  /** Annual Recurring Revenue */
  arr: number;
  /** Monthly Recurring Revenue (optional, will calculate ARR if not provided) */
  mrr?: number;
  /** Year-over-Year growth rate (decimal: 0.50 = 50%) */
  yoyGrowthRate: number;
  /** Monthly churn rate (decimal: 0.03 = 3%) */
  monthlyChurnRate: number;
  /** Net Revenue Retention (decimal: 1.10 = 110%) */
  nrr?: number;
  /** Gross margin (decimal: 0.80 = 80%) */
  grossMargin?: number;
  /** Company stage for baseline multiple */
  stage?: CompanyStage;
  /** Profit margin for Rule of 40 (optional, uses 0 for pre-profit) */
  profitMargin?: number;
}

/**
 * Multiple adjustment breakdown
 */
export interface MultipleAdjustments {
  /** Base multiple for the stage */
  baseMultiple: number;
  /** Adjustment from Rule of 40 */
  ruleOf40Adjustment: number;
  /** Adjustment from churn penalty */
  churnPenalty: number;
  /** Adjustment from NRR bonus */
  nrrBonus: number;
  /** Adjustment from gross margin */
  grossMarginAdjustment: number;
  /** Final calculated multiple */
  finalMultiple: number;
}

/**
 * Complete valuation result
 */
export interface ValuationResult {
  /** Input parameters used */
  input: ValuationInput;
  /** ARR used in calculation */
  arr: number;
  /** Multiple breakdown */
  multiples: MultipleAdjustments;
  /** Final valuation */
  valuation: number;
  /** Valuation range (low/high) */
  valuationRange: {
    low: number;
    mid: number;
    high: number;
  };
  /** Rule of 40 score */
  ruleOf40Score: number;
  /** Whether company passes Rule of 40 */
  passesRuleOf40: boolean;
  /** Valuation per $1 of MRR */
  valuationPerMRR: number;
  /** Key insights */
  insights: string[];
}

/**
 * Exit scenario result
 */
export interface ExitScenario {
  /** Target MRR */
  targetMRR: number;
  /** Target ARR */
  targetARR: number;
  /** Projected valuation at target */
  projectedValuation: number;
  /** Multiple used */
  multiple: number;
  /** Months to reach target (at current growth) */
  monthsToTarget: number;
  /** Valuation increase from current */
  valuationIncrease: number;
  /** Percentage increase */
  percentageIncrease: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Base multiples by company stage (2024 SaaS benchmarks) */
const STAGE_MULTIPLES: Record<CompanyStage, { low: number; mid: number; high: number }> = {
  'pre-seed': { low: 3, mid: 5, high: 8 },
  'seed': { low: 5, mid: 8, high: 12 },
  'series-a': { low: 8, mid: 12, high: 18 },
  'series-b': { low: 10, mid: 15, high: 25 },
  'growth': { low: 12, mid: 20, high: 35 },
};

/** Churn thresholds for penalty calculation */
const CHURN_THRESHOLDS = {
  EXCELLENT: 0.02,  // < 2% = No penalty
  ACCEPTABLE: 0.03, // 2-3% = Small penalty
  WARNING: 0.05,    // 3-5% = Medium penalty
  CRITICAL: 0.08,   // > 5% = Large penalty
} as const;

/** Rule of 40 threshold */
const RULE_OF_40_THRESHOLD = 0.40;

/** NRR thresholds for bonus */
const NRR_THRESHOLDS = {
  EXCELLENT: 1.20,  // > 120% = Large bonus
  GOOD: 1.10,       // 110-120% = Medium bonus
  HEALTHY: 1.00,    // 100-110% = Small bonus
} as const;

// ============================================================================
// CORE VALUATION ENGINE
// ============================================================================

/**
 * Calculate the base multiple for a company stage
 */
export function getBaseMultiple(stage: CompanyStage = 'seed'): number {
  return STAGE_MULTIPLES[stage].mid;
}

/**
 * Calculate Rule of 40 score
 * Rule of 40: Growth Rate + Profit Margin ≥ 40%
 * 
 * @param yoyGrowthRate - Year-over-Year growth rate (decimal)
 * @param profitMargin - Profit margin (decimal), defaults to 0 for pre-profit
 * @returns Rule of 40 score as decimal
 */
export function calculateRuleOf40(yoyGrowthRate: number, profitMargin: number = 0): number {
  return yoyGrowthRate + profitMargin;
}

/**
 * Calculate multiple adjustment based on Rule of 40
 * 
 * @param ruleOf40Score - Combined growth + profit margin
 * @returns Multiple adjustment (can be positive or negative)
 */
export function getRuleOf40Adjustment(ruleOf40Score: number): number {
  if (ruleOf40Score >= 0.60) return 4;   // 60%+ = Exceptional
  if (ruleOf40Score >= 0.50) return 3;   // 50-60% = Excellent
  if (ruleOf40Score >= 0.40) return 2;   // 40-50% = Passes Rule of 40
  if (ruleOf40Score >= 0.30) return 0;   // 30-40% = Neutral
  if (ruleOf40Score >= 0.20) return -1;  // 20-30% = Below average
  return -2;                              // < 20% = Significant penalty
}

/**
 * Calculate churn penalty on multiple
 * 
 * @param monthlyChurnRate - Monthly churn rate (decimal)
 * @returns Penalty to subtract from multiple (always negative or 0)
 */
export function getChurnPenalty(monthlyChurnRate: number): number {
  if (monthlyChurnRate <= CHURN_THRESHOLDS.EXCELLENT) return 0;
  if (monthlyChurnRate <= CHURN_THRESHOLDS.ACCEPTABLE) return -0.5;
  if (monthlyChurnRate <= CHURN_THRESHOLDS.WARNING) return -1.5;
  if (monthlyChurnRate <= CHURN_THRESHOLDS.CRITICAL) return -3;
  return -5; // > 8% monthly churn is severe
}

/**
 * Calculate NRR bonus on multiple
 * 
 * @param nrr - Net Revenue Retention (decimal)
 * @returns Bonus to add to multiple
 */
export function getNRRBonus(nrr: number = 1.0): number {
  if (nrr >= NRR_THRESHOLDS.EXCELLENT) return 3;
  if (nrr >= NRR_THRESHOLDS.GOOD) return 2;
  if (nrr >= NRR_THRESHOLDS.HEALTHY) return 1;
  if (nrr >= 0.90) return 0;
  return -1; // NRR < 90% is a red flag
}

/**
 * Calculate gross margin adjustment
 * 
 * @param grossMargin - Gross margin (decimal)
 * @returns Adjustment to multiple
 */
export function getGrossMarginAdjustment(grossMargin: number = 0.75): number {
  if (grossMargin >= 0.85) return 1;   // Best-in-class SaaS margins
  if (grossMargin >= 0.75) return 0.5; // Healthy SaaS margins
  if (grossMargin >= 0.65) return 0;   // Acceptable
  if (grossMargin >= 0.50) return -1;  // Below average
  return -2; // Low margins
}

/**
 * Calculate complete multiple breakdown
 */
export function calculateMultiples(input: ValuationInput): MultipleAdjustments {
  const stage = input.stage || 'seed';
  const baseMultiple = getBaseMultiple(stage);
  
  const ruleOf40Score = calculateRuleOf40(input.yoyGrowthRate, input.profitMargin || 0);
  const ruleOf40Adjustment = getRuleOf40Adjustment(ruleOf40Score);
  const churnPenalty = getChurnPenalty(input.monthlyChurnRate);
  const nrrBonus = getNRRBonus(input.nrr);
  const grossMarginAdjustment = getGrossMarginAdjustment(input.grossMargin);
  
  const finalMultiple = Math.max(
    1, // Minimum 1x multiple
    baseMultiple + ruleOf40Adjustment + churnPenalty + nrrBonus + grossMarginAdjustment
  );
  
  return {
    baseMultiple,
    ruleOf40Adjustment,
    churnPenalty,
    nrrBonus,
    grossMarginAdjustment,
    finalMultiple,
  };
}

/**
 * Generate valuation insights based on metrics
 */
function generateInsights(input: ValuationInput, multiples: MultipleAdjustments, ruleOf40Score: number): string[] {
  const insights: string[] = [];
  
  // Rule of 40 insight
  if (ruleOf40Score >= RULE_OF_40_THRESHOLD) {
    insights.push(`✓ Passes Rule of 40 (${(ruleOf40Score * 100).toFixed(0)}%) - commands premium valuation`);
  } else {
    const gap = (RULE_OF_40_THRESHOLD - ruleOf40Score) * 100;
    insights.push(`⚠ ${gap.toFixed(0)}% below Rule of 40 threshold - focus on growth or profitability`);
  }
  
  // Churn insight
  if (input.monthlyChurnRate > CHURN_THRESHOLDS.ACCEPTABLE) {
    const annualChurn = 1 - Math.pow(1 - input.monthlyChurnRate, 12);
    insights.push(`⚠ High churn (${(annualChurn * 100).toFixed(0)}% annually) reduces valuation by ${Math.abs(multiples.churnPenalty).toFixed(1)}x`);
  } else {
    insights.push(`✓ Strong retention - churn is below industry average`);
  }
  
  // NRR insight
  if (input.nrr && input.nrr >= NRR_THRESHOLDS.GOOD) {
    insights.push(`✓ Excellent NRR (${(input.nrr * 100).toFixed(0)}%) - expansion revenue driving growth`);
  } else if (input.nrr && input.nrr < 1.0) {
    insights.push(`⚠ NRR below 100% - existing customers are shrinking`);
  }
  
  // Multiple insight
  if (multiples.finalMultiple >= 15) {
    insights.push(`🚀 Premium ${multiples.finalMultiple.toFixed(1)}x multiple - top quartile for stage`);
  } else if (multiples.finalMultiple >= 10) {
    insights.push(`📈 Healthy ${multiples.finalMultiple.toFixed(1)}x multiple - above median`);
  } else {
    insights.push(`📊 ${multiples.finalMultiple.toFixed(1)}x multiple - room for improvement`);
  }
  
  return insights;
}

// ============================================================================
// MAIN VALUATION FUNCTION
// ============================================================================

/**
 * Calculate complete SaaS valuation
 * 
 * @param input - Valuation input parameters
 * @returns Complete valuation result with breakdown
 */
export function calculateValuation(input: ValuationInput): ValuationResult {
  // Calculate ARR from MRR if not provided
  const arr = input.arr || (input.mrr ? input.mrr * 12 : 0);
  
  // Calculate multiples
  const multiples = calculateMultiples(input);
  
  // Calculate Rule of 40 score
  const ruleOf40Score = calculateRuleOf40(input.yoyGrowthRate, input.profitMargin || 0);
  const passesRuleOf40 = ruleOf40Score >= RULE_OF_40_THRESHOLD;
  
  // Calculate valuation
  const valuation = arr * multiples.finalMultiple;
  
  // Calculate valuation range (using stage multiples)
  const stage = input.stage || 'seed';
  const stageMultiples = STAGE_MULTIPLES[stage];
  const valuationRange = {
    low: arr * (stageMultiples.low + multiples.ruleOf40Adjustment + multiples.churnPenalty),
    mid: valuation,
    high: arr * (stageMultiples.high + multiples.ruleOf40Adjustment + multiples.nrrBonus),
  };
  
  // Generate insights
  const insights = generateInsights(input, multiples, ruleOf40Score);
  
  return {
    input: { ...input, arr },
    arr,
    multiples,
    valuation,
    valuationRange: {
      low: Math.max(0, valuationRange.low),
      mid: valuationRange.mid,
      high: valuationRange.high,
    },
    ruleOf40Score,
    passesRuleOf40,
    valuationPerMRR: arr > 0 ? valuation / (arr / 12) : 0,
    insights,
  };
}

// ============================================================================
// EXIT SIMULATOR
// ============================================================================

/**
 * Calculate exit scenario for a target MRR
 * 
 * @param currentMRR - Current MRR
 * @param targetMRR - Target MRR for exit
 * @param currentValuation - Current valuation result
 * @param monthlyGrowthRate - Monthly growth rate (decimal)
 * @returns Exit scenario projection
 */
export function calculateExitScenario(
  currentMRR: number,
  targetMRR: number,
  currentValuation: ValuationResult,
  monthlyGrowthRate: number = 0.05
): ExitScenario {
  const targetARR = targetMRR * 12;
  
  // Calculate months to target using compound growth
  const monthsToTarget = monthlyGrowthRate > 0
    ? Math.ceil(Math.log(targetMRR / currentMRR) / Math.log(1 + monthlyGrowthRate))
    : Infinity;
  
  // At higher ARR, companies often command better multiples
  // Apply a scaling factor based on ARR growth
  const arrGrowthFactor = targetARR / currentValuation.arr;
  const multipleBoost = arrGrowthFactor >= 3 ? 2 : arrGrowthFactor >= 2 ? 1 : 0;
  const exitMultiple = currentValuation.multiples.finalMultiple + multipleBoost;
  
  // Calculate projected valuation
  const projectedValuation = targetARR * exitMultiple;
  
  // Calculate increase
  const valuationIncrease = projectedValuation - currentValuation.valuation;
  const percentageIncrease = currentValuation.valuation > 0
    ? (valuationIncrease / currentValuation.valuation) * 100
    : 0;
  
  return {
    targetMRR,
    targetARR,
    projectedValuation,
    multiple: exitMultiple,
    monthsToTarget: isFinite(monthsToTarget) ? monthsToTarget : -1,
    valuationIncrease,
    percentageIncrease,
  };
}

/**
 * Generate multiple exit scenarios at different MRR targets
 */
export function generateExitScenarios(
  currentMRR: number,
  currentValuation: ValuationResult,
  monthlyGrowthRate: number = 0.05
): ExitScenario[] {
  // Generate scenarios at 1.5x, 2x, 3x, 5x, 10x current MRR
  const multipliers = [1.5, 2, 3, 5, 10];
  
  return multipliers.map(multiplier => 
    calculateExitScenario(
      currentMRR,
      currentMRR * multiplier,
      currentValuation,
      monthlyGrowthRate
    )
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format valuation for display
 */
export function formatValuation(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

/**
 * Format multiple for display
 */
export function formatMultiple(multiple: number): string {
  return `${multiple.toFixed(1)}x`;
}

/**
 * Get stage label
 */
export function getStageLabel(stage: CompanyStage): string {
  const labels: Record<CompanyStage, string> = {
    'pre-seed': 'Pre-Seed',
    'seed': 'Seed',
    'series-a': 'Series A',
    'series-b': 'Series B',
    'growth': 'Growth Stage',
  };
  return labels[stage];
}

/**
 * Estimate company stage from ARR
 */
export function estimateStageFromARR(arr: number): CompanyStage {
  if (arr < 100_000) return 'pre-seed';
  if (arr < 1_000_000) return 'seed';
  if (arr < 5_000_000) return 'series-a';
  if (arr < 20_000_000) return 'series-b';
  return 'growth';
}

// ============================================================================
// EXPORT DEFAULT SERVICE OBJECT
// ============================================================================

const ValuationService = {
  // Core functions
  calculateValuation,
  calculateMultiples,
  calculateRuleOf40,
  
  // Adjustments
  getBaseMultiple,
  getRuleOf40Adjustment,
  getChurnPenalty,
  getNRRBonus,
  getGrossMarginAdjustment,
  
  // Exit simulator
  calculateExitScenario,
  generateExitScenarios,
  
  // Utilities
  formatValuation,
  formatMultiple,
  getStageLabel,
  estimateStageFromARR,
  
  // Constants
  STAGE_MULTIPLES,
  CHURN_THRESHOLDS,
  RULE_OF_40_THRESHOLD,
};

export default ValuationService;






