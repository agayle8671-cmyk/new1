/**
 * SystemHealth.tsx
 * 
 * Real-time system health feed component.
 * Displays runway status, alerts, and burn metrics.
 * Uses Electric Cyan for healthy pings, Vivid Violet/Red for danger alerts.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Check, 
  Bell,
  TrendingUp,
  TrendingDown,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import BurnMonitor, { 
  type HealthStatus, 
  type Alert,
  type BurnAnalysis,
  type HealthGrade,
} from '../../lib/services/BurnMonitor';
import { useAppStore } from '../../lib/store';
import { saveAlert, acknowledgeAlert } from '../../lib/api';
import type { SimParams } from '../../lib/simulator-engine';
import { DEFAULT_PARAMS } from '../../lib/simulator-engine';

// ============================================================================
// TYPES
// ============================================================================

interface SystemHealthProps {
  /** Whether the component is in compact/collapsed mode */
  compact?: boolean;
  /** Custom SimParams to override store values (for live slider updates) */
  customParams?: SimParams;
  /** Callback when health grade changes */
  onGradeChange?: (grade: HealthGrade) => void;
  /** Show full alert feed */
  showAlertFeed?: boolean;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const GradeBadge = ({ grade, label, animate = true }: { grade: HealthGrade; label: string; animate?: boolean }) => {
  const colors = {
    A: 'bg-success/20 text-success border-success/30',
    B: 'bg-warning/20 text-warning border-warning/30',
    C: 'bg-danger/20 text-danger border-danger/30',
  };

  const glowColors = {
    A: 'shadow-success/20',
    B: 'shadow-warning/20',
    C: 'shadow-danger/20',
  };

  return (
    <motion.div
      className={`px-3 py-1 rounded-lg text-xs font-bold border ${colors[grade]} ${animate ? `shadow-lg ${glowColors[grade]}` : ''}`}
      initial={animate ? { scale: 0.8, opacity: 0 } : false}
      animate={animate ? { scale: 1, opacity: 1 } : false}
      key={grade}
    >
      Grade {grade}: {label}
    </motion.div>
  );
};

