import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from './supabase';
import type { FinancialAnalysis } from './dna-processor';
import type { SimParams, SimulationResult } from './simulator-engine';

export interface DnaSnapshot {
  id: string;
  created_at: string;
  snapshot_type: 'analysis' | 'simulation';
  grade: string | null;
  runway_months: number | null;
  monthly_burn: number | null;
  monthly_revenue: number | null;
  cash_on_hand: number | null;
  profit_margin: number | null;
  burn_multiple: number | null;
  revenue_growth: number | null;
  expense_growth: number | null;
  insight: string | null;
  revenue_trend: Array<{ month: string; revenue: number; expenses: number }>;
  projection_data: Array<{ month: string; cash: number }>;
  scenario_params: SimParams | null;
  metadata: Record<string, unknown>;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export async function saveAnalysisSnapshot(
  analysis: FinancialAnalysis,
  showToast: boolean = true
): Promise<ApiResponse<DnaSnapshot>> {
  if (!isSupabaseConfigured) {
    const errorMsg = 'Database not configured. Data saved locally only.';
    if (showToast) {
      toast.warning('Offline Mode', {
        description: errorMsg,
      });
    }
    return { data: null, error: errorMsg, loading: false };
  }

  try {
    // Log the attempt for debugging
    console.log('[API] Attempting to save analysis snapshot...', {
      hasSupabase: isSupabaseConfigured,
      snapshotType: 'analysis',
      grade: analysis.grade,
    });

    const { data, error } = await supabase
      .from('dna_snapshots')
      .insert({
        snapshot_type: 'analysis',
        grade: analysis.grade,
        runway_months: analysis.runwayMonths,
        monthly_burn: analysis.monthlyBurn,
        monthly_revenue: analysis.monthlyRevenue,
        cash_on_hand: analysis.cashOnHand,
        profit_margin: analysis.profitMargin,
        burn_multiple: analysis.burnMultiple,
        revenue_growth: analysis.revenueGrowth,
        expense_growth: analysis.expenseGrowth,
        insight: analysis.insight,
        revenue_trend: analysis.revenueTrend,
      })
      .select()
      .maybeSingle();

    console.log('[API] Supabase response:', { hasData: !!data, hasError: !!error, errorCode: error?.code, errorMessage: error?.message });

    if (error) {
      // Check for the specific "secret API key" error
      const isSecretKeyError = error.message?.toLowerCase().includes('secret') || 
                              error.message?.toLowerCase().includes('forbidden');
      
      if (isSecretKeyError) {
        const errorMsg = 'Wrong API key type. Use the "anon" (public) key in Railway, not the service role key. Check Railway → Variables → VITE_SUPABASE_ANON_KEY';
        if (showToast) {
          toast.error('Failed to Save Analysis', {
            description: errorMsg,
            duration: 8000, // Show longer for important errors
          });
        }
        console.error('❌ Supabase Error:', error.message);
        console.error('💡 Fix: In Railway, set VITE_SUPABASE_ANON_KEY to your Supabase "anon" key (from Settings → API → anon/public key), NOT the service_role key');
        return { data: null, error: errorMsg, loading: false };
      }
      
      if (showToast) {
        toast.error('Failed to Save Analysis', {
          description: error.message,
        });
      }
      return { data: null, error: error.message, loading: false };
    }

    if (showToast) {
      toast.success('Analysis Saved', {
        description: `Grade ${analysis.grade} snapshot archived successfully.`,
      });
    }

    return { data: data as DnaSnapshot, error: null, loading: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
    if (showToast) {
      toast.error('Save Failed', {
        description: errorMsg,
      });
    }
    return { data: null, error: errorMsg, loading: false };
  }
}

export async function saveSimulationSnapshot(
  params: SimParams,
  result: SimulationResult,
  scenarioLabel?: string,
  showToast: boolean = true
): Promise<ApiResponse<DnaSnapshot>> {
  if (!isSupabaseConfigured) {
    const errorMsg = 'Database not configured. Data saved locally only.';
    if (showToast) {
      toast.warning('Offline Mode', {
        description: errorMsg,
      });
    }
    return { data: null, error: errorMsg, loading: false };
  }

  try {
    const projection = result.projection.map((p) => ({ month: p.month, cash: p.cash }));

    const { data, error } = await supabase
      .from('dna_snapshots')
      .insert({
        snapshot_type: 'simulation',
        runway_months: result.runwayMonths,
        monthly_burn: params.monthlyExpenses,
        monthly_revenue: params.monthlyRevenue,
        cash_on_hand: params.cashOnHand,
        revenue_growth: params.revenueGrowth,
        expense_growth: params.expenseGrowth,
        projection_data: projection,
        scenario_params: params,
        metadata: {
          scenario_label: scenarioLabel || 'Unnamed Scenario',
          profitability_month: result.profitabilityMonth,
          final_cash: result.finalCash,
          total_revenue: result.totalRevenue,
          total_expenses: result.totalExpenses,
        },
      })
      .select()
      .maybeSingle();

    if (error) {
      // Check for the specific "secret API key" error
      const isSecretKeyError = error.message?.toLowerCase().includes('secret') || 
                              error.message?.toLowerCase().includes('forbidden');
      
      if (isSecretKeyError) {
        const errorMsg = 'Wrong API key type. Use the "anon" (public) key in Railway, not the service role key. Check Railway → Variables → VITE_SUPABASE_ANON_KEY';
        if (showToast) {
          toast.error('Failed to Save Simulation', {
            description: errorMsg,
            duration: 8000,
          });
        }
        console.error('❌ Supabase Error:', error.message);
        console.error('💡 Fix: In Railway, set VITE_SUPABASE_ANON_KEY to your Supabase "anon" key (from Settings → API → anon/public key), NOT the service_role key');
        return { data: null, error: errorMsg, loading: false };
      }
      
      if (showToast) {
        toast.error('Failed to Save Simulation', {
          description: error.message,
        });
      }
      return { data: null, error: error.message, loading: false };
    }

    if (showToast) {
      toast.success('Simulation Saved', {
        description: `${scenarioLabel || 'Scenario'} archived with ${result.runwayMonths.toFixed(1)} months runway.`,
      });
    }

    return { data: data as DnaSnapshot, error: null, loading: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
    if (showToast) {
      toast.error('Save Failed', {
        description: errorMsg,
      });
    }
    return { data: null, error: errorMsg, loading: false };
  }
}

export async function fetchSnapshots(
  type?: 'analysis' | 'simulation',
  limit: number = 50,
  showToast: boolean = false
): Promise<ApiResponse<DnaSnapshot[]>> {
  if (!isSupabaseConfigured) {
    return { data: [], error: 'Database not configured', loading: false };
  }

  try {
    let query = supabase
      .from('dna_snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type) {
      query = query.eq('snapshot_type', type);
    }

    const { data, error } = await query;

    if (error) {
      if (showToast) {
        toast.error('Failed to Load Snapshots', {
          description: error.message,
        });
      }
      return { data: null, error: error.message, loading: false };
    }

    return { data: data as DnaSnapshot[], error: null, loading: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
    if (showToast) {
      toast.error('Load Failed', {
        description: errorMsg,
      });
    }
    return { data: null, error: errorMsg, loading: false };
  }
}

export async function fetchSnapshotById(
  id: string,
  showToast: boolean = false
): Promise<ApiResponse<DnaSnapshot>> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Database not configured', loading: false };
  }

  try {
    const { data, error } = await supabase
      .from('dna_snapshots')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      if (showToast) {
        toast.error('Failed to Load Snapshot', {
          description: error.message,
        });
      }
      return { data: null, error: error.message, loading: false };
    }

    return { data: data as DnaSnapshot, error: null, loading: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
    if (showToast) {
      toast.error('Load Failed', {
        description: errorMsg,
      });
    }
    return { data: null, error: errorMsg, loading: false };
  }
}

export async function deleteSnapshot(
  id: string,
  showToast: boolean = true
): Promise<ApiResponse<null>> {
  if (!isSupabaseConfigured) {
    const errorMsg = 'Database not configured';
    if (showToast) {
      toast.error('Delete Failed', {
        description: errorMsg,
      });
    }
    return { data: null, error: errorMsg, loading: false };
  }

  try {
    const { error } = await supabase.from('dna_snapshots').delete().eq('id', id);

    if (error) {
      if (showToast) {
        toast.error('Failed to Delete Snapshot', {
          description: error.message,
        });
      }
      return { data: null, error: error.message, loading: false };
    }

    if (showToast) {
      toast.success('Snapshot Deleted', {
        description: 'The snapshot has been permanently removed.',
      });
    }

    return { data: null, error: null, loading: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
    if (showToast) {
      toast.error('Delete Failed', {
        description: errorMsg,
      });
    }
    return { data: null, error: errorMsg, loading: false };
  }
}

export function formatSnapshotDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// GROWTH SCENARIOS API
// ============================================================================

/**
 * Growth Scenario record from database
 */
export interface GrowthScenarioRecord {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  baseline_mrr: number;
  growth_rate: number;
  churn_rate: number;
  expansion_rate: number;
  contraction_rate: number;
  arpa: number;
  new_customers_per_month: number;
  target_arr: number;
  projection_months: number;
  arr_12: number | null;
  arr_24: number | null;
  cagr_1y: number | null;
  cagr_2y: number | null;
  nrr: number | null;
  projection_data: Array<{ month: string; mrr: number; arr: number }>;
  metadata: Record<string, unknown>;
}

/**
 * Input for saving a growth scenario
 */
export interface GrowthScenarioInput {
  name: string;
  baselineMRR: number;
  growthRate: number;
  churnRate: number;
  expansionRate: number;
  contractionRate: number;
  arpa: number;
  newCustomersPerMonth: number;
  targetARR: number;
  projectionMonths?: number;
  arr12?: number;
  arr24?: number;
  cagr1Y?: number;
  cagr2Y?: number;
  nrr?: number;
  projectionData?: Array<{ month: string; mrr: number; arr: number }>;
  metadata?: Record<string, unknown>;
}

/**
 * Save a growth scenario to the database
 * POST /api/growth/save
 */
export async function saveGrowthScenario(
  input: GrowthScenarioInput,
  showToast: boolean = true
): Promise<ApiResponse<GrowthScenarioRecord>> {
  if (!isSupabaseConfigured) {
    const errorMsg = 'Database not configured. Data saved locally only.';
    if (showToast) {
      toast.warning('Offline Mode', {
        description: errorMsg,
      });
    }
    return { data: null, error: errorMsg, loading: false };
  }

  try {
    const { data, error } = await supabase
      .from('growth_scenarios')
      .insert({
        name: input.name,
        baseline_mrr: input.baselineMRR,
        growth_rate: input.growthRate,
        churn_rate: input.churnRate,
        expansion_rate: input.expansionRate,
        contraction_rate: input.contractionRate,
        arpa: input.arpa,
        new_customers_per_month: input.newCustomersPerMonth,
        target_arr: input.targetARR,
        projection_months: input.projectionMonths || 24,
        arr_12: input.arr12,
        arr_24: input.arr24,
        cagr_1y: input.cagr1Y,
        cagr_2y: input.cagr2Y,
        nrr: input.nrr,
        projection_data: input.projectionData || [],
        metadata: input.metadata || {},
      })
      .select()
      .maybeSingle();

    if (error) {
      if (showToast) {
        toast.error('Failed to Save Growth Scenario', {
          description: error.message,
        });
      }
      return { data: null, error: error.message, loading: false };
    }

    if (showToast) {
      toast.success('Growth Scenario Saved', {
        description: `"${input.name}" archived with ${(input.growthRate * 100).toFixed(0)}% growth rate.`,
      });
    }

    return { data: data as GrowthScenarioRecord, error: null, loading: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
    if (showToast) {
      toast.error('Save Failed', {
        description: errorMsg,
      });
    }
    return { data: null, error: errorMsg, loading: false };
  }
}

/**
 * Fetch list of growth scenarios
 * GET /api/growth/list
 */
export async function fetchGrowthScenarios(
  limit: number = 50,
  showToast: boolean = false
): Promise<ApiResponse<GrowthScenarioRecord[]>> {
  if (!isSupabaseConfigured) {
    return { data: [], error: 'Database not configured', loading: false };
  }

  try {
    const { data, error } = await supabase
      .from('growth_scenarios')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (showToast) {
        toast.error('Failed to Load Growth Scenarios', {
          description: error.message,
        });
      }
      return { data: null, error: error.message, loading: false };
    }

    return { data: data as GrowthScenarioRecord[], error: null, loading: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
    if (showToast) {
      toast.error('Load Failed', {
        description: errorMsg,
      });
    }
    return { data: null, error: errorMsg, loading: false };
  }
}

/**
 * Fetch the most recent growth scenario for hydration
 */
export async function fetchLatestGrowthScenario(
  showToast: boolean = false
): Promise<ApiResponse<GrowthScenarioRecord>> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Database not configured', loading: false };
  }

  try {
    const { data, error } = await supabase
      .from('growth_scenarios')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (showToast) {
        toast.error('Failed to Load Growth Scenario', {
          description: error.message,
        });
      }
      return { data: null, error: error.message, loading: false };
    }

    return { data: data as GrowthScenarioRecord, error: null, loading: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
    if (showToast) {
      toast.error('Load Failed', {
        description: errorMsg,
      });
    }
    return { data: null, error: errorMsg, loading: false };
  }
}

/**
 * Fetch a specific growth scenario by ID
 */
export async function fetchGrowthScenarioById(
  id: string,
  showToast: boolean = false
): Promise<ApiResponse<GrowthScenarioRecord>> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Database not configured', loading: false };
  }

