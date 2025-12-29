import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  Target, 
  Users, 
  DollarSign, 
  Percent,
  BarChart3,
  Save,
  RotateCcw,
  Loader2,
  Check,
  Zap,
  Shield,
  Rocket,
  Info
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/simulator-engine';
import { saveSimulationSnapshot } from '../lib/api';
import { MotionCard, MotionButton } from '../components/ui/MotionCard';
import { useAppStore } from '../lib/store';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

interface GrowthParams {
  currentMRR: number;
  monthlyGrowthRate: number; // as decimal (0.05 = 5%)
  churnRate: number; // as decimal (0.02 = 2%)
  arpa: number; // Average Revenue Per Account
  newCustomersPerMonth: number;
  expansionRate: number; // as decimal (0.01 = 1%)
}

interface ScenarioConfig {
  id: 'conservative' | 'base' | 'optimistic';
  label: string;
  icon: typeof Shield;
  color: string;
  growthMultiplier: number;
  churnMultiplier: number;
  description: string;
}

interface ProjectionPoint {
  month: string;
  monthIndex: number;
  conservative: number;
  base: number;
  optimistic: number;
  target: number;
  arr: number;
}

const SCENARIOS: ScenarioConfig[] = [
  {
    id: 'conservative',
    label: 'Conservative',
    icon: Shield,
    color: '#FFB800', // warning
    growthMultiplier: 0.7,
    churnMultiplier: 1.3,
    description: 'Lower growth, higher churn',
  },
  {
    id: 'base',
    label: 'Base Case',
    icon: Target,
    color: '#00D4FF', // cyan-electric
    growthMultiplier: 1.0,
    churnMultiplier: 1.0,
    description: 'Current trajectory',
  },
  {
    id: 'optimistic',
    label: 'Optimistic',
    icon: Rocket,
    color: '#00FF88', // success
    growthMultiplier: 1.4,
    churnMultiplier: 0.7,
    description: 'Accelerated growth, reduced churn',
  },
];

const DEFAULT_PARAMS: GrowthParams = {
  currentMRR: 85000,
  monthlyGrowthRate: 0.08, // 8%
  churnRate: 0.03, // 3%
  arpa: 500,
  newCustomersPerMonth: 15,
  expansionRate: 0.02, // 2%
};

const PROJECTION_MONTHS = 24;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: 'easeOut' },
  }),
};

// ============================================================================
// GROWTH CALCULATION ENGINE
// ============================================================================

/**
 * SaaS MRR Formula:
 * Next Month MRR = Current MRR + New MRR + Expansion MRR - Churn MRR
 */
function calculateMRRProjection(
  params: GrowthParams,
  months: number,
  growthMultiplier: number = 1,
  churnMultiplier: number = 1
): number[] {
  const projection: number[] = [];
  let mrr = params.currentMRR;

  for (let i = 0; i < months; i++) {
    // Apply multipliers for scenario modeling
    const effectiveGrowth = params.monthlyGrowthRate * growthMultiplier;
    const effectiveChurn = params.churnRate * churnMultiplier;

    // New MRR from new customers
    const newMRR = params.newCustomersPerMonth * params.arpa;

    // Expansion MRR from existing customers (upsells)
    const expansionMRR = mrr * params.expansionRate;

    // Churn MRR lost
    const churnMRR = mrr * effectiveChurn;

    // Calculate next month's MRR
    mrr = mrr + newMRR + expansionMRR - churnMRR;

    // Apply compound growth on top
    mrr = mrr * (1 + effectiveGrowth / 12);

    projection.push(Math.max(0, mrr));
  }

  return projection;
}

/**
 * CAGR (Compound Annual Growth Rate) Calculator
 * CAGR = (Ending Value / Beginning Value)^(1/n) - 1
 */
function calculateCAGR(startValue: number, endValue: number, years: number): number {
  if (startValue <= 0 || years <= 0) return 0;
  return Math.pow(endValue / startValue, 1 / years) - 1;
}

/**
 * Calculate Net Revenue Retention (NRR)
 * NRR = (Starting MRR + Expansion - Churn) / Starting MRR
 */
function calculateNRR(expansionRate: number, churnRate: number): number {
  return 1 + expansionRate - churnRate;
}

