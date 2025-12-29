import { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dna, Activity, Archive, ChevronLeft, ChevronRight, Zap, TrendingUp, Users, BarChart3, AlertTriangle, DollarSign, Calculator, PieChart } from 'lucide-react';
import { useAppStore } from '../../lib/store';
import BurnMonitor, { type HealthGrade } from '../../lib/services/BurnMonitor';
import { DEFAULT_PARAMS } from '../../lib/simulator-engine';

const navItems = [
  { to: '/dna-lab', icon: Dna, label: 'DNA Lab', description: 'Analyze financials' },
  { to: '/simulator', icon: Activity, label: 'Simulator', description: 'Model scenarios' },
  { to: '/hiring', icon: Users, label: 'Hiring', description: 'Plan team growth' },
  { to: '/growth', icon: BarChart3, label: 'Growth', description: 'Revenue forecast' },
  { to: '/valuation', icon: DollarSign, label: 'Valuation', description: 'SaaS valuation' },
  { to: '/tax-credit', icon: Calculator, label: 'R&D Credit', description: 'Tax credit estimator' },
  { to: '/dilution', icon: PieChart, label: 'Dilution', description: 'Fundraising shaper' },
  { to: '/archive', icon: Archive, label: 'Archive', description: 'View history' },
];

// Grade color mapping using BurnMonitor
const gradeColors: Record<HealthGrade, { badge: string; text: string; glow: string }> = {
  A: { badge: 'badge-success', text: 'text-success', glow: 'shadow-success/30' },
  B: { badge: 'badge-warning', text: 'text-warning', glow: 'shadow-warning/30' },
  C: { badge: 'badge-danger', text: 'text-danger', glow: 'shadow-danger/30' },
};