  try {
    const { data, error } = await supabase
      .from('growth_scenarios')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      if (showToast) {
        toast.error('Failed to Load Growth Scenario', {
          description: error.message,
        });
      }
      return { data: null, error: error.message, loading: false };
    }

    return { data: data as GrowthScenarioRecord, error: null, loading: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
    if (showToast) {
      toast.error('Load Failed', {
        description: errorMsg,
      });
    }
    return { data: null, error: errorMsg, loading: false };
  }
}

/**
 * Delete a growth scenario
 */
export async function deleteGrowthScenario(
  id: string,
  showToast: boolean = true
): Promise<ApiResponse<null>> {
  if (!isSupabaseConfigured) {
    const errorMsg = 'Database not configured';
    if (showToast) {
      toast.error('Delete Failed', {
        description: errorMsg,
      });
    }
    return { data: null, error: errorMsg, loading: false };
  }

  try {
    const { error } = await supabase.from('growth_scenarios').delete().eq('id', id);

    if (error) {
      if (showToast) {
        toast.error('Failed to Delete Growth Scenario', {
          description: error.message,
        });
      }
      return { data: null, error: error.message, loading: false };
    }

    if (showToast) {
      toast.success('Growth Scenario Deleted', {
        description: 'The scenario has been permanently removed.',
      });
    }

    return { data: null, error: null, loading: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
    if (showToast) {
      toast.error('Delete Failed', {
        description: errorMsg,
      });
    }
    return { data: null, error: errorMsg, loading: false };
  }
}

// ============================================================================
// ALERT HISTORY API
// ============================================================================

/**
 * Alert history record from database
 */
export interface AlertHistoryRecord {
  id: string;
  created_at: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string | null;
  runway_months: number | null;
  health_grade: 'A' | 'B' | 'C' | null;
  metadata: Record<string, unknown>;
  acknowledged: boolean;
  acknowledged_at: string | null;
}

/**
 * Input for saving an alert
 */
export interface AlertInput {
  alertType: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description?: string;
  runwayMonths?: number;
  healthGrade?: 'A' | 'B' | 'C';
  metadata?: Record<string, unknown>;
}

/**
 * Save a critical alert to the database
 * POST /api/alerts/save
 */
export async function saveAlert(
  input: AlertInput,
  showToast: boolean = false
): Promise<ApiResponse<AlertHistoryRecord>> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Database not configured', loading: false };
  }

  try {
    const { data, error } = await supabase
      .from('alert_history')
      .insert({
        alert_type: input.alertType,
        severity: input.severity,
        title: input.title,
        description: input.description || null,
        runway_months: input.runwayMonths || null,
        health_grade: input.healthGrade || null,
        metadata: input.metadata || {},
      })
      .select()
      .maybeSingle();

    if (error) {
      if (showToast) {
        toast.error('Failed to Log Alert', {
          description: error.message,
        });
      }
      return { data: null, error: error.message, loading: false };
    }

    return { data: data as AlertHistoryRecord, error: null, loading: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { data: null, error: errorMsg, loading: false };
  }
}

