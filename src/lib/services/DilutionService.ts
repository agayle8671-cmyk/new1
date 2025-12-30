/**
 * DilutionService.ts
 * 
 * Fundraising Dilution Shaper for Runway DNA Founder Toolkit.
 * Implements equity math, option pool shuffle, and stakeholder impact calculations.
 * 
 * Key Concepts:
 * - Pre-Money vs Post-Money Valuation
 * - Option Pool Shuffle (investor-friendly vs founder-friendly)
 * - Dilution = Raise Amount / Post-Money Valuation
 * 
 * @author Runway DNA Team
 * @version 1.0.0
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Stakeholder types
 */
export type StakeholderType = 'founder' | 'investor' | 'employee' | 'option_pool';

/**
 * Individual stakeholder
 */
export interface Stakeholder {
  /** Unique identifier */
  id: string;
  /** Stakeholder name */
  name: string;
  /** Type of stakeholder */
  type: StakeholderType;
  /** Current shares owned */
  shares: number;
  /** Current ownership percentage */
  ownershipPercent: number;
}

/**
 * Cap table state
 */
export interface CapTable {
  /** Total shares outstanding */
  totalShares: number;
  /** List of stakeholders */
  stakeholders: Stakeholder[];
  /** Current option pool size (percentage) */
  optionPoolPercent: number;
  /** Option pool shares available */
  optionPoolShares: number;
}

/**
 * Funding round parameters
 */
export interface FundingRoundInput {
  /** Name of the round */
  roundName: string;
  /** Target raise amount */
  raiseAmount: number;
  /** Pre-money valuation */
  preMoneyValuation: number;
  /** Required option pool percentage post-money */
  targetOptionPoolPercent: number;
  /** Whether to apply option pool shuffle (investor-friendly) */
  applyOptionPoolShuffle: boolean;
  /** Lead investor name */
  leadInvestor?: string;
  /** Current monthly burn rate (for runway calculation) */
  monthlyBurn?: number;
  /** Current cash on hand (for runway calculation) */
  currentCash?: number;
}

/**
 * Dilution result for a single stakeholder
 */
export interface StakeholderDilution {
  /** Stakeholder info */
  stakeholder: Stakeholder;
  /** Ownership before round */
  preRoundOwnership: number;
  /** Ownership after round */
  postRoundOwnership: number;
  /** Absolute dilution (percentage points lost) */
  absoluteDilution: number;
  /** Relative dilution (percentage of ownership lost) */
  relativeDilution: number;
  /** New share count */
  newShares: number;
}

/**
 * Complete funding round result
 */
export interface FundingRoundResult {
  /** Input parameters */
  input: FundingRoundInput;
  /** Pre-money valuation */
  preMoneyValuation: number;
  /** Post-money valuation */
  postMoneyValuation: number;
  /** Price per share */
  pricePerShare: number;
  /** New shares issued to investors */
  newInvestorShares: number;
  /** New shares for expanded option pool */
  newOptionPoolShares: number;
  /** Total new shares issued */
  totalNewShares: number;
  /** Total shares after round */
  totalSharesPostRound: number;
  /** Investor ownership percentage */
  investorOwnership: number;
  /** Option pool percentage post-round */
  optionPoolOwnership: number;
  /** Founder dilution impact */
  founderDilution: StakeholderDilution[];
  /** All stakeholder impacts */
  allStakeholderImpacts: StakeholderDilution[];
  /** Option pool shuffle impact (extra dilution from pool expansion) */
  optionPoolShuffleImpact: number;
  /** Runway bridge metrics */
  runwayBridge: {
    currentRunwayMonths: number;
    additionalRunwayMonths: number;
    newTotalRunwayMonths: number;
    cashAfterRaise: number;
  };
  /** Summary insights */
  insights: string[];
}

/**
 * Comparison between multiple scenarios
 */
