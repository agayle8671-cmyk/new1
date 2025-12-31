import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import FloatingOrbs from './FloatingOrbs';
import FloatingSidebar from './FloatingSidebar';
import { OnboardingOverlay } from '../ui/OnboardingOverlay';
import { AIChat } from '../ui/AIChat';
import { ScreenshotControl } from '../dev/ScreenshotControl';

// Page transition variants for mac-native feel
const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
    scale: 0.995,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1], // Custom cubic-bezier
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.995,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-charcoal relative">
      <ScreenshotControl />
      <FloatingOrbs />
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
