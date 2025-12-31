/**
 * AIAdvisor.tsx
 * 
 * Dedicated AI Advisor page with full financial intelligence features.
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  MessageSquare,
  FileText,
  AlertTriangle,
  Target,
  Shield,
  TrendingUp,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  BarChart3,
  Send,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { MotionCard, MotionButton } from '../components/ui/MotionCard';
import AIService, {
  type AIMessage,
  type AIInsight,
  type BoardDeckSection,
  type FundraisingReadiness,
  type RiskAssessment,
  type AIContext,
  type ConnectionStatus,
  getDebugInfo,
} from '../lib/services/AIService';
import { useAppStore } from '../lib/store';
import { saveConversationMemory } from '../lib/api';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' },
  }),
};

const INITIAL_MESSAGE: AIMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Welcome to the AI Advisor! I have full access to your financial data and can provide deep strategic insights. Ask me anything about your runway, growth, risks, or fundraising strategy.",
  timestamp: new Date(),
};

export default function AIAdvisor() {
  const { currentAnalysis, simulatorParams } = useAppStore();
  const [isConfigured, setIsConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<AIMessage[]>([INITIAL_MESSAGE]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Feature states
  const [insights, setInsights] = useState<AIInsight[] | null>(null);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  
  const [boardDeck, setBoardDeck] = useState<BoardDeckSection[] | null>(null);
  const [isBoardDeckLoading, setIsBoardDeckLoading] = useState(false);
  
  const [fundraisingScore, setFundraisingScore] = useState<FundraisingReadiness | null>(null);
  const [isFundraisingLoading, setIsFundraisingLoading] = useState(false);
  
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [isRiskLoading, setIsRiskLoading] = useState(false);
  
  const [benchmarks, setBenchmarks] = useState<string | null>(null);
  const [isBenchmarksLoading, setIsBenchmarksLoading] = useState(false);
  
  const [runwayPlan, setRunwayPlan] = useState<string | null>(null);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [targetRunway, setTargetRunway] = useState<number>(24);

  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  useEffect(() => {
    try {
      setIsConfigured(AIService.isConfigured());
      // Don't auto-test on mount to avoid rate limits
      // User can manually test via the "Test Connection" button
      // This prevents hitting rate limits when multiple users visit the page
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('[AIAdvisor] Error on mount:', err);
    }
  }, []);

  const testAIConnection = async (force: boolean = false) => {
    setIsTestingConnection(true);
    try {
      const status = await AIService.testConnection(force);
      setConnectionStatus(status);
      if (status.connected) {
        toast.success('AI Connected', { 
          description: `${status.model} • ${status.latency}ms latency`,
          duration: 3000,
        });
      } else {
        // Don't show error toast if it's a rate limit - just show info
        if (status.error?.includes('rate limit')) {
          toast.warning('Rate Limit', { 
            description: 'Please wait 60 seconds before testing again to avoid rate limits.',
            duration: 5000,
          });
        } else {
          toast.error('AI Connection Failed', { 
            description: status.error,
            duration: 5000,
          });
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Connection test failed';
      toast.error('Connection Test Failed', { description: errorMsg });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const getContext = useCallback((): AIContext => {
    // Build enhanced context from available data (Stage 1)
    const context: AIContext = {
      analysis: currentAnalysis,
      simulatorParams: simulatorParams,
    };

    // Extract enhanced financial data from analysis
    if (currentAnalysis) {
      context.cashOnHand = currentAnalysis.cashOnHand;
      context.monthlyBurn = currentAnalysis.monthlyBurn;
      context.monthlyRevenue = currentAnalysis.monthlyRevenue;
      context.runway = currentAnalysis.runwayMonths;
      context.revenueGrowthRate = currentAnalysis.revenueGrowth;
      
      // Calculate derived metrics
      if (currentAnalysis.monthlyRevenue > 0 && currentAnalysis.monthlyBurn > 0) {
        context.approachingBreakeven = currentAnalysis.monthlyRevenue >= currentAnalysis.monthlyBurn * 0.9;
      }
      
      // Check if burn is increasing (from expense growth)
      context.burnIncreasing = currentAnalysis.expenseGrowth > 0;
      
      // Check if revenue growth is slowing (negative growth rate or low)
      context.revenueGrowthSlowing = currentAnalysis.revenueGrowth < 0.1; // Less than 10% monthly
    }

    // Extract data from simulator params
    if (simulatorParams) {
      // Override with simulator params if available (more current)
      context.cashOnHand = simulatorParams.cashOnHand;
      context.monthlyBurn = simulatorParams.monthlyExpenses;
      context.monthlyRevenue = simulatorParams.monthlyRevenue;
      context.revenueGrowthRate = simulatorParams.revenueGrowth;
      
      // Calculate runway from simulator params
      if (simulatorParams.monthlyExpenses > 0) {
        context.runway = simulatorParams.cashOnHand / simulatorParams.monthlyExpenses;
      }
    }

    return context;
  }, [currentAnalysis, simulatorParams]);

  // Chat handler (Stage 3: Save conversation memory)
  const sendMessage = useCallback(async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage: AIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const userQuestion = chatInput.trim();
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await AIService.chat(userQuestion, getContext(), messages);
      const assistantMessage: AIMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Stage 3: Save conversation memory (async, don't block UI)
      try {
        // Extract key insights from the response (simple extraction)
        const insights: string[] = [];
        const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 20);
        if (sentences.length > 0) {
          // Take first 2-3 meaningful sentences as insights
          insights.push(...sentences.slice(0, 3).map(s => s.trim()).filter(s => s.length > 0));
        }

        await saveConversationMemory({
          summary: `${userQuestion}: ${response.substring(0, 200)}${response.length > 200 ? '...' : ''}`,
          key_insights: insights.length > 0 ? insights : [response.substring(0, 150)],
        }, false); // Don't show toast for auto-saves
      } catch (memoryError) {
        // Silently fail - memory saving shouldn't break the chat
        console.warn('[AIAdvisor] Failed to save conversation memory:', memoryError);
      }
    } catch (error) {
      toast.error('AI Error', { description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, isChatLoading, messages, getContext]);

  // Feature handlers
  const fetchInsights = useCallback(async () => {
    setIsInsightsLoading(true);
    try {
      const result = await AIService.getStrategicInsights(getContext());
      setInsights(result);
      toast.success('Insights Generated');
    } catch (error) {
      toast.error('Failed to generate insights');
    } finally {
      setIsInsightsLoading(false);
    }
  }, [getContext]);

  const fetchBoardDeck = useCallback(async () => {
    setIsBoardDeckLoading(true);
    try {
      const result = await AIService.generateBoardDeck(getContext());
      setBoardDeck(result);
      toast.success('Board Deck Generated');
    } catch (error) {
      toast.error('Failed to generate board deck');
    } finally {
      setIsBoardDeckLoading(false);
    }
  }, [getContext]);

  const fetchFundraisingScore = useCallback(async () => {
    setIsFundraisingLoading(true);
    try {
      const result = await AIService.assessFundraisingReadiness(getContext());
      setFundraisingScore(result);
      toast.success('Fundraising Assessment Complete');
    } catch (error) {
      toast.error('Failed to assess fundraising readiness');
    } finally {
      setIsFundraisingLoading(false);
    }
  }, [getContext]);

  const fetchRiskAssessment = useCallback(async () => {
    setIsRiskLoading(true);
    try {
      const result = await AIService.assessRisks(getContext());
      setRiskAssessment(result);
      toast.success('Risk Assessment Complete');
    } catch (error) {
      toast.error('Failed to assess risks');
    } finally {
      setIsRiskLoading(false);
    }
  }, [getContext]);

  const fetchBenchmarks = useCallback(async () => {
    setIsBenchmarksLoading(true);
    try {
      const result = await AIService.benchmarkAnalysis(getContext());
      setBenchmarks(result);
      toast.success('Benchmark Analysis Complete');
    } catch (error) {
      toast.error('Failed to generate benchmarks');
    } finally {
      setIsBenchmarksLoading(false);
    }
  }, [getContext]);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
    toast.success('Copied to clipboard');
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success': return <Check className="w-4 h-4 text-success" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'danger': return <AlertTriangle className="w-4 h-4 text-danger" />;
      default: return <Sparkles className="w-4 h-4 text-cyan-electric" />;
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-success';
      case 'B': return 'text-cyan-electric';
      case 'C': return 'text-warning';
      case 'D': case 'F': return 'text-danger';
      default: return 'text-gray-400';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-success bg-success/20';
      case 'medium': return 'text-warning bg-warning/20';
      case 'high': return 'text-danger bg-danger/20';
      case 'critical': return 'text-danger bg-danger/30';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center min-h-[60vh]"
      >
        <MotionCard className="p-8 text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-danger mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Error Loading AI Advisor</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-cyan-electric text-charcoal rounded-lg hover:bg-cyan-glow transition-colors"
          >
            Reload Page
          </button>
        </MotionCard>
      </motion.div>
    );
  }

  if (!isConfigured) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center min-h-[60vh]"
      >
        <MotionCard className="p-8 text-center max-w-md">
          <Sparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">AI Advisor Not Configured</h2>
          <p className="text-gray-400 mb-4">
            Add your Google AI API key to Railway (server-side) to enable AI-powered financial insights.
          </p>
          
          {/* Debug Info */}
          <div className="mt-6 p-4 bg-white/5 rounded-lg text-left border border-white/10 space-y-4">
            <h3 className="text-xs font-bold text-warning mb-2">🔧 Debug Info</h3>
            <pre className="text-xs text-gray-400 overflow-x-auto mb-4">
{JSON.stringify(getDebugInfo(), null, 2)}
            </pre>
            
            <div className="border-t border-white/10 pt-4">
              <h4 className="text-xs font-bold mb-2">📍 How to Add API Key in Railway (Server-Side):</h4>
              <ol className="list-decimal list-inside space-y-1 text-xs text-gray-300">
                <li>Go to Railway Dashboard → Your Service → <strong>Settings</strong> → <strong>Variables</strong></li>
                <li>Click <strong>"+ New Variable"</strong></li>
                <li><strong>Key:</strong> <code className="bg-white/10 px-1 rounded">GOOGLE_AI_KEY</code> <span className="text-warning">(NO VITE_ prefix!)</span></li>
                <li><strong>Value:</strong> Your API key from <a href="https://aistudio.google.com/apikey" target="_blank" className="text-cyan-electric hover:underline">Google AI Studio</a></li>
                <li>Click <strong>"Add"</strong> - Railway will automatically redeploy</li>
              </ol>
              <div className="mt-3 p-2 bg-warning/10 border border-warning/30 rounded text-xs text-warning">
                <strong>⚠️ Important:</strong> Use <code>GOOGLE_AI_KEY</code> (not <code>VITE_GOOGLE_AI_KEY</code>) because the API key is stored server-side in the Express server, not exposed to the browser.
              </div>
            </div>
          </div>
        </MotionCard>
      </motion.div>
    );
  }

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
            <span className="gradient-text-mixed">AI Financial Advisor</span>
          </h1>
          <p className="text-gray-400 mt-1">
            Powered by Gemini • {currentAnalysis ? 'Using your financial data' : 'Upload data in DNA Lab for personalized insights'}
          </p>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            connectionStatus?.connected
              ? 'bg-success/20 text-success border border-success/30'
              : connectionStatus === null
                ? 'bg-white/10 text-gray-400 border border-white/10'
                : 'bg-danger/20 text-danger border border-danger/30'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus?.connected ? 'bg-success animate-pulse' : 
              connectionStatus === null ? 'bg-gray-400' : 'bg-danger'
            }`} />
            {isTestingConnection ? 'Testing...' :
              connectionStatus?.connected ? `Connected • ${connectionStatus.latency}ms` :
              connectionStatus === null ? 'Not tested' :
              'Disconnected'}
          </div>
          <button
            onClick={() => testAIConnection(true)}
            disabled={isTestingConnection}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Test AI Connection (60s cooldown to avoid rate limits)"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${isTestingConnection ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <MotionButton
                  onClick={fetchInsights}
                  disabled={isInsightsLoading}
                  className="flex flex-col items-center gap-2 p-4 h-auto"
                >
                  {isInsightsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  <span className="text-xs">Insights</span>
                </MotionButton>
                
                <MotionButton
                  onClick={fetchBoardDeck}
                  disabled={isBoardDeckLoading}
                  variant="secondary"
                  className="flex flex-col items-center gap-2 p-4 h-auto"
                >
                  {isBoardDeckLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                  <span className="text-xs">Board Deck</span>
                </MotionButton>
                
                <MotionButton
                  onClick={fetchFundraisingScore}
                  disabled={isFundraisingLoading}
                  variant="secondary"
                  className="flex flex-col items-center gap-2 p-4 h-auto"
                >
                  {isFundraisingLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Target className="w-5 h-5" />}
                  <span className="text-xs">Fundraise</span>
                </MotionButton>
                
                <MotionButton
                  onClick={fetchRiskAssessment}
                  disabled={isRiskLoading}
                  variant="secondary"
                  className="flex flex-col items-center gap-2 p-4 h-auto"
                >
                  {isRiskLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                  <span className="text-xs">Risks</span>
                </MotionButton>
                
                <MotionButton
                  onClick={fetchBenchmarks}
                  disabled={isBenchmarksLoading}
                  variant="secondary"
                  className="flex flex-col items-center gap-2 p-4 h-auto"
                >
                  {isBenchmarksLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BarChart3 className="w-5 h-5" />}
                  <span className="text-xs">Benchmarks</span>
                </MotionButton>
                
                <MotionButton
                  onClick={generateRunwayPlan}
                  disabled={isPlanLoading}
                  variant="secondary"
                  className="flex flex-col items-center gap-2 p-4 h-auto"
                >
                  {isPlanLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calendar className="w-5 h-5" />}
                  <span className="text-xs">90-Day Plan</span>
                </MotionButton>
              </div>
              
              {/* Target Runway Input */}
              {currentAnalysis && (
                <div className="flex items-center gap-3 glass-card p-3">
                  <label className="text-sm text-gray-400">Target Runway:</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={targetRunway}
                    onChange={(e) => setTargetRunway(Number(e.target.value))}
                    className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-cyan-electric/50"
                  />
                  <span className="text-sm text-gray-400">months</span>
                  <span className="text-xs text-gray-500 ml-auto">
                    Current: {currentAnalysis.runwayMonths.toFixed(1)} months
                  </span>
                </div>
              )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat Section */}
        <MotionCard
          variant="elevated"
          className="p-0 overflow-hidden flex flex-col h-[500px]"
          custom={0}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <div className="p-4 border-b border-white/10 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-electric" />
            <h3 className="font-semibold">Chat with AI</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-cyan-electric text-charcoal'
                      : 'bg-white/10'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-electric" />
                </div>
              </div>
            )}
          </div>
          
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            className="p-4 border-t border-white/10 flex gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask anything about your finances..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-cyan-electric/50"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isChatLoading}
              className="p-2 rounded-xl bg-cyan-electric text-charcoal disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </MotionCard>

        {/* Insights Section */}
        <MotionCard
          variant="default"
          className="p-6 h-[500px] overflow-y-auto"
          custom={1}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-vivid" />
              <h3 className="font-semibold">Strategic Insights</h3>
            </div>
            <button
              onClick={fetchInsights}
              disabled={isInsightsLoading}
              className="p-1.5 hover:bg-white/10 rounded-lg"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${isInsightsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {insights ? (
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`p-3 rounded-lg border ${
                    insight.type === 'success' ? 'border-success/30 bg-success/5' :
                    insight.type === 'warning' ? 'border-warning/30 bg-warning/5' :
                    insight.type === 'danger' ? 'border-danger/30 bg-danger/5' :
                    'border-cyan-electric/30 bg-cyan-electric/5'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {getInsightIcon(insight.type)}
                    <div>
                      <h4 className="font-medium text-sm">{insight.title}</h4>
                      <p className="text-xs text-gray-400 mt-1">{insight.content}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Click "Insights" to generate AI analysis</p>
            </div>
          )}
        </MotionCard>
      </div>

      {/* Fundraising Readiness */}
      <AnimatePresence>
        {fundraisingScore && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <MotionCard variant="elevated" className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-cyan-electric" />
                <h3 className="font-semibold">Fundraising Readiness</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className={`text-5xl font-bold ${getGradeColor(fundraisingScore.grade)}`}>
                    {fundraisingScore.score}
                  </div>
                  <div className="text-gray-400 text-sm mt-1">
                    Grade: <span className={getGradeColor(fundraisingScore.grade)}>{fundraisingScore.grade}</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-success mb-2">Strengths</h4>
                  <ul className="space-y-1">
                    {fundraisingScore.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                        <Check className="w-3 h-3 text-success mt-0.5 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-warning mb-2">Areas to Improve</h4>
                  <ul className="space-y-1">
                    {fundraisingScore.weaknesses.map((w, i) => (
                      <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 text-warning mt-0.5 flex-shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-white/5 rounded-lg">
                <p className="text-sm text-gray-300">{fundraisingScore.summary}</p>
              </div>
            </MotionCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Risk Assessment */}
      <AnimatePresence>
        {riskAssessment && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <MotionCard variant="default" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-violet-vivid" />
                  <h3 className="font-semibold">Risk Assessment</h3>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskColor(riskAssessment.riskLevel)}`}>
                  {riskAssessment.riskLevel.toUpperCase()} RISK
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {riskAssessment.risks.map((risk, i) => (
                  <div key={i} className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-cyan-electric">{risk.category}</span>
                      <span className="text-xs text-gray-500">
                        Impact: {risk.impact}/5 • Likelihood: {risk.likelihood}/5
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{risk.description}</p>
                    <p className="text-xs text-success">→ {risk.mitigation}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-white/5 rounded-lg">
                <p className="text-sm text-gray-300">{riskAssessment.overallSummary}</p>
              </div>
            </MotionCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 90-Day Runway Plan */}
      <AnimatePresence>
        {runwayPlan && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-6 border border-cyan-electric/30"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-electric" />
                <h3 className="font-semibold">90-Day Runway Plan</h3>
              </div>
              <button
                onClick={() => copyToClipboard(runwayPlan, 'plan')}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
              >
                {copiedSection === 'plan' ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="prose prose-invert max-w-none">
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{runwayPlan}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board Deck */}
      <AnimatePresence>
        {boardDeck && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <MotionCard variant="elevated" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-electric" />
                  <h3 className="font-semibold">Board Deck Draft</h3>
                </div>
                <button
                  onClick={() => copyToClipboard(boardDeck.map(s => `## ${s.title}\n\n${s.content}\n\n${s.bullets?.map(b => `- ${b}`).join('\n') || ''}`).join('\n\n'), 'deck')}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                >
                  {copiedSection === 'deck' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  Copy All
                </button>
              </div>
              
              <div className="space-y-4">
                {boardDeck.map((section, i) => (
                  <div key={i} className="p-4 bg-white/5 rounded-lg">
                    <h4 className="font-medium text-cyan-electric mb-2">{section.title}</h4>
                    <p className="text-sm text-gray-300 mb-3">{section.content}</p>
                    {section.bullets && section.bullets.length > 0 && (
                      <ul className="space-y-1">
                        {section.bullets.map((b, j) => (
                          <li key={j} className="text-xs text-gray-400 flex items-start gap-2">
                            <span className="text-cyan-electric">•</span> {b}
                          </li>
                        ))}
                      </ul>
                    )}
                    {section.metrics && section.metrics.length > 0 && (
                      <div className="flex flex-wrap gap-3 mt-3">
                        {section.metrics.map((m, j) => (
                          <div key={j} className="bg-white/5 px-3 py-1.5 rounded-lg">
                            <span className="text-xs text-gray-400">{m.label}: </span>
                            <span className={`text-sm font-semibold ${
                              m.trend === 'up' ? 'text-success' : m.trend === 'down' ? 'text-danger' : 'text-white'
                            }`}>
                              {m.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </MotionCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Benchmarks */}
      <AnimatePresence>
        {benchmarks && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <MotionCard variant="default" className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-violet-vivid" />
                <h3 className="font-semibold">Industry Benchmarks</h3>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-white/5 p-4 rounded-lg">
                  {benchmarks}
                </pre>
              </div>
            </MotionCard>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

