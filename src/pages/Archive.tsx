import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Calendar, RefreshCw, Trash2, Activity, Dna, Database, X, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { fetchSnapshots, deleteSnapshot, formatSnapshotDate, type DnaSnapshot } from '../lib/api';
import { formatCurrency } from '../lib/simulator-engine';
import { MotionCard, MotionButton } from '../components/ui/MotionCard';
import { TableRowSkeleton } from '../components/ui/Skeleton';

const gradeColors: Record<string, string> = {
  A: 'text-success border-success/30 bg-success/10',
  B: 'text-cyan-electric border-cyan-electric/30 bg-cyan-electric/10',
  C: 'text-warning border-warning/30 bg-warning/10',
  D: 'text-orange-500 border-orange-500/30 bg-orange-500/10',
  F: 'text-danger border-danger/30 bg-danger/10',
};

const typeIcons = {
  analysis: Dna,
  simulation: Activity,
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: 'easeOut' },
  }),
};

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.03, duration: 0.3 },
  }),
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
};

function SnapshotDetailModal({ snapshot, onClose }: { snapshot: DnaSnapshot; onClose: () => void }) {
  const metadata = (snapshot.metadata as Record<string, unknown>) || {};

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-charcoal/90 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl glass-card-elevated p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-electric via-violet-vivid to-cyan-electric" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${snapshot.snapshot_type === 'analysis' ? 'bg-cyan-electric/20' : 'bg-violet-vivid/20'}`}>
            {snapshot.snapshot_type === 'analysis' ? (
              <Dna className="w-7 h-7 text-cyan-electric" />
            ) : (
              <Activity className="w-7 h-7 text-violet-vivid" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {snapshot.snapshot_type === 'analysis' ? 'Financial Analysis' : (metadata.scenario_label as string) || 'Simulation'}
            </h2>
            <p className="text-gray-400 text-sm">{formatSnapshotDate(snapshot.created_at)}</p>
          </div>
          {snapshot.grade && (
            <span className={`ml-auto inline-flex items-center justify-center w-14 h-14 rounded-xl font-bold text-2xl border ${gradeColors[snapshot.grade]}`}>
              {snapshot.grade}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="glass-card p-4">
            <div className="text-sm text-gray-400 mb-1">Runway</div>
            <div className="text-2xl font-bold text-cyan-electric">
              {snapshot.runway_months ? `${snapshot.runway_months.toFixed(1)} mo` : '-'}
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="text-sm text-gray-400 mb-1">Cash on Hand</div>
            <div className="text-2xl font-bold text-white">
              {snapshot.cash_on_hand ? formatCurrency(snapshot.cash_on_hand, true) : '-'}
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="text-sm text-gray-400 mb-1">Monthly Revenue</div>
            <div className="text-2xl font-bold text-success">
              {snapshot.monthly_revenue ? formatCurrency(snapshot.monthly_revenue, true) : '-'}
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="text-sm text-gray-400 mb-1">Monthly Burn</div>
            <div className="text-2xl font-bold text-violet-vivid">
              {snapshot.monthly_burn ? formatCurrency(snapshot.monthly_burn, true) : '-'}
            </div>
          </div>
        </div>

        {(snapshot.revenue_growth !== null || snapshot.expense_growth !== null || snapshot.profit_margin !== null) && (
          <div className="glass-card p-4 mb-6">
            <h3 className="font-semibold mb-3">Growth Metrics</h3>
            <div className="grid grid-cols-3 gap-4">
              {snapshot.revenue_growth !== null && (
                <div>
                  <div className="text-sm text-gray-400">Revenue Growth</div>
                  <div className="text-lg font-bold text-success">
                    {(snapshot.revenue_growth * 100).toFixed(1)}%
                  </div>
                </div>
              )}
              {snapshot.expense_growth !== null && (
                <div>
                  <div className="text-sm text-gray-400">Expense Growth</div>
                  <div className="text-lg font-bold text-violet-vivid">
                    {(snapshot.expense_growth * 100).toFixed(1)}%
                  </div>
                </div>
              )}
              {snapshot.profit_margin !== null && (
                <div>
                  <div className="text-sm text-gray-400">Profit Margin</div>
                  <div className={`text-lg font-bold ${snapshot.profit_margin >= 0 ? 'text-success' : 'text-danger'}`}>
                    {snapshot.profit_margin.toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {snapshot.insight && (
          <div className="glass-card p-4">
            <h3 className="font-semibold mb-2">AI Insight</h3>
            <p className="text-gray-400 leading-relaxed">{snapshot.insight}</p>
          </div>
        )}

        {snapshot.snapshot_type === 'simulation' && metadata.profitability_month && (
          <div className="glass-card p-4 mt-4">
            <h3 className="font-semibold mb-3">Simulation Results</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-400">Profitability Month</div>
                <div className="text-lg font-bold text-success">Month {metadata.profitability_month as number}</div>
              </div>
              {metadata.final_cash && (
                <div>
                  <div className="text-sm text-gray-400">Final Cash Position</div>
                  <div className="text-lg font-bold text-cyan-electric">
                    {formatCurrency(metadata.final_cash as number, true)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function Archive() {
  const [snapshots, setSnapshots] = useState<DnaSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'analysis' | 'simulation'>('all');
  const [selectedSnapshot, setSelectedSnapshot] = useState<DnaSnapshot | null>(null);

  useEffect(() => {
    loadSnapshots();
  }, []);

  const loadSnapshots = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchSnapshots(undefined, 50, true);
      if (response.error) {
        setError(response.error);
        toast.error('Failed to Load Archive', {
          description: response.error,
        });
      } else {
        setSnapshots(response.data || []);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMsg);
      toast.error('Failed to Load Archive', {
        description: errorMsg,
      });
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    // deleteSnapshot now handles its own toast notifications
    const response = await deleteSnapshot(id);
    if (!response.error) {
      setSnapshots((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const filteredSnapshots = useMemo(() => {
    return snapshots.filter((s) => {
      const matchesType = typeFilter === 'all' || s.snapshot_type === typeFilter;
      const matchesSearch =
        searchQuery === '' ||
        s.insight?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.grade?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [snapshots, searchQuery, typeFilter]);

  const stats = useMemo(() => {
    const analyses = snapshots.filter((s) => s.snapshot_type === 'analysis');
    const simulations = snapshots.filter((s) => s.snapshot_type === 'simulation');
    const avgRunway = snapshots.length > 0
      ? snapshots.reduce((acc, s) => acc + (s.runway_months || 0), 0) / snapshots.length
      : 0;
    return { total: snapshots.length, analyses: analyses.length, simulations: simulations.length, avgRunway };
  }, [snapshots]);

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
            <span className="gradient-text-cyan">DNA Archive</span>
          </h1>
          <p className="text-gray-400 mt-1">Historical financial analyses and simulations</p>
        </div>
        <MotionButton onClick={loadSnapshots} variant="secondary" className="flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </MotionButton>
      </header>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search snapshots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-electric/50 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'analysis', 'simulation'] as const).map((type) => (
            <motion.button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                typeFilter === type ? 'bg-cyan-electric text-charcoal' : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <MotionCard
          className="p-4 text-center"
          custom={0}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <motion.div
            className="text-2xl font-bold text-white"
            key={stats.total}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
          >
            {stats.total}
          </motion.div>
          <div className="text-sm text-gray-400">Total Snapshots</div>
        </MotionCard>
        <MotionCard
          className="p-4 text-center"
          custom={1}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <motion.div
            className="text-2xl font-bold text-cyan-electric"
            key={stats.analyses}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
          >
            {stats.analyses}
          </motion.div>
          <div className="text-sm text-gray-400">Analyses</div>
        </MotionCard>
        <MotionCard
          className="p-4 text-center"
          custom={2}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <motion.div
            className="text-2xl font-bold text-violet-vivid"
            key={stats.simulations}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
          >
            {stats.simulations}
          </motion.div>
          <div className="text-sm text-gray-400">Simulations</div>
        </MotionCard>
        <MotionCard
          className="p-4 text-center"
          custom={3}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <motion.div
            className="text-2xl font-bold text-success"
            key={stats.avgRunway}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
          >
            {stats.avgRunway.toFixed(1)}
          </motion.div>
          <div className="text-sm text-gray-400">Avg Runway (mo)</div>
        </MotionCard>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-4 border-danger/50 bg-danger/10"
          >
            <p className="text-danger">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <MotionCard
        variant="elevated"
        className="overflow-hidden"
        custom={4}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        disableHover
      >
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 text-sm text-gray-400 uppercase tracking-wider">
          <div className="col-span-2">Date</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-1">Grade</div>
          <div className="col-span-2">Runway</div>
          <div className="col-span-2">Burn Rate</div>
          <div className="col-span-3">Insight</div>
          <div className="col-span-1">Actions</div>
        </div>

        {loading ? (
          <div className="divide-y divide-white/5">
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </div>
        ) : filteredSnapshots.length === 0 ? (
          <motion.div
            className="p-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Database className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No snapshots found.</p>
            <p className="text-gray-500 text-sm">
              {snapshots.length === 0
                ? 'Save an analysis from DNA Lab or a simulation to see it here.'
                : 'Try adjusting your search or filter.'}
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredSnapshots.map((snapshot, i) => {
              const TypeIcon = typeIcons[snapshot.snapshot_type] || Dna;
              return (
                <motion.div
                  key={snapshot.id}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={rowVariants}
                  layout
                  className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 items-center hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setSelectedSnapshot(snapshot)}
                >
                  <div className="col-span-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{formatSnapshotDate(snapshot.created_at)}</span>
                  </div>
                  <div className="col-span-1">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${snapshot.snapshot_type === 'analysis' ? 'bg-cyan-electric/20 text-cyan-electric' : 'bg-violet-vivid/20 text-violet-vivid'}`}>
                      <TypeIcon className="w-3 h-3" />
                    </div>
                  </div>
                  <div className="col-span-1">
                    {snapshot.grade ? (
                      <motion.span
                        className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-bold text-lg border ${gradeColors[snapshot.grade] || gradeColors.C}`}
                        whileHover={{ scale: 1.1 }}
                      >
                        {snapshot.grade}
                      </motion.span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className="text-xl font-semibold text-white">
                      {snapshot.runway_months ? snapshot.runway_months.toFixed(1) : '-'}
                    </span>
                    <span className="text-gray-400 ml-1">mo</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-white">
                      {snapshot.monthly_burn ? formatCurrency(snapshot.monthly_burn, true) : '-'}
                    </span>
                    <span className="text-gray-400">/mo</span>
                  </div>
                  <div className="col-span-3 text-gray-400 truncate text-sm">
                    {snapshot.insight || (snapshot.metadata as Record<string, unknown>)?.scenario_label || 'No insight'}
                  </div>
                  <div className="col-span-1 flex gap-2">
                    <motion.button
                      className="p-2 rounded-lg hover:bg-cyan-electric/20 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSnapshot(snapshot);
                      }}
                      title="View Details"
                    >
                      <Eye className="w-4 h-4 text-cyan-electric" />
                    </motion.button>
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(snapshot.id);
                      }}
                      className="p-2 rounded-lg hover:bg-danger/20 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-danger" />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </MotionCard>

      <AnimatePresence>
        {selectedSnapshot && (
          <SnapshotDetailModal
            snapshot={selectedSnapshot}
            onClose={() => setSelectedSnapshot(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
