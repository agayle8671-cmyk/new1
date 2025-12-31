# Quick Start Guide for AI Review

## What's Included

This folder contains **ALL UI-related files** from the Runway DNA project, organized for easy AI context understanding.

## File Count
- **29 total files** including:
  - 12 page components
  - 11 UI components
  - 3 layout components
  - 3 configuration files
  - 1 state management file
  - 1 global stylesheet
  - 2 entry point files

## Key Files to Start With

### 1. **App.tsx** - Main Application Structure
   - Defines all routes
   - Sets up routing with React Router
   - Configures toast notifications
   - Entry point for understanding page structure

### 2. **index.css** - Design System
   - All Tailwind custom classes
   - Color palette definitions
   - Animation keyframes
   - Glassmorphism utilities
   - Component styles (buttons, badges, cards)

### 3. **tailwind.config.js** - Theme Configuration
   - Custom colors (charcoal, cyan, violet, success, warning, danger)
   - Custom animations
   - Font families
   - Safelist for dynamic classes

### 4. **store.ts** - State Management
   - Global Zustand store
   - Financial analysis state
   - Simulator parameters
   - Growth scenarios

### 5. **AppLayout.tsx** - Main Layout
   - Sidebar navigation
   - Page wrapper
   - Floating orbs background
   - Overall page structure

## Design Patterns to Understand

### Glassmorphism
- Used throughout: `backdrop-blur-md bg-white/5 border border-white/10`
- Elevated variant: `bg-white/[0.07]` with shadow
- See `index.css` for `.glass-card` and `.glass-card-elevated`

### Color System
- Primary: Cyan Electric (`#00D4FF`)
- Secondary: Violet Vivid (`#8B5CF6`)
- Background: Charcoal (`#0D0D0D`)
- Status: Success, Warning, Danger

### Animation Patterns
- Framer Motion for page transitions
- Staggered card animations
- Floating orb animations (see `FloatingOrbs.tsx`)
- Loading skeletons

### Component Hierarchy
```
App.tsx
  └── AppLayout.tsx
      ├── FloatingSidebar.tsx (navigation)
      ├── FloatingOrbs.tsx (background)
      └── Page Components
          ├── DNALab.tsx
          ├── Simulator.tsx
          ├── AIAdvisor.tsx
          └── ... (other pages)
```

## Common UI Components

### MotionCard
- Reusable animated card component
- Variants: `default`, `elevated`
- Used throughout for consistent card styling

### PageTransition
- Wraps pages for smooth transitions
- Fade and slide animations

### Skeleton Components
- Loading states
- Shimmer animations
- Used while data loads

## Page Structure Pattern

Most pages follow this structure:
1. Header with title and description
2. Action buttons/controls
3. Main content grid
4. Feature-specific sections
5. Animated cards with data

## State Flow

1. User uploads CSV in **DNALab.tsx**
   → Updates `currentAnalysis` in store

2. User adjusts sliders in **Simulator.tsx**
   → Updates `simulatorParams` in store

3. **AIAdvisor.tsx** reads from store
   → Builds context for AI queries

## Important Notes

- All pages use **glassmorphic design** consistently
- **Responsive design** with Tailwind breakpoints
- **Dark theme** only (charcoal background)
- **Framer Motion** for all animations
- **TypeScript** throughout for type safety

## Missing (Not UI-Related)

These files are NOT included (backend/data processing):
- `dna-processor.ts` - CSV parsing logic
- `simulator-engine.ts` - Financial calculations
- `services/*.ts` - Business logic
- `api.ts` - API calls (has backend logic)
- `supabase.ts` - Database client
- `server.js` - Express backend

## Questions to Answer

When reviewing for UI changes, consider:
1. How does the design system maintain consistency?
2. Where are reusable patterns that could be extracted?
3. What animation patterns are used?
4. How is responsive design handled?
5. What state management patterns are used?
6. How are loading states handled?
7. What accessibility features are present?

