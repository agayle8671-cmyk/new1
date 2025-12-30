/**
 * Valuation.tsx
 * 
 * SaaS Valuation Tool - Founder Toolkit Module
 * Implements revenue multiple valuation with interactive exit simulator.
 * 
 * Design: Deep Charcoal glassmorphism with Electric Cyan highlights
 * Mobile: No layout shifting, responsive grid
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  Target,
  Zap,
  Award,
  AlertTriangle,
  ChevronRight,
  Save,
  Loader2,
  Check,
  Info,
  ArrowUpRight,
  Calculator,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { toast } from 'sonner';

import ValuationService, {
  type ValuationInput,
  type ValuationResult,
  type ExitScenario,
  type CompanyStage,
} from '../../lib/services/ValuationService';
import GrowthService from '../../lib/services/GrowthService';
import { saveAnalysisSnapshot } from '../../lib/api';
import { MotionCard, MotionButton } from '../../components/ui/MotionCard';
import { useAppStore } from '../../lib/store';

// ============================================================================
// CONSTANTS & ANIMATIONS
// ============================================================================

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' },
  }),
};

const STAGES: { value: CompanyStage; label: string }[] = [
  { value: 'pre-seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series-a', label: 'Series A' },
  { value: 'series-b', label: 'Series B' },
  { value: 'growth', label: 'Growth' },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const MetricCard = ({
  label,
  value,
  subValue,
  icon: Icon,
  color = 'cyan-electric',
  trend,
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: typeof DollarSign;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
}) => {
  const colorClasses = {
    'cyan-electric': 'from-cyan-electric/20 to-cyan-electric/5 text-cyan-electric',
    'success': 'from-success/20 to-success/5 text-success',
    'warning': 'from-warning/20 to-warning/5 text-warning',
    'violet-vivid': 'from-violet-vivid/20 to-violet-vivid/5 text-violet-vivid',
  };

  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${
            trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-gray-400'
          }`}>
            {trend === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend === 'down' && <TrendingUp className="w-3 h-3 rotate-180" />}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold">{value}</p>
      {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
    </div>
  );
};

const InsightBadge = ({ insight, index }: { insight: string; index: number }) => {
  const isPositive = insight.startsWith('✓') || insight.startsWith('🚀');
  const isWarning = insight.startsWith('⚠');

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`p-3 rounded-lg border text-sm ${
        isPositive
          ? 'bg-success/10 border-success/30 text-success'
          : isWarning
          ? 'bg-warning/10 border-warning/30 text-warning'
          : 'bg-cyan-electric/10 border-cyan-electric/30 text-cyan-electric'
      }`}
    >
      {insight}
    </motion.div>
  );
};

const ExitScenarioCard = ({
  scenario,
  currentValuation,
  isSelected,
  onClick,
}: {
  scenario: ExitScenario;
  currentValuation: number;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <motion.button
    onClick={onClick}
    className={`w-full p-4 rounded-xl border text-left transition-all ${
      isSelected
        ? 'border-cyan-electric/50 bg-cyan-electric/10'
        : 'border-white/10 bg-white/5 hover:bg-white/10'
    }`}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-gray-400">Target MRR</span>
      <ArrowUpRight className={`w-4 h-4 ${isSelected ? 'text-cyan-electric' : 'text-gray-500'}`} />
    </div>
    <p className="text-xl font-bold text-white mb-1">
      {ValuationService.formatValuation(scenario.targetMRR)}/mo
    </p>
    <div className="flex items-center justify-between">
      <span className="text-sm text-success">
        +{scenario.percentageIncrease.toFixed(0)}%
      </span>
      <span className="text-sm text-gray-400">
        {scenario.monthsToTarget > 0 ? `${scenario.monthsToTarget} mo` : 'N/A'}
      </span>
    </div>
  </motion.button>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Valuation() {
  const { currentAnalysis, growthScenario } = useAppStore();

  // State
  const [stage, setStage] = useState<CompanyStage>('seed');
  const [mrr, setMrr] = useState(50000);
  const [yoyGrowth, setYoyGrowth] = useState(0.50);
  const [monthlyChurn, setMonthlyChurn] = useState(0.03);
  const [nrr, setNrr] = useState(1.10);
  const [grossMargin, setGrossMargin] = useState(0.80);
  const [targetMRR, setTargetMRR] = useState(150000);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [selectedExitIndex, setSelectedExitIndex] = useState(1);

  // Hydrate from GrowthService/Store data
  useEffect(() => {
    if (growthScenario) {
      setMrr(growthScenario.baselineMRR || 50000);
      // Convert monthly churn from growth scenario
      setMonthlyChurn(growthScenario.churnRate || 0.03);
    }
    if (currentAnalysis) {
      const estimatedMRR = currentAnalysis.monthlyRevenue || 50000;
      setMrr(estimatedMRR);
      // Estimate stage from ARR
      setStage(ValuationService.estimateStageFromARR(estimatedMRR * 12));
      // Use revenue growth if available
      if (currentAnalysis.revenueGrowth) {
        setYoyGrowth(currentAnalysis.revenueGrowth);
      }
    }
  }, [currentAnalysis, growthScenario]);

  // Calculate valuation
  const valuationInput: ValuationInput = useMemo(() => ({
    arr: mrr * 12,
    mrr,
    yoyGrowthRate: yoyGrowth,
    monthlyChurnRate: monthlyChurn,
    nrr,
    grossMargin,
    stage,
    profitMargin: 0, // Pre-profit assumption
  }), [mrr, yoyGrowth, monthlyChurn, nrr, grossMargin, stage]);

  const valuation = useMemo(() =>
    ValuationService.calculateValuation(valuationInput),
    [valuationInput]
  );

  // Generate exit scenarios
  const exitScenarios = useMemo(() =>
    ValuationService.generateExitScenarios(mrr, valuation, yoyGrowth / 12),
    [mrr, valuation, yoyGrowth]
  );

  // Selected exit scenario
  const selectedExit = useMemo(() =>
    ValuationService.calculateExitScenario(mrr, targetMRR, valuation, yoyGrowth / 12),
    [mrr, targetMRR, valuation, yoyGrowth]
  );

  // Chart data for exit simulator
  const exitChartData = useMemo(() => {
    return exitScenarios.map((scenario, i) => ({
      label: `${(scenario.targetMRR / mrr).toFixed(1)}x`,
      valuation: scenario.projectedValuation,
      increase: scenario.percentageIncrease,
      isSelected: i === selectedExitIndex,
    }));
  }, [exitScenarios, mrr, selectedExitIndex]);

  // Save valuation snapshot
  const handleSaveSnapshot = useCallback(async () => {
    setSaveStatus('saving');

    // Create a snapshot-compatible analysis object
    const snapshotData = {
      cashOnHand: currentAnalysis?.cashOnHand || 0,
      monthlyBurn: currentAnalysis?.monthlyBurn || 0,
      monthlyRevenue: mrr,
      runwayMonths: currentAnalysis?.runwayMonths || 0,
      grade: valuation.passesRuleOf40 ? 'A' : valuation.multiples.finalMultiple >= 8 ? 'B' : 'C',
      profitMargin: grossMargin,
      burnMultiple: 0,
      revenueGrowth: yoyGrowth,
      expenseGrowth: 0,
      revenueTrend: [],
      aiInsight: `Valuation: ${ValuationService.formatValuation(valuation.valuation)} at ${ValuationService.formatMultiple(valuation.multiples.finalMultiple)}. Rule of 40: ${(valuation.ruleOf40Score * 100).toFixed(0)}%. ${valuation.insights[0]}`,
    };

    const response = await saveAnalysisSnapshot(snapshotData as any, true);

    if (response.error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('saved');
      toast.success('Valuation Snapshot Saved', {
        description: `${ValuationService.formatValuation(valuation.valuation)} archived to DNA history.`,
      });
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [currentAnalysis, mrr, valuation, grossMargin, yoyGrowth]);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            <span className="gradient-text-cyan">SaaS Valuation</span>
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">Founder Toolkit • Revenue Multiple Calculator</p>
        </div>
        <div className="flex gap-3">
          <MotionButton
            onClick={handleSaveSnapshot}
            disabled={saveStatus === 'saving'}
            className={`flex items-center gap-2 ${
              saveStatus === 'saved' ? 'bg-success text-charcoal' : ''
            } ${saveStatus === 'error' ? 'bg-danger/20 text-danger' : ''}`}
          >
            {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
            {saveStatus === 'saved' && <Check className="w-4 h-4" />}
            {saveStatus === 'idle' && <Save className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Snapshot'}
            </span>
          </MotionButton>
        </div>
      </header>

      {/* Main Valuation Display - Hero Bento Card */}
      <MotionCard
        variant="elevated"
        className="p-6 sm:p-8 relative overflow-hidden"
        custom={0}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
      >
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-electric/10 via-transparent to-violet-vivid/10 opacity-50" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Valuation */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-electric to-success flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-charcoal" />
                </div>
                <div>
                  <p className="text-sm text-gray-400 uppercase tracking-wider">Current Valuation</p>
                  <p className="text-xs text-cyan-electric">{ValuationService.getStageLabel(stage)} Stage</p>
                </div>
              </div>

              <motion.div
                className="mb-4"
                key={valuation.valuation}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <span className="text-4xl sm:text-5xl lg:text-6xl font-bold gradient-text-cyan">
                  {ValuationService.formatValuation(valuation.valuation)}
                </span>
              </motion.div>

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Multiple:</span>
                  <span className="font-semibold text-white">
                    {ValuationService.formatMultiple(valuation.multiples.finalMultiple)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">ARR:</span>
                  <span className="font-semibold text-success">
                    {ValuationService.formatValuation(valuation.arr)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Per $1 MRR:</span>
                  <span className="font-semibold text-violet-vivid">
                    ${valuation.valuationPerMRR.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Rule of 40 Gauge */}
            <div className="lg:w-48 flex flex-col items-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-white/10"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="url(#ruleOf40Gradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: '0 251.2' }}
                    animate={{
                      strokeDasharray: `${Math.min(100, valuation.ruleOf40Score * 100) * 2.512} 251.2`,
                    }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                  <defs>
                    <linearGradient id="ruleOf40Gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00D4FF" />
                      <stop offset="100%" stopColor={valuation.passesRuleOf40 ? '#00FF88' : '#FFB800'} />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">
                    {(valuation.ruleOf40Score * 100).toFixed(0)}%
                  </span>
                  <span className="text-xs text-gray-400">Rule of 40</span>
                </div>
              </div>
              {valuation.passesRuleOf40 ? (
                <div className="flex items-center gap-1 mt-2 text-success text-xs">
                  <Award className="w-4 h-4" />
                  <span>Passes!</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 mt-2 text-warning text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{(40 - valuation.ruleOf40Score * 100).toFixed(0)}% to go</span>
                </div>
              )}
            </div>
          </div>

          {/* Valuation Range */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-gray-400 mb-3">Valuation Range</p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden relative">
                  <motion.div
                    className="absolute h-full bg-gradient-to-r from-warning via-cyan-electric to-success rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1 }}
                  />
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg"
                    initial={{ left: '0%' }}
                    animate={{
                      left: `${((valuation.valuation - valuation.valuationRange.low) / (valuation.valuationRange.high - valuation.valuationRange.low)) * 100}%`,
                    }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>{ValuationService.formatValuation(valuation.valuationRange.low)}</span>
              <span className="text-cyan-electric font-semibold">
                {ValuationService.formatValuation(valuation.valuation)}
              </span>
              <span>{ValuationService.formatValuation(valuation.valuationRange.high)}</span>
            </div>
          </div>
        </div>
      </MotionCard>

      {/* Input Controls + Multiple Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Controls */}
        <MotionCard
          variant="default"
          className="p-6"
          custom={1}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-cyan-electric" />
            Valuation Inputs
          </h3>

          <div className="space-y-5">
            {/* Stage Selector */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">
                Company Stage
              </label>
              <div className="flex flex-wrap gap-2">
                {STAGES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStage(s.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      stage === s.value
                        ? 'bg-cyan-electric/20 text-cyan-electric border border-cyan-electric/30'
                        : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* MRR Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Monthly Recurring Revenue</span>
                <span className="text-sm font-semibold text-cyan-electric">
                  {ValuationService.formatValuation(mrr)}/mo
                </span>
              </div>
              <input
                type="range"
                min="5000"
                max="500000"
                step="5000"
                value={mrr}
                onChange={(e) => setMrr(parseInt(e.target.value))}
                className="w-full accent-cyan-electric h-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>$5K</span>
                <span>$500K</span>
              </div>
            </div>

            {/* YoY Growth Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Year-over-Year Growth</span>
                <span className="text-sm font-semibold text-success">
                  {(yoyGrowth * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                step="5"
                value={yoyGrowth * 100}
                onChange={(e) => setYoyGrowth(parseInt(e.target.value) / 100)}
                className="w-full accent-success h-2"
              />
            </div>

            {/* Churn Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Monthly Churn Rate</span>
                <span className={`text-sm font-semibold ${monthlyChurn > 0.03 ? 'text-danger' : 'text-gray-300'}`}>
                  {(monthlyChurn * 100).toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={monthlyChurn * 100}
                onChange={(e) => setMonthlyChurn(parseFloat(e.target.value) / 100)}
                className="w-full accent-danger h-2"
              />
            </div>

            {/* NRR Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Net Revenue Retention</span>
                <span className="text-sm font-semibold text-violet-vivid">
                  {(nrr * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="70"
                max="150"
                step="5"
                value={nrr * 100}
                onChange={(e) => setNrr(parseInt(e.target.value) / 100)}
                className="w-full accent-violet-vivid h-2"
              />
            </div>
          </div>
        </MotionCard>

        {/* Multiple Breakdown */}
        <MotionCard
          variant="default"
          className="p-6"
          custom={2}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-violet-vivid" />
            Multiple Breakdown
          </h3>

          <div className="space-y-3">
            {[
              { label: 'Base Multiple', value: valuation.multiples.baseMultiple, color: 'text-gray-300' },
              { label: 'Rule of 40 Adjustment', value: valuation.multiples.ruleOf40Adjustment, color: valuation.multiples.ruleOf40Adjustment >= 0 ? 'text-success' : 'text-danger' },
              { label: 'Churn Penalty', value: valuation.multiples.churnPenalty, color: valuation.multiples.churnPenalty >= 0 ? 'text-success' : 'text-danger' },
              { label: 'NRR Bonus', value: valuation.multiples.nrrBonus, color: valuation.multiples.nrrBonus >= 0 ? 'text-success' : 'text-danger' },
              { label: 'Gross Margin Adj.', value: valuation.multiples.grossMarginAdjustment, color: valuation.multiples.grossMarginAdjustment >= 0 ? 'text-success' : 'text-danger' },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                className="flex items-center justify-between py-2 border-b border-white/5"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <span className="text-sm text-gray-400">{item.label}</span>
                <span className={`text-sm font-semibold ${item.color}`}>
                  {item.value >= 0 ? '+' : ''}{item.value.toFixed(1)}x
                </span>
              </motion.div>
            ))}
            <div className="flex items-center justify-between py-3 border-t border-white/20">
              <span className="text-sm font-semibold">Final Multiple</span>
              <span className="text-xl font-bold text-cyan-electric">
                {ValuationService.formatMultiple(valuation.multiples.finalMultiple)}
              </span>
            </div>
          </div>
        </MotionCard>
      </div>

      {/* Exit Simulator */}
      <MotionCard
        variant="elevated"
        className="p-6"
        custom={3}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-vivid to-cyan-electric flex items-center justify-center">
              <Target className="w-5 h-5 text-charcoal" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Exit Simulator</h3>
              <p className="text-xs text-gray-400">See how your valuation grows with scale</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Target MRR:</span>
            <span className="text-xl font-bold text-cyan-electric">
              {ValuationService.formatValuation(targetMRR)}/mo
            </span>
          </div>
        </div>

        {/* Target MRR Slider */}
        <div className="mb-6">
          <input
            type="range"
            min={mrr}
            max={mrr * 10}
            step={mrr / 10}
            value={targetMRR}
            onChange={(e) => setTargetMRR(parseInt(e.target.value))}
            className="w-full accent-violet-vivid h-3"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Current: {ValuationService.formatValuation(mrr)}</span>
            <span>10x: {ValuationService.formatValuation(mrr * 10)}</span>
          </div>
        </div>

        {/* Exit Scenario Result */}
        <motion.div
          className="glass-card p-6 mb-6"
          key={targetMRR}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-400 mb-1">Target Valuation</p>
              <p className="text-2xl font-bold text-cyan-electric">
                {ValuationService.formatValuation(selectedExit.projectedValuation)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Value Increase</p>
              <p className="text-2xl font-bold text-success">
                +{ValuationService.formatValuation(selectedExit.valuationIncrease)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Growth</p>
              <p className="text-2xl font-bold text-violet-vivid">
                +{selectedExit.percentageIncrease.toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Time to Target</p>
              <p className="text-2xl font-bold text-warning">
                {selectedExit.monthsToTarget > 0 ? `${selectedExit.monthsToTarget} mo` : 'N/A'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Quick Scenarios */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {exitScenarios.map((scenario, i) => (
            <ExitScenarioCard
              key={i}
              scenario={scenario}
              currentValuation={valuation.valuation}
              isSelected={i === selectedExitIndex}
              onClick={() => {
                setSelectedExitIndex(i);
                setTargetMRR(scenario.targetMRR);
              }}
            />
          ))}
        </div>
      </MotionCard>

      {/* Insights */}
      <MotionCard
        variant="default"
        className="p-6"
        custom={4}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-warning" />
          Valuation Insights
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {valuation.insights.map((insight, i) => (
            <InsightBadge key={i} insight={insight} index={i} />
          ))}
        </div>
      </MotionCard>
    </motion.div>
  );
}



