/**
 * BurnMonitor.ts
 * 
 * Real-time runway health monitoring and anomaly detection for Runway DNA.
 * Integrates data from both GrowthService and simulator-engine for complete picture.
 * 
 * @author Runway DNA Team
 * @version 1.0.0
 */

import type { SimParams, SimulationResult, ProjectionPoint } from '../simulator-engine';
import { runSimulation } from '../simulator-engine';
import type { GrowthSummary } from './GrowthService';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Runway health grade based on months remaining
 */
export type HealthGrade = 'A' | 'B' | 'C';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Alert types for the system
 */
export type AlertType = 
  | 'runway_healthy'
  | 'runway_warning'
  | 'runway_critical'
  | 'burn_spike'
  | 'profitability_achieved'
  | 'cash_depleted'
  | 'growth_stall';

/**
 * System health status
 */
export interface HealthStatus {
  /** Current health grade (A/B/C) */
  grade: HealthGrade;
  /** Months of runway remaining */
  runwayMonths: number;
  /** Human-readable status label */
  label: string;
  /** Status description */
  description: string;
  /** CSS color class for the grade */
  colorClass: string;
  /** Hex color for charts */
  color: string;
}

/**
 * Burn spike detection result
 */
export interface BurnSpikeResult {
  /** Whether a spike was detected */
  detected: boolean;
  /** Month index where spike occurred */
  monthIndex: number | null;
  /** Month label */
  month: string | null;
  /** Expense increase percentage */
  expenseIncrease: number;
  /** Revenue increase percentage */
  revenueIncrease: number;
  /** Net impact (negative = bad) */
  netImpact: number;
  /** Alert message */
  message: string | null;
}

/**
 * Complete burn analysis result
 */
export interface BurnAnalysis {
  /** Overall health status */
  health: HealthStatus;
  /** Burn spike detection */
  burnSpike: BurnSpikeResult;
  /** Active alerts */
  alerts: Alert[];
  /** Monthly burn trend */
  burnTrend: 'increasing' | 'stable' | 'decreasing';
  /** Average monthly net burn */
  averageNetBurn: number;
  /** Current net burn (revenue - expenses) */
  currentNetBurn: number;
  /** Months until profitability (null if never) */
  monthsToProfitability: number | null;
}

/**
 * Individual alert record
 */
export interface Alert {
  /** Unique alert ID */
  id: string;
  /** Alert type */
  type: AlertType;
  /** Severity level */
  severity: AlertSeverity;
  /** Alert title */
  title: string;
  /** Alert description */
  description: string;
  /** Timestamp */
  timestamp: Date;
  /** Related data */
  metadata: Record<string, unknown>;
  /** Whether alert has been acknowledged */
  acknowledged: boolean;
}

/**
 * Input for burn analysis combining runway and growth data
 */
