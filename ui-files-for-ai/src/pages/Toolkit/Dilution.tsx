/**
 * Dilution.tsx
 * 
 * Fundraising Dilution Shaper - Founder Toolkit Module
 * Implements equity dilution calculator with term sheet preview.
 * 
 * Design: Deep Charcoal glassmorphism with Electric Cyan highlights
 * Features: Cap table comparison, option pool shuffle, runway bridge
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart,
  DollarSign,
  Users,
  TrendingUp,
  AlertTriangle,
  Check,
  Save,
  Loader2,
  Sparkles,
  ArrowRight,
  Calendar,
  Percent,
  Building2,
  Shuffle,
  Target,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

import DilutionService, {
  type FundingRoundInput,
  type FundingRoundResult,
  type CapTable,
  type Stakeholder,
  OPTION_POOL_SIZES,
  DEFAULT_CAP_TABLE,
} from '../../lib/services/DilutionService';
import ValuationService from '../../lib/services/ValuationService';
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

const ROUND_PRESETS = [
  { name: 'Pre-Seed', raise: 500000, valuation: 4000000 },
  { name: 'Seed', raise: 2000000, valuation: 10000000 },
  { name: 'Series A', raise: 8000000, valuation: 30000000 },
  { name: 'Series B', raise: 25000000, valuation: 100000000 },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const OwnershipBar = ({
  label,
  prePercent,
  postPercent,
  color,
}: {
  label: string;
  prePercent: number;
  postPercent: number;
  color: string;
}) => {
  const dilution = prePercent - postPercent;
  const dilutionPercent = prePercent > 0 ? (dilution / prePercent) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-gray-500">{prePercent.toFixed(1)}%</span>
          <ArrowRight className="w-3 h-3 text-gray-600" />
          <span className={`font-semibold ${color}`}>{postPercent.toFixed(1)}%</span>
          {dilution > 0 && (
            <span className="text-xs text-danger">(-{dilutionPercent.toFixed(0)}%)</span>
          )}
        </div>
      </div>
      <div className="h-3 bg-white/10 rounded-full overflow-hidden flex">
        <motion.div
          className={`h-full ${color.replace('text-', 'bg-')}`}
          initial={{ width: 0 }}
          animate={{ width: `${postPercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        {dilution > 0 && (
          <motion.div
            className="h-full bg-white/20"
            initial={{ width: 0 }}
            animate={{ width: `${dilution}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          />
        )}
      </div>
    </div>
  );
};

const TermSheetRow = ({
  label,
  preMoney,
  postMoney,
  highlight = false,
}: {
  label: string;
  preMoney: string;
  postMoney: string;
  highlight?: boolean;
}) => (
  <div className={`flex items-center justify-between py-3 ${highlight ? 'bg-cyan-electric/5 px-3 -mx-3 rounded-lg' : 'border-b border-white/5'}`}>
    <span className={`text-sm ${highlight ? 'font-semibold text-cyan-electric' : 'text-gray-400'}`}>
      {label}
    </span>
    <div className="flex items-center gap-6">
      <span className="text-sm text-gray-500 w-24 text-right">{preMoney}</span>
      <ArrowRight className="w-3 h-3 text-gray-600" />
      <span className={`text-sm font-semibold w-24 text-right ${highlight ? 'text-cyan-electric' : 'text-white'}`}>
        {postMoney}
      </span>
    </div>
  </div>
);

const RunwayBridgeCard = ({
  currentMonths,
  additionalMonths,
  totalMonths,
}: {
  currentMonths: number;
  additionalMonths: number;
  totalMonths: number;
}) => {
  const isHealthy = totalMonths >= 18;

  return (
    <div className="glass-card p-5 border border-cyan-electric/30">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-electric to-success flex items-center justify-center">
          <Calendar className="w-5 h-5 text-charcoal" />
        </div>
        <div>
          <p className="text-sm text-gray-400">New Runway</p>
          <p className="text-xs text-cyan-electric">After funding closes</p>
        </div>
      </div>

      <div className="flex items-end gap-2 mb-4">
        <span className="text-4xl font-bold gradient-text-cyan">
          {isFinite(totalMonths) ? totalMonths.toFixed(0) : '∞'}
        </span>
        <span className="text-gray-400 mb-1">months</span>
      </div>

      {/* Runway visualization */}
      <div className="space-y-2">
        <div className="flex gap-1 h-6">
          <motion.div
            className="bg-gray-600 rounded-l-lg flex items-center justify-center"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((currentMonths / totalMonths) * 100, 100)}%` }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-[10px] text-gray-300 px-1">Current</span>
          </motion.div>
          <motion.div
            className="bg-gradient-to-r from-cyan-electric to-success rounded-r-lg flex items-center justify-center"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((additionalMonths / totalMonths) * 100, 100)}%` }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <span className="text-[10px] text-charcoal px-1 font-semibold">
              +{additionalMonths.toFixed(0)} mo
            </span>
          </motion.div>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Today</span>
          <span>{isHealthy ? '✓ Healthy runway' : '⚠ Consider larger raise'}</span>
        </div>
      </div>
    </div>
  );
};