export default function FloatingSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { currentAnalysis, simulatorParams, contextMode, setContextMode } = useAppStore();

  // Use BurnMonitor for health evaluation
  const healthAnalysis = useMemo(() => {
    // Prioritize simulator params (from DNALab), then current analysis, then defaults
    const params = simulatorParams || (currentAnalysis ? {
      cashOnHand: currentAnalysis.cashOnHand,
      monthlyExpenses: currentAnalysis.monthlyBurn,
      monthlyRevenue: currentAnalysis.monthlyRevenue,
      expenseGrowth: currentAnalysis.expenseGrowth,
      revenueGrowth: currentAnalysis.revenueGrowth,
    } : null);

    if (!params) return null;

    return BurnMonitor.analyzeBurn({ simParams: params });
  }, [currentAnalysis, simulatorParams]);

  // Extract health metrics
  const hasData = healthAnalysis !== null;
  const health = healthAnalysis?.health;
  const runwayMonths = health?.runwayMonths ?? null;
  const runwayPercent = runwayMonths ? Math.min(100, (runwayMonths / 24) * 100) : 0;
  const grade = health?.grade ?? 'C';
  const { badge: statusColor, text: textColor, glow: glowColor } = gradeColors[grade];
  const hasCriticalAlerts = healthAnalysis?.alerts.some(a => a.severity === 'critical') ?? false;

  return (
    <aside
      className={`fixed top-4 left-4 bottom-4 z-50 glass-sidebar flex flex-col transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-electric to-violet-vivid flex items-center justify-center">
              <Dna className="w-5 h-5 text-charcoal" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="font-bold text-lg gradient-text-mixed">Runway</h1>
                <p className="text-xs text-gray-500">v2.0</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="p-4 border-b border-white/10 flex justify-center text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      <div className={`p-4 border-b border-white/10 ${collapsed ? 'px-2' : ''}`}>
        {!collapsed ? (
          <div className="glass-card p-1 flex gap-1">
            <button
              onClick={() => setContextMode('growth')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                contextMode === 'growth'
                  ? 'bg-cyan-electric/20 text-cyan-electric'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Growth
            </button>
            <button
              onClick={() => setContextMode('strategy')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                contextMode === 'strategy'
                  ? 'bg-violet-vivid/20 text-violet-vivid'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Zap className="w-4 h-4" />
              Strategy
            </button>
          </div>
        ) : (
          <button
            onClick={() => setContextMode(contextMode === 'growth' ? 'strategy' : 'growth')}
            className={`w-full p-2 rounded-lg transition-all ${
              contextMode === 'growth' ? 'bg-cyan-electric/20' : 'bg-violet-vivid/20'
            }`}
          >
            {contextMode === 'growth' ? (
              <TrendingUp className="w-5 h-5 text-cyan-electric mx-auto" />
            ) : (
              <Zap className="w-5 h-5 text-violet-vivid mx-auto" />
            )}
          </button>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item-active' : ''} ${collapsed ? 'justify-center px-0' : ''}`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* System Health Feed */}
      <div className={`p-4 border-t border-white/10 ${collapsed ? 'px-2' : ''}`}>
        <motion.div 
          className={`glass-card ${collapsed ? 'p-2' : 'p-4'} ${hasCriticalAlerts ? `shadow-lg ${glowColor}` : ''}`}
          animate={hasCriticalAlerts ? {
            boxShadow: ['0 0 0 0 rgba(255, 68, 68, 0)', '0 0 15px 5px rgba(255, 68, 68, 0.2)', '0 0 0 0 rgba(255, 68, 68, 0)'],
          } : {}}
          transition={{ duration: 2, repeat: hasCriticalAlerts ? Infinity : 0 }}
        >
          {!collapsed ? (
            <>
              {/* Header with Grade */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400 uppercase tracking-wider">System Health</span>
                {hasData ? (
                  <div className="flex items-center gap-2">
                    {hasCriticalAlerts && (
                      <AlertTriangle className="w-3 h-3 text-danger animate-pulse" />
                    )}
                    <span className={`badge ${statusColor}`}>
                      Grade {grade}
                    </span>
                  </div>
                ) : (
                  <span className="badge bg-white/10 text-gray-400">No Data</span>
                )}
              </div>
              
              {hasData && runwayMonths !== null ? (
                <>
                  {/* Runway Value */}
                  <motion.div
                    className={`stat-value ${textColor}`}
                    key={runwayMonths}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                  >
                    {runwayMonths >= 999 ? '∞' : runwayMonths.toFixed(1)}
                  </motion.div>
                  <div className="text-sm text-gray-400 mt-1">months runway</div>
                  
                  {/* Progress Bar with Grade Colors */}
                  <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        grade === 'A' ? 'bg-gradient-to-r from-cyan-electric to-success' :
                        grade === 'B' ? 'bg-gradient-to-r from-warning to-orange-400' :
                        'bg-gradient-to-r from-danger to-red-600'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${runwayPercent}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>

                  {/* Health Description */}
                  <p className="text-xs text-gray-500 mt-2">{health?.label}</p>

                  {/* Burn Trend Indicator */}
                  {healthAnalysis && (
                    <div className={`flex items-center gap-1 mt-2 text-xs ${
                      healthAnalysis.burnTrend === 'decreasing' ? 'text-success' :
                      healthAnalysis.burnTrend === 'increasing' ? 'text-danger' :
                      'text-gray-400'
                    }`}>
                      <Activity className="w-3 h-3" />
                      <span>Burn {healthAnalysis.burnTrend}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-gray-500 text-sm">Upload financial data</p>
                  <p className="text-gray-600 text-xs mt-1">to see system health</p>
                </div>
              )}
            </>
          ) : (
            /* Collapsed View */
            <div className="text-center relative">
              {hasData ? (
                <>
                  <div className={`text-xl font-bold ${textColor}`}>
                    {grade}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {runwayMonths !== null ? `${runwayMonths.toFixed(0)}mo` : '-'}
                  </div>
                  {hasCriticalAlerts && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-danger rounded-full animate-pulse" />
                  )}
                </>
              ) : (
                <div className="text-[10px] text-gray-500">-</div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </aside>
  );
}
