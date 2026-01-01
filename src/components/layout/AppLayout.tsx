import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import FloatingSidebar from './FloatingSidebar';
import { OnboardingOverlay } from '../ui/OnboardingOverlay';
import { AIChat } from '../ui/AIChat';
import { ScreenshotControl } from '../dev/ScreenshotControl';
import { AmbientGlow } from '../effects/AmbientGlow';

// Page transition variants - Antigravity style (cubic-bezier 0.16, 1, 0.3, 1)
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.99,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1], // Antigravity easeOutExpo
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.99,
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#F8F9FA] relative">
      <ScreenshotControl />
      <AmbientGlow />
      <FloatingSidebar />

      {/* First-time user onboarding - hide in screenshots */}
      <div className="hide-on-screenshot">
        <OnboardingOverlay />
      </div>

      {/* Floating AI Chat Bubble - hide in screenshots */}
      <div className="hide-on-screenshot">
        <AIChat />
      </div>

      <main className="ml-72 p-4 min-h-screen relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Animated page transitions */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
