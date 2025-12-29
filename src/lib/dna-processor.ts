export type ProcessingStage = 'idle' | 'decoding' | 'mapping' | 'simulating' | 'complete' | 'error';

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface FinancialRecord {
  date: string;
  revenue: number;
  expenses: number;
  category?: string;
}

export interface FinancialAnalysis {
  runwayMonths: number;
  grade: Grade;
  gradeLabel: string;
  monthlyBurn: number;
  monthlyRevenue: number;
  cashOnHand: number;
  profitMargin: number;
  burnMultiple: number;
  revenueGrowth: number;
  expenseGrowth: number;
  revenueTrend: Array<{ month: string; revenue: number; expenses: number }>;
  insight: string;
  processedAt: Date;
}

export interface ProcessingProgress {
  stage: ProcessingStage;
  message: string;
  progress: number;
}

const STAGE_MESSAGES: Record<ProcessingStage, string> = {
  idle: '',
  decoding: 'Parsing Financial DNA Strings...',
  mapping: 'Sequencing Revenue Genome...',
  simulating: 'Simulating Survival Horizon...',
  complete: 'Analysis Complete',
  error: 'Processing Error',
};

const GRADE_LABELS: Record<Grade, string> = {
  A: 'Exceptional',
  B: 'Strong fundamentals',
  C: 'Watch closely',
  D: 'Critical attention needed',
  F: 'Immediate action required',
};

export function calculateGrade(
  runwayMonths: number,
  profitMargin: number,
  monthlyBurn: number,
  cashOnHand: number
): Grade {
  if (monthlyBurn === 0 && cashOnHand > 0) return 'A';
  if (runwayMonths > 36) return profitMargin >= 0 ? 'A' : 'B';
  if (runwayMonths >= 18) return profitMargin >= 10 ? 'A' : 'B';
  if (runwayMonths >= 12) return profitMargin >= 0 ? 'B' : 'C';
  if (runwayMonths >= 6) return 'C';
  if (runwayMonths >= 3) return 'D';
  return 'F';
}

export function generateInsight(analysis: Omit<FinancialAnalysis, 'insight' | 'processedAt'>): string {
  const { runwayMonths, profitMargin, revenueGrowth, expenseGrowth, burnMultiple, grade } = analysis;

  if (grade === 'A') {
    if (profitMargin > 20) {
      return `Strong profitability at ${profitMargin.toFixed(1)}% margin. Consider reinvesting in growth while maintaining this healthy position.`;
    }
    return `Excellent runway of ${runwayMonths.toFixed(1)} months with solid fundamentals. You have time to execute your growth strategy.`;
  }

  if (grade === 'B') {
    if (revenueGrowth > expenseGrowth) {
      return `Revenue growth of ${(revenueGrowth * 100).toFixed(0)}% is outpacing expenses at ${(expenseGrowth * 100).toFixed(0)}%. Maintain this trajectory to extend runway.`;
    }
    return `Solid position with ${runwayMonths.toFixed(1)} months runway. Focus on accelerating revenue to improve margins.`;
  }

  if (grade === 'C') {
    if (burnMultiple > 2) {
      return `Burn multiple of ${burnMultiple.toFixed(1)}x is elevated. Consider optimizing spend efficiency while maintaining growth.`;
    }
    return `${runwayMonths.toFixed(1)} months runway requires attention. Evaluate opportunities to reduce burn or accelerate revenue.`;
  }

  if (grade === 'D') {
    return `Critical: Only ${runwayMonths.toFixed(1)} months runway. Immediate action needed - consider cost reduction or fundraising.`;
  }

  return `Urgent: Runway is critically low at ${runwayMonths.toFixed(1)} months. Prioritize survival - cut non-essential costs immediately.`;
}

export function parseCSV(content: string): FinancialRecord[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].toLowerCase().split(',').map((h) => h.trim());
  const dateIdx = headers.findIndex((h) => h.includes('date'));
  const revenueIdx = headers.findIndex((h) => h.includes('revenue') || h.includes('income'));
  const expenseIdx = headers.findIndex((h) => h.includes('expense') || h.includes('cost') || h.includes('spend'));
  const categoryIdx = headers.findIndex((h) => h.includes('category') || h.includes('type'));

  if (dateIdx === -1 || (revenueIdx === -1 && expenseIdx === -1)) {
    throw new Error('CSV must contain date and revenue/expense columns');
  }

  const records: FinancialRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    if (values.length < Math.max(dateIdx, revenueIdx, expenseIdx) + 1) continue;

    const revenue = revenueIdx >= 0 ? parseFloat(values[revenueIdx].replace(/[$,]/g, '')) || 0 : 0;
    const expenses = expenseIdx >= 0 ? parseFloat(values[expenseIdx].replace(/[$,]/g, '')) || 0 : 0;

    records.push({
      date: values[dateIdx],
      revenue,
      expenses,
      category: categoryIdx >= 0 ? values[categoryIdx] : undefined,
    });
  }

  return records;
}