export interface ScenarioComparison {
  scenarios: FundingRoundResult[];
  bestForFounders: string;
  recommendation: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Common option pool sizes */
export const OPTION_POOL_SIZES = {
  SMALL: 0.10,   // 10% - typical for later stages
  MEDIUM: 0.15,  // 15% - typical for Series A
  LARGE: 0.20,   // 20% - typical for early stage
} as const;

/** Default cap table for new company */
export const DEFAULT_CAP_TABLE: CapTable = {
  totalShares: 10_000_000,
  stakeholders: [
    { id: 'founder-1', name: 'Founder 1', type: 'founder', shares: 4_000_000, ownershipPercent: 40 },
    { id: 'founder-2', name: 'Founder 2', type: 'founder', shares: 3_000_000, ownershipPercent: 30 },
    { id: 'seed-investors', name: 'Seed Investors', type: 'investor', shares: 2_000_000, ownershipPercent: 20 },
  ],
  optionPoolPercent: 10,
  optionPoolShares: 1_000_000,
};

// ============================================================================
// CORE DILUTION ENGINE
// ============================================================================

/**
 * Calculate basic dilution from a funding round
 * 
 * @param raiseAmount - Amount being raised
 * @param preMoneyValuation - Pre-money valuation
 * @returns Investor ownership percentage
 */
export function calculateBasicDilution(raiseAmount: number, preMoneyValuation: number): number {
  const postMoneyValuation = preMoneyValuation + raiseAmount;
  return raiseAmount / postMoneyValuation;
}

/**
 * Calculate post-money valuation
 */
export function calculatePostMoneyValuation(preMoneyValuation: number, raiseAmount: number): number {
  return preMoneyValuation + raiseAmount;
}

/**
 * Calculate price per share
 */
export function calculatePricePerShare(preMoneyValuation: number, totalShares: number): number {
  return preMoneyValuation / totalShares;
}

/**
 * Calculate shares to issue for investment
 */
export function calculateNewShares(raiseAmount: number, pricePerShare: number): number {
  return Math.round(raiseAmount / pricePerShare);
}

/**
 * Calculate option pool shuffle impact
 * 
 * The "option pool shuffle" means expanding the option pool pre-money,
 * which dilutes existing shareholders before the new investor comes in.
 * This is investor-friendly as it preserves their ownership percentage.
 * 
 * @param currentPoolPercent - Current option pool percentage
 * @param targetPoolPercent - Target option pool percentage post-money
 * @param investorOwnership - Investor ownership percentage
 * @returns Additional shares needed for option pool
 */
export function calculateOptionPoolShuffle(
  totalShares: number,
  currentPoolPercent: number,
  targetPoolPercent: number,
  raiseAmount: number,
  preMoneyValuation: number
): {
  additionalPoolShares: number;
  shuffleImpact: number;
  effectivePreMoney: number;
} {
  if (targetPoolPercent <= currentPoolPercent) {
    return { additionalPoolShares: 0, shuffleImpact: 0, effectivePreMoney: preMoneyValuation };
  }

  const postMoneyValuation = preMoneyValuation + raiseAmount;
  const investorOwnership = raiseAmount / postMoneyValuation;
  
  // Calculate how many shares needed for the target pool post-money
  // Post-money: investor gets X%, option pool gets Y%, founders get rest
  // The shuffle means we expand the pool PRE-money, diluting founders
  
  const poolExpansion = targetPoolPercent - currentPoolPercent;
  
  // Calculate effective pre-money considering the shuffle
  // The shuffle effectively reduces the pre-money for founders
  const shuffleImpact = poolExpansion / (1 - investorOwnership);
  
  // Additional shares for option pool expansion
  const postRoundShares = totalShares / (1 - investorOwnership);
  const targetPoolShares = postRoundShares * targetPoolPercent;
  const currentPoolShares = totalShares * currentPoolPercent;
  const additionalPoolShares = Math.max(0, targetPoolShares - currentPoolShares);
  
  // Effective pre-money is reduced by the pool expansion
  const effectivePreMoney = preMoneyValuation * (1 - poolExpansion);

  return {
    additionalPoolShares: Math.round(additionalPoolShares),
    shuffleImpact,
    effectivePreMoney,
  };
}

/**
 * Calculate stakeholder dilution impact
 */
export function calculateStakeholderDilution(
  stakeholder: Stakeholder,
  totalSharesPreRound: number,
  totalSharesPostRound: number,
  optionPoolShuffle: number = 0
): StakeholderDilution {
  // Calculate new ownership percentage
  const postRoundOwnership = (stakeholder.shares / totalSharesPostRound) * 100;
  
  // Apply option pool shuffle impact to founders/employees (not new investors)
  const adjustedPostRoundOwnership = stakeholder.type === 'investor' 
    ? postRoundOwnership 
    : postRoundOwnership * (1 - optionPoolShuffle);
  
  const absoluteDilution = stakeholder.ownershipPercent - adjustedPostRoundOwnership;
  const relativeDilution = (absoluteDilution / stakeholder.ownershipPercent) * 100;

  return {
    stakeholder,
    preRoundOwnership: stakeholder.ownershipPercent,
    postRoundOwnership: adjustedPostRoundOwnership,
    absoluteDilution,
    relativeDilution,
    newShares: stakeholder.shares, // Shares don't change, just percentage
  };
}

/**
 * Calculate runway bridge from new funding
 */
export function calculateRunwayBridge(
  currentCash: number,
  raiseAmount: number,
  monthlyBurn: number
): {
  currentRunwayMonths: number;
  additionalRunwayMonths: number;
  newTotalRunwayMonths: number;
  cashAfterRaise: number;
} {
  if (monthlyBurn <= 0) {
    return {
      currentRunwayMonths: Infinity,
      additionalRunwayMonths: Infinity,
      newTotalRunwayMonths: Infinity,
      cashAfterRaise: currentCash + raiseAmount,
    };
  }

  const currentRunwayMonths = currentCash / monthlyBurn;
  const cashAfterRaise = currentCash + raiseAmount;
  const newTotalRunwayMonths = cashAfterRaise / monthlyBurn;
  const additionalRunwayMonths = raiseAmount / monthlyBurn;

  return {
    currentRunwayMonths,
    additionalRunwayMonths,
    newTotalRunwayMonths,
    cashAfterRaise,
  };
}

/**
 * Generate insights based on funding round
 */
function generateInsights(result: Partial<FundingRoundResult>, input: FundingRoundInput): string[] {
  const insights: string[] = [];

  // Dilution insight
  const founderDilution = result.founderDilution?.[0];
  if (founderDilution) {
    if (founderDilution.relativeDilution > 30) {
      insights.push(`⚠ High founder dilution of ${founderDilution.relativeDilution.toFixed(0)}% - consider negotiating higher valuation`);
    } else if (founderDilution.relativeDilution < 20) {
      insights.push(`✓ Reasonable dilution of ${founderDilution.relativeDilution.toFixed(0)}% - within normal range`);
    }
  }

  // Option pool shuffle insight
  if (input.applyOptionPoolShuffle && result.optionPoolShuffleImpact) {
    const shufflePercent = (result.optionPoolShuffleImpact * 100).toFixed(1);
    insights.push(`📊 Option pool shuffle adds ${shufflePercent}% additional dilution to founders`);
  }

  // Runway insight
  if (result.runwayBridge) {
    const runway = result.runwayBridge;
    if (runway.newTotalRunwayMonths >= 24) {
      insights.push(`🚀 ${runway.newTotalRunwayMonths.toFixed(0)} months runway gives 2+ years to hit milestones`);
    } else if (runway.newTotalRunwayMonths >= 18) {
      insights.push(`✓ ${runway.newTotalRunwayMonths.toFixed(0)} months runway is healthy for next raise`);
    } else {
      insights.push(`⚠ ${runway.newTotalRunwayMonths.toFixed(0)} months may be tight - consider larger raise`);
    }
  }

  // Valuation insight
  const postMoney = result.postMoneyValuation || 0;
  const raise = input.raiseAmount;
  if (postMoney > 0) {
    const multiple = postMoney / raise;
    if (multiple >= 5) {
      insights.push(`💰 Strong ${multiple.toFixed(1)}x raise-to-valuation ratio`);
    }
  }

  // Investor ownership insight
  if (result.investorOwnership) {
    const ownership = result.investorOwnership * 100;
    if (ownership > 25) {
      insights.push(`📋 Investors taking ${ownership.toFixed(0)}% - may want board seat`);
    }
  }

  return insights;
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Calculate complete funding round dilution
 * 
 * @param input - Funding round parameters
 * @param currentCapTable - Current cap table state
 * @returns Complete funding round result
 */
export function calculateDilution(
  input: FundingRoundInput,
  currentCapTable: CapTable = DEFAULT_CAP_TABLE
): FundingRoundResult {
  const { raiseAmount, preMoneyValuation, targetOptionPoolPercent, applyOptionPoolShuffle } = input;

  // Calculate post-money valuation
  const postMoneyValuation = calculatePostMoneyValuation(preMoneyValuation, raiseAmount);

  // Calculate price per share
  const pricePerShare = calculatePricePerShare(preMoneyValuation, currentCapTable.totalShares);

  // Calculate option pool shuffle if applicable
  const shuffle = applyOptionPoolShuffle
    ? calculateOptionPoolShuffle(
        currentCapTable.totalShares,
        currentCapTable.optionPoolPercent,
        targetOptionPoolPercent,
        raiseAmount,
        preMoneyValuation
      )
    : { additionalPoolShares: 0, shuffleImpact: 0, effectivePreMoney: preMoneyValuation };

  // Calculate new investor shares
  const newInvestorShares = calculateNewShares(raiseAmount, pricePerShare);

  // Total new shares (investor + option pool expansion)
  const totalNewShares = newInvestorShares + shuffle.additionalPoolShares;

  // Total shares after round
  const totalSharesPostRound = currentCapTable.totalShares + totalNewShares;

  // Calculate investor ownership
  const investorOwnership = newInvestorShares / totalSharesPostRound;

  // Calculate option pool ownership post-round
  const optionPoolOwnership = (currentCapTable.optionPoolShares + shuffle.additionalPoolShares) / totalSharesPostRound;

  // Calculate dilution for each stakeholder
  const allStakeholderImpacts = currentCapTable.stakeholders.map(stakeholder =>
    calculateStakeholderDilution(
      stakeholder,
      currentCapTable.totalShares,
      totalSharesPostRound,
      shuffle.shuffleImpact
    )
  );

  // Filter founder dilution
  const founderDilution = allStakeholderImpacts.filter(s => s.stakeholder.type === 'founder');

  // Calculate runway bridge
  const runwayBridge = calculateRunwayBridge(
    input.currentCash || 0,
    raiseAmount,
    input.monthlyBurn || 0
  );

  // Build partial result for insights
  const partialResult = {
    founderDilution,
    optionPoolShuffleImpact: shuffle.shuffleImpact,
    runwayBridge,
    postMoneyValuation,
    investorOwnership,
  };

  // Generate insights
  const insights = generateInsights(partialResult, input);

  return {
    input,
    preMoneyValuation,
    postMoneyValuation,
    pricePerShare,
    newInvestorShares,
    newOptionPoolShares: shuffle.additionalPoolShares,
    totalNewShares,
    totalSharesPostRound,
    investorOwnership,
    optionPoolOwnership,
    founderDilution,
    allStakeholderImpacts,
    optionPoolShuffleImpact: shuffle.shuffleImpact,
    runwayBridge,
    insights,
  };
}

/**
 * Compare multiple funding scenarios
 */
export function compareScenarios(scenarios: FundingRoundInput[], capTable: CapTable): ScenarioComparison {
  const results = scenarios.map(input => calculateDilution(input, capTable));

  // Find best for founders (lowest dilution)
  const bestForFounders = results.reduce((best, current) => {
    const bestDilution = best.founderDilution[0]?.relativeDilution || Infinity;
    const currentDilution = current.founderDilution[0]?.relativeDilution || Infinity;
    return currentDilution < bestDilution ? current : best;
  });

  return {
    scenarios: results,
    bestForFounders: bestForFounders.input.roundName,
    recommendation: `${bestForFounders.input.roundName} offers the best terms with ${bestForFounders.founderDilution[0]?.relativeDilution.toFixed(0)}% founder dilution`,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
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
 * Format percentage for display
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format shares for display
 */
export function formatShares(shares: number): string {
  if (shares >= 1_000_000) {
    return `${(shares / 1_000_000).toFixed(2)}M`;
  }
  if (shares >= 1_000) {
    return `${(shares / 1_000).toFixed(0)}K`;
  }
  return shares.toFixed(0);
}

/**
 * Create a stakeholder entry
 */
export function createStakeholder(
  id: string,
  name: string,
  type: StakeholderType,
  shares: number,
  totalShares: number
): Stakeholder {
  return {
    id,
    name,
    type,
    shares,
    ownershipPercent: (shares / totalShares) * 100,
  };
}

/**
 * Calculate implied valuation from ownership sale
 */
export function calculateImpliedValuation(raiseAmount: number, ownershipSold: number): number {
  return raiseAmount / ownershipSold;
}

// ============================================================================
// EXPORT DEFAULT SERVICE OBJECT
// ============================================================================

const DilutionService = {
  // Core functions
  calculateDilution,
  compareScenarios,
  
  // Component calculations
  calculateBasicDilution,
  calculatePostMoneyValuation,
  calculatePricePerShare,
  calculateNewShares,
  calculateOptionPoolShuffle,
  calculateStakeholderDilution,
  calculateRunwayBridge,
  
  // Utilities
  formatCurrency,
  formatPercent,
  formatShares,
  createStakeholder,
  calculateImpliedValuation,
  
  // Constants
  OPTION_POOL_SIZES,
  DEFAULT_CAP_TABLE,
};

export default DilutionService;




