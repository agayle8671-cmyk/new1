import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, RotateCcw, Save, Snowflake, Rocket, Briefcase, DollarSign, Loader2, Check, RefreshCw, TrendingUp, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Area, ComposedChart, ReferenceLine } from 'recharts';
import { toast } from 'sonner';
import {
  SimParams,
  DEFAULT_PARAMS,
  PRESETS,
  runSimulation,
  applyPreset,
  mergeProjections,
  formatCurrency,
  formatRunway,
  compareScenarios,
} from '../lib/simulator-engine';
import GrowthService, { 
  type MRRInput, 
  type GrowthScenario,
  DEFAULT_SCENARIOS 
} from '../lib/services/GrowthService';
import { 
  saveSimulationSnapshot, 
  saveGrowthScenario, 
  fetchLatestGrowthScenario,
  type GrowthScenarioInput 
} from '../lib/api';
import { MotionCard, MotionButton } from '../components/ui/MotionCard';
import { useAppStore } from '../lib/store';

const presetIcons: Record<string, typeof Briefcase> = {
  hire: Briefcase,
  blitz: Rocket,
  winter: Snowflake,
  raise: DollarSign,
};

const presetColors: Record<string, string> = {
  hire: 'bg-cyan-electric/20 text-cyan-electric',
  blitz: 'bg-violet-vivid/20 text-violet-vivid',
  winter: 'bg-blue-500/20 text-blue-400',
  raise: 'bg-success/20 text-success',
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: 'easeOut' },
  }),
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
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

