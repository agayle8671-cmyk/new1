/**
 * AIService.ts
 * 
 * Google Gemini AI integration for Runway DNA.
 * Provides financial insights, natural language queries, and strategic advice.
 */

import type { FinancialAnalysis } from '../dna-processor';
import type { SimParams, ProjectionMonth } from '../simulator-engine';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export type AnalysisType = 'runway' | 'fundraising' | 'growth' | 'risk' | 'breakeven';

export const ANALYSIS_TYPES: Record<AnalysisType, string> = {
  runway: 'Analyze our cash runway and burn rate trajectory',
  fundraising: 'Assess our fundraising readiness and timing',
  growth: 'Evaluate revenue growth and unit economics',
  risk: 'Identify top financial risks we should address',
  breakeven: 'Calculate path to profitability'
};

export interface IndustryBenchmarks {
  industry: string;
  typicalBurn: number;
  typicalGrowth: number; // Monthly growth rate
  typicalChurn: number; // Monthly churn rate
  seriesASizeAvg: number;
}

export const BENCHMARKS: IndustryBenchmarks = {
  industry: 'B2B SaaS',
  typicalBurn: 75000, // for similar stage
  typicalGrowth: 0.15, // 15% MoM
  typicalChurn: 0.05, // 5% monthly
  seriesASizeAvg: 8000000 // $8M average Series A
};

// Scenario definitions for "what if" analysis
export const SCENARIOS = {
  optimistic: { revenueGrowth: 0.25, churn: 0.02 },
  realistic: { revenueGrowth: 0.15, churn: 0.05 },
  pessimistic: { revenueGrowth: 0.05, churn: 0.10 }
};

// Competitive benchmarking data
export const COMPETITOR_DATA = {
  competitor1: { runway: 18, growth: 0.20 },
  competitor2: { runway: 12, growth: 0.30 },
  industry_median: { runway: 15, growth: 0.18 }
};

export interface AIContext {
  analysis?: FinancialAnalysis | null;
  simulatorParams?: SimParams | null;
  projections?: ProjectionMonth[];
  additionalContext?: string;
  
  // Enhanced financial context (Stage 1)
  cashOnHand?: number;
  monthlyBurn?: number;
  monthlyRevenue?: number;
  runway?: number; // months
  
  // Growth metrics
  revenueGrowthRate?: number; // monthly growth rate (decimal)
  customerCount?: number;
  avgRevenuePerCustomer?: number;
  churnRate?: number; // monthly churn rate (decimal)
  
  // Fundraising
  lastRoundAmount?: number;
  lastRoundDate?: string;
  investorsCount?: number;
  targetNextRound?: number;
  
  // Team
  employeeCount?: number;
  monthlyPayroll?: number;
  
  // Alerts
  burnIncreasing?: boolean;
  revenueGrowthSlowing?: boolean;
  approachingBreakeven?: boolean;
}

export interface AIInsight {
  title: string;
  content: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  priority: number;
}

export interface FundraisingReadiness {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  strengths: string[];
  weaknesses: string[];
  actionItems: string[];
  summary: string;
}

export interface BoardDeckSection {
  title: string;
  content: string;
  bullets?: string[];
  metrics?: { label: string; value: string; trend?: 'up' | 'down' | 'neutral' }[];
}