/**
 * Fetch alert history
 * GET /api/alerts/list
 */
export async function fetchAlerts(
  limit: number = 50,
  unacknowledgedOnly: boolean = false,
  showToast: boolean = false
): Promise<ApiResponse<AlertHistoryRecord[]>> {
  if (!isSupabaseConfigured) {
    return { data: [], error: 'Database not configured', loading: false };
  }

  try {
    let query = supabase
      .from('alert_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unacknowledgedOnly) {
      query = query.eq('acknowledged', false);
    }

    const { data, error } = await query;

    if (error) {
      if (showToast) {
        toast.error('Failed to Load Alerts', {
          description: error.message,
        });
      }
      return { data: null, error: error.message, loading: false };
    }

    return { data: data as AlertHistoryRecord[], error: null, loading: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { data: null, error: errorMsg, loading: false };
  }
}

/**
 * Fetch only critical alerts
 */
// ============================================================================
// AI CONVERSATION MEMORY (Stage 3)
// ============================================================================

export interface ConversationMemoryRecord {
  id: string;
  user_id: string | null;
  summary: string | null;
  key_insights: string[];
  created_at: string;
}

export interface ConversationMemoryInput {
  summary: string;
  key_insights?: string[];
}

/**
 * Save AI conversation memory to the database
 */
export async function saveConversationMemory(
  input: ConversationMemoryInput,
  showToast: boolean = false
): Promise<ApiResponse<ConversationMemoryRecord>> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Database not configured', loading: false };
  }

  try {
    const { data, error } = await supabase
      .from('ai_conversation_memory')
      .insert({
        summary: input.summary,
        key_insights: input.key_insights || [],
      })
      .select()
      .maybeSingle();

    if (error) {
      if (showToast) {
        toast.error('Failed to Save Conversation', {
          description: error.message,
        });
      }
      return { data: null, error: error.message, loading: false };
    }

    if (showToast) {
      toast.success('Conversation Saved', {
        description: 'Key insights archived for future reference.',
      });
    }

    return { data: data as ConversationMemoryRecord, error: null, loading: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { data: null, error: errorMsg, loading: false };
  }
}

