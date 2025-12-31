# UI Files for AI Context

This folder contains all UI-related files from the Runway DNA project, organized for AI context understanding.

## Folder Structure

```
ui-files-for-ai/
├── src/
│   ├── App.tsx                    # Main app component with routing
│   ├── main.tsx                   # Entry point
│   ├── index.css                  # Global styles and Tailwind utilities
│   ├── pages/                     # All page components
│   │   ├── AIAdvisor.tsx
│   │   ├── DNALab.tsx
│   │   ├── Simulator.tsx
│   │   ├── GrowthTracker.tsx
│   │   ├── HiringPlanner.tsx
│   │   ├── Archive.tsx
│   │   ├── APITest.tsx
│   │   ├── EnvDebug.tsx
│   │   └── Toolkit/
│   │       ├── Valuation.tsx
│   │       ├── TaxCredit.tsx
│   │       └── Dilution.tsx
│   ├── components/                 # Reusable UI components
│   │   ├── ErrorBoundary.tsx
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx       # Main layout wrapper
│   │   │   ├── FloatingSidebar.tsx
│   │   │   └── FloatingOrbs.tsx
│   │   └── ui/
│   │       ├── MotionCard.tsx
│   │       ├── AIChat.tsx
│   │       ├── PageTransition.tsx
│   │       ├── Skeleton.tsx
│   │       ├── SkeletonScreens.tsx
│   │       ├── SystemHealth.tsx
│   │       ├── SuccessConfetti.tsx
│   │       ├── WelcomeOverlay.tsx
│   │       └── OnboardingOverlay.tsx
│   └── lib/
│       └── store.ts               # Zustand state management
├── tailwind.config.js             # Tailwind CSS configuration
├── vite.config.ts                 # Vite build configuration
└── package.json                   # Dependencies and scripts
```

## Design System

### Color Palette
- **Charcoal**: `#0D0D0D` (primary background)
- **Cyan Electric**: `#00D4FF` (primary accent)
- **Violet Vivid**: `#8B5CF6` (secondary accent)
- **Success**: `#00FF88` (green)
- **Warning**: `#FFB800` (yellow)
- **Danger**: `#E53935` (red)

### Key Design Patterns
- **Glassmorphism**: Backdrop blur with semi-transparent backgrounds
- **Gradient Text**: Cyan-to-violet gradients for headings
- **Floating Orbs**: Animated background elements
- **Motion Cards**: Framer Motion animated cards
- **Bento Grid**: Responsive grid layout system

### UI Components
- **MotionCard**: Animated card with variants (default, elevated)
- **FloatingSidebar**: Navigation sidebar with glassmorphic design
- **AppLayout**: Main layout wrapper with sidebar and content area
- **PageTransition**: Smooth page transitions
- **Skeleton**: Loading state components

### State Management
- **Zustand Store** (`store.ts`): Global state for:
  - Current financial analysis
  - Simulator parameters
  - Growth scenarios
  - Context mode (growth/strategy)

### Routing
Routes defined in `App.tsx`:
- `/dna-lab` - Main DNA Lab page
- `/simulator` - Financial simulator
- `/ai-advisor` - AI Financial Advisor
- `/growth` - Growth Tracker
- `/hiring` - Hiring Planner
- `/valuation` - Valuation Toolkit
- `/tax-credit` - Tax Credit Calculator
- `/dilution` - Dilution Calculator
- `/archive` - Archive page

### Key Libraries
- **React 18** with TypeScript
- **React Router DOM** for routing
- **Framer Motion** for animations
- **Tailwind CSS** for styling
- **Zustand** for state management
- **Lucide React** for icons
- **Sonner** for toast notifications
- **Recharts** for data visualization

## Notes for AI Review

1. **Design Consistency**: All pages follow the glassmorphic design pattern with consistent spacing, colors, and animations.

2. **Responsive Design**: Components use Tailwind's responsive utilities (sm:, md:, lg:) for mobile-first design.

3. **Accessibility**: Reduced motion support, semantic HTML, and proper ARIA labels where needed.

4. **Performance**: 
   - Code splitting via Vite
   - Lazy loading for off-screen content
   - GPU-accelerated animations
   - Content visibility optimization

5. **Animation Patterns**:
   - Page transitions via Framer Motion
   - Staggered card animations
   - Floating orb animations
   - Loading skeletons

6. **State Flow**:
   - DNA Lab uploads → `currentAnalysis` in store
   - Simulator adjustments → `simulatorParams` in store
   - AI Advisor reads from store for context

## Missing Files (Not UI-Related)

The following files are NOT included as they're backend/data processing:
- `src/lib/dna-processor.ts` - CSV processing logic
- `src/lib/simulator-engine.ts` - Financial calculations
- `src/lib/services/*.ts` - Business logic services
- `src/lib/api.ts` - API calls (partially UI-related but includes backend logic)
- `src/lib/supabase.ts` - Database client
- `server.js` - Express backend server

These can be referenced separately if needed for full context.