export default function Simulator() {
  const { simulatorParams, contextMode, currentAnalysis } = useAppStore();
  
  // Initialize params from store (hydrated from DNALab) or use defaults
  const initialParams = simulatorParams || DEFAULT_PARAMS;
  
  const [paramsA, setParamsA] = useState<SimParams>(initialParams);
  const [paramsB, setParamsB] = useState<SimParams>(() => applyPreset(initialParams, 'winter'));
  const [activeScenario, setActiveScenario] = useState<'A' | 'B'>('A');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'complete'>('idle');
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from store when simulatorParams changes (after DNALab upload)
  useEffect(() => {
    if (simulatorParams && !isHydrated) {
      setParamsA(simulatorParams);
      setParamsB(applyPreset(simulatorParams, 'winter'));
      setIsHydrated(true);
      toast.success('Data Synced', {
        description: 'Simulator loaded with your DNA Lab analysis.',
      });
    }
  }, [simulatorParams, isHydrated]);

  const activeParams = activeScenario === 'A' ? paramsA : paramsB;
  const setActiveParams = activeScenario === 'A' ? setParamsA : setParamsB;

  const resultA = useMemo(() => runSimulation(paramsA), [paramsA]);
  const resultB = useMemo(() => runSimulation(paramsB), [paramsB]);

  const chartData = useMemo(() => mergeProjections(resultA.projection, resultB.projection), [resultA, resultB]);
  const comparison = useMemo(() => compareScenarios(resultA, resultB), [resultA, resultB]);

  const handleParamChange = useCallback(
    (key: keyof SimParams, value: number) => {
      setActiveParams((prev) => ({ ...prev, [key]: value }));
    },
    [setActiveParams]
  );

  const handlePreset = useCallback(
    (presetId: string) => {
      setActiveParams((prev) => applyPreset(prev, presetId));
      toast.info('Preset Applied', {
        description: `${PRESETS.find(p => p.id === presetId)?.label || presetId} configuration loaded.`,
      });
    },
    [setActiveParams]
  );

  const handleReset = useCallback(() => {
    const baseParams = simulatorParams || DEFAULT_PARAMS;
    setParamsA(baseParams);
    setParamsB(applyPreset(baseParams, 'winter'));
    toast.info('Reset Complete', {
      description: 'Parameters restored to baseline.',
    });
  }, [simulatorParams]);

  // Wire the "Run Simulation" button to save both scenarios
  const handleRunSimulation = useCallback(async () => {
    setRunStatus('running');
    
    try {
      // Save both scenarios to the database
      const [responseA, responseB] = await Promise.all([
        saveSimulationSnapshot(paramsA, resultA, 'Scenario A', false),
        saveSimulationSnapshot(paramsB, resultB, 'Scenario B', false),
      ]);

      if (responseA.error && responseB.error) {
        toast.error('Simulation Save Failed', {
          description: 'Could not archive scenarios to database.',
        });
        setRunStatus('idle');
        return;
      }

      setRunStatus('complete');
      toast.success('Simulation Complete', {
        description: `Both scenarios archived. A: ${resultA.runwayMonths.toFixed(1)}mo | B: ${resultB.runwayMonths.toFixed(1)}mo runway.`,
      });

      setTimeout(() => setRunStatus('idle'), 2000);
    } catch (err) {
      toast.error('Simulation Failed', {
        description: err instanceof Error ? err.message : 'An unexpected error occurred.',
      });
      setRunStatus('idle');
    }
  }, [paramsA, paramsB, resultA, resultB]);

  const handleSaveSnapshot = useCallback(async () => {
    setSaveStatus('saving');
    const params = activeScenario === 'A' ? paramsA : paramsB;
    const result = activeScenario === 'A' ? resultA : resultB;
    const response = await saveSimulationSnapshot(params, result, `Scenario ${activeScenario}`);
    if (response.error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [activeScenario, paramsA, paramsB, resultA, resultB]);

  const handleHydrateFromDNA = useCallback(() => {
    if (currentAnalysis) {
      const params: SimParams = {
        cashOnHand: currentAnalysis.cashOnHand,
        monthlyExpenses: currentAnalysis.monthlyBurn,
        monthlyRevenue: currentAnalysis.monthlyRevenue,
        expenseGrowth: currentAnalysis.expenseGrowth,
        revenueGrowth: currentAnalysis.revenueGrowth,
      };
      setParamsA(params);
      setParamsB(applyPreset(params, 'winter'));
      toast.success('Data Refreshed', {
        description: 'Simulator synced with latest DNA Lab data.',
      });
    } else {
      toast.warning('No Analysis Found', {
        description: 'Upload a CSV in DNA Lab first.',
      });
    }
  }, [currentAnalysis]);

  const parseInput = (value: string): number => {
    const cleaned = value.replace(/[$,]/g, '');
    return parseFloat(cleaned) || 0;
  };

  // Filter presets based on context mode
  const visiblePresets = contextMode === 'growth' 
    ? PRESETS.filter(p => ['blitz', 'raise'].includes(p.id))
    : PRESETS.filter(p => ['hire', 'winter'].includes(p.id));

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            <span className="gradient-text-violet">Runway Simulator</span>
          </h1>
          <p className="text-gray-400 mt-1">
            {contextMode === 'growth' 
              ? 'Model aggressive growth scenarios' 
              : 'Plan strategic operational changes'}
          </p>
        </div>
        <div className="flex gap-3">
          {currentAnalysis && (
            <MotionButton 
              variant="secondary" 
              onClick={handleHydrateFromDNA} 
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Sync DNA
            </MotionButton>
          )}
          <MotionButton variant="secondary" onClick={handleReset} className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Reset
          </MotionButton>
          <MotionButton 
            onClick={handleRunSimulation} 
            disabled={runStatus === 'running'}
            className={`flex items-center gap-2 ${runStatus === 'complete' ? 'bg-success text-charcoal' : ''}`}
          >
            {runStatus === 'running' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : runStatus === 'complete' ? (
              <Check className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {runStatus === 'running' ? 'Running...' : runStatus === 'complete' ? 'Complete!' : 'Run Simulation'}
          </MotionButton>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-3 space-y-4">
          <MotionCard
            className="p-6"
            custom={0}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <h3 className="font-semibold mb-4">
              {contextMode === 'growth' ? 'Growth Presets' : 'Strategy Presets'}
            </h3>
            <div className="space-y-2">
              {visiblePresets.map((preset, i) => {
                const Icon = presetIcons[preset.id] || Briefcase;
                return (
                  <motion.button
                    key={preset.id}
                    onClick={() => handlePreset(preset.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${presetColors[preset.id]}`}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                  >
                    <Icon className="w-5 h-5" />
                    <div className="text-left">
                      <span className="font-medium block">{preset.label}</span>
                      <span className="text-xs opacity-70">{preset.description}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
            {PRESETS.length > visiblePresets.length && (
              <p className="text-xs text-gray-500 mt-3 text-center">
                Switch to {contextMode === 'growth' ? 'Strategy' : 'Growth'} mode for more presets
              </p>
            )}
          </MotionCard>

          <MotionCard
            className="p-6"
            custom={1}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <h3 className="font-semibold mb-4">Parameters</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">Cash on Hand</label>
                <input
                  type="text"
                  value={formatCurrency(activeParams.cashOnHand)}
                  onChange={(e) => handleParamChange('cashOnHand', parseInput(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-electric/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-2">Monthly Expenses</label>
                <input
                  type="text"
                  value={formatCurrency(activeParams.monthlyExpenses)}
                  onChange={(e) => handleParamChange('monthlyExpenses', parseInput(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-electric/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-2">Monthly Revenue</label>
                <input
                  type="text"
                  value={formatCurrency(activeParams.monthlyRevenue)}
                  onChange={(e) => handleParamChange('monthlyRevenue', parseInput(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-electric/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-2">Revenue Growth (Annual)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(activeParams.revenueGrowth * 100)}
                  onChange={(e) => handleParamChange('revenueGrowth', parseInt(e.target.value) / 100)}
                  className="w-full accent-cyan-electric"
                />
                <div className="text-right text-sm text-cyan-electric">
                  {Math.round(activeParams.revenueGrowth * 100)}%
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-2">Expense Growth (Annual)</label>
                <input
                  type="range"
                  min="-10"
                  max="50"
                  value={Math.round(activeParams.expenseGrowth * 100)}
                  onChange={(e) => handleParamChange('expenseGrowth', parseInt(e.target.value) / 100)}
                  className="w-full accent-violet-vivid"
                />
                <div className="text-right text-sm text-violet-vivid">
                  {Math.round(activeParams.expenseGrowth * 100)}%
                </div>
              </div>
            </div>
          </MotionCard>
        </div>

        <div className="col-span-9 space-y-4">
          <MotionCard
            variant="elevated"
            className="p-6"
            custom={2}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Cash Projection</h2>
              <div className="flex gap-2">
                <motion.button
                  onClick={() => setActiveScenario('A')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeScenario === 'A' ? 'bg-cyan-electric text-charcoal' : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Scenario A
                </motion.button>
                <motion.button
                  onClick={() => setActiveScenario('B')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeScenario === 'B' ? 'bg-success text-charcoal' : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Scenario B
                </motion.button>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <defs>
                    <filter id="glowA" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="glowB" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <XAxis dataKey="month" stroke="#555" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#555"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCurrency(v, true)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="scenarioA"
                    name="Scenario A"
                    stroke="#00D4FF"
                    strokeWidth={2}
                    dot={false}
                    filter="url(#glowA)"
                  />
                  <Line
                    type="monotone"
                    dataKey="scenarioB"
                    name="Scenario B"
                    stroke="#00FF88"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                    filter="url(#glowB)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </MotionCard>

          <div className="grid grid-cols-3 gap-4">
            <MotionCard
              className="p-6 text-center"
              custom={3}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <div className="text-sm text-gray-400 uppercase tracking-wider mb-2">Scenario A Runway</div>
              <motion.div
                className="text-4xl font-bold text-cyan-electric"
                key={resultA.runwayMonths}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {formatRunway(resultA.runwayMonths)}
              </motion.div>
              <div className="text-sm text-gray-400">months</div>
            </MotionCard>
            <MotionCard
              className="p-6 text-center"
              custom={4}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <div className="text-sm text-gray-400 uppercase tracking-wider mb-2">Scenario B Runway</div>
              <motion.div
                className="text-4xl font-bold text-success"
                key={resultB.runwayMonths}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {formatRunway(resultB.runwayMonths)}
              </motion.div>
              <div className="text-sm text-gray-400">months</div>
            </MotionCard>
            <MotionCard
              className="p-6 text-center"
              custom={5}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <div className="text-sm text-gray-400 uppercase tracking-wider mb-2">Difference</div>
              <motion.div
                className={`text-4xl font-bold ${comparison.runwayDelta >= 0 ? 'text-success' : 'text-danger'}`}
                key={comparison.runwayDelta}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {comparison.runwayDelta >= 0 ? '+' : ''}
                {comparison.runwayDelta.toFixed(1)}
              </motion.div>
              <div className="text-sm text-gray-400">months {comparison.runwayDelta >= 0 ? 'gained' : 'lost'}</div>
            </MotionCard>
          </div>

          <MotionCard
            className="p-6"
            custom={6}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Save Scenario</h3>
                <p className="text-sm text-gray-400">Save current parameters as a snapshot</p>
              </div>
              <MotionButton
                variant="secondary"
                onClick={handleSaveSnapshot}
                disabled={saveStatus === 'saving'}
                className={`flex items-center gap-2 ${saveStatus === 'saved' ? 'bg-success/20 text-success border-success/30' : ''} ${saveStatus === 'error' ? 'bg-danger/20 text-danger border-danger/30' : ''}`}
              >
                {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                {saveStatus === 'saved' && <Check className="w-4 h-4" />}
                {saveStatus === 'idle' && <Save className="w-4 h-4" />}
                {saveStatus === 'error' && <Save className="w-4 h-4" />}
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save Snapshot'}
              </MotionButton>
            </div>
          </MotionCard>

          {/* Top-Line Revenue Chart - Powered by GrowthService */}
          <TopLineChart currentMRR={activeParams.monthlyRevenue} />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// TOP-LINE CHART COMPONENT (Uses GrowthService)
// ============================================================================

interface TopLineChartProps {
  currentMRR: number;
}

function TopLineChart({ currentMRR }: TopLineChartProps) {
  const { growthScenario, setGrowthScenario, isGrowthHydrated, setGrowthHydrated } = useAppStore();
  
  const [growthRate, setGrowthRate] = useState(0.08); // 8% monthly
  const [churnRate, setChurnRate] = useState(0.03); // 3% monthly
  const [contractionRate, setContractionRate] = useState(0.01); // 1% monthly (downgrades)
  const [arpa, setArpa] = useState(500);
  const [newCustomers, setNewCustomers] = useState(15);
  const [activeScenarios, setActiveScenarios] = useState<Set<'conservative' | 'base' | 'optimistic'>>(
    new Set(['conservative', 'base', 'optimistic'])
  );
  const [targetARR, setTargetARR] = useState(2000000);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from database on first load
  useEffect(() => {
    if (isGrowthHydrated) {
      setIsLoading(false);
      return;
    }

    const hydrateFromDB = async () => {
      const response = await fetchLatestGrowthScenario();
      if (response.data) {
        const saved = response.data;
        setGrowthRate(saved.growth_rate);
        setChurnRate(saved.churn_rate);
        setContractionRate(saved.contraction_rate || 0.01);
        setArpa(saved.arpa);
        setNewCustomers(saved.new_customers_per_month);
        setTargetARR(saved.target_arr);
        
        // Update store
        setGrowthScenario({
          baselineMRR: saved.baseline_mrr,
          growthRate: saved.growth_rate,
          churnRate: saved.churn_rate,
          contractionRate: saved.contraction_rate || 0.01,
          expansionRate: saved.expansion_rate,
          arpa: saved.arpa,
          newCustomersPerMonth: saved.new_customers_per_month,
          targetARR: saved.target_arr,
        });
        
        toast.info('Growth Scenario Loaded', {
          description: `Restored "${saved.name}" from archive.`,
        });
      }
      setGrowthHydrated(true);
      setIsLoading(false);
    };

    hydrateFromDB();
  }, [isGrowthHydrated, setGrowthHydrated, setGrowthScenario]);

  // Build MRR input from current simulator params
  const mrrInput: MRRInput = useMemo(() => ({
    currentMRR,
    arpa,
    newCustomersPerMonth: newCustomers,
  }), [currentMRR, arpa, newCustomers]);

  // Create custom scenarios based on slider values
  // Uses MRR Waterfall: Ending = Starting + New + Expansion - Churn - Contraction
  const customScenarios = useMemo(() => ({
    conservative: GrowthService.createCustomScenario(DEFAULT_SCENARIOS.conservative, {
      monthlyGrowthRate: growthRate * 0.7,
      churnRate: churnRate * 1.3,
      expansionRate: 0.01,
      contractionRate: contractionRate * 1.5, // Higher contraction in conservative
    }),
    base: GrowthService.createCustomScenario(DEFAULT_SCENARIOS.base, {
      monthlyGrowthRate: growthRate,
      churnRate: churnRate,
      expansionRate: 0.02,
      contractionRate: contractionRate, // Base contraction
    }),
    optimistic: GrowthService.createCustomScenario(DEFAULT_SCENARIOS.optimistic, {
      monthlyGrowthRate: growthRate * 1.4,
      churnRate: churnRate * 0.7,
      expansionRate: 0.03,
      contractionRate: contractionRate * 0.5, // Lower contraction in optimistic
    }),
  }), [growthRate, churnRate, contractionRate]);

  // Generate projections using GrowthService
  const comparison = useMemo(() => 
    GrowthService.generateScenarioComparison(mrrInput, customScenarios, 24, targetARR),
    [mrrInput, customScenarios, targetARR]
  );

  // Merge projections for chart
  const chartData = useMemo(() => 
    GrowthService.mergeProjectionsForChart(comparison),
    [comparison]
  );

  const toggleScenario = useCallback((id: 'conservative' | 'base' | 'optimistic') => {
    setActiveScenarios(prev => {
      const next = new Set(prev);
      if (next.has(id) && next.size > 1) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Save growth scenario to database
  const handleSaveGrowthScenario = useCallback(async () => {
    setSaveStatus('saving');

    const input: GrowthScenarioInput = {
      name: `Growth ${(growthRate * 100).toFixed(0)}% | Churn ${(churnRate * 100).toFixed(0)}% | Contraction ${(contractionRate * 100).toFixed(1)}%`,
      baselineMRR: currentMRR,
      growthRate,
      churnRate,
      expansionRate: 0.02, // Base expansion rate
      contractionRate, // MRR Waterfall: contraction from downgrades
      arpa,
      newCustomersPerMonth: newCustomers,
      targetARR,
      projectionMonths: 24,
      arr12: comparison.base.summary.arr12,
      arr24: comparison.base.summary.arr24,
      cagr1Y: comparison.base.summary.cagr1Y,
      cagr2Y: comparison.base.summary.cagr2Y,
      nrr: comparison.base.summary.nrr,
      projectionData: comparison.base.breakdown.map(b => ({
        month: b.month,
        mrr: b.endingMRR,
        arr: b.arr,
      })),
      metadata: {
        scenarios: {
          conservative: comparison.conservative.summary.arr24,
          base: comparison.base.summary.arr24,
          optimistic: comparison.optimistic.summary.arr24,
        },
        spread: comparison.spreadAt24,
        waterfallFormula: 'EndingMRR = StartingMRR + New + Expansion - Churn - Contraction',
      },
    };

    const response = await saveGrowthScenario(input);
    
    if (response.error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('saved');
      // Update store
      setGrowthScenario({
        baselineMRR: currentMRR,
        growthRate,
        churnRate,
        contractionRate,
        expansionRate: 0.02,
        arpa,
        newCustomersPerMonth: newCustomers,
        targetARR,
      });
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [currentMRR, growthRate, churnRate, contractionRate, arpa, newCustomers, targetARR, comparison, setGrowthScenario]);

  if (isLoading) {
    return (
      <MotionCard variant="elevated" className="p-6" custom={7} initial="hidden" animate="visible" variants={cardVariants}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-electric" />
        </div>
      </MotionCard>
    );
  }

  return (
    <MotionCard
      variant="elevated"
      className="p-6"
      custom={7}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-electric to-success flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-charcoal" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Top-Line Revenue Forecast</h2>
            <p className="text-sm text-gray-400">SaaS MRR Engine • Powered by GrowthService</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {(['conservative', 'base', 'optimistic'] as const).map((id) => {
              const isActive = activeScenarios.has(id);
              const colors = {
                conservative: '#FFB800',
                base: '#00D4FF',
                optimistic: '#00FF88',
              };
              return (
                <motion.button
                  key={id}
                  onClick={() => toggleScenario(id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    isActive ? 'bg-white/10 border border-white/20' : 'bg-white/5 text-gray-500'
                  }`}
                  style={{ color: isActive ? colors[id] : undefined }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {id.charAt(0).toUpperCase() + id.slice(1)}
                </motion.button>
              );
            })}
          </div>
          <motion.button
            onClick={handleSaveGrowthScenario}
            disabled={saveStatus === 'saving'}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              saveStatus === 'saved' 
                ? 'bg-success/20 text-success border border-success/30' 
                : saveStatus === 'error'
                ? 'bg-danger/20 text-danger border border-danger/30'
                : 'bg-cyan-electric/20 text-cyan-electric border border-cyan-electric/30 hover:bg-cyan-electric/30'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {saveStatus === 'saving' && <Loader2 className="w-3 h-3 animate-spin" />}
            {saveStatus === 'saved' && <Check className="w-3 h-3" />}
            {saveStatus === 'idle' && <Save className="w-3 h-3" />}
            {saveStatus === 'error' && <Save className="w-3 h-3" />}
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save'}
          </motion.button>
        </div>
      </div>

      {/* Growth Levers - MRR Waterfall: Ending = Starting + New + Expansion - Churn - Contraction */}
      <div className="grid grid-cols-5 gap-4 mb-6 p-4 glass-card">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Growth %</span>
            <span className="text-xs text-success font-semibold">{(growthRate * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="25"
            step="1"
            value={growthRate * 100}
            onChange={(e) => setGrowthRate(parseInt(e.target.value) / 100)}
            className="w-full accent-success h-1"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Churn %</span>
            <span className="text-xs text-danger font-semibold">{(churnRate * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="15"
            step="1"
            value={churnRate * 100}
            onChange={(e) => setChurnRate(parseInt(e.target.value) / 100)}
            className="w-full accent-danger h-1"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Contraction %</span>
            <span className="text-xs text-orange-400 font-semibold">{(contractionRate * 100).toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={contractionRate * 100}
            onChange={(e) => setContractionRate(parseFloat(e.target.value) / 100)}
            className="w-full accent-orange-400 h-1"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">ARPA</span>
            <span className="text-xs text-violet-vivid font-semibold">{formatCurrency(arpa)}</span>
          </div>
          <input
            type="range"
            min="50"
            max="2000"
            step="50"
            value={arpa}
            onChange={(e) => setArpa(parseInt(e.target.value))}
            className="w-full accent-violet-vivid h-1"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">New Cust/Mo</span>
            <span className="text-xs text-cyan-electric font-semibold">{newCustomers}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={newCustomers}
            onChange={(e) => setNewCustomers(parseInt(e.target.value))}
            className="w-full accent-cyan-electric h-1"
          />
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="toplineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="month" 
              stroke="#555" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              interval={2}
            />
            <YAxis 
              stroke="#555" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(v) => formatCurrency(v, true)}
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (!active || !payload) return null;
                return (
                  <div className="glass-card p-3 border border-white/20">
                    <p className="text-gray-400 text-xs mb-2">{label}</p>
                    {payload.map((entry, i) => (
                      <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
                        {entry.name}: {formatCurrency(entry.value as number, true)}
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Legend />
            
            {/* Target ARR line (Vivid Violet) */}
            <ReferenceLine 
              y={targetARR / 12} 
              stroke="#8B5CF6" 
              strokeDasharray="5 5" 
              strokeWidth={2}
            />

            {/* Base case with area */}
            {activeScenarios.has('base') && (
              <Area
                type="monotone"
                dataKey="base"
                name="Base Case"
                stroke="#00D4FF"
                strokeWidth={2}
                fill="url(#toplineGradient)"
              />
            )}

            {/* Conservative */}
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

            {/* Optimistic */}
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

      {/* Metrics Footer */}
      <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/10">
        <div className="text-center">
          <div className="text-xs text-gray-400">12-Mo ARR (Base)</div>
          <div className="text-lg font-bold text-cyan-electric">
            {GrowthService.formatRevenue(comparison.base.summary.arr12, true)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400">24-Mo ARR (Base)</div>
          <div className="text-lg font-bold text-success">
            {GrowthService.formatRevenue(comparison.base.summary.arr24, true)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400">CAGR (1Y)</div>
          <div className="text-lg font-bold text-violet-vivid">
            {GrowthService.formatPercent(comparison.base.summary.cagr1Y)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400">Scenario Spread</div>
          <div className="text-lg font-bold text-warning">
            {GrowthService.formatRevenue(comparison.spreadAt24, true)}
          </div>
        </div>
      </div>
    </MotionCard>
  );
}
