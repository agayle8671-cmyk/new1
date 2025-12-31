/**
 * TaxCredit.tsx
 * 
 * R&D Tax Credit Estimator - Founder Toolkit Module
 * Implements ASC (Alternative Simplified Credit) calculator.
 * 
 * Design: High-status Glassmorphic dashboard with Deep Charcoal aesthetic
 * Pulls default data from Hiring Planner
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  DollarSign,
  Users,
  Cloud,
  Percent,
  TrendingUp,
  Info,
  AlertTriangle,
  Check,
  Save,
  Loader2,
  Sparkles,
  Building2,
  Calendar,
  Zap,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

import TaxCreditService, {
  type TaxCreditInput,
  type TaxCreditResult,
  type CloudCosts,
} from '../../lib/services/TaxCreditService';
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

// Default engineering cost from Hiring Planner (monthly per engineer)
const DEFAULT_ENGINEER_MONTHLY_COST = 12000;

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const StatCard = ({
  label,
  value,
  subValue,
  icon: Icon,
  color = 'cyan-electric',
  large = false,
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: typeof DollarSign;
  color?: 'cyan-electric' | 'success' | 'warning' | 'violet-vivid';
  large?: boolean;
}) => {
  const colorClasses = {
    'cyan-electric': 'from-cyan-electric/20 to-cyan-electric/5 text-cyan-electric border-cyan-electric/30',
    'success': 'from-success/20 to-success/5 text-success border-success/30',
    'warning': 'from-warning/20 to-warning/5 text-warning border-warning/30',
    'violet-vivid': 'from-violet-vivid/20 to-violet-vivid/5 text-violet-vivid border-violet-vivid/30',
  };

  return (
    <div className={`glass-card p-4 sm:p-5 border ${colorClasses[color].split(' ').pop()}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`${large ? 'w-12 h-12' : 'w-10 h-10'} rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className={`${large ? 'w-6 h-6' : 'w-5 h-5'}`} />
        </div>
      </div>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`${large ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'} font-bold`}>{value}</p>
      {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
    </div>
  );
};

const QREBreakdownItem = ({
  label,
  amount,
  percentage,
  color,
}: {
  label: string;
  amount: number;
  percentage: number;
  color: string;
}) => (
  <div className="flex items-center justify-between py-3 border-b border-white/5">
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-sm text-gray-300">{label}</span>
    </div>
    <div className="text-right">
      <span className="text-sm font-semibold">{TaxCreditService.formatCurrency(amount)}</span>
      <span className="text-xs text-gray-500 ml-2">({percentage.toFixed(0)}%)</span>
    </div>
  </div>
);

const InsightCard = ({ insight, index }: { insight: string; index: number }) => {
  const isPositive = insight.startsWith('✓') || insight.startsWith('🚀') || insight.startsWith('💰') || insight.startsWith('☁️');
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TaxCredit() {
  const { currentAnalysis, simulatorParams } = useAppStore();

  // State - Wages
  const [engineeringWages, setEngineeringWages] = useState(500000);
  const [rdPercentage, setRdPercentage] = useState(80);
  const [contractorPercentage, setContractorPercentage] = useState(20);
  const [engineerCount, setEngineerCount] = useState(5);

  // State - Cloud Costs
  const [cloudCosts, setCloudCosts] = useState<CloudCosts>({
    aws: 5000,
    gcp: 0,
    azure: 0,
    other: 0,
    devStagingPercentage: 60,
  });

  // State - Company Info
  const [companyType, setCompanyType] = useState<'startup' | 'established'>('startup');
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Hydrate from Hiring Planner data
  useEffect(() => {
    // If we have simulator params with monthly expenses, estimate engineering wages
    if (simulatorParams) {
      // Assume 40-60% of expenses are engineering
      const estimatedEngineering = simulatorParams.monthlyExpenses * 0.5 * 12;
      if (estimatedEngineering > 100000) {
        setEngineeringWages(estimatedEngineering);
        setEngineerCount(Math.round(estimatedEngineering / (DEFAULT_ENGINEER_MONTHLY_COST * 12)));
      }
    }
  }, [simulatorParams]);

  // Sync engineer count with wages
  useEffect(() => {
    const wagesFromCount = engineerCount * DEFAULT_ENGINEER_MONTHLY_COST * 12;
    setEngineeringWages(wagesFromCount);
  }, [engineerCount]);

  // Calculate annual cloud costs
  const annualCloudCosts = useMemo(() => ({
    ...cloudCosts,
    aws: cloudCosts.aws * 12,
    gcp: cloudCosts.gcp * 12,
    azure: cloudCosts.azure * 12,
    other: cloudCosts.other * 12,
  }), [cloudCosts]);

  // Build input and calculate
  const taxCreditInput: TaxCreditInput = useMemo(() => ({
    taxYear,
    employees: [],
    totalEngineeringWages: engineeringWages,
    averageRDPercentage: rdPercentage,
    cloudCosts: annualCloudCosts,
    useSimpleCalculation: true,
    companyType,
  }), [taxYear, engineeringWages, rdPercentage, annualCloudCosts, companyType]);

  const result = useMemo(() =>
    TaxCreditService.calculateTaxCredit(taxCreditInput),
    [taxCreditInput]
  );

  // Quick estimate for preview
  const quickEstimate = useMemo(() =>
    TaxCreditService.quickEstimate(engineeringWages, rdPercentage),
    [engineeringWages, rdPercentage]
  );

  // Quarterly payroll offset
  const quarterlyOffset = useMemo(() =>
    TaxCreditService.calculateQuarterlyOffset(result.finalCredit),
    [result.finalCredit]
  );

  // Save snapshot
  const handleSaveSnapshot = useCallback(async () => {
    setSaveStatus('saving');

    const snapshotData = {
      cashOnHand: currentAnalysis?.cashOnHand || 0,
      monthlyBurn: currentAnalysis?.monthlyBurn || 0,
      monthlyRevenue: currentAnalysis?.monthlyRevenue || 0,
      runwayMonths: currentAnalysis?.runwayMonths || 0,
      grade: result.finalCredit >= 100000 ? 'A' : result.finalCredit >= 25000 ? 'B' : 'C',
      profitMargin: 0,
      burnMultiple: 0,
      revenueGrowth: 0,
      expenseGrowth: 0,
      revenueTrend: [],
      aiInsight: `R&D Tax Credit: ${TaxCreditService.formatCurrency(result.finalCredit)} estimated for ${taxYear}. QREs: ${TaxCreditService.formatCurrency(result.qreBreakdown.totalQRE)}. Rate: ${result.creditRateDisplay}. ${result.insights[0]}`,
    };

    const response = await saveAnalysisSnapshot(snapshotData as any, true);

    if (response.error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('saved');
      toast.success('Tax Credit Snapshot Saved', {
        description: `${TaxCreditService.formatCurrency(result.finalCredit)} R&D credit archived.`,
      });
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [currentAnalysis, result, taxYear]);

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
            <span className="gradient-text-cyan">R&D Tax Credit</span>
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Founder Toolkit • ASC Method Estimator
          </p>
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
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save to Archive'}
            </span>
          </MotionButton>
        </div>
      </header>

      {/* Hero Card - Annual Cash Refund Estimate */}
      <MotionCard
        variant="elevated"
        className="p-6 sm:p-8 relative overflow-hidden"
        custom={0}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
      >
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-electric/10 via-transparent to-success/10 opacity-50" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Main Credit Display */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-electric to-success flex items-center justify-center shadow-lg shadow-cyan-electric/30">
                  <DollarSign className="w-7 h-7 text-charcoal" />
                </div>
                <div>
                  <p className="text-sm text-gray-400 uppercase tracking-wider">Annual Cash Refund Estimate</p>
                  <p className="text-xs text-success flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {companyType === 'startup' ? 'Payroll Tax Offset' : 'Income Tax Credit'}
                  </p>
                </div>
              </div>

              <motion.div
                className="mb-4"
                key={result.finalCredit}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <span className="text-5xl sm:text-6xl lg:text-7xl font-bold gradient-text-cyan">
                  {TaxCreditService.formatCurrency(result.finalCredit)}
                </span>
                {result.wasCapped && (
                  <span className="ml-3 text-xs text-warning bg-warning/20 px-2 py-1 rounded">
                    Capped
                  </span>
                )}
              </motion.div>

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Credit Rate:</span>
                  <span className="font-semibold text-success">{result.creditRateDisplay}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Total QREs:</span>
                  <span className="font-semibold text-white">
                    {TaxCreditService.formatCurrency(result.qreBreakdown.totalQRE)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Tax Year:</span>
                  <span className="font-semibold text-violet-vivid">{taxYear}</span>
                </div>
              </div>
            </div>

            {/* Right: Quarterly Breakdown */}
            <div className="lg:w-64 glass-card p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Quarterly Offset</p>
              <div className="space-y-2">
                {['Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => (
                  <div key={quarter} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{quarter}</span>
                    <span className="text-sm font-semibold text-cyan-electric">
                      {TaxCreditService.formatCurrency(quarterlyOffset)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-gray-500">
                  Applied against FICA payroll taxes each quarter
                </p>
              </div>
            </div>
          </div>

          {/* Credit Range */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-gray-400 mb-3">Credit Estimate Range</p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-3 bg-white/10 rounded-full overflow-hidden relative">
                  <motion.div
                    className="absolute h-full bg-gradient-to-r from-warning via-cyan-electric to-success rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1 }}
                  />
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-cyan-electric"
                    initial={{ left: '0%' }}
                    animate={{
                      left: `${((result.finalCredit - quickEstimate.creditRange.low) / 
                        (quickEstimate.creditRange.high - quickEstimate.creditRange.low)) * 100}%`,
                    }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>{TaxCreditService.formatCurrency(quickEstimate.creditRange.low)}</span>
              <span className="text-cyan-electric font-semibold">
                {TaxCreditService.formatCurrency(result.finalCredit)}
              </span>
              <span>{TaxCreditService.formatCurrency(quickEstimate.creditRange.high)}</span>
            </div>
          </div>
        </div>
      </MotionCard>

      {/* Input Controls + QRE Breakdown */}
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
            R&D Expense Inputs
          </h3>

          <div className="space-y-5">
            {/* Company Type */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">
                Company Type
              </label>
              <div className="flex gap-2">
                {(['startup', 'established'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setCompanyType(type)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      companyType === type
                        ? 'bg-cyan-electric/20 text-cyan-electric border border-cyan-electric/30'
                        : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    {type === 'startup' ? 'Startup (<$5M)' : 'Established'}
                  </button>
                ))}
              </div>
            </div>

            {/* Engineer Count */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Number of Engineers</span>
                <span className="text-sm font-semibold text-cyan-electric">{engineerCount}</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={engineerCount}
                onChange={(e) => setEngineerCount(parseInt(e.target.value))}
                className="w-full accent-cyan-electric h-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>50</span>
              </div>
            </div>

            {/* Total Engineering Wages */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">US Engineering Wages (Annual)</span>
                <span className="text-sm font-semibold text-success">
                  {TaxCreditService.formatCurrency(engineeringWages)}
                </span>
              </div>
              <input
                type="range"
                min="50000"
                max="5000000"
                step="50000"
                value={engineeringWages}
                onChange={(e) => {
                  setEngineeringWages(parseInt(e.target.value));
                  setEngineerCount(Math.round(parseInt(e.target.value) / (DEFAULT_ENGINEER_MONTHLY_COST * 12)));
                }}
                className="w-full accent-success h-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>$50K</span>
                <span>$5M</span>
              </div>
            </div>

            {/* R&D Percentage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">% Time Spent on R&D</span>
                  {rdPercentage >= 80 && (
                    <span className="text-xs text-success bg-success/20 px-2 py-0.5 rounded">
                      80% Rule ✓
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-violet-vivid">{rdPercentage}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={rdPercentage}
                onChange={(e) => setRdPercentage(parseInt(e.target.value))}
                className="w-full accent-violet-vivid h-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10%</span>
                <span className="text-violet-vivid">80% threshold</span>
                <span>100%</span>
              </div>
            </div>

            {/* Monthly Cloud Costs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Monthly Cloud Costs (Dev/Staging)</span>
                <span className="text-sm font-semibold text-warning">
                  ${(cloudCosts.aws + cloudCosts.gcp + cloudCosts.azure + cloudCosts.other).toLocaleString()}/mo
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50000"
                step="1000"
                value={cloudCosts.aws}
                onChange={(e) => setCloudCosts(prev => ({ ...prev, aws: parseInt(e.target.value) }))}
                className="w-full accent-warning h-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>$0</span>
                <span>$50K/mo</span>
              </div>
            </div>

            {/* Dev/Staging Percentage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">% Cloud for Dev/Staging</span>
                <span className="text-sm font-semibold text-gray-300">{cloudCosts.devStagingPercentage}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={cloudCosts.devStagingPercentage}
                onChange={(e) => setCloudCosts(prev => ({ ...prev, devStagingPercentage: parseInt(e.target.value) }))}
                className="w-full accent-gray-400 h-2"
              />
            </div>
          </div>
        </MotionCard>

        {/* QRE Breakdown */}
        <MotionCard
          variant="default"
          className="p-6"
          custom={2}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-violet-vivid" />
            QRE Breakdown
          </h3>

          <div className="space-y-1">
            <QREBreakdownItem
              label="Qualified Wages"
              amount={result.qreBreakdown.qualifiedWages}
              percentage={result.qreBreakdown.totalQRE > 0 
                ? (result.qreBreakdown.qualifiedWages / result.qreBreakdown.totalQRE) * 100 
                : 0}
              color="bg-cyan-electric"
            />
            <QREBreakdownItem
              label="Contractors (65%)"
              amount={result.qreBreakdown.qualifiedContractors}
              percentage={result.qreBreakdown.totalQRE > 0 
                ? (result.qreBreakdown.qualifiedContractors / result.qreBreakdown.totalQRE) * 100 
                : 0}
              color="bg-violet-vivid"
            />
            <QREBreakdownItem
              label="Cloud Costs"
              amount={result.qreBreakdown.qualifiedCloud}
              percentage={result.qreBreakdown.totalQRE > 0 
                ? (result.qreBreakdown.qualifiedCloud / result.qreBreakdown.totalQRE) * 100 
                : 0}
              color="bg-warning"
            />
            <QREBreakdownItem
              label="Supplies"
              amount={result.qreBreakdown.qualifiedSupplies}
              percentage={result.qreBreakdown.totalQRE > 0 
                ? (result.qreBreakdown.qualifiedSupplies / result.qreBreakdown.totalQRE) * 100 
                : 0}
              color="bg-success"
            />
          </div>

          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Total Qualified Research Expenses</span>
              <span className="text-xl font-bold text-cyan-electric">
                {TaxCreditService.formatCurrency(result.qreBreakdown.totalQRE)}
              </span>
            </div>
          </div>

          {/* 80% Rule Explanation */}
          <div className="mt-4 p-3 glass-card border border-white/10">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-electric flex-shrink-0 mt-0.5" />
              <div className="text-xs text-gray-400">
                <strong className="text-gray-300">80% Rule:</strong> If an engineer spends ≥80% of their time on R&D, 
                100% of their wages qualify. Below 80%, only that specific percentage counts.
              </div>
            </div>
          </div>
        </MotionCard>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Quarterly Offset"
          value={TaxCreditService.formatCurrency(quarterlyOffset)}
          subValue="Per quarter"
          icon={Calendar}
          color="cyan-electric"
        />
        <StatCard
          label="Effective Rate"
          value={`${(result.effectiveRate * 100).toFixed(1)}%`}
          subValue="On total expenses"
          icon={Percent}
          color="success"
        />
        <StatCard
          label="Max Potential"
          value={TaxCreditService.formatCurrency(result.maxPotentialCredit)}
          subValue="At 10% rate"
          icon={TrendingUp}
          color="violet-vivid"
        />
        <StatCard
          label="Annual Cap"
          value={TaxCreditService.formatCurrency(result.annualCap)}
          subValue="Payroll tax offset"
          icon={AlertTriangle}
          color="warning"
        />
      </div>

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
          Credit Insights
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {result.insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} index={i} />
          ))}
        </div>
      </MotionCard>

      {/* Disclaimer */}
      <div className="text-center text-xs text-gray-500 p-4">
        <p>
          This is an estimate only. Consult a qualified tax professional for actual R&D tax credit claims.
          <br />
          Credits subject to IRS qualification requirements and documentation.
        </p>
      </div>
    </motion.div>
  );
}





