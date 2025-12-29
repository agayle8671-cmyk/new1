import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dna, Activity, X, ChevronRight } from 'lucide-react';

const STORAGE_KEY = 'runway-dna-welcomed';

export function WelcomeOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem(STORAGE_KEY);
    if (!hasSeenWelcome) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  const handleNext = () => {
    if (step < 1) {
      setStep(step + 1);
    } else {
      handleDismiss();
    }
  };

  const steps = [
    {
      icon: Dna,
      title: 'Welcome to Runway DNA',
      description: 'Your financial intelligence platform. Upload your financial data to decode your startup\'s DNA and get actionable insights.',
      highlight: 'DNA Lab',
      color: 'cyan-electric',
    },
    {
      icon: Activity,
      title: 'Two Powerful Modes',
      description: 'Switch between Analysis mode to understand your current state, and Strategy mode to simulate different scenarios and plan your future.',
      highlight: 'Simulator',
      color: 'violet-vivid',
    },
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <motion.div
            className="absolute inset-0 bg-charcoal/90 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleDismiss}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg mx-4"
          >
            <div className="glass-card-elevated p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-electric via-violet-vivid to-cyan-electric" />

              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center"
              >
                <motion.div
                  className={`w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-${currentStep.color}/30 to-${currentStep.color}/10 flex items-center justify-center`}
                  animate={{
                    boxShadow: [
                      `0 0 20px rgba(0, 212, 255, 0.2)`,
                      `0 0 40px rgba(139, 92, 246, 0.3)`,
                      `0 0 20px rgba(0, 212, 255, 0.2)`,
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Icon className={`w-10 h-10 ${step === 0 ? 'text-cyan-electric' : 'text-violet-vivid'}`} />
                </motion.div>

                <h2 className="text-2xl font-bold mb-3">{currentStep.title}</h2>
                <p className="text-gray-400 mb-6 leading-relaxed">{currentStep.description}</p>

                <div className="flex items-center justify-center gap-2 mb-6">
                  {steps.map((_, i) => (
                    <motion.div
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${i === step ? 'w-8 bg-gradient-to-r from-cyan-electric to-violet-vivid' : 'w-1.5 bg-white/20'}`}
                    />
                  ))}
                </div>

                <motion.button
                  onClick={handleNext}
                  className="btn-primary flex items-center gap-2 mx-auto"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {step < steps.length - 1 ? 'Next' : 'Get Started'}
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