// ============================================================================
// CUSTOM TOOLTIP
// ============================================================================

const CustomTooltip = ({ 
  active, 
  payload, 
  label 
}: { 
  active?: boolean; 
  payload?: Array<{ value: number; name: string; color: string; dataKey: string }>; 
  label?: string 
}) => {
  if (!active || !payload) return null;
  return (
    <div className="glass-card p-4 border border-white/20 min-w-[200px]">
      <p className="text-gray-400 text-xs mb-3 font-semibold">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4 mb-1">
          <span className="text-sm" style={{ color: entry.color }}>{entry.name}</span>
          <span className="text-sm font-semibold" style={{ color: entry.color }}>
            {formatCurrency(entry.value, true)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function GrowthTracker() {
  const { currentAnalysis } = useAppStore();

  // Initialize from current analysis or defaults
  const [params, setParams] = useState<GrowthParams>(() => ({
    ...DEFAULT_PARAMS,
    currentMRR: currentAnalysis?.monthlyRevenue || DEFAULT_PARAMS.currentMRR,
  }));

  const [activeScenarios, setActiveScenarios] = useState<Set<'conservative' | 'base' | 'optimistic'>>(
    new Set(['conservative', 'base', 'optimistic'])
  );
  const [targetARR, setTargetARR] = useState<number>(2000000); // $2M ARR target
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  // Generate projections for all scenarios
  const projections = useMemo(() => {
    const conservative = calculateMRRProjection(
      params, 
      PROJECTION_MONTHS, 
      SCENARIOS[0].growthMultiplier, 
      SCENARIOS[0].churnMultiplier
    );
    const base = calculateMRRProjection(
      params, 
      PROJECTION_MONTHS, 
      SCENARIOS[1].growthMultiplier, 
      SCENARIOS[1].churnMultiplier
    );
    const optimistic = calculateMRRProjection(
      params, 
      PROJECTION_MONTHS, 
      SCENARIOS[2].growthMultiplier, 
      SCENARIOS[2].churnMultiplier
    );

    const startMonth = new Date().getMonth();

    return Array.from({ length: PROJECTION_MONTHS }, (_, i) => {
      const monthName = MONTH_LABELS[(startMonth + i) % 12];
      const year = Math.floor((startMonth + i) / 12);
      
      return {
        month: year > 0 ? `${monthName} Y${year + 1}` : monthName,
        monthIndex: i,
        conservative: conservative[i],
        base: base[i],
        optimistic: optimistic[i],
        target: targetARR / 12, // Monthly target from ARR
        arr: base[i] * 12, // ARR for base case
      };
    });
  }, [params, targetARR]);

  // Key metrics
  const metrics = useMemo(() => {
    const currentARR = params.currentMRR * 12;
    const projectedARR12 = projections[11]?.base * 12 || 0;
    const projectedARR24 = projections[23]?.base * 12 || 0;
    
    const cagr12 = calculateCAGR(currentARR, projectedARR12, 1);
    const cagr24 = calculateCAGR(currentARR, projectedARR24, 2);
    
    const nrr = calculateNRR(params.expansionRate, params.churnRate);
    
    // Find month when target ARR is reached
    const targetMonthIndex = projections.findIndex(p => p.base * 12 >= targetARR);
    const monthsToTarget = targetMonthIndex >= 0 ? targetMonthIndex + 1 : null;

    // Calculate net new MRR (growth - churn)
    const grossNewMRR = params.newCustomersPerMonth * params.arpa;
    const churnMRR = params.currentMRR * params.churnRate;
    const expansionMRR = params.currentMRR * params.expansionRate;
    const netNewMRR = grossNewMRR + expansionMRR - churnMRR;

    return {
      currentARR,
      projectedARR12,
      projectedARR24,
      cagr12,
      cagr24,
      nrr,
      monthsToTarget,
      grossNewMRR,
      churnMRR,
      expansionMRR,
      netNewMRR,
    };
  }, [params, projections, targetARR]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const updateParam = useCallback(<K extends keyof GrowthParams>(key: K, value: GrowthParams[K]) => {
    setParams(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleScenario = useCallback((scenarioId: 'conservative' | 'base' | 'optimistic') => {
    setActiveScenarios(prev => {
      const next = new Set(prev);
      if (next.has(scenarioId)) {
        // Don't allow removing all scenarios
        if (next.size > 1) {
          next.delete(scenarioId);
        }
      } else {
        next.add(scenarioId);
      }
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setParams({
      ...DEFAULT_PARAMS,
      currentMRR: currentAnalysis?.monthlyRevenue || DEFAULT_PARAMS.currentMRR,
    });
    setActiveScenarios(new Set(['conservative', 'base', 'optimistic']));
    toast.info('Growth Model Reset', {
      description: 'Parameters restored to baseline.',
    });
  }, [currentAnalysis]);

  const handleSave = useCallback(async () => {
    setSaveStatus('saving');

    // Create simulation params from growth data
    const simParams = {
      cashOnHand: 0, // Not applicable for growth tracking
      monthlyExpenses: 0,
      monthlyRevenue: params.currentMRR,
      expenseGrowth: 0,
      revenueGrowth: params.monthlyGrowthRate * 12, // Annualized
    };

    const simResult = {
      projection: projections.map(p => ({
        month: p.month,
        monthIndex: p.monthIndex,
        cash: p.base * 12, // Store ARR
        revenue: p.base,
        expenses: 0,
        netBurn: 0,
        cumulative: 0,
      })),
      runwayMonths: metrics.monthsToTarget || 24,
      profitabilityMonth: null,
      finalCash: metrics.projectedARR24,
      totalRevenue: projections.reduce((sum, p) => sum + p.base, 0),
      totalExpenses: 0,
      averageNetBurn: 0,
    };

    const response = await saveSimulationSnapshot(
      simParams,
      simResult,
      `Growth Forecast: ${(params.monthlyGrowthRate * 100).toFixed(0)}% MoM`,
      true
    );

    if (response.error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [params, projections, metrics]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            <span className="gradient-text-cyan">Growth Tracker</span>
          </h1>
          <p className="text-gray-400 mt-1">SaaS revenue forecasting & scenario modeling</p>
        </div>
        <div className="flex gap-3">
          <MotionButton variant="secondary" onClick={handleReset} className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Reset
          </MotionButton>
          <MotionButton 
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className={`flex items-center gap-2 ${
              saveStatus === 'saved' ? 'bg-success text-charcoal' : ''
            } ${saveStatus === 'error' ? 'bg-danger/20 text-danger' : ''}`}
          >
            {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
            {saveStatus === 'saved' && <Check className="w-4 h-4" />}
            {saveStatus === 'idle' && <Save className="w-4 h-4" />}
            {saveStatus === 'error' && <Save className="w-4 h-4" />}
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Forecast'}
          </MotionButton>
        </div>
      </header>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-5 gap-4">
        <MotionCard className="p-4 text-center" custom={0} initial="hidden" animate="visible" variants={cardVariants}>
          <div className="text-sm text-gray-400 mb-1">Current ARR</div>
          <motion.div 
            className="text-2xl font-bold text-cyan-electric"
            key={metrics.currentARR}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            {formatCurrency(metrics.currentARR, true)}
          </motion.div>
        </MotionCard>

        <MotionCard className="p-4 text-center" custom={1} initial="hidden" animate="visible" variants={cardVariants}>
          <div className="text-sm text-gray-400 mb-1">12-Month ARR</div>
          <motion.div 
            className="text-2xl font-bold text-success"
            key={metrics.projectedARR12}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            {formatCurrency(metrics.projectedARR12, true)}
          </motion.div>
        </MotionCard>

        <MotionCard className="p-4 text-center" custom={2} initial="hidden" animate="visible" variants={cardVariants}>
          <div className="text-sm text-gray-400 mb-1">CAGR (1Y)</div>
          <motion.div 
            className={`text-2xl font-bold ${metrics.cagr12 >= 0 ? 'text-success' : 'text-danger'}`}
            key={metrics.cagr12}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            {(metrics.cagr12 * 100).toFixed(0)}%
          </motion.div>
        </MotionCard>

        <MotionCard className="p-4 text-center" custom={3} initial="hidden" animate="visible" variants={cardVariants}>
          <div className="text-sm text-gray-400 mb-1">Net Revenue Retention</div>
          <motion.div 
            className={`text-2xl font-bold ${metrics.nrr >= 1 ? 'text-success' : 'text-warning'}`}
            key={metrics.nrr}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            {(metrics.nrr * 100).toFixed(0)}%
          </motion.div>
        </MotionCard>

        <MotionCard className="p-4 text-center" custom={4} initial="hidden" animate="visible" variants={cardVariants}>
          <div className="text-sm text-gray-400 mb-1">Months to Target</div>
          <motion.div 
            className={`text-2xl font-bold ${metrics.monthsToTarget ? 'text-violet-vivid' : 'text-gray-400'}`}
            key={metrics.monthsToTarget}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            {metrics.monthsToTarget ? `${metrics.monthsToTarget}mo` : '24+'}
          </motion.div>
        </MotionCard>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left Panel - Controls */}
        <div className="col-span-4 space-y-4">
          {/* Growth Levers */}
          <MotionCard className="p-6" custom={5} initial="hidden" animate="visible" variants={cardVariants}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-electric to-violet-vivid flex items-center justify-center">
                <Zap className="w-5 h-5 text-charcoal" />
              </div>
              <div>
                <h3 className="font-semibold">Growth Levers</h3>
                <p className="text-sm text-gray-400">Adjust to see impact</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Current MRR */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Current MRR
                  </label>
                  <span className="text-cyan-electric font-semibold">{formatCurrency(params.currentMRR)}</span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="500000"
                  step="5000"
                  value={params.currentMRR}
                  onChange={(e) => updateParam('currentMRR', parseInt(e.target.value))}
                  className="w-full accent-cyan-electric"
                />
              </div>

              {/* Monthly Growth Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Monthly Growth
                  </label>
                  <span className="text-success font-semibold">{(params.monthlyGrowthRate * 100).toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="0.5"
                  value={params.monthlyGrowthRate * 100}
                  onChange={(e) => updateParam('monthlyGrowthRate', parseFloat(e.target.value) / 100)}
                  className="w-full accent-success"
                />
              </div>

              {/* Churn Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400 flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    Monthly Churn
                  </label>
                  <span className="text-danger font-semibold">{(params.churnRate * 100).toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.5"
                  value={params.churnRate * 100}
                  onChange={(e) => updateParam('churnRate', parseFloat(e.target.value) / 100)}
                  className="w-full accent-danger"
                />
              </div>

              {/* ARPA */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    ARPA (Avg Revenue/Account)
                  </label>
                  <span className="text-violet-vivid font-semibold">{formatCurrency(params.arpa)}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="5000"
                  step="50"
                  value={params.arpa}
                  onChange={(e) => updateParam('arpa', parseInt(e.target.value))}
                  className="w-full accent-violet-vivid"
                />
              </div>

              {/* New Customers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    New Customers/Month
                  </label>
                  <span className="text-cyan-electric font-semibold">{params.newCustomersPerMonth}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={params.newCustomersPerMonth}
                  onChange={(e) => updateParam('newCustomersPerMonth', parseInt(e.target.value))}
                  className="w-full accent-cyan-electric"
                />
              </div>

              {/* Expansion Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Expansion Rate
                  </label>
                  <span className="text-warning font-semibold">{(params.expansionRate * 100).toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={params.expansionRate * 100}
                  onChange={(e) => updateParam('expansionRate', parseFloat(e.target.value) / 100)}
                  className="w-full accent-warning"
                />
              </div>
            </div>
          </MotionCard>

          {/* MRR Waterfall */}
          <MotionCard className="p-6" custom={6} initial="hidden" animate="visible" variants={cardVariants}>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-gray-400" />
              Monthly MRR Movement
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">+ New MRR</span>
                <span className="font-semibold text-success">+{formatCurrency(metrics.grossNewMRR)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">+ Expansion</span>
                <span className="font-semibold text-warning">+{formatCurrency(metrics.expansionMRR)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">− Churn</span>
                <span className="font-semibold text-danger">−{formatCurrency(metrics.churnMRR)}</span>
              </div>
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-sm font-semibold">= Net New MRR</span>
                <span className={`font-bold text-lg ${metrics.netNewMRR >= 0 ? 'text-cyan-electric' : 'text-danger'}`}>
                  {metrics.netNewMRR >= 0 ? '+' : ''}{formatCurrency(metrics.netNewMRR)}
                </span>
              </div>
            </div>
          </MotionCard>
        </div>

        {/* Right Panel - Chart & Scenarios */}
        <div className="col-span-8 space-y-4">
          {/* Scenario Toggles */}
          <MotionCard className="p-4" custom={7} initial="hidden" animate="visible" variants={cardVariants}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-violet-vivid" />
                <span className="font-semibold">Scenario Comparison</span>
              </div>
              <div className="flex gap-2">
                {SCENARIOS.map((scenario) => {
                  const Icon = scenario.icon;
                  const isActive = activeScenarios.has(scenario.id);
                  return (
                    <motion.button
                      key={scenario.id}
                      onClick={() => toggleScenario(scenario.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive 
                          ? 'bg-white/10 border border-white/20' 
                          : 'bg-white/5 text-gray-500 border border-transparent'
                      }`}
                      style={{ color: isActive ? scenario.color : undefined }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Icon className="w-4 h-4" />
                      {scenario.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </MotionCard>

          {/* Main Chart */}
          <MotionCard 
            variant="elevated" 
            className="p-6" 
            custom={8} 
            initial="hidden" 
            animate="visible" 
            variants={cardVariants}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">24-Month MRR Projection</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Target ARR:</span>
                  <input
                    type="text"
                    value={formatCurrency(targetARR)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value.replace(/[$,]/g, '')) || 0;
                      setTargetARR(val);
                    }}
                    className="w-28 bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm text-violet-vivid font-semibold focus:border-violet-vivid/50 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={projections}>
                  <defs>
                    <linearGradient id="baseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                    </linearGradient>
                    <filter id="glowCyan" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  
                  <XAxis 
                    dataKey="month" 
                    stroke="#555" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#555" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(v) => formatCurrency(v, true)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />

                  {/* Target line (Vivid Violet) */}
                  <ReferenceLine 
                    y={targetARR / 12} 
                    stroke="#8B5CF6" 
                    strokeDasharray="5 5" 
                    strokeWidth={2}
                    label={{ 
                      value: 'Target', 
                      position: 'right', 
                      fill: '#8B5CF6',
                      fontSize: 12 
                    }}
                  />

                  {/* Base case with area fill */}
                  {activeScenarios.has('base') && (
                    <Area
                      type="monotone"
                      dataKey="base"
                      name="Base Case"
                      stroke="#00D4FF"
                      strokeWidth={3}
                      fill="url(#baseGradient)"
                      filter="url(#glowCyan)"
                    />
                  )}

                  {/* Conservative (dashed) */}
                  {activeScenarios.has('conservative') && (
                    <Line
                      type="monotone"
                      dataKey="conservative"
                      name="Conservative"
                      stroke="#FFB800"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  )}

                  {/* Optimistic (solid bright) */}
                  {activeScenarios.has('optimistic') && (
                    <Line
                      type="monotone"
                      dataKey="optimistic"
                      name="Optimistic"
                      stroke="#00FF88"
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </MotionCard>

          {/* Scenario Details */}
          <div className="grid grid-cols-3 gap-4">
            {SCENARIOS.map((scenario, i) => {
              const isActive = activeScenarios.has(scenario.id);
              const Icon = scenario.icon;
              const finalMRR = projections[23]?.[scenario.id] || 0;
              const finalARR = finalMRR * 12;
              
              return (
                <MotionCard
                  key={scenario.id}
                  className={`p-4 cursor-pointer transition-all ${
                    isActive ? 'border-white/20' : 'opacity-50'
                  }`}
                  custom={9 + i}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                  onClick={() => toggleScenario(scenario.id)}
                  style={{ borderColor: isActive ? `${scenario.color}40` : undefined }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${scenario.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: scenario.color }} />
                    </div>
                    <div>
                      <div className="font-semibold">{scenario.label}</div>
                      <div className="text-xs text-gray-400">{scenario.description}</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: scenario.color }}>
                    {formatCurrency(finalARR, true)}
                  </div>
                  <div className="text-xs text-gray-400">24-month ARR</div>
                </MotionCard>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}