export function aggregateByMonth(records: FinancialRecord[]): Map<string, { revenue: number; expenses: number }> {
  const monthly = new Map<string, { revenue: number; expenses: number }>();

  for (const record of records) {
    const date = new Date(record.date);
    if (isNaN(date.getTime())) continue;

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthly.get(key) || { revenue: 0, expenses: 0 };

    monthly.set(key, {
      revenue: existing.revenue + record.revenue,
      expenses: existing.expenses + record.expenses,
    });
  }

  return monthly;
}

export function calculateGrowthRate(values: number[]): number {
  if (values.length < 2) return 0;
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  if (avgFirst === 0) return avgSecond > 0 ? 1 : 0;
  return (avgSecond - avgFirst) / avgFirst;
}

export function sanitizeFinancialData(data: Partial<FinancialAnalysis>): FinancialAnalysis {
  const monthlyBurn = Math.max(0, data.monthlyBurn ?? 0);
  const monthlyRevenue = Math.max(0, data.monthlyRevenue ?? 0);
  const cashOnHand = Math.max(0, data.cashOnHand ?? 0);

  const netBurn = monthlyBurn - monthlyRevenue;
  let runwayMonths = netBurn > 0 ? cashOnHand / netBurn : Infinity;
  if (!isFinite(runwayMonths) || runwayMonths < 0) runwayMonths = monthlyRevenue >= monthlyBurn ? 999 : 0;
  runwayMonths = Math.min(runwayMonths, 999);

  const profitMargin = monthlyRevenue > 0 ? ((monthlyRevenue - monthlyBurn) / monthlyRevenue) * 100 : 0;
  const burnMultiple = monthlyRevenue > 0 ? monthlyBurn / monthlyRevenue : Infinity;

  const grade = calculateGrade(runwayMonths, profitMargin, monthlyBurn, cashOnHand);

  const analysis: Omit<FinancialAnalysis, 'insight' | 'processedAt'> = {
    runwayMonths,
    grade,
    gradeLabel: GRADE_LABELS[grade],
    monthlyBurn,
    monthlyRevenue,
    cashOnHand,
    profitMargin,
    burnMultiple: isFinite(burnMultiple) ? burnMultiple : 0,
    revenueGrowth: data.revenueGrowth ?? 0,
    expenseGrowth: data.expenseGrowth ?? 0,
    revenueTrend: data.revenueTrend ?? [],
  };

  return {
    ...analysis,
    insight: generateInsight(analysis),
    processedAt: new Date(),
  };
}

export async function processFinancialData(
  csvContent: string,
  cashOnHand: number,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<FinancialAnalysis> {
  const updateProgress = (stage: ProcessingStage, progress: number) => {
    onProgress?.({ stage, message: STAGE_MESSAGES[stage], progress });
  };

  updateProgress('decoding', 10);
  await sleep(300);

  const records = parseCSV(csvContent);
  if (records.length === 0) {
    throw new Error('No valid records found in CSV');
  }

  updateProgress('mapping', 40);
  await sleep(300);

  const monthly = aggregateByMonth(records);
  const sortedMonths = Array.from(monthly.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  const revenues = sortedMonths.map(([, data]) => data.revenue);
  const expenses = sortedMonths.map(([, data]) => data.expenses);

  const totalRevenue = revenues.reduce((a, b) => a + b, 0);
  const totalExpenses = expenses.reduce((a, b) => a + b, 0);
  const monthCount = sortedMonths.length || 1;

  const monthlyRevenue = totalRevenue / monthCount;
  const monthlyBurn = totalExpenses / monthCount;

  updateProgress('simulating', 70);
  await sleep(300);

  const revenueGrowth = calculateGrowthRate(revenues);
  const expenseGrowth = calculateGrowthRate(expenses);

  const revenueTrend = sortedMonths.slice(-6).map(([key, data]) => {
    const [year, month] = key.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      month: monthNames[parseInt(month) - 1],
      revenue: data.revenue,
      expenses: data.expenses,
    };
  });

  updateProgress('complete', 100);

  return sanitizeFinancialData({
    monthlyBurn,
    monthlyRevenue,
    cashOnHand,
    revenueGrowth,
    expenseGrowth,
    revenueTrend,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getStageMessage(stage: ProcessingStage): string {
  return STAGE_MESSAGES[stage];
}

export function getGradeColor(grade: Grade): string {
  const colors: Record<Grade, string> = {
    A: 'text-success',
    B: 'text-cyan-electric',
    C: 'text-warning',
    D: 'text-orange-500',
    F: 'text-danger',
  };
  return colors[grade];
}
