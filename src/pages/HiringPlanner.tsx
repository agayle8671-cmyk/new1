import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Code,
  Megaphone,
  HeadphonesIcon,
  Settings2,
  Plus,
  Minus,
  AlertTriangle,
  TrendingDown,
  Calendar,
  DollarSign,
  Save,
  RotateCcw,
  Loader2,
  Check,
  ArrowRight,
  Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, Legend } from 'recharts';
import { toast } from 'sonner';
import {
  SimParams,
  runSimulation,
  formatCurrency,
  formatRunway,
  DEFAULT_PARAMS
} from '../lib/simulator-engine';
import { saveSimulationSnapshot, saveAlert } from '../lib/api';
import { MotionCard, MotionButton } from '../components/ui/MotionCard';
import { useAppStore } from '../lib/store';
import BurnMonitor, { type HealthGrade } from '../lib/services/BurnMonitor';

// ============================================================================
// TYPES & CONSTANTS (from Architecture Report Section 5)
// ============================================================================

interface HireRole {
  id: string;
  name: string;
  icon: typeof Code;
  monthlyCost: number;
  color: string;
  bgColor: string;
  description: string;
}

interface HirePlan {
  roleId: string;
  count: number;
  startMonth: number; // 0-11 for months 1-12
}

const ROLES: HireRole[] = [
  {
    id: 'engineers',
    name: 'Engineers',
    icon: Code,
    monthlyCost: 12000,
    color: '#00D4FF', // cyan-electric
    bgColor: 'bg-cyan-electric/20',
    description: 'Software engineers, DevOps, QA',
  },
  {
    id: 'sales',
    name: 'Sales',
    icon: Megaphone,
    monthlyCost: 8000,
    color: '#00FF88', // success
    bgColor: 'bg-success/20',
    description: 'Account executives, SDRs',
  },
  {
    id: 'support',
    name: 'Support',
    icon: HeadphonesIcon,
    monthlyCost: 5000,
    color: '#FFB800', // warning
    bgColor: 'bg-warning/20',
    description: 'Customer success, support reps',
  },
  {
    id: 'operations',
    name: 'Operations',
    icon: Settings2,
    monthlyCost: 7000,
    color: '#8B5CF6', // violet-vivid
    bgColor: 'bg-violet-vivid/20',
    description: 'HR, finance, admin',
  },
];

const MONTH_LABELS = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: 'easeOut' },
  }),
};

// ============================================================================
// CUSTOM TOOLTIP
// ============================================================================