export interface AnomalyExplanation {
  anomaly: string;
  explanation: string;
  possibleCauses: string[];
  recommendations: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  risks: {
    category: string;
    description: string;
    likelihood: number;
    impact: number;
    mitigation: string;
  }[];
  overallSummary: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Use the correct Gemini API endpoint
// Google AI Studio REST API - using stable v1 (not v1beta)
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1';
// Model names that work with Google AI Studio API keys (v1):
// - gemini-1.5-flash (recommended: fastest, most reliable)
// - gemini-1.5-pro (for deeper reasoning, slower)
// Note: gemini-pro is deprecated
const GEMINI_MODEL = 'gemini-1.5-flash';

// NOTE: We use an Express server on Railway (/api/chat) to proxy requests
// The API key is stored server-side as GOOGLE_AI_KEY (not VITE_GOOGLE_AI_KEY)
// The client doesn't need the key - it just calls our API endpoint
export const isAIConfigured = (): boolean => {
  // Always return true - the Express server will handle API key validation
  // If the key is missing, the server will return an error that we'll display
  return true;
};

// Expose debug info for troubleshooting
export const getDebugInfo = () => {
  return {
    setup: 'Railway Express Server',
    note: 'API key is stored server-side in Railway as GOOGLE_AI_KEY (not VITE_ prefix)',
    clientSideKey: 'not required (using server-side proxy)',
    allViteVars: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')),
    supabaseConfigured: Boolean(import.meta.env.VITE_SUPABASE_URL),
    apiEndpoint: '/api/chat',
  };
};

export interface ConnectionStatus {
  connected: boolean;
  model: string;
  latency?: number;
  error?: string;
}

/**
 * Test the AI connection and return status
 */
// Cache connection test results to avoid rate limits
let lastConnectionTest: { timestamp: number; result: ConnectionStatus } | null = null;
const CONNECTION_TEST_COOLDOWN = 60000; // 60 seconds cooldown between tests

export async function testConnection(force: boolean = false): Promise<ConnectionStatus> {
  // Check cache - don't test too frequently to avoid rate limits
  const now = Date.now();
  if (!force && lastConnectionTest && (now - lastConnectionTest.timestamp) < CONNECTION_TEST_COOLDOWN) {
    console.log('[AI] Using cached connection test (cooldown active)');
    return lastConnectionTest.result;
  }

  console.log('[AI] Testing connection via Express server...');
  const startTime = Date.now();

  try {
    // Use a simple, fast test message to avoid rate limits
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Hi',
        context: null,
        conversationHistory: [],
      }),
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(15000), // 15 second timeout for test
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `HTTP ${response.status}` };
      }
      
      console.error('[AI] Connection failed:', errorData);
      
      // Provide helpful error messages
      let errorMessage = errorData.error || `HTTP ${response.status}`;
      if (response.status === 429) {
        errorMessage = 'Rate limit exceeded - API is being used too frequently';
      } else if (response.status === 504) {
        errorMessage = 'Request timeout - server may be cold starting';
      } else if (response.status === 500) {
        errorMessage = errorData.hint || 'Server error - check Railway logs';
      }
      
      return {
        connected: false,
        model: 'gemini-2.5-flash',
        latency,
        error: errorMessage,
      };
    }

    const data = await response.json();
    const text = data.text || data.response;
    
    console.log('[AI] ✅ Connection successful!', { latency, response: text?.substring(0, 50) });
    
    const result: ConnectionStatus = {
      connected: true,
      model: 'gemini-2.5-flash',
      latency,
    };
    
    // Cache successful result
    lastConnectionTest = { timestamp: now, result };
    
    return result;
  } catch (err) {
    const latency = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Network error';
    
    console.error('[AI] Connection error:', errorMessage);
    
    // Check for rate limit errors
    const isRateLimit = errorMessage.includes('rate limit') || 
                       errorMessage.includes('429') || 
                       errorMessage.includes('quota');
    
    // Check for timeout
    const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('AbortError');
    
    let finalError = errorMessage;
    if (isRateLimit) {
      finalError = 'Rate limit exceeded. Please wait a moment before testing again.';
    } else if (isTimeout) {
      finalError = 'Connection timeout - server may be cold starting. Try again in a moment.';
    }
    
    const result: ConnectionStatus = {
      connected: false,
      model: 'gemini-2.5-flash',
      latency,
      error: finalError,
    };
    
    // Cache failed result too (but with shorter cooldown for retries)
    lastConnectionTest = { timestamp: now, result };
    
    return result;
  }
}

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