/**
 * Fetch conversation memory history
 */
export async function fetchConversationMemory(
  limit: number = 20,
  showToast: boolean = false
): Promise<ApiResponse<ConversationMemoryRecord[]>> {
  if (!isSupabaseConfigured) {
    return { data: [], error: 'Database not configured', loading: false };
  }

  try {
    const { data, error } = await supabase
      .from('ai_conversation_memory')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (showToast) {
        toast.error('Failed to Load Conversations', {
          description: error.message,
        });
      }
      return { data: null, error: error.message, loading: false };
    }

    return { data: data as ConversationMemoryRecord[], error: null, loading: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
    if (showToast) {
      toast.error('Load Failed', {
        description: errorMsg,
      });
    }
    return { data: null, error: errorMsg, loading: false };
  }
}

export async function fetchCriticalAlerts(
  limit: number = 10,
  showToast: boolean = false
): Promise<ApiResponse<AlertHistoryRecord[]>> {
  if (!isSupabaseConfigured) {
    return { data: [], error: 'Database not configured', loading: false };
  }

  try {
    const { data, error } = await supabase
      .from('alert_history')
      .select('*')
      .eq('severity', 'critical')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (showToast) {
        toast.error('Failed to Load Critical Alerts', {
          description: error.message,
        });
      }
      return { data: null, error: error.message, loading: false };
    }

    return { data: data as AlertHistoryRecord[], error: null, loading: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { data: null, error: errorMsg, loading: false };
  }
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(
  id: string,
  showToast: boolean = true
): Promise<ApiResponse<null>> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Database not configured', loading: false };
  }

  try {
    const { error } = await supabase
      .from('alert_history')
      .update({ acknowledged: true })
      .eq('id', id);

    if (error) {
      if (showToast) {
        toast.error('Failed to Acknowledge Alert', {
          description: error.message,
        });
      }
      return { data: null, error: error.message, loading: false };
    }

    if (showToast) {
      toast.success('Alert Acknowledged', {
        description: 'The alert has been dismissed.',
      });
    }

    return { data: null, error: null, loading: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
    if (showToast) {
      toast.error('Acknowledge Failed', {
        description: errorMsg,
      });
    }
    return { data: null, error: errorMsg, loading: false };
  }
}