const CustomTooltip = ({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string
}) => {
  if (!active || !payload) return null;
  return (
    <div className="glass-card p-3 border border-white/20">
      <p className="text-gray-400 text-xs mb-2">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value, true)}
        </p>
      ))}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HiringPlanner() {
  const { simulatorParams, currentAnalysis } = useAppStore();

  // Initialize from store or defaults
  const baseParams: SimParams = simulatorParams || {
    cashOnHand: currentAnalysis?.cashOnHand || DEFAULT_PARAMS.cashOnHand,
    monthlyExpenses: currentAnalysis?.monthlyBurn || DEFAULT_PARAMS.monthlyExpenses,
    monthlyRevenue: currentAnalysis?.monthlyRevenue || DEFAULT_PARAMS.monthlyRevenue,
    expenseGrowth: currentAnalysis?.expenseGrowth || DEFAULT_PARAMS.expenseGrowth,
    revenueGrowth: currentAnalysis?.revenueGrowth || DEFAULT_PARAMS.revenueGrowth,
  };

  // Hiring plan state
  const [hirePlans, setHirePlans] = useState<HirePlan[]>(
    ROLES.map(role => ({ roleId: role.id, count: 0, startMonth: 0 }))
  );

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  // Calculate total additional monthly burn from hires
  const totalHiringCost = useMemo(() => {
    return hirePlans.reduce((total, plan) => {
      const role = ROLES.find(r => r.id === plan.roleId);
      return total + (role ? role.monthlyCost * plan.count : 0);
    }, 0);
  }, [hirePlans]);

  // Calculate hiring cost by role for chart
  const hiringBreakdown = useMemo(() => {
    return ROLES.map(role => {
      const plan = hirePlans.find(p => p.roleId === role.id);
      return {
        name: role.name,
        cost: plan ? role.monthlyCost * plan.count : 0,
        color: role.color,
        count: plan?.count || 0,
      };
    }).filter(item => item.cost > 0);
  }, [hirePlans]);

  // Calculate total headcount
  const totalHeadcount = useMemo(() => {
    return hirePlans.reduce((sum, plan) => sum + plan.count, 0);
  }, [hirePlans]);

  // Run simulations: baseline vs with hires
  const baselineResult = useMemo(() => runSimulation(baseParams, 24), [baseParams]);

  const modifiedParams = useMemo((): SimParams => ({
    ...baseParams,
    monthlyExpenses: baseParams.monthlyExpenses + totalHiringCost,
  }), [baseParams, totalHiringCost]);

  const withHiresResult = useMemo(() => {
    return runSimulation(modifiedParams, 24);
  }, [modifiedParams]);

  // Use BurnMonitor for health grading
  const baselineHealth = useMemo(() =>
    BurnMonitor.evaluateRunwayHealth(baselineResult.runwayMonths),
    [baselineResult.runwayMonths]
  );

  const withHiresHealth = useMemo(() =>
    BurnMonitor.evaluateRunwayHealth(withHiresResult.runwayMonths),
    [withHiresResult.runwayMonths]
  );

  // Calculate runway impact using BurnMonitor
  const healthComparison = useMemo(() =>
    BurnMonitor.compareHealth(baseParams, modifiedParams),
    [baseParams, modifiedParams]
  );

  const runwayDelta = healthComparison.delta;
  const isCritical = withHiresHealth.grade === 'C';
  const isWarning = withHiresHealth.grade === 'B';
  const gradeChanged = withHiresHealth.grade !== baselineHealth.grade;
  const gradeWorsened = BurnMonitor.getHealthScore(withHiresHealth.grade) < BurnMonitor.getHealthScore(baselineHealth.grade);

  // Log critical alerts when grade drops to C
  useEffect(() => {
    if (gradeWorsened && withHiresHealth.grade === 'C' && totalHeadcount > 0) {
      saveAlert({
        alertType: 'runway_critical',
        severity: 'critical',
        title: 'Hiring Plan Risk',
        description: `Adding ${totalHeadcount} hires would drop runway to ${withHiresHealth.runwayMonths.toFixed(1)} months (Grade C)`,
        runwayMonths: withHiresHealth.runwayMonths,
        healthGrade: 'C',
        metadata: {
          baselineGrade: baselineHealth.grade,
          baselineRunway: baselineHealth.runwayMonths,
          totalHiringCost,
          totalHeadcount,
        },
      });
    }
  }, [gradeWorsened, withHiresHealth.grade, withHiresHealth.runwayMonths, totalHeadcount, baselineHealth.grade, baselineHealth.runwayMonths, totalHiringCost]);

  // Build comparison chart data (12 months)
  const comparisonData = useMemo(() => {
    return MONTH_LABELS.map((label, i) => ({
      month: label,
      baseline: baselineResult.projection[i]?.cash || 0,
      withHires: withHiresResult.projection[i]?.cash || 0,
    }));
  }, [baselineResult, withHiresResult]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const updateHireCount = useCallback((roleId: string, delta: number) => {
    setHirePlans(prev => prev.map(plan => {
      if (plan.roleId === roleId) {
        const newCount = Math.max(0, Math.min(20, plan.count + delta));
        return { ...plan, count: newCount };
      }
      return plan;
    }));
  }, []);

  const updateStartMonth = useCallback((roleId: string, month: number) => {
    setHirePlans(prev => prev.map(plan => {
      if (plan.roleId === roleId) {
        return { ...plan, startMonth: month };
      }
      return plan;
    }));
  }, []);

  const handleReset = useCallback(() => {
    setHirePlans(ROLES.map(role => ({ roleId: role.id, count: 0, startMonth: 0 })));
    toast.info('Hiring Plan Reset', {
      description: 'All positions cleared.',
    });
  }, []);

  const handleSavePlan = useCallback(async () => {
    if (totalHeadcount === 0) {
      toast.warning('Empty Plan', {
        description: 'Add at least one hire to save.',
      });
      return;
    }

    setSaveStatus('saving');

    const modifiedParams: SimParams = {
      ...baseParams,
      monthlyExpenses: baseParams.monthlyExpenses + totalHiringCost,
    };

    const response = await saveSimulationSnapshot(
      modifiedParams,
      withHiresResult,
      `Hiring Plan: +${totalHeadcount} hires`,
      true
    );

    if (response.error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('saved');
      toast.success('Hiring Plan Archived', {
        description: `${totalHeadcount} hires with ${formatCurrency(totalHiringCost)}/mo added burn.`,
      });
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [baseParams, totalHiringCost, totalHeadcount, withHiresResult]);

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
            <span className="gradient-text-mixed">Hiring Planner</span>
          </h1>
          <p className="text-gray-400 mt-1">Model team growth impact on runway</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Live Health Grade */}
          <motion.div
            className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${withHiresHealth.grade === 'A' ? 'border-success/30 bg-success/10' :
              withHiresHealth.grade === 'B' ? 'border-warning/30 bg-warning/10' :
                'border-danger/30 bg-danger/10'
              }`}
            animate={gradeChanged ? {
              scale: [1, 1.05, 1],
              boxShadow: gradeWorsened
                ? ['0 0 0 0 rgba(255,68,68,0)', '0 0 20px 5px rgba(255,68,68,0.3)', '0 0 0 0 rgba(255,68,68,0)']
                : ['0 0 0 0 rgba(0,255,136,0)', '0 0 20px 5px rgba(0,255,136,0.3)', '0 0 0 0 rgba(0,255,136,0)'],
            } : {}}
            transition={{ duration: 0.5 }}
            key={withHiresHealth.grade}
          >
            <Activity className={`w-4 h-4 ${withHiresHealth.grade === 'A' ? 'text-success' :
              withHiresHealth.grade === 'B' ? 'text-warning' :
                'text-danger'
              }`} />
            <div className="text-sm">
              <span className="text-gray-400">Health: </span>
              <span className={`font-bold ${withHiresHealth.grade === 'A' ? 'text-success' :
                withHiresHealth.grade === 'B' ? 'text-warning' :
                  'text-danger'
                }`}>Grade {withHiresHealth.grade}</span>
            </div>
            {gradeChanged && totalHeadcount > 0 && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`text-xs ${gradeWorsened ? 'text-danger' : 'text-success'}`}
              >
                {gradeWorsened ? '↓ from ' : '↑ from '}{baselineHealth.grade}
              </motion.span>
            )}
          </motion.div>

          <div className="flex gap-3">
            <MotionButton variant="secondary" onClick={handleReset} className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Reset
            </MotionButton>
            <MotionButton
              onClick={handleSavePlan}
              disabled={saveStatus === 'saving' || totalHeadcount === 0}
              className={`flex items-center gap-2 ${saveStatus === 'saved' ? 'bg-success text-charcoal' : ''
                } ${saveStatus === 'error' ? 'bg-danger/20 text-danger' : ''}`}
            >
              {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
              {saveStatus === 'saved' && <Check className="w-4 h-4" />}
              {saveStatus === 'idle' && <Save className="w-4 h-4" />}
              {saveStatus === 'error' && <Save className="w-4 h-4" />}
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Plan'}
            </MotionButton>
          </div>
        </div>
      </header>

      {/* Critical Warning Banner */}
      <AnimatePresence>
        {isCritical && totalHeadcount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-4 border-danger/50 bg-danger/10 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-danger/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-danger" />
            </div>
            <div>
              <h3 className="font-semibold text-danger">Critical Runway Warning</h3>
              <p className="text-gray-400 text-sm">
                This hiring plan reduces runway to {withHiresResult.runwayMonths.toFixed(1)} months.
                Consider reducing hires or securing additional funding first.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-12 gap-4">
        {/* Role Cards */}
        <div className="col-span-5 space-y-4">
          <MotionCard
            className="p-6"
            custom={0}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-electric to-violet-vivid flex items-center justify-center">
                <Users className="w-5 h-5 text-charcoal" />
              </div>
              <div>
                <h3 className="font-semibold">Team Composition</h3>
                <p className="text-sm text-gray-400">Configure your hiring plan</p>
              </div>
            </div>

            <div className="space-y-4">
              {ROLES.map((role, index) => {
                const plan = hirePlans.find(p => p.roleId === role.id);
                const Icon = role.icon;
                const count = plan?.count || 0;

                return (
                  <motion.div
                    key={role.id}
                    className="glass-card p-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${role.bgColor} flex items-center justify-center`}>
                          <Icon className="w-5 h-5" style={{ color: role.color }} />
                        </div>
                        <div>
                          <div className="font-medium">{role.name}</div>
                          <div className="text-xs text-gray-400">{formatCurrency(role.monthlyCost)}/mo each</div>
                        </div>
                      </div>

                      {/* Counter */}
                      <div className="flex items-center gap-2">
                        <motion.button
                          onClick={() => updateHireCount(role.id, -1)}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          disabled={count === 0}
                        >
                          <Minus className="w-4 h-4" />
                        </motion.button>
                        <motion.span
                          className="w-10 text-center text-xl font-bold"
                          key={count}
                          initial={{ scale: 1.2 }}
                          animate={{ scale: 1 }}
                        >
                          {count}
                        </motion.span>
                        <motion.button
                          onClick={() => updateHireCount(role.id, 1)}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Plus className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>

                    {/* Cost preview */}
                    {count > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="pt-3 border-t border-white/10 flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-400">{count} × {formatCurrency(role.monthlyCost)}</span>
                        <span className="font-semibold" style={{ color: role.color }}>
                          {formatCurrency(role.monthlyCost * count)}/mo
                        </span>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </MotionCard>

          {/* Summary Card */}
          <MotionCard
            className="p-6"
            custom={1}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-electric/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-cyan-electric" />
              </div>
              <div>
                <div className="text-sm text-gray-400">Total Added Burn</div>
                <motion.div
                  className="text-2xl font-bold text-cyan-electric"
                  key={totalHiringCost}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                >
                  {formatCurrency(totalHiringCost)}/mo
                </motion.div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div>
                <div className="text-sm text-gray-400">Total Hires</div>
                <div className="text-xl font-bold">{totalHeadcount}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">New Monthly Burn</div>
                <div className="text-xl font-bold text-violet-vivid">
                  {formatCurrency(baseParams.monthlyExpenses + totalHiringCost)}
                </div>
              </div>
            </div>
          </MotionCard>
        </div>

        {/* Right Panel - Impact Visualization */}
        <div className="col-span-7 space-y-4">
          {/* Runway Impact */}
          <MotionCard
            variant="elevated"
            className="p-6"
            custom={2}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Runway Impact</h2>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-cyan-electric" />
                  Baseline
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-violet-vivid" />
                  With Hires
                </span>
              </div>
            </div>

            {/* Runway Comparison Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="glass-card p-4 text-center">
                <div className="text-sm text-gray-400 mb-2">Current Runway</div>
                <motion.div
                  className="text-3xl font-bold text-cyan-electric"
                  key={baselineResult.runwayMonths}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                >
                  {formatRunway(baselineResult.runwayMonths)}
                </motion.div>
                <div className="text-xs text-gray-400">months</div>
              </div>

              <div className="glass-card p-4 text-center flex flex-col items-center justify-center">
                <ArrowRight className={`w-6 h-6 ${runwayDelta < 0 ? 'text-danger' : 'text-gray-400'}`} />
                <motion.div
                  className={`text-lg font-bold mt-1 ${runwayDelta < 0 ? 'text-danger' : runwayDelta > 0 ? 'text-success' : 'text-gray-400'
                    }`}
                  key={runwayDelta}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                >
                  {runwayDelta >= 0 ? '+' : ''}{runwayDelta.toFixed(1)}
                </motion.div>
                <div className="text-xs text-gray-400">months</div>
              </div>

              <div className={`glass-card p-4 text-center ${isCritical ? 'border-danger/50 bg-danger/10' :
                isWarning ? 'border-warning/50 bg-warning/10' : ''
                }`}>
                <div className="text-sm text-gray-400 mb-2">Projected Runway</div>
                <motion.div
                  className={`text-3xl font-bold ${isCritical ? 'text-danger' :
                    isWarning ? 'text-warning' : 'text-violet-vivid'
                    }`}
                  key={withHiresResult.runwayMonths}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                >
                  {formatRunway(withHiresResult.runwayMonths)}
                </motion.div>
                <div className="text-xs text-gray-400">months</div>
              </div>
            </div>

            {/* Cash Projection Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} barGap={2}>
                  <defs>
                    {/* Gradient for Baseline */}
                    <linearGradient id="barGradientCyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00D4FF" stopOpacity={1} />
                      <stop offset="100%" stopColor="#00D4FF" stopOpacity={0.6} />
                    </linearGradient>
                    {/* Gradient for With Hires */}
                    <linearGradient id="barGradientViolet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.6} />
                    </linearGradient>
                    {/* Danger Gradient */}
                    <linearGradient id="barGradientDanger" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E53935" stopOpacity={1} />
                      <stop offset="100%" stopColor="#E53935" stopOpacity={0.6} />
                    </linearGradient>
                    {/* Bar Shadow Filter */}
                    <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
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
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar
                    dataKey="baseline"
                    name="Baseline"
                    fill="url(#barGradientCyan)"
                    radius={[4, 4, 0, 0]}
                    filter="url(#barShadow)"
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                  <Bar
                    dataKey="withHires"
                    name="With Hires"
                    radius={[4, 4, 0, 0]}
                    filter="url(#barShadow)"
                    animationBegin={200}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {comparisonData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.withHires < entry.baseline * 0.5 ? 'url(#barGradientDanger)' : 'url(#barGradientViolet)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </MotionCard>

          {/* Hiring Breakdown Chart */}
          {hiringBreakdown.length > 0 && (
            <MotionCard
              className="p-6"
              custom={3}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <h3 className="font-semibold mb-4">Cost Breakdown by Role</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hiringBreakdown} layout="vertical">
                    <defs>
                      {/* Re-use the bar shadow filter */}
                      <filter id="barShadowH" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="2" dy="0" stdDeviation="2" floodColor="#000" floodOpacity="0.3" />
                      </filter>
                    </defs>
                    <XAxis
                      type="number"
                      stroke="#555"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatCurrency(v, true)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#555"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      width={100}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar
                      dataKey="cost"
                      name="Monthly Cost"
                      radius={[0, 4, 4, 0]}
                      filter="url(#barShadowH)"
                      animationBegin={0}
                      animationDuration={800}
                      animationEasing="ease-out"
                    >
                      {hiringBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Role badges */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
                {hiringBreakdown.map((item) => (
                  <span
                    key={item.name}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                    style={{ backgroundColor: `${item.color}20`, color: item.color }}
                  >
                    {item.name}: {item.count} × {formatCurrency(item.cost / item.count)}
                  </span>
                ))}
              </div>
            </MotionCard>
          )}

          {/* Empty State */}
          {totalHeadcount === 0 && (
            <MotionCard
              className="p-12 text-center"
              custom={3}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No Hires Planned</h3>
              <p className="text-gray-500">
                Use the controls on the left to add team members and see the impact on your runway.
              </p>
            </MotionCard>
          )}
        </div>
      </div>
    </motion.div>
  );
}