const SYSTEM_PROMPT = `You are an elite financial advisor AI embedded in Runway DNA, a strategic finance suite for SaaS founders. Your role is to:

1. Provide actionable financial insights based on the user's actual data
2. Answer questions about runway, burn rate, growth, and fundraising
3. Speak like a seasoned CFO - confident, direct, and data-driven
4. Always ground advice in the specific numbers provided
5. Be concise but thorough - founders are busy

Key metrics you understand:
- Runway = Cash / Monthly Burn
- Burn Multiple = Net Burn / Net New ARR
- Rule of 40 = Revenue Growth % + Profit Margin %
- Net Revenue Retention (NRR) = (MRR + Expansion - Contraction - Churn) / Starting MRR

When analyzing data, always:
- Reference specific numbers
- Compare to industry benchmarks
- Provide 2-3 actionable next steps
- Flag any red flags immediately

Format responses in clear markdown with headers when appropriate.`;

// ============================================================================
// CORE API FUNCTION
// ============================================================================

async function callGemini(
  prompt: string,
  context?: AIContext,
  conversationHistory?: AIMessage[]
): Promise<string> {
  // Call our Express server on Railway
  // API key is stored server-side as GOOGLE_AI_KEY (not VITE_ prefix)
  // No SDK usage in browser - all AI logic is server-side
  const apiUrl = '/api/chat';
  
  console.log('[AI] ========================================');
  console.log('[AI] Calling Express server endpoint:', apiUrl);
  console.log('[AI] Setup: Server-side API key (GOOGLE_AI_KEY in Railway)');
  console.log('[AI] Request payload:', { 
    prompt: prompt.substring(0, 50) + '...', 
    hasContext: !!context, 
    historyLength: conversationHistory?.length || 0 
  });

  try {
    const startTime = Date.now();
    
    const requestBody = {
      message: prompt, // Use 'message' for Edge function compatibility
      context,
      conversationHistory,
    };
    
    console.log('[AI] Request body:', {
      message: prompt.substring(0, 50) + '...',
      hasContext: !!context,
      historyLength: conversationHistory?.length || 0,
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const latency = Date.now() - startTime;
    console.log('[AI] Response status:', response.status, `(${latency}ms)`);
    console.log('[AI] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      // Try to parse error response
      let errorData: any = {};
      let errorText = '';
      
      try {
        errorText = await response.text();
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        errorData = { error: errorText || `HTTP ${response.status}` };
      }
      
      console.error('[AI] ❌ Error response:', errorData);
      console.error('[AI] Full error text:', errorText);
      console.error('[AI] Response status:', response.status, response.statusText);
      
      // Provide helpful error messages based on status code
      if (response.status === 500) {
        if (errorData.error?.includes('API key not configured') || errorData.error?.includes('API key')) {
          throw new Error('API key not configured in Railway. Add GOOGLE_AI_KEY (not VITE_ prefix) in Railway Settings → Variables, then redeploy.');
        }
        if (errorData.details) {
          throw new Error(`AI Service Error: ${errorData.error || 'Unknown error'}. Details: ${errorData.details}. ${errorData.hint || ''}`);
        }
      }
      
      if (response.status === 404) {
        throw new Error('API endpoint not found. Check that /api/chat exists and is deployed.');
      }
      
      if (response.status === 401 || response.status === 403) {
        throw new Error('API key authentication failed. Verify your GOOGLE_AI_KEY is valid at https://aistudio.google.com/');
      }
      
      // Generic error with details
      const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${errorText}`;
      const hint = errorData.hint ? ` ${errorData.hint}` : '';
      throw new Error(`AI Error: ${errorMessage}${hint}`);
    }

    const data = await response.json();
    console.log('[AI] Response data:', {
      hasResponse: !!data.response,
      hasText: !!data.text,
      responseLength: data.response?.length || data.text?.length || 0,
    });
    
    // Support both 'response' and 'text' fields for compatibility
    const aiResponse = data.response || data.text;
    
    if (!aiResponse) {
      console.error('[AI] ❌ No response text in data:', data);
      throw new Error('No response from AI - empty response. Check Railway logs for details.');
    }

    console.log('[AI] ✅ Success, response length:', aiResponse.length);
    console.log('[AI] ========================================');
    
    return aiResponse;
  } catch (err) {
    console.error('[AI] ❌ Fetch error:', err);
    console.error('[AI] Error type:', err instanceof Error ? err.constructor.name : typeof err);
    console.error('[AI] Error message:', err instanceof Error ? err.message : String(err));
    console.error('[AI] ========================================');
    
    // Re-throw with better error message
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`AI Error: ${String(err)}`);
  }
}

// ============================================================================
// FEATURE FUNCTIONS
// ============================================================================

/**
 * Get strategic insights based on financial data
 */
export async function getStrategicInsights(context: AIContext): Promise<AIInsight[]> {
  const prompt = `Based on the financial data provided, give me 3-5 strategic insights. For each insight, provide:
1. A short title (5-7 words)
2. A detailed explanation (2-3 sentences)
3. Classification: success (good news), warning (needs attention), danger (urgent), or info (neutral)
4. Priority: 1 (highest) to 5 (lowest)

Format as JSON array:
[{"title": "...", "content": "...", "type": "success|warning|danger|info", "priority": 1-5}]

Only return the JSON array, no other text.`;

  const response = await callGemini(prompt, context);
  
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON in response');
  } catch {
    // Fallback insight
    return [{
      title: 'Analysis Available',
      content: response.slice(0, 200),
      type: 'info',
      priority: 3
    }];
  }
}

/**
 * Chat with the AI advisor
 */
export async function chat(
  message: string,
  context: AIContext,
  history: AIMessage[] = []
): Promise<string> {
  return callGemini(message, context, history);
}

/**
 * Alias for chat function - simpler API
 */
export async function askAI(
  message: string,
  context?: AIContext | Record<string, any>
): Promise<string> {
  // Convert plain object to AIContext if needed
  const aiContext: AIContext = context as AIContext || {};
  return callGemini(message, aiContext, []);
}

/**
 * Perform a specific type of financial analysis
 */
export async function performAnalysis(
  analysisType: AnalysisType,
  context: AIContext
): Promise<string> {
  const prompt = ANALYSIS_TYPES[analysisType];
  return callGemini(prompt, context, []);
}

/**
 * Generate a 90-day action plan to improve runway
 */
export async function generateRunwayPlan(
  context: AIContext,
  targetRunway: number
): Promise<string> {
  const currentRunway = context.runway || 
    (context.cashOnHand && context.monthlyBurn 
      ? context.cashOnHand / context.monthlyBurn 
      : 0);
  
  const planningPrompt = `Create a comprehensive 90-day action plan to improve our runway from ${currentRunway.toFixed(1)} to ${targetRunway} months.

REQUIREMENTS:
- Provide a complete, detailed plan (do not truncate or cut off)
- Include specific tactics with exact timelines (Days 1-30, 31-60, 61-90)
- Show expected impact on metrics (burn reduction, revenue increase, runway extension)
- List resources needed (team, tools, budget)
- Define clear success milestones for each 30-day period

Current financial context:
- Cash on hand: $${(context.cashOnHand || 0).toLocaleString()}
- Monthly burn: $${(context.monthlyBurn || 0).toLocaleString()}
- Monthly revenue: $${(context.monthlyRevenue || 0).toLocaleString()}
- Revenue growth: ${context.revenueGrowthRate ? (context.revenueGrowthRate * 100).toFixed(1) + '%' : 'N/A'} monthly
${context.burnIncreasing ? '- ⚠️ Burn is increasing' : ''}
${context.revenueGrowthSlowing ? '- ⚠️ Revenue growth is slowing' : ''}

Format the plan as:
## 90-Day Runway Improvement Plan

### Month 1 (Days 1-30)
[Detailed tactics, expected impact, resources, milestones]

### Month 2 (Days 31-60)
[Detailed tactics, expected impact, resources, milestones]

### Month 3 (Days 61-90)
[Detailed tactics, expected impact, resources, milestones]

### Overall Impact Summary
[Total runway improvement, key metrics changes, success criteria]

Provide the complete plan - do not stop mid-sentence.`;

  return callGemini(planningPrompt, context, []);
}

/**
 * Generate board deck content
 */
export async function generateBoardDeck(context: AIContext): Promise<BoardDeckSection[]> {
  const prompt = `Generate a professional board deck update based on the financial data. Create sections for:

1. Executive Summary (2-3 key highlights)
2. Financial Performance (revenue, burn, runway metrics)
3. Growth Metrics (trends and projections)
4. Key Wins This Period
5. Challenges & Mitigations
6. Next Quarter Priorities
7. Ask/Support Needed

Format as JSON array:
[{
  "title": "Section Title",
  "content": "Main paragraph content",
  "bullets": ["bullet 1", "bullet 2"],
  "metrics": [{"label": "MRR", "value": "$85K", "trend": "up"}]
}]

Only return the JSON array.`;

  const response = await callGemini(prompt, context);
  
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON');
  } catch {
    return [{
      title: 'Board Update',
      content: response,
      bullets: []
    }];
  }
}

/**
 * Explain anomalies in financial data
 */
export async function explainAnomaly(
  anomalyDescription: string,
  context: AIContext
): Promise<AnomalyExplanation> {
  const prompt = `Analyze this financial anomaly: "${anomalyDescription}"

Based on the financial data provided, explain:
1. What this anomaly means
2. 3-4 possible causes
3. 2-3 recommended actions
4. Severity level (low/medium/high)

Format as JSON:
{
  "anomaly": "brief description",
  "explanation": "detailed explanation",
  "possibleCauses": ["cause 1", "cause 2"],
  "recommendations": ["action 1", "action 2"],
  "severity": "low|medium|high"
}

Only return JSON.`;

  const response = await callGemini(prompt, context);
  
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON');
  } catch {
    return {
      anomaly: anomalyDescription,
      explanation: response,
      possibleCauses: [],
      recommendations: [],
      severity: 'medium'
    };
  }
}

/**
 * Assess fundraising readiness
 */
export async function assessFundraisingReadiness(context: AIContext): Promise<FundraisingReadiness> {
  const prompt = `Assess this company's readiness to raise venture funding based on the financial data.

Evaluate:
- Revenue growth trajectory
- Burn rate efficiency
- Runway remaining
- Unit economics indicators
- Overall financial health

Provide:
1. Score (0-100)
2. Grade (A/B/C/D/F)
3. Top 3 strengths
4. Top 3 weaknesses
5. Top 5 action items to improve readiness
6. Summary paragraph

Format as JSON:
{
  "score": 75,
  "grade": "B",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "actionItems": ["action 1", "action 2", "action 3", "action 4", "action 5"],
  "summary": "paragraph summary"
}

Only return JSON.`;

  const response = await callGemini(prompt, context);
  
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON');
  } catch {
    return {
      score: 50,
      grade: 'C',
      strengths: ['Data available for analysis'],
      weaknesses: ['Unable to parse detailed assessment'],
      actionItems: ['Review financial data', 'Consult with advisor'],
      summary: response.slice(0, 300)
    };
  }
}

/**
 * Generate risk assessment
 */
export async function assessRisks(context: AIContext): Promise<RiskAssessment> {
  const prompt = `Perform a comprehensive risk assessment based on the financial data.

Identify 4-6 key risks across categories:
- Runway/Cash risk
- Revenue risk
- Operational risk
- Market risk

For each risk provide:
- Category
- Description
- Likelihood (1-5)
- Impact (1-5)
- Mitigation strategy

Also provide overall risk level (low/medium/high/critical) and summary.

Format as JSON:
{
  "riskLevel": "medium",
  "risks": [{
    "category": "Runway",
    "description": "...",
    "likelihood": 3,
    "impact": 4,
    "mitigation": "..."
  }],
  "overallSummary": "paragraph"
}

Only return JSON.`;

  const response = await callGemini(prompt, context);
  
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON');
  } catch {
    return {
      riskLevel: 'medium',
      risks: [],
      overallSummary: response.slice(0, 300)
    };
  }
}

/**
 * Analyze a "what if" scenario question
 */
export async function analyzeScenario(
  question: string,
  context: AIContext
): Promise<string> {
  const currentRevenue = context.monthlyRevenue || 0;
  const currentBurn = context.monthlyBurn || 0;
  const currentCash = context.cashOnHand || 0;
  const currentGrowth = context.revenueGrowthRate || 0;
  const currentChurn = context.churnRate || 0;
  
  const prompt = `The user is asking: "${question}"

Analyze this scenario based on the current financial context:
- Current monthly revenue: $${currentRevenue.toLocaleString()}
- Current monthly burn: $${currentBurn.toLocaleString()}
- Current cash on hand: $${currentCash.toLocaleString()}
- Current revenue growth: ${(currentGrowth * 100).toFixed(1)}% monthly
- Current churn rate: ${(currentChurn * 100).toFixed(1)}% monthly

Available scenario templates:
- Optimistic: 25% revenue growth, 2% churn
- Realistic: 15% revenue growth, 5% churn
- Pessimistic: 5% revenue growth, 10% churn

Calculate and explain:
1. How the scenario change affects runway (in months)
2. Impact on burn rate and profitability timeline
3. Revenue trajectory over next 12 months
4. Key risks and opportunities
5. Actionable recommendations

Provide specific numbers and clear comparisons to the current state.`;

  return callGemini(prompt, context, []);
}

/**
 * Narrate a scenario in plain English
 */
export async function narrateScenario(
  scenarioName: string,
  projections: ProjectionMonth[],
  context: AIContext
): Promise<string> {
  const projectionSummary = projections.slice(0, 6).map(p => 
    `Month ${p.month}: Revenue $${p.revenue?.toLocaleString()}, Expenses $${p.expenses?.toLocaleString()}, Cash $${p.cashBalance?.toLocaleString()}`
  ).join('\n');

  const prompt = `Explain this "${scenarioName}" scenario in plain English for a founder:

${projectionSummary}

Write a 2-3 paragraph narrative that:
1. Summarizes the trajectory
2. Highlights the key inflection points
3. Explains what this means practically
4. Gives 1-2 recommendations

Write conversationally but professionally.`;

  return callGemini(prompt, { ...context, additionalContext: projectionSummary });
}

/**
 * Compare metrics to industry benchmarks
 */
export async function benchmarkAnalysis(context: AIContext): Promise<string> {
  const benchmarks = BENCHMARKS;
  
  const prompt = `Compare this company's metrics to ${benchmarks.industry} industry benchmarks:

INDUSTRY BENCHMARKS:
- Typical monthly burn: $${benchmarks.typicalBurn.toLocaleString()}
- Typical monthly growth: ${(benchmarks.typicalGrowth * 100).toFixed(0)}% MoM
- Typical monthly churn: ${(benchmarks.typicalChurn * 100).toFixed(0)}%
- Average Series A size: $${benchmarks.seriesASizeAvg.toLocaleString()}

ADDITIONAL BENCHMARKS:
- Healthy burn multiple: < 2x
- Good revenue growth: > 100% YoY for early stage
- Ideal runway: 18-24 months
- Target gross margin: > 70%
- Good NRR: > 100%

Provide:
1. How each metric compares to industry benchmarks (above/below/at benchmark)
2. Percentile estimate (top 10%, median, bottom 25%)
3. What this means for the business
4. Specific recommendations to improve underperforming metrics

Format with clear headers and bullet points. Include specific numbers from the company's data compared to benchmarks.`;

  return callGemini(prompt, context);
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

const AIService = {
  isConfigured: isAIConfigured,
  testConnection,
  chat,
  askAI,
  performAnalysis,
  generateRunwayPlan,
  analyzeScenario,
  competitiveBenchmark,
  getStrategicInsights,
  generateBoardDeck,
  explainAnomaly,
  assessFundraisingReadiness,
  assessRisks,
  narrateScenario,
  benchmarkAnalysis,
  ANALYSIS_TYPES,
  BENCHMARKS,
  SCENARIOS,
  COMPETITOR_DATA,
};

export default AIService;