const AlertItem = ({ 
  alert, 
  onAcknowledge,
  compact = false,
}: { 
  alert: Alert; 
  onAcknowledge?: (id: string) => void;
  compact?: boolean;
}) => {
  const iconMap = {
    critical: AlertTriangle,
    warning: AlertCircle,
    info: Info,
  };
  const Icon = iconMap[alert.severity];

  const colorMap = {
    critical: 'text-danger border-danger/30 bg-danger/10',
    warning: 'text-warning border-warning/30 bg-warning/10',
    info: 'text-cyan-electric border-cyan-electric/30 bg-cyan-electric/10',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`p-3 rounded-lg border ${colorMap[alert.severity]} ${compact ? 'p-2' : ''}`}
    >
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
          alert.severity === 'critical' ? 'text-danger' : 
          alert.severity === 'warning' ? 'text-warning' : 'text-cyan-electric'
        }`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`font-medium text-sm ${compact ? 'text-xs' : ''}`}>{alert.title}</span>
            {onAcknowledge && !alert.acknowledged && (
              <button
                onClick={() => onAcknowledge(alert.id)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {!compact && alert.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{alert.description}</p>
          )}
          <span className="text-[10px] text-gray-500 mt-1 block">
            {BurnMonitor.formatAlertTime(alert.timestamp)}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const BurnTrendIndicator = ({ trend }: { trend: 'increasing' | 'stable' | 'decreasing' }) => {
  const config = {
    increasing: { Icon: TrendingUp, color: 'text-danger', label: 'Burn Increasing' },
    stable: { Icon: Activity, color: 'text-gray-400', label: 'Burn Stable' },
    decreasing: { Icon: TrendingDown, color: 'text-success', label: 'Burn Decreasing' },
  };
  const { Icon, color, label } = config[trend];

  return (
    <div className={`flex items-center gap-1 text-xs ${color}`}>
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SystemHealth({
  compact = false,
  customParams,
  onGradeChange,
  showAlertFeed = true,
}: SystemHealthProps) {
  const { currentAnalysis, simulatorParams } = useAppStore();
  const [expanded, setExpanded] = useState(false);
  const [localAlerts, setLocalAlerts] = useState<Alert[]>([]);
  const [lastGrade, setLastGrade] = useState<HealthGrade | null>(null);

  // Determine which params to use
  const activeParams = useMemo((): SimParams => {
    if (customParams) return customParams;
    if (simulatorParams) return simulatorParams;
    if (currentAnalysis) {
      return {
        cashOnHand: currentAnalysis.cashOnHand,
        monthlyExpenses: currentAnalysis.monthlyBurn,
        monthlyRevenue: currentAnalysis.monthlyRevenue,
        expenseGrowth: currentAnalysis.expenseGrowth,
        revenueGrowth: currentAnalysis.revenueGrowth,
      };
    }
    return DEFAULT_PARAMS;
  }, [customParams, simulatorParams, currentAnalysis]);

  // Run burn analysis
  const analysis = useMemo((): BurnAnalysis => {
    return BurnMonitor.analyzeBurn({ simParams: activeParams });
  }, [activeParams]);

  // Update local alerts when analysis changes
  useEffect(() => {
    setLocalAlerts(analysis.alerts);
  }, [analysis.alerts]);

  // Track grade changes and notify parent
  useEffect(() => {
    if (analysis.health.grade !== lastGrade) {
      setLastGrade(analysis.health.grade);
      onGradeChange?.(analysis.health.grade);

      // Log critical alerts to database
      if (analysis.health.grade === 'C' && lastGrade !== null) {
        saveAlert({
          alertType: 'runway_critical',
          severity: 'critical',
          title: 'Runway Critical',
          description: analysis.health.description,
          runwayMonths: analysis.health.runwayMonths,
          healthGrade: 'C',
          metadata: { previousGrade: lastGrade },
        });
      }

      // Log burn spikes
      if (analysis.burnSpike.detected) {
        saveAlert({
          alertType: 'burn_spike',
          severity: 'critical',
          title: 'Burn Spike Detected',
          description: analysis.burnSpike.message || 'Unusual expense increase',
          runwayMonths: analysis.health.runwayMonths,
          healthGrade: analysis.health.grade,
          metadata: {
            expenseIncrease: analysis.burnSpike.expenseIncrease,
            revenueIncrease: analysis.burnSpike.revenueIncrease,
            month: analysis.burnSpike.month,
          },
        });
      }
    }
  }, [analysis.health.grade, analysis.health.description, analysis.health.runwayMonths, analysis.burnSpike, lastGrade, onGradeChange]);

  // Handle alert acknowledgment
  const handleAcknowledge = useCallback(async (alertId: string) => {
    setLocalAlerts(prev => prev.filter(a => a.id !== alertId));
    await acknowledgeAlert(alertId, false);
  }, []);

  // Count unacknowledged critical alerts
  const criticalCount = useMemo(() => 
    localAlerts.filter(a => a.severity === 'critical' && !a.acknowledged).length,
    [localAlerts]
  );

  // Render compact version
  if (compact) {
    return (
      <div className="relative">
        <motion.div
          className={`p-2 rounded-lg border ${
            analysis.health.grade === 'A' ? 'border-success/30 bg-success/10' :
            analysis.health.grade === 'B' ? 'border-warning/30 bg-warning/10' :
            'border-danger/30 bg-danger/10'
          }`}
          animate={{
            boxShadow: analysis.health.grade === 'C' 
              ? ['0 0 0 0 rgba(255, 68, 68, 0)', '0 0 15px 5px rgba(255, 68, 68, 0.3)', '0 0 0 0 rgba(255, 68, 68, 0)']
              : 'none',
          }}
          transition={{ duration: 2, repeat: analysis.health.grade === 'C' ? Infinity : 0 }}
        >
          <div className="flex items-center justify-center gap-2">
            <span className={`text-xl font-bold ${
              analysis.health.grade === 'A' ? 'text-success' :
              analysis.health.grade === 'B' ? 'text-warning' :
              'text-danger'
            }`}>
              {analysis.health.grade}
            </span>
            {criticalCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                {criticalCount}
              </span>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // Full version
  return (
    <div className="space-y-4">
      {/* Header with grade */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            analysis.health.grade === 'A' ? 'bg-success/20' :
            analysis.health.grade === 'B' ? 'bg-warning/20' :
            'bg-danger/20'
          }`}>
            <Activity className={`w-5 h-5 ${
              analysis.health.grade === 'A' ? 'text-success' :
              analysis.health.grade === 'B' ? 'text-warning' :
              'text-danger'
            }`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold">System Health</h3>
            <BurnTrendIndicator trend={analysis.burnTrend} />
          </div>
        </div>
        <GradeBadge grade={analysis.health.grade} label={analysis.health.label} />
      </div>

      {/* Runway Meter */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 uppercase tracking-wider">Runway</span>
          <span className={`text-xs font-semibold ${
            analysis.health.grade === 'A' ? 'text-success' :
            analysis.health.grade === 'B' ? 'text-warning' :
            'text-danger'
          }`}>
            {BurnMonitor.formatRunwayMonths(analysis.health.runwayMonths)}
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              analysis.health.grade === 'A' ? 'bg-gradient-to-r from-cyan-electric to-success' :
              analysis.health.grade === 'B' ? 'bg-gradient-to-r from-warning to-orange-400' :
              'bg-gradient-to-r from-danger to-red-600'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (analysis.health.runwayMonths / 24) * 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">{analysis.health.description}</p>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-3">
          <span className="text-xs text-gray-400">Net Burn</span>
          <div className={`text-lg font-bold ${analysis.currentNetBurn >= 0 ? 'text-success' : 'text-danger'}`}>
            ${Math.abs(analysis.currentNetBurn).toLocaleString()}
            <span className="text-xs font-normal text-gray-400">/mo</span>
          </div>
        </div>
        <div className="glass-card p-3">
          <span className="text-xs text-gray-400">Profitability</span>
          <div className="text-lg font-bold text-cyan-electric">
            {analysis.monthsToProfitability !== null 
              ? `${analysis.monthsToProfitability} mo`
              : 'N/A'
            }
          </div>
        </div>
      </div>

      {/* Alert Feed */}
      {showAlertFeed && localAlerts.length > 0 && (
        <div className="glass-card p-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between mb-3"
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-electric" />
              <span className="text-sm font-medium">Alert Feed</span>
              {criticalCount > 0 && (
                <span className="px-2 py-0.5 bg-danger/20 text-danger text-xs rounded-full">
                  {criticalCount} critical
                </span>
              )}
            </div>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {localAlerts.slice(0, 5).map((alert) => (
                  <AlertItem
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={handleAcknowledge}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Burn Spike Warning */}
      {analysis.burnSpike.detected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-lg border border-danger/30 bg-danger/10"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-danger">Burn Spike Alert</h4>
              <p className="text-sm text-gray-300 mt-1">{analysis.burnSpike.message}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export { GradeBadge, AlertItem, BurnTrendIndicator };





