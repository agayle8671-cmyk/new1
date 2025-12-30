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

export interface AIContext {
  analysis?: FinancialAnalysis | null;
  simulatorParams?: SimParams | null;
  projections?: ProjectionMonth[];
  additionalContext?: string;
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
// Google AI Studio REST API - use v1beta with models endpoint
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
// Model names that work with Google AI Studio API keys:
// - gemini-pro (standard, most compatible)
// - gemini-1.5-pro (if available with your API key)
// - gemini-1.5-flash (faster, if available)
const GEMINI_MODEL = 'gemini-pro';

const getApiKey = (): string | null => {
  const key = import.meta.env.VITE_GOOGLE_AI_KEY || null;
  // Debug logging (safe - only shows if key exists, not the actual key)
  if (typeof window !== 'undefined') {
    console.log('[AI Debug] API Key configured:', key ? `Yes (${key.substring(0, 8)}...)` : 'No');
    console.log('[AI Debug] All VITE_ env vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
  }
  return key;
};

export const isAIConfigured = (): boolean => {
  return Boolean(getApiKey());
};

// Expose debug info for troubleshooting
export const getDebugInfo = () => {
  const key = import.meta.env.VITE_GOOGLE_AI_KEY;
  return {
    keyConfigured: Boolean(key),
    keyPrefix: key ? key.substring(0, 8) + '...' : 'none',
    allViteVars: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')),
    supabaseConfigured: Boolean(import.meta.env.VITE_SUPABASE_URL),
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
export async function testConnection(): Promise<ConnectionStatus> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.warn('[AI] No API key configured');
    return {
      connected: false,
      model: 'none',
      error: 'API key not configured. Add VITE_GOOGLE_AI_KEY to environment variables.',
    };
  }

  console.log('[AI] Testing connection to Gemini...');
  const startTime = Date.now();

  try {
    const apiUrl = `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    console.log('[AI] Testing connection:', apiUrl.replace(apiKey, 'API_KEY_HIDDEN'));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Say "connected" in one word.' }] }],
        generationConfig: { maxOutputTokens: 10 },
      }),
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      const error = await response.json();
      console.error('[AI] Connection failed:', error);
      return {
        connected: false,
        model: GEMINI_MODEL,
        latency,
        error: error.error?.message || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    console.log('[AI] Connection successful!', { latency, response: text });
    
    return {
      connected: true,
      model: GEMINI_MODEL,
      latency,
    };
  } catch (err) {
    const latency = Date.now() - startTime;
    console.error('[AI] Connection error:', err);
    return {
      connected: false,
      model: GEMINI_MODEL,
      latency,
      error: err instanceof Error ? err.message : 'Network error',
    };
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
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('Google AI API key not configured. Add VITE_GOOGLE_AI_KEY to environment variables.');
  }

  // Build context string
  let contextString = '';
  if (context?.analysis) {
    const a = context.analysis;
    contextString += `
CURRENT FINANCIAL DATA:
- Monthly Revenue: $${a.monthlyRevenue?.toLocaleString() || 'N/A'}
- Monthly Burn: $${a.monthlyBurn?.toLocaleString() || 'N/A'}
- Cash on Hand: $${a.cashOnHand?.toLocaleString() || 'N/A'}
- Runway: ${a.runwayMonths?.toFixed(1) || 'N/A'} months
- Grade: ${a.grade || 'N/A'}
- Revenue Growth: ${((a.revenueGrowth || 0) * 100).toFixed(1)}%
- Expense Growth: ${((a.expenseGrowth || 0) * 100).toFixed(1)}%
- Profit Margin: ${((a.profitMargin || 0) * 100).toFixed(1)}%
- Burn Multiple: ${a.burnMultiple?.toFixed(2) || 'N/A'}
`;
  }

  if (context?.simulatorParams) {
    const s = context.simulatorParams;
    contextString += `
SIMULATOR PARAMETERS:
- Projected Monthly Revenue: $${s.monthlyRevenue?.toLocaleString() || 'N/A'}
- Projected Monthly Expenses: $${s.monthlyExpenses?.toLocaleString() || 'N/A'}
- Revenue Growth Rate: ${((s.revenueGrowth || 0) * 100).toFixed(1)}%
- Expense Growth Rate: ${((s.expenseGrowth || 0) * 100).toFixed(1)}%
`;
  }

  if (context?.additionalContext) {
    contextString += `\nADDITIONAL CONTEXT:\n${context.additionalContext}`;
  }

  // Build conversation for multi-turn
  const contents = [];
  
  // Add system context as first user message (Gemini doesn't have system role)
  contents.push({
    role: 'user',
    parts: [{ text: SYSTEM_PROMPT + '\n\n' + contextString }]
  });
  contents.push({
    role: 'model',
    parts: [{ text: 'I understand. I\'m ready to provide financial insights based on the data you\'ve shared. How can I help you today?' }]
  });

  // Add conversation history
  if (conversationHistory) {
    for (const msg of conversationHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }
  }

  // Add current prompt
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  const response = await fetch(`${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get AI response');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) {
    throw new Error('No response from AI');
  }

  return text;
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
  const prompt = `Compare this company's metrics to SaaS industry benchmarks:

Key benchmarks to compare against:
- Healthy burn multiple: < 2x
- Good revenue growth: > 100% YoY for early stage
- Ideal runway: 18-24 months
- Target gross margin: > 70%
- Good NRR: > 100%

Provide:
1. How each metric compares (above/below/at benchmark)
2. Percentile estimate (top 10%, median, bottom 25%)
3. What this means for the business
4. How to improve underperforming metrics

Format with clear headers and bullet points.`;

  return callGemini(prompt, context);
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

const AIService = {
  isConfigured: isAIConfigured,
  testConnection,
  chat,
  getStrategicInsights,
  generateBoardDeck,
  explainAnomaly,
  assessFundraisingReadiness,
  assessRisks,
  narrateScenario,
  benchmarkAnalysis,
};

export default AIService;

