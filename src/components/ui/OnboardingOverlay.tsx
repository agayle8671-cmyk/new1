/**
 * OnboardingOverlay.tsx
 * 
 * First-time user onboarding with high-blur glassmorphism.
 * Highlights key features like Context Switcher (Analysis/Strategy modes).
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Zap, ArrowRight, ChevronRight, BarChart3, Dna, Activity } from 'lucide-react';

const ONBOARDING_KEY = 'runway-dna-onboarding-completed';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: typeof Sparkles;
  highlight?: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    title: 'Welcome to Runway DNA',
    description: 'Your AI-powered strategic finance suite. Upload your financial data and get instant runway insights.',
    icon: Dna,
  },
  {
    id: 2,
    title: 'DNA Lab → Simulator Flow',
    description: 'Start in the DNA Lab to analyze your financials. Your data automatically syncs to the Simulator for scenario modeling.',
    icon: Activity,
    highlight: 'The sidebar shows your current Runway Grade in real-time.',
  },
  {
    id: 3,
    title: 'Context Switcher',
    description: 'Toggle between Analysis mode (deep-dive metrics) and Strategy mode (growth levers) to focus your view.',
    icon: Zap,
    highlight: 'Find this in the sidebar header.',
  },
  {
    id: 4,
    title: 'Founder Toolkit',
    description: 'Access Valuation, Tax Credits, Hiring Planner, and Dilution Shaper — all connected to your DNA.',
    icon: BarChart3,
    highlight: 'Save snapshots to track your progress over time.',
  },
];

export function OnboardingOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasChecked, setHasChecked] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      // Delay showing overlay to let page load first
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
    setHasChecked(true);
  }, []);

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsVisible(false);
  };

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const step = onboardingSteps[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            backgroundColor: 'rgba(13, 13, 13, 0.85)',
          }}
        >
          {/* Decorative gradient orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-electric/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-vivid/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md glass-card border border-white/20 rounded-2xl overflow-hidden"
          >
            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-electric to-violet-vivid"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Skip button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="p-8 pt-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Icon */}
                  <div className="flex justify-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.1 }}
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-electric/20 to-violet-vivid/20 border border-cyan-electric/30 flex items-center justify-center"
                    >
                      <Icon className="w-8 h-8 text-cyan-electric" />
                    </motion.div>
                  </div>

                  {/* Title & Description */}
                  <div className="text-center space-y-3">
                    <h2 className="text-xl font-bold text-white">{step.title}</h2>
                    <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
                    
                    {step.highlight && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-4 p-3 rounded-lg bg-cyan-electric/10 border border-cyan-electric/20"
                      >
                        <p className="text-xs text-cyan-electric flex items-center justify-center gap-2">
                          <Sparkles className="w-3 h-3" />
                          {step.highlight}
                        </p>
                      </motion.div>
                    )}
                  </div>

                  {/* Step indicators */}
                  <div className="flex justify-center gap-2 pt-2">
                    {onboardingSteps.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentStep(i)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i === currentStep
                            ? 'bg-cyan-electric w-6'
                            : i < currentStep
                            ? 'bg-cyan-electric/50'
                            : 'bg-white/20'
                        }`}
                      />
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-8 pb-8 flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-gray-400 font-medium hover:bg-white/10 transition-all"
                >
                  Back
                </button>
              )}
              <motion.button
                onClick={handleNext}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-electric to-cyan-electric/80 text-charcoal font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-cyan-electric/20 transition-all"
              >
                {currentStep === onboardingSteps.length - 1 ? (
                  <>
                    Get Started
                    <Zap className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to reset onboarding (for testing)
export function useResetOnboarding() {
  return () => {
    localStorage.removeItem(ONBOARDING_KEY);
    window.location.reload();
  };
}

export default OnboardingOverlay;




