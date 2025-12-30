/**
 * TaxCreditService.ts
 * 
 * R&D Tax Credit Estimator for Runway DNA Founder Toolkit.
 * Implements ASC (Alternative Simplified Credit) methodology.
 * 
 * Key Rules:
 * - 80% Rule: Engineers spending >80% on R&D = 100% wages qualify
 * - Contractor Logic: 65% of US-based contractor costs qualify
 * - Cloud Costs: 100% of dev/staging environments qualify
 * - Credit Rate: 6.6% to 10% of QREs, capped at $500K annually
 * 
 * @author Runway DNA Team
 * @version 1.0.0
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Employee R&D allocation
 */
export interface EmployeeRDAllocation {
  /** Unique identifier */
  id: string;
  /** Employee name or role */
  name: string;
  /** Annual salary/wages */
  annualWages: number;
  /** Percentage of time spent on R&D (0-100) */
  rdPercentage: number;
  /** Whether employee is a contractor */
  isContractor: boolean;
  /** Whether contractor is US-based (only US contractors qualify) */
  isUSBased: boolean;
}

/**
 * Cloud infrastructure costs
 */
export interface CloudCosts {
  /** AWS costs */
  aws: number;
  /** Google Cloud Platform costs */
  gcp: number;
  /** Microsoft Azure costs */
  azure: number;
  /** Other cloud providers */
  other: number;
  /** Percentage allocated to dev/staging (vs production) */
  devStagingPercentage: number;
}

/**
 * Supplies and equipment for R&D
 */
export interface SuppliesCosts {
  /** Software licenses for R&D */
  softwareLicenses: number;
  /** Hardware/equipment for R&D */
  hardware: number;
  /** Other supplies */
  other: number;
}

/**
 * Complete R&D Tax Credit input
 */
export interface TaxCreditInput {
  /** Tax year */
  taxYear: number;
  /** Employee/contractor R&D allocations */
  employees: EmployeeRDAllocation[];
  /** Aggregate engineering wages (if not using detailed breakdown) */
  totalEngineeringWages?: number;
  /** Aggregate R&D percentage (if not using detailed breakdown) */
  averageRDPercentage?: number;
  /** Cloud infrastructure costs */
  cloudCosts: CloudCosts;
  /** Supplies costs */
  suppliesCosts?: SuppliesCosts;
  /** Use simple calculation (aggregate wages) vs detailed */
  useSimpleCalculation: boolean;
  /** Company type for credit rate */
  companyType: 'startup' | 'established';
}

/**
 * Qualified Research Expenses breakdown
 */
export interface QREBreakdown {
  /** Qualified employee wages */
  qualifiedWages: number;
  /** Qualified contractor costs (65%) */
  qualifiedContractors: number;
  /** Qualified cloud costs */
  qualifiedCloud: number;
  /** Qualified supplies */
  qualifiedSupplies: number;
  /** Total QREs */
  totalQRE: number;
}

/**
 * Credit calculation result
 */
export interface TaxCreditResult {
  /** Input parameters used */
  input: TaxCreditInput;
  /** QRE breakdown */
  qreBreakdown: QREBreakdown;
  /** Credit rate used (decimal) */
  creditRate: number;
  /** Credit rate as percentage string */
  creditRateDisplay: string;
  /** Calculated credit (before cap) */
  calculatedCredit: number;
  /** Whether credit was capped */
  wasCapped: boolean;
  /** Final credit amount (after cap) */
  finalCredit: number;
  /** Annual cap applied */
  annualCap: number;
  /** Potential credit if using max rate */
  maxPotentialCredit: number;
  /** Effective credit rate on total expenses */
  effectiveRate: number;
  /** Estimated cash refund (for startups) */
  estimatedCashRefund: number;
  /** Key insights and recommendations */
  insights: string[];
  /** Whether company qualifies for payroll tax offset (startups) */
  qualifiesForPayrollOffset: boolean;
}

/**
 * Simple estimation result
 */
