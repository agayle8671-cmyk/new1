export interface SimParams {
  cashOnHand: number;
  monthlyExpenses: number;
  monthlyRevenue: number;
  expenseGrowth: number;
  revenueGrowth: number;
}

export interface ProjectionPoint {
  month: string;
  monthIndex: number;
  cash: number;
  revenue: number;
  expenses: number;
  netBurn: number;
  cumulative: number;
}

export interface SimulationResult {
  projection: ProjectionPoint[];
  runwayMonths: number;
  profitabilityMonth: number | null;
  finalCash: number;
  totalRevenue: number;
  totalExpenses: number;
  averageNetBurn: number;
}

export interface Preset {
  id: string;
  label: string;
  description: string;
  modifications: Partial<SimParams> & { cashBoost?: number; expenseMultiplier?: number; revenueGrowthBoost?: number };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PROJECTION_MONTHS = 24;

export const DEFAULT_PARAMS: SimParams = {
  cashOnHand: 1200000,
  monthlyExpenses: 60000,
  monthlyRevenue: 85000,
  expenseGrowth: 0.03,
  revenueGrowth: 0.18,
};

export const PRESETS: Preset[] = [
  {
    id: 'hire',
    label: 'Big Hire',
    description: '+20% Burn, add key talent',
    modifications: { expenseMultiplier: 1.2 },
  },
  {
    id: 'blitz',
    label: 'Blitzscale',
    description: '+30% Burn, +40% Growth',
    modifications: { expenseMultiplier: 1.3, revenueGrowthBoost: 0.4 },
  },
  {
    id: 'winter',
    label: 'Winter Mode',
    description: '-15% Burn, extend runway',
    modifications: { expenseMultiplier: 0.85 },
  },
  {
    id: 'raise',
    label: 'Post-Raise',
    description: '+$500K Cash, +10% Burn',
    modifications: { cashBoost: 500000, expenseMultiplier: 1.1 },
  },
];

export function applyPreset(params: SimParams, presetId: string): SimParams {
  const preset = PRESETS.find((p) => p.id === presetId);
  if (!preset) return params;

  const { cashBoost = 0, expenseMultiplier = 1, revenueGrowthBoost = 0 } = preset.modifications;

  return {
    ...params,
    cashOnHand: params.cashOnHand + cashBoost,
    monthlyExpenses: Math.round(params.monthlyExpenses * expenseMultiplier),
    revenueGrowth: Math.min(1, params.revenueGrowth + revenueGrowthBoost),
  };
}

export function runSimulation(params: SimParams, months: number = PROJECTION_MONTHS): SimulationResult {
  const projection: ProjectionPoint[] = [];
  let cash = params.cashOnHand;
  let runwayMonths = 0;
  let profitabilityMonth: number | null = null;
  let totalRevenue = 0;
  let totalExpenses = 0;
  let runwayFound = false;

  const startMonth = new Date().getMonth();

  for (let t = 0; t < months; t++) {
    const monthlyGrowthFactor = Math.pow(1 + params.revenueGrowth / 12, t);
    const expenseGrowthFactor = Math.pow(1 + params.expenseGrowth / 12, t);

    const revenue = params.monthlyRevenue * monthlyGrowthFactor;
    const expenses = params.monthlyExpenses * expenseGrowthFactor;
    const netBurn = expenses - revenue;

    cash = cash - netBurn;

    totalRevenue += revenue;
    totalExpenses += expenses;

    const monthName = MONTHS[(startMonth + t) % 12];
    const year = Math.floor((startMonth + t) / 12);

    projection.push({
      month: year > 0 ? `${monthName} Y${year + 1}` : monthName,
      monthIndex: t,
      cash: Math.max(0, cash),
      revenue,
      expenses,
      netBurn,
      cumulative: totalRevenue - totalExpenses,
    });

    if (cash > 0 && !runwayFound) {
      runwayMonths = t + 1;
    } else if (cash <= 0 && !runwayFound) {
      runwayFound = true;
      runwayMonths = t;
    }

    if (revenue >= expenses && profitabilityMonth === null) {
      profitabilityMonth = t;
    }
  }

  if (!runwayFound) {
    runwayMonths = months;
  }

  const averageNetBurn = totalExpenses / months - totalRevenue / months;

  return {
    projection,
    runwayMonths,
    profitabilityMonth,
    finalCash: Math.max(0, cash),
    totalRevenue,
    totalExpenses,
    averageNetBurn,
  };
}

export function calculateRunway(cashOnHand: number, monthlyBurn: number, monthlyRevenue: number): number {
  const netBurn = monthlyBurn - monthlyRevenue;
  if (netBurn <= 0) return Infinity;
  return cashOnHand / netBurn;
}

export function formatCurrency(value: number, compact: boolean = false): string {
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

export function formatRunway(months: number): string {
  if (months >= 24) return '24+';
  if (months === Infinity) return 'Infinite';
  return months.toFixed(1);
}

export function compareScenarios(a: SimulationResult, b: SimulationResult): {
  runwayDelta: number;
  profitabilityDelta: number | null;
  cashDelta: number;
} {
  return {
    runwayDelta: b.runwayMonths - a.runwayMonths,
    profitabilityDelta:
      a.profitabilityMonth !== null && b.profitabilityMonth !== null
        ? b.profitabilityMonth - a.profitabilityMonth
        : null,
    cashDelta: b.finalCash - a.finalCash,
  };
}

export function mergeProjections(
  a: ProjectionPoint[],
  b: ProjectionPoint[]
): Array<{ month: string; scenarioA: number; scenarioB: number }> {
  return a.map((point, i) => ({
    month: point.month,
    scenarioA: point.cash,
    scenarioB: b[i]?.cash ?? 0,
  }));
}
