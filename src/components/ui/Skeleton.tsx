import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <motion.div
      className={`bg-white/10 rounded-lg ${className}`}
      animate={{
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

export function BentoCardSkeleton() {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-32" />
        </div>
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="glass-card-elevated p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="h-64 flex items-end gap-2 pt-8">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="flex-1 bg-white/10 rounded-t"
            initial={{ height: '20%' }}
            animate={{
              height: ['20%', `${30 + Math.random() * 50}%`, '20%'],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.1,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function GradeSkeleton() {
  return (
    <div className="glass-card p-6 text-center space-y-4">
      <Skeleton className="h-3 w-20 mx-auto" />
      <motion.div
        className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-cyan-electric/20 to-violet-vivid/20"
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <Skeleton className="h-3 w-24 mx-auto" />
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 items-center">
      <div className="col-span-2">
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="col-span-1">
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <div className="col-span-1">
        <Skeleton className="w-10 h-10 rounded-xl" />
      </div>
      <div className="col-span-2">
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="col-span-2">
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="col-span-3">
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="col-span-1">
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

export function SequencingLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="relative w-24 h-24">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-cyan-electric/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-2 rounded-full border-2 border-violet-vivid/30"
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-4 rounded-full border-2 border-cyan-electric/50"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-cyan-electric to-violet-vivid" />
        </motion.div>
      </div>
      <motion.p
        className="text-gray-400 text-sm"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Sequencing financial DNA...
      </motion.p>
    </div>
  );
}