export interface BurnMonitorInput {
  /** Simulation parameters */
  simParams: SimParams;
  /** Optional growth summary for enhanced analysis */
  growthSummary?: GrowthSummary;
  /** Historical projection for spike detection */
  previousProjection?: ProjectionPoint[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Runway thresholds in months */
const RUNWAY_THRESHOLDS = {
  HEALTHY: 18,  // Grade A: > 18 months
  WARNING: 6,   // Grade B: 6-18 months
  // Grade C: < 6 months
} as const;

/** Burn spike threshold (20% increase without proportional revenue) */
const BURN_SPIKE_THRESHOLD = 0.20;

/** Colors for health grades */
const GRADE_COLORS = {
  A: { class: 'text-success', hex: '#00FF88' },     // Electric Green
  B: { class: 'text-warning', hex: '#FFB800' },     // Warning Yellow
  C: { class: 'text-danger', hex: '#FF4444' },      // Danger Red
} as const;

// ============================================================================
// CORE HEALTH GRADING
// ============================================================================

/**
 * Evaluate runway health based on months remaining
 * 
 * Grade A (Healthy): > 18 months
 * Grade B (Warning): 6-18 months
 * Grade C (Danger): < 6 months
 * 
 * @param runwayMonths - Months of runway remaining
 * @returns Health status with grade, label, and styling
 */
export function evaluateRunwayHealth(runwayMonths: number): HealthStatus {
  if (runwayMonths > RUNWAY_THRESHOLDS.HEALTHY) {
    return {
      grade: 'A',
      runwayMonths,
      label: 'Healthy',
      description: `${runwayMonths.toFixed(1)} months of runway - in excellent financial position`,
      colorClass: GRADE_COLORS.A.class,
      color: GRADE_COLORS.A.hex,
    };
  }

  if (runwayMonths >= RUNWAY_THRESHOLDS.WARNING) {
    return {
      grade: 'B',
      runwayMonths,
      label: 'Caution',
      description: `${runwayMonths.toFixed(1)} months remaining - consider extending runway`,
      colorClass: GRADE_COLORS.B.class,
      color: GRADE_COLORS.B.hex,
    };
  }

  return {
    grade: 'C',
    runwayMonths: Math.max(0, runwayMonths),
    label: 'Critical',
    description: runwayMonths <= 0 
      ? 'Cash depleted - immediate action required'
      : `Only ${runwayMonths.toFixed(1)} months remaining - urgent runway extension needed`,
    colorClass: GRADE_COLORS.C.class,
    color: GRADE_COLORS.C.hex,
  };
}

/**
 * Get numeric score for health grade (for comparisons)
 */
export function getHealthScore(grade: HealthGrade): number {
  switch (grade) {
    case 'A': return 3;
    case 'B': return 2;
    case 'C': return 1;
    default: return 0;
  }
}

// ============================================================================
// BURN SPIKE DETECTION
// ============================================================================

/**
 * Detect burn spikes in projection data
 * 
 * A spike is flagged when:
 * - Expenses in Month X are > 20% higher than Month X-1
 * - AND there's no proportional revenue increase
 * 
 * @param projection - Monthly projection data
 * @returns Burn spike detection result
 */
export function detectBurnSpike(projection: ProjectionPoint[]): BurnSpikeResult {
  if (projection.length < 2) {
    return {
      detected: false,
      monthIndex: null,
      month: null,
      expenseIncrease: 0,
      revenueIncrease: 0,
      netImpact: 0,
      message: null,
    };
  }

  // Check each month for spikes (starting from month 1)
  for (let i = 1; i < projection.length; i++) {
    const prev = projection[i - 1];
    const curr = projection[i];

    // Calculate percentage changes
    const expenseChange = prev.expenses > 0 
      ? (curr.expenses - prev.expenses) / prev.expenses 
      : 0;
    const revenueChange = prev.revenue > 0 
      ? (curr.revenue - prev.revenue) / prev.revenue 
      : 0;

    // Check for burn spike: expenses up > 20% without proportional revenue
    if (expenseChange > BURN_SPIKE_THRESHOLD) {
      const isProportional = revenueChange >= expenseChange * 0.8; // Revenue should be at least 80% of expense growth

      if (!isProportional) {
        const netImpact = (curr.revenue - curr.expenses) - (prev.revenue - prev.expenses);

        return {
          detected: true,
          monthIndex: i,
          month: curr.month,
          expenseIncrease: expenseChange,
          revenueIncrease: revenueChange,
          netImpact,
          message: `Burn spike detected in ${curr.month}: expenses up ${(expenseChange * 100).toFixed(0)}% while revenue only up ${(revenueChange * 100).toFixed(0)}%`,
        };
      }
    }
  }

  return {
    detected: false,
    monthIndex: null,
    month: null,
    expenseIncrease: 0,
    revenueIncrease: 0,
    netImpact: 0,
    message: null,
  };
}

/**
 * Analyze burn trend across projection
 */
export function analyzeBurnTrend(projection: ProjectionPoint[]): 'increasing' | 'stable' | 'decreasing' {
  if (projection.length < 3) return 'stable';

  const firstThird = projection.slice(0, Math.floor(projection.length / 3));
  const lastThird = projection.slice(-Math.floor(projection.length / 3));

  const avgBurnFirst = firstThird.reduce((sum, p) => sum + p.netBurn, 0) / firstThird.length;
  const avgBurnLast = lastThird.reduce((sum, p) => sum + p.netBurn, 0) / lastThird.length;

  const changePercent = avgBurnFirst !== 0 
    ? (avgBurnLast - avgBurnFirst) / Math.abs(avgBurnFirst)
    : 0;

  if (changePercent > 0.1) return 'increasing';
  if (changePercent < -0.1) return 'decreasing';
  return 'stable';
}

// ============================================================================
// ALERT GENERATION
// ============================================================================

/**
 * Generate unique alert ID
 */
function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create an alert from health status
 */
export function createHealthAlert(health: HealthStatus): Alert {
  const now = new Date();

  if (health.grade === 'A') {
    return {
      id: generateAlertId(),
      type: 'runway_healthy',
      severity: 'info',
      title: 'Runway Healthy',
      description: health.description,
      timestamp: now,
      metadata: { runwayMonths: health.runwayMonths, grade: health.grade },
      acknowledged: false,
    };
  }

  if (health.grade === 'B') {
    return {
      id: generateAlertId(),
      type: 'runway_warning',
      severity: 'warning',
      title: 'Runway Warning',
      description: health.description,
      timestamp: now,
      metadata: { runwayMonths: health.runwayMonths, grade: health.grade },
      acknowledged: false,
    };
  }

  return {
    id: generateAlertId(),
    type: 'runway_critical',
    severity: 'critical',
    title: 'Runway Critical',
    description: health.description,
    timestamp: now,
    metadata: { runwayMonths: health.runwayMonths, grade: health.grade },
    acknowledged: false,
  };
}

/**
 * Create a burn spike alert
 */
export function createBurnSpikeAlert(spike: BurnSpikeResult): Alert | null {
  if (!spike.detected) return null;

  return {
    id: generateAlertId(),
    type: 'burn_spike',
    severity: 'critical',
    title: 'Burn Spike Detected',
    description: spike.message || 'Unusual expense increase detected',
    timestamp: new Date(),
    metadata: {
      month: spike.month,
      monthIndex: spike.monthIndex,
      expenseIncrease: spike.expenseIncrease,
      revenueIncrease: spike.revenueIncrease,
      netImpact: spike.netImpact,
    },
    acknowledged: false,
  };
}

/**
 * Create profitability alert
 */
export function createProfitabilityAlert(monthIndex: number, monthLabel: string): Alert {
  return {
    id: generateAlertId(),
    type: 'profitability_achieved',
    severity: 'info',
    title: 'Profitability Projected',
    description: `Based on current trajectory, profitability expected in ${monthLabel} (Month ${monthIndex + 1})`,
    timestamp: new Date(),
    metadata: { monthIndex, monthLabel },
    acknowledged: false,
  };
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Perform complete burn analysis
 * 
 * Integrates data from simulator-engine and optionally GrowthService
 * to provide a complete picture of runway health.
 * 
 * @param input - Burn monitor input parameters
 * @returns Complete burn analysis with health, alerts, and trends
 */
export function analyzeBurn(input: BurnMonitorInput): BurnAnalysis {
  const { simParams, growthSummary } = input;

  // Run simulation to get projections
  const simResult: SimulationResult = runSimulation(simParams);
  const { projection, runwayMonths, profitabilityMonth, averageNetBurn } = simResult;

  // Evaluate health grade
  const health = evaluateRunwayHealth(runwayMonths);

  // Detect burn spikes
  const burnSpike = detectBurnSpike(projection);

  // Analyze trend
  const burnTrend = analyzeBurnTrend(projection);

  // Current net burn
  const currentNetBurn = simParams.monthlyRevenue - simParams.monthlyExpenses;

  // Generate alerts
  const alerts: Alert[] = [];

  // Add health alert
  alerts.push(createHealthAlert(health));

  // Add burn spike alert if detected
  if (burnSpike.detected) {
    const spikeAlert = createBurnSpikeAlert(burnSpike);
    if (spikeAlert) alerts.push(spikeAlert);
  }

  // Add profitability alert if projected
  if (profitabilityMonth !== null && profitabilityMonth < 24) {
    const profitMonth = projection[profitabilityMonth];
    if (profitMonth) {
      alerts.push(createProfitabilityAlert(profitabilityMonth, profitMonth.month));
    }
  }

  // Add growth stall alert if NRR is declining
  if (growthSummary && growthSummary.nrr < 0.95) {
    alerts.push({
      id: generateAlertId(),
      type: 'growth_stall',
      severity: 'warning',
      title: 'Growth Stall Risk',
      description: `Net Revenue Retention at ${(growthSummary.nrr * 100).toFixed(0)}% - below healthy 100% threshold`,
      timestamp: new Date(),
      metadata: { nrr: growthSummary.nrr },
      acknowledged: false,
    });
  }

  return {
    health,
    burnSpike,
    alerts,
    burnTrend,
    averageNetBurn,
    currentNetBurn,
    monthsToProfitability: profitabilityMonth,
  };
}

/**
 * Quick health check without full analysis
 */
export function quickHealthCheck(simParams: SimParams): HealthStatus {
  const result = runSimulation(simParams);
  return evaluateRunwayHealth(result.runwayMonths);
}

/**
 * Compare health between two scenarios
 */
export function compareHealth(
  paramsA: SimParams,
  paramsB: SimParams
): {
  healthA: HealthStatus;
  healthB: HealthStatus;
  delta: number;
  improved: boolean;
} {
  const healthA = quickHealthCheck(paramsA);
  const healthB = quickHealthCheck(paramsB);

  const delta = healthB.runwayMonths - healthA.runwayMonths;
  const improved = getHealthScore(healthB.grade) >= getHealthScore(healthA.grade) && delta >= 0;

  return { healthA, healthB, delta, improved };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format runway months for display
 */
export function formatRunwayMonths(months: number): string {
  if (months <= 0) return 'Depleted';
  if (months === Infinity) return 'Infinite';
  if (months > 36) return '36+ months';
  return `${months.toFixed(1)} months`;
}

/**
 * Get grade color as CSS variable
 */
export function getGradeColor(grade: HealthGrade): string {
  return GRADE_COLORS[grade].hex;
}

/**
 * Get alert icon name based on severity
 */
export function getAlertIcon(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical': return 'AlertTriangle';
    case 'warning': return 'AlertCircle';
    case 'info': return 'Info';
    default: return 'Bell';
  }
}

/**
 * Format alert timestamp for display
 */
export function formatAlertTime(timestamp: Date): string {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ============================================================================
// EXPORT DEFAULT SERVICE OBJECT
// ============================================================================

const BurnMonitor = {
  // Core functions
  evaluateRunwayHealth,
  detectBurnSpike,
  analyzeBurnTrend,
  analyzeBurn,
  quickHealthCheck,
  compareHealth,

  // Alert functions
  createHealthAlert,
  createBurnSpikeAlert,
  createProfitabilityAlert,

  // Utilities
  getHealthScore,
  formatRunwayMonths,
  getGradeColor,
  getAlertIcon,
  formatAlertTime,

  // Constants
  RUNWAY_THRESHOLDS,
  GRADE_COLORS,
};

export default BurnMonitor;