export interface SimpleEstimation {
  /** Estimated QREs */
  estimatedQRE: number;
  /** Estimated credit range */
  creditRange: {
    low: number;
    mid: number;
    high: number;
  };
  /** Confidence level */
  confidence: 'low' | 'medium' | 'high';
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Federal R&D credit rate (ASC method) */
const ASC_CREDIT_RATE = {
  MIN: 0.066,  // 6.6% (14% × 50% ASC factor - typical effective)
  MID: 0.08,   // 8% (typical effective rate)
  MAX: 0.10,   // 10% (maximum with state credits)
} as const;

/** Annual credit cap for payroll tax offset (startups) */
const ANNUAL_CAP = 500000;

/** Contractor inclusion rate (65% of US contractor costs) */
const CONTRACTOR_INCLUSION_RATE = 0.65;

/** 80% Rule threshold */
const FULL_QUALIFICATION_THRESHOLD = 0.80;

/** Startup qualification criteria */
const STARTUP_CRITERIA = {
  MAX_GROSS_RECEIPTS: 5000000,
  MIN_YEARS: 0,
  MAX_YEARS: 5,
} as const;

// ============================================================================
// CORE CALCULATION ENGINE
// ============================================================================

/**
 * Apply the 80% Rule for employee wages
 * 
 * If engineer spends >80% on R&D, 100% of wages qualify
 * If <80%, only that specific percentage qualifies
 * 
 * @param annualWages - Annual wages
 * @param rdPercentage - Percentage of time on R&D (0-100)
 * @returns Qualified wages amount
 */
export function applyEightyPercentRule(annualWages: number, rdPercentage: number): number {
  // Convert percentage to decimal if needed
  const rdDecimal = rdPercentage > 1 ? rdPercentage / 100 : rdPercentage;
  
  if (rdDecimal >= FULL_QUALIFICATION_THRESHOLD) {
    // 80%+ rule: 100% of wages qualify
    return annualWages;
  }
  
  // Less than 80%: only that percentage qualifies
  return annualWages * rdDecimal;
}

/**
 * Calculate qualified contractor costs
 * 
 * Only 65% of US-based contractor costs qualify
 * 
 * @param contractorCost - Total contractor cost
 * @param isUSBased - Whether contractor is US-based
 * @returns Qualified contractor amount
 */
export function calculateContractorQRE(contractorCost: number, isUSBased: boolean): number {
  if (!isUSBased) return 0;
  return contractorCost * CONTRACTOR_INCLUSION_RATE;
}

/**
 * Calculate qualified cloud costs
 * 
 * 100% of dev/staging environment costs qualify
 * Production costs typically don't qualify
 * 
 * @param cloudCosts - Cloud cost breakdown
 * @returns Qualified cloud amount
 */
export function calculateCloudQRE(cloudCosts: CloudCosts): number {
  const totalCloud = cloudCosts.aws + cloudCosts.gcp + cloudCosts.azure + cloudCosts.other;
  const devStagingDecimal = cloudCosts.devStagingPercentage > 1 
    ? cloudCosts.devStagingPercentage / 100 
    : cloudCosts.devStagingPercentage;
  
  return totalCloud * devStagingDecimal;
}

/**
 * Calculate qualified supplies costs
 * 
 * @param suppliesCosts - Supplies cost breakdown
 * @returns Qualified supplies amount
 */
export function calculateSuppliesQRE(suppliesCosts?: SuppliesCosts): number {
  if (!suppliesCosts) return 0;
  return suppliesCosts.softwareLicenses + suppliesCosts.hardware + suppliesCosts.other;
}

/**
 * Calculate QRE breakdown from detailed employee list
 * 
 * @param employees - List of employees with R&D allocations
 * @returns Breakdown of qualified wages and contractors
 */
export function calculateDetailedWagesQRE(employees: EmployeeRDAllocation[]): {
  qualifiedWages: number;
  qualifiedContractors: number;
} {
  let qualifiedWages = 0;
  let qualifiedContractors = 0;

  for (const employee of employees) {
    const qualifiedAmount = applyEightyPercentRule(employee.annualWages, employee.rdPercentage);
    
    if (employee.isContractor) {
      qualifiedContractors += calculateContractorQRE(qualifiedAmount, employee.isUSBased);
    } else {
      qualifiedWages += qualifiedAmount;
    }
  }

  return { qualifiedWages, qualifiedContractors };
}

/**
 * Calculate QRE from simplified inputs
 * 
 * @param totalWages - Total engineering wages
 * @param rdPercentage - Average R&D percentage
 * @param contractorPercentage - Percentage that are contractors
 * @returns Breakdown of qualified amounts
 */
export function calculateSimpleWagesQRE(
  totalWages: number,
  rdPercentage: number,
  contractorPercentage: number = 0
): { qualifiedWages: number; qualifiedContractors: number } {
  const qualifiedTotal = applyEightyPercentRule(totalWages, rdPercentage);
  
  const contractorDecimal = contractorPercentage > 1 ? contractorPercentage / 100 : contractorPercentage;
  const contractorPortion = qualifiedTotal * contractorDecimal;
  const employeePortion = qualifiedTotal * (1 - contractorDecimal);
  
  return {
    qualifiedWages: employeePortion,
    qualifiedContractors: contractorPortion * CONTRACTOR_INCLUSION_RATE,
  };
}

/**
 * Get credit rate based on company type and state
 * 
 * @param companyType - Startup or established
 * @param includeState - Include estimated state credit
 * @returns Credit rate as decimal
 */
export function getCreditRate(
  companyType: 'startup' | 'established',
  includeState: boolean = true
): number {
  // Startups can claim against payroll taxes at full rate
  // Established companies have different considerations
  const baseRate = companyType === 'startup' ? ASC_CREDIT_RATE.MID : ASC_CREDIT_RATE.MIN;
  
  // Add ~2% for typical state credits if included
  return includeState ? Math.min(baseRate + 0.02, ASC_CREDIT_RATE.MAX) : baseRate;
}

/**
 * Generate insights based on calculation results
 */
function generateInsights(
  input: TaxCreditInput,
  qre: QREBreakdown,
  result: { finalCredit: number; wasCapped: boolean; effectiveRate: number }
): string[] {
  const insights: string[] = [];

  // Credit amount insight
  if (result.finalCredit >= 100000) {
    insights.push(`✓ Significant credit of ${formatCurrency(result.finalCredit)} can offset payroll taxes or reduce tax liability`);
  } else if (result.finalCredit >= 25000) {
    insights.push(`✓ ${formatCurrency(result.finalCredit)} credit provides meaningful tax savings`);
  } else {
    insights.push(`📊 ${formatCurrency(result.finalCredit)} estimated credit - consider increasing R&D documentation`);
  }

  // Cap insight
  if (result.wasCapped) {
    insights.push(`⚠ Credit capped at ${formatCurrency(ANNUAL_CAP)} - excess can be carried forward 20 years`);
  }

  // QRE composition insight
  const wagePercent = (qre.qualifiedWages / qre.totalQRE) * 100;
  if (wagePercent > 80) {
    insights.push(`💰 ${wagePercent.toFixed(0)}% of QREs from wages - typical for software companies`);
  }

  // R&D percentage insight
  const avgRD = input.averageRDPercentage || 0;
  if (avgRD >= 80) {
    insights.push(`✓ High R&D allocation (${avgRD.toFixed(0)}%) maximizes the 80% rule benefit`);
  } else if (avgRD >= 50) {
    insights.push(`📈 Consider documenting more R&D activities to increase allocation above 80%`);
  }

  // Cloud costs insight
  if (qre.qualifiedCloud > 0) {
    insights.push(`☁️ ${formatCurrency(qre.qualifiedCloud)} in cloud costs qualify as R&D expenses`);
  }

  // Startup benefit
  if (input.companyType === 'startup') {
    insights.push(`🚀 As a startup, credit can offset FICA payroll taxes quarterly`);
  }

  return insights;
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Calculate complete R&D Tax Credit
 * 
 * @param input - Tax credit calculation input
 * @returns Complete tax credit result
 */
export function calculateTaxCredit(input: TaxCreditInput): TaxCreditResult {
  // Calculate wage/contractor QREs
  let wageQRE: { qualifiedWages: number; qualifiedContractors: number };
  
  if (input.useSimpleCalculation && input.totalEngineeringWages !== undefined) {
    wageQRE = calculateSimpleWagesQRE(
      input.totalEngineeringWages,
      input.averageRDPercentage || 80,
      0 // Assume no contractors in simple mode, or add parameter
    );
  } else {
    wageQRE = calculateDetailedWagesQRE(input.employees);
  }

  // Calculate cloud QRE
  const cloudQRE = calculateCloudQRE(input.cloudCosts);

  // Calculate supplies QRE
  const suppliesQRE = calculateSuppliesQRE(input.suppliesCosts);

  // Build QRE breakdown
  const qreBreakdown: QREBreakdown = {
    qualifiedWages: wageQRE.qualifiedWages,
    qualifiedContractors: wageQRE.qualifiedContractors,
    qualifiedCloud: cloudQRE,
    qualifiedSupplies: suppliesQRE,
    totalQRE: wageQRE.qualifiedWages + wageQRE.qualifiedContractors + cloudQRE + suppliesQRE,
  };

  // Get credit rate
  const creditRate = getCreditRate(input.companyType, true);

  // Calculate credit
  const calculatedCredit = qreBreakdown.totalQRE * creditRate;
  
  // Apply annual cap for payroll tax offset
  const wasCapped = calculatedCredit > ANNUAL_CAP && input.companyType === 'startup';
  const finalCredit = wasCapped ? ANNUAL_CAP : calculatedCredit;

  // Calculate max potential
  const maxPotentialCredit = qreBreakdown.totalQRE * ASC_CREDIT_RATE.MAX;

  // Calculate effective rate
  const totalExpenses = (input.totalEngineeringWages || 0) + 
    (input.cloudCosts.aws + input.cloudCosts.gcp + input.cloudCosts.azure + input.cloudCosts.other);
  const effectiveRate = totalExpenses > 0 ? finalCredit / totalExpenses : 0;

  // For startups, credit is a cash refund against payroll taxes
  const estimatedCashRefund = input.companyType === 'startup' ? finalCredit : 0;

  // Generate insights
  const insights = generateInsights(input, qreBreakdown, { finalCredit, wasCapped, effectiveRate });

  return {
    input,
    qreBreakdown,
    creditRate,
    creditRateDisplay: `${(creditRate * 100).toFixed(1)}%`,
    calculatedCredit,
    wasCapped,
    finalCredit,
    annualCap: ANNUAL_CAP,
    maxPotentialCredit,
    effectiveRate,
    estimatedCashRefund,
    insights,
    qualifiesForPayrollOffset: input.companyType === 'startup',
  };
}

/**
 * Quick estimation for preview
 * 
 * @param totalWages - Total engineering wages
 * @param rdPercentage - Estimated R&D percentage
 * @returns Quick estimation result
 */
export function quickEstimate(totalWages: number, rdPercentage: number): SimpleEstimation {
  const qualifiedWages = applyEightyPercentRule(totalWages, rdPercentage);
  
  return {
    estimatedQRE: qualifiedWages,
    creditRange: {
      low: qualifiedWages * ASC_CREDIT_RATE.MIN,
      mid: qualifiedWages * ASC_CREDIT_RATE.MID,
      high: Math.min(qualifiedWages * ASC_CREDIT_RATE.MAX, ANNUAL_CAP),
    },
    confidence: rdPercentage >= 80 ? 'high' : rdPercentage >= 50 ? 'medium' : 'low',
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Calculate annual wages from monthly
 */
export function monthlyToAnnual(monthly: number): number {
  return monthly * 12;
}

/**
 * Calculate monthly equivalent of annual credit
 */
export function annualToMonthly(annual: number): number {
  return annual / 12;
}

/**
 * Estimate quarterly payroll tax offset for startups
 */
export function calculateQuarterlyOffset(annualCredit: number): number {
  // Startups can claim up to $500K per year against FICA
  // Applied quarterly = annual / 4
  return Math.min(annualCredit, ANNUAL_CAP) / 4;
}

/**
 * Get qualification status message
 */
export function getQualificationStatus(
  grossReceipts: number,
  yearsInBusiness: number
): { qualifies: boolean; message: string } {
  if (grossReceipts > STARTUP_CRITERIA.MAX_GROSS_RECEIPTS) {
    return {
      qualifies: false,
      message: `Gross receipts exceed $${STARTUP_CRITERIA.MAX_GROSS_RECEIPTS / 1000000}M startup threshold`,
    };
  }
  
  if (yearsInBusiness > STARTUP_CRITERIA.MAX_YEARS) {
    return {
      qualifies: false,
      message: `Company exceeds ${STARTUP_CRITERIA.MAX_YEARS} year startup threshold`,
    };
  }
  
  return {
    qualifies: true,
    message: 'Qualifies for startup payroll tax offset',
  };
}

// ============================================================================
// EXPORT DEFAULT SERVICE OBJECT
// ============================================================================

const TaxCreditService = {
  // Core calculations
  calculateTaxCredit,
  quickEstimate,
  
  // Component calculations
  applyEightyPercentRule,
  calculateContractorQRE,
  calculateCloudQRE,
  calculateSuppliesQRE,
  calculateDetailedWagesQRE,
  calculateSimpleWagesQRE,
  getCreditRate,
  
  // Utilities
  formatCurrency,
  formatPercentage,
  monthlyToAnnual,
  annualToMonthly,
  calculateQuarterlyOffset,
  getQualificationStatus,
  
  // Constants
  ASC_CREDIT_RATE,
  ANNUAL_CAP,
  CONTRACTOR_INCLUSION_RATE,
  FULL_QUALIFICATION_THRESHOLD,
};

export default TaxCreditService;