/**
 * Clear all acknowledged alerts (cleanup)
 */
export async function clearAcknowledgedAlerts(
  showToast: boolean = true
): Promise<ApiResponse<null>> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Database not configured', loading: false };
  }

  try {
    const { error } = await supabase
      .from('alert_history')
      .delete()
      .eq('acknowledged', true);

    if (error) {
      if (showToast) {
        toast.error('Failed to Clear Alerts', {
          description: error.message,
        });
      }
      return { data: null, error: error.message, loading: false };
    }

    if (showToast) {
      toast.success('Alerts Cleared', {
        description: 'Acknowledged alerts have been removed.',
      });
    }

    return { data: null, error: null, loading: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { data: null, error: errorMsg, loading: false };
  }
}

export interface CustomerFeedback {
  id?: string;
  user_id?: string;
  feedback_text: string;
  source?: string;
  rating?: number;
  sentiment_score?: number;
  sentiment_label?: 'positive' | 'neutral' | 'negative';
  created_at?: string;
  metadata?: Record<string, unknown>;
}

export interface SentimentAnalysis {
  overall: 'positive' | 'neutral' | 'negative';
  score: number; // -1 to 1
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  totalCount: number;
  recentTrend?: 'improving' | 'stable' | 'declining';
}

/**
 * Analyze sentiment from customer feedback text
 * Simple keyword-based sentiment analysis (can be enhanced with AI/ML)
 */