const InsightBadge = ({ insight, index }: { insight: string; index: number }) => {
  const isPositive = insight.startsWith('✓') || insight.startsWith('🚀') || insight.startsWith('💰');
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

export default function Dilution() {
  const { currentAnalysis, simulatorParams } = useAppStore();

  // Funding round state
  const [roundName, setRoundName] = useState('Seed Round');
  const [raiseAmount, setRaiseAmount] = useState(2000000);
  const [preMoneyValuation, setPreMoneyValuation] = useState(10000000);
  const [targetOptionPool, setTargetOptionPool] = useState(OPTION_POOL_SIZES.MEDIUM);
  const [applyOptionPoolShuffle, setApplyOptionPoolShuffle] = useState(true);
  const [leadInvestor, setLeadInvestor] = useState('Lead VC');

  // Cap table state (simplified)
  const [founder1Ownership, setFounder1Ownership] = useState(40);
  const [founder2Ownership, setFounder2Ownership] = useState(30);
  const [existingInvestorOwnership, setExistingInvestorOwnership] = useState(20);
  const [currentOptionPool, setCurrentOptionPool] = useState(10);

  // UI state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Hydrate from current analysis
  useEffect(() => {
    if (simulatorParams) {
      // Could use simulator data to set defaults
    }
    if (currentAnalysis) {
      // Use current burn for runway calculation
    }
  }, [currentAnalysis, simulatorParams]);

  // Build cap table from state
  const capTable: CapTable = useMemo(() => {
    const totalShares = 10_000_000;
    return {
      totalShares,
      stakeholders: [
        {
          id: 'founder-1',
          name: 'Founder 1',
          type: 'founder',
          shares: (founder1Ownership / 100) * totalShares,
          ownershipPercent: founder1Ownership,
        },
        {
          id: 'founder-2',
          name: 'Founder 2',
          type: 'founder',
          shares: (founder2Ownership / 100) * totalShares,
          ownershipPercent: founder2Ownership,
        },
        {
          id: 'existing-investors',
          name: 'Existing Investors',
          type: 'investor',
          shares: (existingInvestorOwnership / 100) * totalShares,
          ownershipPercent: existingInvestorOwnership,
        },
      ],
      optionPoolPercent: currentOptionPool / 100,
      optionPoolShares: (currentOptionPool / 100) * totalShares,
    };
  }, [founder1Ownership, founder2Ownership, existingInvestorOwnership, currentOptionPool]);

  // Build funding input
  const fundingInput: FundingRoundInput = useMemo(() => ({
    roundName,
    raiseAmount,
    preMoneyValuation,
    targetOptionPoolPercent: targetOptionPool,
    applyOptionPoolShuffle,
    leadInvestor,
    monthlyBurn: simulatorParams?.monthlyExpenses || currentAnalysis?.monthlyBurn || 80000,
    currentCash: simulatorParams?.cashOnHand || currentAnalysis?.cashOnHand || 200000,
  }), [roundName, raiseAmount, preMoneyValuation, targetOptionPool, applyOptionPoolShuffle, leadInvestor, simulatorParams, currentAnalysis]);

  // Calculate dilution
  const result = useMemo(() =>
    DilutionService.calculateDilution(fundingInput, capTable),
    [fundingInput, capTable]
  );

  // Apply preset
  const applyPreset = useCallback((preset: typeof ROUND_PRESETS[0]) => {
    setRoundName(preset.name);
    setRaiseAmount(preset.raise);
    setPreMoneyValuation(preset.valuation);
    toast.info(`Applied ${preset.name} Preset`, {
      description: `${DilutionService.formatCurrency(preset.raise)} at ${DilutionService.formatCurrency(preset.valuation)} pre-money`,
    });
  }, []);

  // Save snapshot
  const handleSaveSnapshot = useCallback(async () => {
    setSaveStatus('saving');

    const founderDilution = result.founderDilution[0]?.relativeDilution || 0;

    const snapshotData = {
      cashOnHand: result.runwayBridge.cashAfterRaise,
      monthlyBurn: fundingInput.monthlyBurn || 0,
      monthlyRevenue: currentAnalysis?.monthlyRevenue || 0,
      runwayMonths: result.runwayBridge.newTotalRunwayMonths,
      grade: founderDilution < 25 ? 'A' : founderDilution < 35 ? 'B' : 'C',
      profitMargin: 0,
      burnMultiple: 0,
      revenueGrowth: 0,
      expenseGrowth: 0,
      revenueTrend: [],
      aiInsight: `${roundName}: ${DilutionService.formatCurrency(raiseAmount)} at ${DilutionService.formatCurrency(preMoneyValuation)} pre-money (${DilutionService.formatCurrency(result.postMoneyValuation)} post). Founders: ${result.founderDilution[0]?.postRoundOwnership.toFixed(1)}% → ${founderDilution.toFixed(0)}% dilution. New runway: ${result.runwayBridge.newTotalRunwayMonths.toFixed(0)} months.`,
    };

    const response = await saveAnalysisSnapshot(snapshotData as any, true);

    if (response.error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('saved');
      toast.success('Funding Scenario Saved', {
        description: `${roundName} term sheet archived to DNA history.`,
      });
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [result, fundingInput, currentAnalysis, roundName, raiseAmount, preMoneyValuation]);

  // Calculate total founder ownership post-round
  const totalFounderOwnershipPost = result.founderDilution.reduce(
    (sum, fd) => sum + fd.postRoundOwnership,
    0
  );

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
            <span className="gradient-text-cyan">Dilution Shaper</span>
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Founder Toolkit • Fundraising Term Sheet Preview
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
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Snapshot'}
            </span>
          </MotionButton>
        </div>
      </header>

      {/* Round Presets */}
      <div className="flex flex-wrap gap-2">
        {ROUND_PRESETS.map((preset) => (
          <motion.button
            key={preset.name}
            onClick={() => applyPreset(preset)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              roundName === preset.name
                ? 'bg-cyan-electric/20 text-cyan-electric border border-cyan-electric/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {preset.name}
          </motion.button>
        ))}
      </div>

      {/* Hero Section - Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Post-Money Valuation */}
        <MotionCard
          variant="elevated"
          className="p-6 relative overflow-hidden"
          custom={0}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-electric/10 to-transparent opacity-50" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-5 h-5 text-cyan-electric" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">Post-Money Valuation</span>
            </div>
            <motion.div
              key={result.postMoneyValuation}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-3xl sm:text-4xl font-bold gradient-text-cyan"
            >
              {DilutionService.formatCurrency(result.postMoneyValuation)}
            </motion.div>
            <p className="text-xs text-gray-500 mt-1">
              Pre: {DilutionService.formatCurrency(preMoneyValuation)}
            </p>
          </div>
        </MotionCard>

        {/* Investor Ownership */}
        <MotionCard
          variant="elevated"
          className="p-6"
          custom={1}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-5 h-5 text-violet-vivid" />
            <span className="text-xs text-gray-400 uppercase tracking-wider">New Investor Ownership</span>
          </div>
          <motion.div
            key={result.investorOwnership}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="text-3xl sm:text-4xl font-bold text-violet-vivid"
          >
            {(result.investorOwnership * 100).toFixed(1)}%
          </motion.div>
          <p className="text-xs text-gray-500 mt-1">
            For {DilutionService.formatCurrency(raiseAmount)} invested
          </p>
        </MotionCard>

        {/* Founder Ownership */}
        <MotionCard
          variant="elevated"
          className="p-6"
          custom={2}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-success" />
            <span className="text-xs text-gray-400 uppercase tracking-wider">Founders After Round</span>
          </div>
          <motion.div
            key={totalFounderOwnershipPost}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="text-3xl sm:text-4xl font-bold text-success"
          >
            {totalFounderOwnershipPost.toFixed(1)}%
          </motion.div>
          <p className="text-xs text-gray-500 mt-1">
            From {founder1Ownership + founder2Ownership}% pre-round
          </p>
        </MotionCard>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funding Round Inputs */}
        <MotionCard
          variant="default"
          className="p-6"
          custom={3}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-cyan-electric" />
            Funding Round
          </h3>

          <div className="space-y-5">
            {/* Raise Amount */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Raise Amount</span>
                <span className="text-sm font-semibold text-cyan-electric">
                  {DilutionService.formatCurrency(raiseAmount)}
                </span>
              </div>
              <input
                type="range"
                min="100000"
                max="50000000"
                step="100000"
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(parseInt(e.target.value))}
                className="w-full accent-cyan-electric h-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>$100K</span>
                <span>$50M</span>
              </div>
            </div>

            {/* Pre-Money Valuation */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Pre-Money Valuation</span>
                <span className="text-sm font-semibold text-success">
                  {DilutionService.formatCurrency(preMoneyValuation)}
                </span>
              </div>
              <input
                type="range"
                min="1000000"
                max="200000000"
                step="1000000"
                value={preMoneyValuation}
                onChange={(e) => setPreMoneyValuation(parseInt(e.target.value))}
                className="w-full accent-success h-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>$1M</span>
                <span>$200M</span>
              </div>
            </div>

            {/* Option Pool Target */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Target Option Pool (Post-Money)</span>
                <span className="text-sm font-semibold text-warning">
                  {(targetOptionPool * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex gap-2">
                {[
                  { value: OPTION_POOL_SIZES.SMALL, label: '10%' },
                  { value: OPTION_POOL_SIZES.MEDIUM, label: '15%' },
                  { value: OPTION_POOL_SIZES.LARGE, label: '20%' },
                ].map((option) => (
                  <button
                    key={option.label}
                    onClick={() => setTargetOptionPool(option.value)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      targetOptionPool === option.value
                        ? 'bg-warning/20 text-warning border border-warning/30'
                        : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Option Pool Shuffle Toggle */}
            <div className="flex items-center justify-between p-3 glass-card">
              <div className="flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-violet-vivid" />
                <div>
                  <span className="text-sm">Option Pool Shuffle</span>
                  <p className="text-xs text-gray-500">Expand pool pre-money (investor-friendly)</p>
                </div>
              </div>
              <button
                onClick={() => setApplyOptionPoolShuffle(!applyOptionPoolShuffle)}
                className={`w-12 h-6 rounded-full transition-all ${
                  applyOptionPoolShuffle ? 'bg-violet-vivid' : 'bg-white/20'
                }`}
              >
                <motion.div
                  className="w-5 h-5 bg-white rounded-full shadow"
                  animate={{ x: applyOptionPoolShuffle ? 26 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          </div>
        </MotionCard>

        {/* Runway Bridge */}
        <MotionCard
          variant="default"
          className="p-6"
          custom={4}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-success" />
            Runway Bridge
          </h3>

          <RunwayBridgeCard
            currentMonths={result.runwayBridge.currentRunwayMonths}
            additionalMonths={result.runwayBridge.additionalRunwayMonths}
            totalMonths={result.runwayBridge.newTotalRunwayMonths}
          />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="glass-card p-3">
              <span className="text-xs text-gray-400">Cash After Raise</span>
              <p className="text-lg font-bold text-cyan-electric">
                {DilutionService.formatCurrency(result.runwayBridge.cashAfterRaise)}
              </p>
            </div>
            <div className="glass-card p-3">
              <span className="text-xs text-gray-400">Price Per Share</span>
              <p className="text-lg font-bold text-violet-vivid">
                ${result.pricePerShare.toFixed(2)}
              </p>
            </div>
          </div>
        </MotionCard>
      </div>

      {/* Ownership Comparison Table */}
      <MotionCard
        variant="elevated"
        className="p-6"
        custom={5}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-cyan-electric" />
          Ownership: Current vs. Post-Round
        </h3>

        <div className="space-y-4">
          {result.allStakeholderImpacts.map((impact, i) => (
            <OwnershipBar
              key={impact.stakeholder.id}
              label={impact.stakeholder.name}
              prePercent={impact.preRoundOwnership}
              postPercent={impact.postRoundOwnership}
              color={
                impact.stakeholder.type === 'founder'
                  ? 'text-success'
                  : impact.stakeholder.type === 'investor'
                  ? 'text-violet-vivid'
                  : 'text-warning'
              }
            />
          ))}

          {/* New Investor */}
          <OwnershipBar
            label={leadInvestor || 'New Investor'}
            prePercent={0}
            postPercent={result.investorOwnership * 100}
            color="text-cyan-electric"
          />

          {/* Option Pool */}
          <OwnershipBar
            label="Option Pool"
            prePercent={currentOptionPool}
            postPercent={result.optionPoolOwnership * 100}
            color="text-warning"
          />
        </div>

        {/* Option Pool Shuffle Impact */}
        {applyOptionPoolShuffle && result.optionPoolShuffleImpact > 0 && (
          <div className="mt-4 p-3 glass-card border border-warning/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-warning">Option Pool Shuffle Impact:</strong>
                <span className="text-gray-400 ml-1">
                  An additional {(result.optionPoolShuffleImpact * 100).toFixed(1)}% founder dilution 
                  is applied to expand the option pool pre-money. This is investor-friendly.
                </span>
              </div>
            </div>
          </div>
        )}
      </MotionCard>

      {/* Term Sheet Summary */}
      <MotionCard
        variant="default"
        className="p-6"
        custom={6}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-warning" />
          Term Sheet Preview
        </h3>

        <div className="space-y-0">
          <TermSheetRow
            label="Pre-Money Valuation"
            preMoney="—"
            postMoney={DilutionService.formatCurrency(preMoneyValuation)}
          />
          <TermSheetRow
            label="Investment Amount"
            preMoney="—"
            postMoney={DilutionService.formatCurrency(raiseAmount)}
            highlight
          />
          <TermSheetRow
            label="Post-Money Valuation"
            preMoney="—"
            postMoney={DilutionService.formatCurrency(result.postMoneyValuation)}
            highlight
          />
          <TermSheetRow
            label="Shares Issued"
            preMoney={DilutionService.formatShares(capTable.totalShares)}
            postMoney={DilutionService.formatShares(result.totalSharesPostRound)}
          />
          <TermSheetRow
            label="Price Per Share"
            preMoney="—"
            postMoney={`$${result.pricePerShare.toFixed(2)}`}
          />
          <TermSheetRow
            label="Investor Ownership"
            preMoney="0%"
            postMoney={DilutionService.formatPercent(result.investorOwnership * 100)}
          />
          <TermSheetRow
            label="Option Pool"
            preMoney={`${currentOptionPool}%`}
            postMoney={DilutionService.formatPercent(result.optionPoolOwnership * 100)}
          />
        </div>
      </MotionCard>

      {/* Insights */}
      <MotionCard
        variant="default"
        className="p-6"
        custom={7}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-electric" />
          Deal Insights
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {result.insights.map((insight, i) => (
            <InsightBadge key={i} insight={insight} index={i} />
          ))}
        </div>
      </MotionCard>
    </motion.div>
  );
}





