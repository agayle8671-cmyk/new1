/**
 * AIChat.tsx
 * 
 * Floating AI chat bubble for Runway DNA.
 * Provides natural language financial advice.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2, Sparkles, Minimize2, Maximize2 } from 'lucide-react';
import AIService, { type AIMessage, type AIContext } from '../../lib/services/AIService';
import { useAppStore } from '../../lib/store';

const INITIAL_MESSAGE: AIMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Hey! I'm Runa, your AI financial advisor. Yes, like Runway — the DNA team thought they were clever. 😏 Ask me about your runway, burn rate, or fundraising readiness. I've run the numbers. Trust me.",
  timestamp: new Date(),
};

const QUICK_PROMPTS = [
  "How's my runway looking?",
  "What are my biggest risks?",
  "Am I ready to fundraise?",
  "Explain my burn rate",
];

export function AIChat() {
  const { currentAnalysis, simulatorParams } = useAppStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsConfigured(AIService.isConfigured());
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const getContext = useCallback((): AIContext => ({
    analysis: currentAnalysis,
    simulatorParams: simulatorParams,
  }), [currentAnalysis, simulatorParams]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: AIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await AIService.chat(
        content,
        getContext(),
        messages.filter(m => m.id !== 'welcome')
      );

      const assistantMessage: AIMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: AIMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your API key configuration.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, getContext]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  if (!isConfigured) {
    return (
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-gray-600 to-gray-700 shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
          title="AI not configured"
        >
          <MessageSquare className="w-6 h-6 text-gray-400" />
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="absolute bottom-16 right-0 w-72 glass-card p-4"
            >
              <div className="space-y-3">
                <p className="text-sm text-gray-400">
                  AI Advisor requires a Google AI API key configured server-side in Railway.
                </p>
                <p className="text-xs text-gray-500">
                  Add <code className="text-cyan-electric">GOOGLE_AI_KEY</code> (not VITE_ prefix) in Railway Settings → Variables.
                </p>
                <a
                  href="/ai-advisor"
                  className="block text-center text-xs text-cyan-electric hover:text-cyan-glow underline"
                >
                  🔧 Open AI Advisor Page
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`absolute bottom-16 right-0 glass-card-elevated overflow-hidden ${isMinimized ? 'w-72 h-12' : 'w-96 h-[500px]'
              }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/10 bg-gradient-to-r from-cyan-electric/10 to-violet-vivid/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-electric" />
                <span className="font-semibold text-sm">AI Advisor</span>
                {isLoading && <Loader2 className="w-4 h-4 animate-spin text-cyan-electric" />}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isMinimized ? (
                    <Maximize2 className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Minimize2 className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[360px] scrollbar-thin scrollbar-thumb-white/10">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${message.role === 'user'
                          ? 'bg-cyan-electric text-charcoal font-medium'
                          : 'bg-surface-2 border border-white/5 text-text-primary'
                          }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-surface-2 border border-white/5 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-1.5 h-5">
                          <div className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Prompts */}
                {messages.length <= 2 && (
                  <div className="px-4 pb-2 flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleQuickPrompt(prompt)}
                        className="text-xs px-3 py-1.5 rounded-full bg-surface-2 border border-white/10 hover:bg-surface-3 text-text-secondary hover:text-text-primary transition-all duration-200 hover-scale"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input */}
                <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 bg-white/[0.02]">
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask Runa..."
                      className="flex-1 bg-surface-1 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-cyan-electric/50 focus:ring-1 focus:ring-cyan-electric/20 transition-all"
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="p-2.5 rounded-xl bg-cyan-electric text-charcoal disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-glow hover:shadow-glow-cyan transition-all duration-200 active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${isOpen
          ? 'bg-white/10 hover:bg-white/20'
          : 'bg-gradient-to-r from-cyan-electric to-violet-vivid hover:scale-110'
          }`}
        whileHover={{ scale: isOpen ? 1 : 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={isOpen ? {} : {
          boxShadow: [
            '0 0 20px rgba(0, 212, 255, 0.3)',
            '0 0 40px rgba(139, 92, 246, 0.4)',
            '0 0 20px rgba(0, 212, 255, 0.3)',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-gray-300" />
        ) : (
          <Sparkles className="w-6 h-6 text-charcoal" />
        )}
      </motion.button>
    </div>
  );
}

export default AIChat;