export function analyzeSentiment(feedbackText: string): {
  score: number; // -1 to 1
  label: 'positive' | 'neutral' | 'negative';
} {
  const text = feedbackText.toLowerCase();
  
  // Positive keywords
  const positiveWords = [
    'love', 'great', 'excellent', 'amazing', 'fantastic', 'wonderful',
    'perfect', 'awesome', 'good', 'happy', 'satisfied', 'pleased',
    'impressed', 'recommend', 'best', 'outstanding', 'superb', 'brilliant'
  ];
  
  // Negative keywords
  const negativeWords = [
    'hate', 'terrible', 'awful', 'horrible', 'bad', 'worst', 'disappointed',
    'frustrated', 'angry', 'upset', 'poor', 'broken', 'bug', 'issue',
    'problem', 'slow', 'crash', 'error', 'fail', 'unusable'
  ];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    if (text.includes(word)) positiveCount++;
  });
  
  negativeWords.forEach(word => {
    if (text.includes(word)) negativeCount++;
  });
  
  // Calculate sentiment score (-1 to 1)
  const totalWords = positiveCount + negativeCount;
  let score = 0;
  
  if (totalWords > 0) {
    score = (positiveCount - negativeCount) / Math.max(totalWords, 1);
  } else {
    // Neutral if no sentiment words found
    score = 0;
  }
  
  // Determine label
  let label: 'positive' | 'neutral' | 'negative';
  if (score > 0.2) {
    label = 'positive';
  } else if (score < -0.2) {
    label = 'negative';
  } else {
    label = 'neutral';
  }
  
  return { score, label };
}

/**
 * Fetch and analyze customer feedback from the last week
 */
