import { create } from 'zustand';
import type { FinancialAnalysis } from './dna-processor';
import type { SimParams } from './simulator-engine';

// Growth scenario state for hydration
// MRR Waterfall: Ending = Starting + New + Expansion - Churn - Contraction
export interface GrowthScenarioState {
  baselineMRR: number;
  growthRate: number;
  churnRate: number;
  contractionRate: number;  // MRR lost to downgrades
  expansionRate: number;
  arpa: number;
  newCustomersPerMonth: number;
  targetARR: number;
}

interface AppState {
  // Current analysis from DNALab
  currentAnalysis: FinancialAnalysis | null;
  setCurrentAnalysis: (analysis: FinancialAnalysis | null) => void;
  
  // Context mode toggle (Growth = revenue focus, Strategy = scenario planning)
  contextMode: 'growth' | 'strategy';
  setContextMode: (mode: 'growth' | 'strategy') => void;
  
  // Simulator params derived from DNALab analysis
  simulatorParams: SimParams | null;
  setSimulatorParams: (params: SimParams | null) => void;
  
  // Growth scenario state for TopLine chart
  growthScenario: GrowthScenarioState | null;
  setGrowthScenario: (scenario: GrowthScenarioState | null) => void;
  
  // Hydration flags
  isGrowthHydrated: boolean;
  setGrowthHydrated: (hydrated: boolean) => void;
  
  // Hydrate simulator from analysis data
  hydrateSimulatorFromAnalysis: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentAnalysis: null,
  setCurrentAnalysis: (analysis) => {
    set({ currentAnalysis: analysis });
    // Auto-hydrate simulator when new analysis is set
    if (analysis) {
      const params: SimParams = {
        cashOnHand: analysis.cashOnHand,
        monthlyExpenses: analysis.monthlyBurn,
        monthlyRevenue: analysis.monthlyRevenue,
        expenseGrowth: analysis.expenseGrowth,
        revenueGrowth: analysis.revenueGrowth,
      };
      set({ simulatorParams: params });
      
      // Also update growth scenario baseline MRR
      const currentGrowth = get().growthScenario;
      if (currentGrowth) {
        set({
          growthScenario: {
            ...currentGrowth,
            baselineMRR: analysis.monthlyRevenue,
          },
        });
      }
    }
  },
  
  contextMode: 'growth',
  setContextMode: (mode) => set({ contextMode: mode }),
  
  simulatorParams: null,
  setSimulatorParams: (params) => set({ simulatorParams: params }),
  
  growthScenario: null,
  setGrowthScenario: (scenario) => set({ growthScenario: scenario }),
  
  isGrowthHydrated: false,
  setGrowthHydrated: (hydrated) => set({ isGrowthHydrated: hydrated }),
  
  hydrateSimulatorFromAnalysis: () => {
    const analysis = get().currentAnalysis;
    if (analysis) {
      const params: SimParams = {
        cashOnHand: analysis.cashOnHand,
        monthlyExpenses: analysis.monthlyBurn,
        monthlyRevenue: analysis.monthlyRevenue,
        expenseGrowth: analysis.expenseGrowth,
        revenueGrowth: analysis.revenueGrowth,
      };
      set({ simulatorParams: params });
    }
  },
}));