export async function fetchAndAnalyzeCustomerFeedback(
  daysBack: number = 7,
  showToast: boolean = false
): Promise<ApiResponse<SentimentAnalysis>> {
  if (!isSupabaseConfigured) {
    return { 
      data: null, 
      error: 'Database not configured', 
      loading: false 
    };
  }

  try {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - daysBack);
    
    const { data: feedback, error } = await supabase
      .from('customer_feedback')
      .select('*')
      .gte('created_at', lastWeek.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      if (showToast) {
        toast.error('Failed to Fetch Feedback', { description: error.message });
      }
      return { data: null, error: error.message, loading: false };
    }

    if (!feedback || feedback.length === 0) {
      return {
        data: {
          overall: 'neutral',
          score: 0,
          positiveCount: 0,
          negativeCount: 0,
          neutralCount: 0,
          totalCount: 0,
        },
        error: null,
        loading: false,
      };
    }

    // Analyze sentiment for each feedback
    const sentiments = feedback.map(f => {
      const analysis = analyzeSentiment(f.feedback_text);
      return {
        ...f,
        sentiment_score: analysis.score,
        sentiment_label: analysis.label,
      };
    });

    // Calculate aggregate sentiment
    const positiveCount = sentiments.filter(s => s.sentiment_label === 'positive').length;
    const negativeCount = sentiments.filter(s => s.sentiment_label === 'negative').length;
    const neutralCount = sentiments.filter(s => s.sentiment_label === 'neutral').length;
    const totalCount = sentiments.length;
    
    const avgScore = sentiments.reduce((sum, s) => sum + (s.sentiment_score || 0), 0) / totalCount;
    
    // Determine overall sentiment
    let overall: 'positive' | 'neutral' | 'negative';
    if (avgScore > 0.2) {
      overall = 'positive';
    } else if (avgScore < -0.2) {
      overall = 'negative';
    } else {
      overall = 'neutral';
    }

    // Determine trend (compare first half vs second half of period)
    const midPoint = Math.floor(sentiments.length / 2);
    const firstHalf = sentiments.slice(0, midPoint);
    const secondHalf = sentiments.slice(midPoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, s) => sum + (s.sentiment_score || 0), 0) / Math.max(firstHalf.length, 1);
    const secondHalfAvg = secondHalf.reduce((sum, s) => sum + (s.sentiment_score || 0), 0) / Math.max(secondHalf.length, 1);
    
    let recentTrend: 'improving' | 'stable' | 'declining';
    if (secondHalfAvg > firstHalfAvg + 0.1) {
      recentTrend = 'improving';
    } else if (secondHalfAvg < firstHalfAvg - 0.1) {
      recentTrend = 'declining';
    } else {
      recentTrend = 'stable';
    }

    const result: SentimentAnalysis = {
      overall,
      score: avgScore,
      positiveCount,
      negativeCount,
      neutralCount,
      totalCount,
      recentTrend: totalCount >= 4 ? recentTrend : undefined, // Only show trend if enough data
    };

    return { data: result, error: null, loading: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
    if (showToast) {
      toast.error('Analysis Failed', { description: errorMsg });
    }
    return { data: null, error: errorMsg, loading: false };
  }
}

/**
 * Save customer feedback to the database
 */
export async function saveCustomerFeedback(
  input: Omit<CustomerFeedback, 'id' | 'user_id' | 'created_at'>,
  showToast: boolean = true
): Promise<ApiResponse<CustomerFeedback>> {
  if (!isSupabaseConfigured) {
    const errorMsg = 'Database not configured. Feedback not saved.';
    if (showToast) {
      toast.warning('Offline Mode', { description: errorMsg });
    }
    return { data: null, error: errorMsg, loading: false };
  }

  try {
    // Analyze sentiment
    const sentiment = analyzeSentiment(input.feedback_text);
    
    const { data, error } = await supabase
      .from('customer_feedback')
      .insert({
        user_id: (await supabase.auth.getUser()).data.user?.id || 'anonymous',
        feedback_text: input.feedback_text,
        source: input.source || 'support',
        rating: input.rating,
        sentiment_score: sentiment.score,
        sentiment_label: sentiment.label,
        metadata: input.metadata || {},
      })
      .select()
      .maybeSingle();

    if (error) {
      if (showToast) {
        toast.error('Failed to Save Feedback', { description: error.message });
      }
      return { data: null, error: error.message, loading: false };
    }

    if (showToast) {
      toast.success('Feedback Saved', { description: 'Customer feedback recorded.' });
    }
    return { data: data as CustomerFeedback, error: null, loading: false };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
    if (showToast) {
      toast.error('Save Failed', { description: errorMsg });
    }
    return { data: null, error: errorMsg, loading: false };
  }
}
