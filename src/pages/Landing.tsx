import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
    Dna,
    Sparkles,
    TrendingUp,
    Shield,
    Zap,
    BarChart3,
    ArrowRight,
    Play,
    Check,
    Star,
    ChevronDown,
} from 'lucide-react';

// Animated counter hook
function useCounter(end: number, duration: number = 2000, delay: number = 0) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const timeout = setTimeout(() => {
            let startTime: number;
            const animate = (currentTime: number) => {
                if (!startTime) startTime = currentTime;
                const progress = Math.min((currentTime - startTime) / duration, 1);
                setCount(Math.floor(progress * end));
                if (progress < 1) requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
        }, delay);
        return () => clearTimeout(timeout);
    }, [end, duration, delay]);

    return count;
}

// Floating DNA helix component
function DNAHelix() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Animated DNA strands */}
            {[...Array(20)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-3 h-3 rounded-full"
                    style={{
                        background: i % 2 === 0
                            ? 'linear-gradient(135deg, #00D4FF, #00E5FF)'
                            : 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
                        left: `${50 + Math.sin(i * 0.5) * 15}%`,
                        top: `${i * 5}%`,
                        filter: 'blur(1px)',
                    }}
                    animate={{
                        x: [0, Math.sin(i) * 30, 0],
                        y: [0, -20, 0],
                        scale: [1, 1.2, 1],
                        opacity: [0.4, 0.8, 0.4],
                    }}
                    transition={{
                        duration: 3 + i * 0.1,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.1,
                    }}
                />
            ))}

            {/* Connecting lines */}
            {[...Array(10)].map((_, i) => (
                <motion.div
                    key={`line-${i}`}
                    className="absolute h-px bg-gradient-to-r from-cyan-electric/20 via-violet-vivid/40 to-cyan-electric/20"
                    style={{
                        width: '100px',
                        left: '45%',
                        top: `${i * 10 + 5}%`,
                        transform: 'rotate(-15deg)',
                    }}
                    animate={{
                        opacity: [0.2, 0.5, 0.2],
                        scaleX: [0.8, 1.2, 0.8],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.2,
                    }}
                />
            ))}
        </div>
    );
}

// Animated metrics card
function MetricCard({
    label,
    value,
    suffix = '',
    trend,
    color,
    delay
}: {
    label: string;
    value: number;
    suffix?: string;
    trend?: string;
    color: string;
    delay: number;
}) {
    const count = useCounter(value, 1500, delay);

    return (
        <motion.div
            className="glass-card p-6 relative overflow-hidden group"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: delay / 1000 }}
            whileHover={{ scale: 1.02, y: -5 }}
        >
            {/* Glow effect on hover */}
            <div
                className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${color}`}
                style={{ filter: 'blur(40px)' }}
            />

            <p className="text-gray-400 text-sm mb-2">{label}</p>
            <div className="flex items-baseline gap-1">
                <span className={`text-4xl font-bold ${color.replace('bg-', 'text-').replace('/20', '')}`}>
                    {count.toLocaleString()}{suffix}
                </span>
                {trend && (
                    <span className="text-success text-sm flex items-center gap-1 ml-2">
                        <TrendingUp className="w-3 h-3" />
                        {trend}
                    </span>
                )}
            </div>
        </motion.div>
    );
}

// Feature card with icon
function FeatureCard({
    icon: Icon,
    title,
    description,
    gradient,
    delay
}: {
    icon: React.ElementType;
    title: string;
    description: string;
    gradient: string;
    delay: number;
}) {
    return (
        <motion.div
            className="glass-card p-8 relative overflow-hidden group cursor-pointer"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay }}
            whileHover={{ scale: 1.03, y: -8 }}
        >
            {/* Animated background gradient */}
            <motion.div
                className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${gradient}`}
                style={{ filter: 'blur(60px)' }}
                animate={{
                    scale: [1, 1.2, 1],
                }}
                transition={{ duration: 3, repeat: Infinity }}
            />

            {/* Icon container */}
            <div className={`w-14 h-14 rounded-2xl ${gradient} flex items-center justify-center mb-6 relative`}>
                <Icon className="w-7 h-7 text-white" />

                {/* Icon glow */}
                <motion.div
                    className={`absolute inset-0 rounded-2xl ${gradient}`}
                    style={{ filter: 'blur(15px)' }}
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            </div>

            <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
            <p className="text-gray-400 leading-relaxed">{description}</p>

            {/* Arrow on hover */}
            <motion.div
                className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity"
                initial={{ x: -10 }}
                whileHover={{ x: 0 }}
            >
                <ArrowRight className="w-5 h-5 text-white" />
            </motion.div>
        </motion.div>
    );
}

// Testimonial card
function TestimonialCard({
    quote,
    author,
    role,
    avatar,
    delay
}: {
    quote: string;
    author: string;
    role: string;
    avatar: string;
    delay: number;
}) {
    return (
        <motion.div
            className="glass-card p-8 relative"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay }}
        >
            {/* Stars */}
            <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                ))}
            </div>

            <p className="text-gray-300 text-lg leading-relaxed mb-6">"{quote}"</p>

            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-electric to-violet-vivid flex items-center justify-center text-white font-bold">
                    {avatar}
                </div>
                <div>
                    <p className="font-semibold text-white">{author}</p>
                    <p className="text-gray-400 text-sm">{role}</p>
                </div>
            </div>
        </motion.div>
    );
}

export default function Landing() {
    const { scrollYProgress } = useScroll();
    const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

    return (
        <div className="min-h-screen bg-charcoal overflow-hidden">
            {/* Floating Orbs Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <motion.div
                    className="absolute w-[600px] h-[600px] rounded-full bg-cyan-electric/10"
                    style={{ filter: 'blur(120px)', top: '-10%', right: '-10%' }}
                    animate={{
                        x: [0, 50, 0],
                        y: [0, 30, 0],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute w-[500px] h-[500px] rounded-full bg-violet-vivid/10"
                    style={{ filter: 'blur(100px)', bottom: '-5%', left: '-5%' }}
                    animate={{
                        x: [0, -40, 0],
                        y: [0, -30, 0],
                        scale: [1, 1.15, 1],
                    }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute w-[400px] h-[400px] rounded-full bg-cyan-electric/5"
                    style={{ filter: 'blur(80px)', top: '40%', left: '30%' }}
                    animate={{
                        x: [0, 60, 0],
                        y: [0, -40, 0],
                    }}
                    transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
                />
            </div>

            {/* Hero Section */}
            <motion.section
                className="relative min-h-screen flex items-center justify-center px-6"
                style={{ opacity: heroOpacity, scale: heroScale }}
            >
                <DNAHelix />

                <div className="max-w-6xl mx-auto text-center relative z-10">
                    {/* Badge */}
                    <motion.div
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-1 border border-border mb-8"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <Sparkles className="w-4 h-4 text-cyan-electric" />
                        <span className="text-sm text-text-secondary">Powered by AI Financial Intelligence</span>
                    </motion.div>

                    {/* Main Headline */}
                    <motion.h1
                        className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <span className="text-white">Know Your</span>
                        <br />
                        <span className="gradient-text-mixed">Runway DNA</span>
                    </motion.h1>

                    {/* Subheadline */}
                    <motion.p
                        className="text-xl md:text-2xl text-text-secondary max-w-3xl mx-auto mb-10 leading-relaxed"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                    >
                        The AI-powered financial intelligence platform that tells SaaS founders
                        <span className="text-text-primary font-medium"> exactly </span>
                        how long their runway lasts—and how to extend it.
                    </motion.p>

                    {/* CTAs */}
                    <motion.div
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                    >
                        <Link to="/dna-lab">
                            <motion.button
                                className="group px-8 py-4 rounded-2xl font-semibold text-lg bg-gradient-to-r from-cyan-electric to-cyan-glow text-charcoal flex items-center gap-3 relative overflow-hidden"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {/* Shimmer effect */}
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                    animate={{ x: ['-100%', '200%'] }}
                                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                                />
                                <span className="relative">Analyze My Runway</span>
                                <ArrowRight className="w-5 h-5 relative group-hover:translate-x-1 transition-transform" />
                            </motion.button>
                        </Link>

                        <motion.button
                            className="px-8 py-4 rounded-2xl font-semibold text-lg bg-white/5 border border-white/10 text-white flex items-center gap-3 hover:bg-white/10 transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Play className="w-5 h-5" />
                            <span>Watch Demo</span>
                        </motion.button>
                    </motion.div>

                    {/* Social Proof */}
                    <motion.div
                        className="flex flex-col items-center gap-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.8 }}
                    >
                        <div className="flex items-center gap-2">
                            {[...Array(5)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border-2 border-charcoal flex items-center justify-center text-xs font-bold"
                                    style={{ marginLeft: i > 0 ? '-8px' : '0' }}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 1 + i * 0.1 }}
                                >
                                    {['JD', 'MK', 'AL', 'SR', 'PT'][i]}
                                </motion.div>
                            ))}
                            <span className="text-gray-400 ml-3">500+ founders</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                            ))}
                            <span className="text-gray-400 ml-2">4.9/5 rating</span>
                        </div>
                    </motion.div>
                </div>

                {/* Scroll indicator */}
                <motion.div
                    className="absolute bottom-10 left-1/2 -translate-x-1/2"
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <ChevronDown className="w-8 h-8 text-gray-500" />
                </motion.div>
            </motion.section>

            {/* Live Metrics Demo */}
            <section className="relative py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                            Real-Time Financial Intelligence
                        </h2>
                        <p className="text-xl text-gray-400">
                            See your startup's financial DNA in seconds
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <MetricCard
                            label="Runway"
                            value={18}
                            suffix=" mo"
                            color="bg-cyan-electric/20"
                            delay={0}
                        />
                        <MetricCard
                            label="Monthly Burn"
                            value={85}
                            suffix="k"
                            trend="-12%"
                            color="bg-violet-vivid/20"
                            delay={200}
                        />
                        <MetricCard
                            label="Revenue Growth"
                            value={24}
                            suffix="%"
                            trend="+5%"
                            color="bg-success/20"
                            delay={400}
                        />
                        <MetricCard
                            label="Health Score"
                            value={87}
                            suffix="/100"
                            color="bg-warning/20"
                            delay={600}
                        />
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="relative py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                            Everything You Need to
                            <span className="gradient-text-cyan"> Survive & Thrive</span>
                        </h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            Built by founders, for founders. Every feature designed to extend your runway.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FeatureCard
                            icon={Dna}
                            title="DNA Analysis"
                            description="Upload your financials and get instant insights on burn rate, revenue trends, and runway projections."
                            gradient="bg-gradient-to-br from-cyan-electric to-cyan-glow"
                            delay={0}
                        />
                        <FeatureCard
                            icon={Sparkles}
                            title="AI Advisor (Runa)"
                            description="Meet Runa—your overconfident AI CFO who's analyzed thousands of startups and knows exactly what you need."
                            gradient="bg-gradient-to-br from-violet-vivid to-violet-glow"
                            delay={0.1}
                        />
                        <FeatureCard
                            icon={BarChart3}
                            title="Scenario Simulator"
                            description="Model hiring decisions, funding rounds, and growth scenarios to see their impact on your runway."
                            gradient="bg-gradient-to-br from-success to-emerald-400"
                            delay={0.2}
                        />
                        <FeatureCard
                            icon={TrendingUp}
                            title="Growth Tracker"
                            description="Monitor MRR, churn, and expansion revenue with beautiful visualizations and benchmarks."
                            gradient="bg-gradient-to-br from-warning to-orange-400"
                            delay={0.3}
                        />
                        <FeatureCard
                            icon={Shield}
                            title="Risk Alerts"
                            description="Get proactive warnings before you hit danger zones. Never be caught off guard by cash flow issues."
                            gradient="bg-gradient-to-br from-danger to-red-400"
                            delay={0.4}
                        />
                        <FeatureCard
                            icon={Zap}
                            title="Investor Reports"
                            description="One-click export beautiful investor updates with key metrics and AI-generated insights."
                            gradient="bg-gradient-to-br from-cyan-electric to-violet-vivid"
                            delay={0.5}
                        />
                    </div>
                </div>
            </section>

            {/* Runa Section */}
            <section className="relative py-24 px-6 overflow-hidden">
                <div className="max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-vivid/20 border border-violet-vivid/30 mb-6">
                                <Sparkles className="w-4 h-4 text-violet-vivid" />
                                <span className="text-sm text-violet-vivid font-medium">Meet Your AI CFO</span>
                            </div>

                            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                                Say Hello to
                                <span className="gradient-text-violet"> Runa</span>
                            </h2>

                            <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                                Runa is your AI financial advisor—slightly overconfident, incredibly smart,
                                and always ready with the numbers. She's analyzed thousands of startup financials
                                and knows exactly what to look for.
                            </p>

                            <div className="space-y-4">
                                {[
                                    "I've run the numbers. Trust me.",
                                    "Your runway? I probably know it better than you do.",
                                    "I don't guess. I calculate.",
                                ].map((quote, i) => (
                                    <motion.div
                                        key={i}
                                        className="flex items-center gap-3 text-gray-300"
                                        initial={{ opacity: 0, x: -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.2 + i * 0.1 }}
                                    >
                                        <div className="w-2 h-2 rounded-full bg-violet-vivid" />
                                        <span className="italic">"{quote}"</span>
                                    </motion.div>
                                ))}
                            </div>

                            <Link to="/ai-advisor">
                                <motion.button
                                    className="mt-8 px-6 py-3 rounded-xl font-semibold bg-violet-vivid text-white flex items-center gap-2"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Chat with Runa
                                    <ArrowRight className="w-4 h-4" />
                                </motion.button>
                            </Link>
                        </motion.div>

                        {/* Runa Chat Preview */}
                        <motion.div
                            className="glass-card-elevated p-6 relative"
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                        >
                            {/* Chat header */}
                            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-vivid to-violet-glow flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="font-semibold text-white">Runa</p>
                                    <p className="text-xs text-success flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                        Online
                                    </p>
                                </div>
                            </div>

                            {/* Chat messages */}
                            <div className="py-6 space-y-4">
                                <motion.div
                                    className="bg-white/5 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]"
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <p className="text-gray-300 text-sm">
                                        Hey! I'm Runa — yes, like Runway. The DNA team thought they were clever. 😏
                                    </p>
                                </motion.div>

                                <motion.div
                                    className="bg-white/5 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]"
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.7 }}
                                >
                                    <p className="text-gray-300 text-sm">
                                        I've already glanced at your numbers. 18 months runway—not bad! But your burn increased 15% last quarter. Want me to show you how to fix that?
                                    </p>
                                </motion.div>

                                <motion.div
                                    className="flex justify-end"
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.9 }}
                                >
                                    <div className="bg-cyan-electric text-charcoal rounded-2xl rounded-tr-sm px-4 py-3">
                                        <p className="text-sm font-medium">Yes, show me!</p>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Typing indicator */}
                            <motion.div
                                className="flex items-center gap-2 text-gray-400 text-sm"
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            >
                                <span>Runa is calculating...</span>
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-violet-vivid rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-1.5 h-1.5 bg-violet-vivid rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-1.5 h-1.5 bg-violet-vivid rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="relative py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                            Loved by Founders
                        </h2>
                        <p className="text-xl text-gray-400">
                            Join 500+ startups already using Runway DNA
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <TestimonialCard
                            quote="Finally, a tool that actually understands startup financials. Runa caught a burn rate issue we completely missed."
                            author="Sarah Chen"
                            role="CEO, TechFlow"
                            avatar="SC"
                            delay={0}
                        />
                        <TestimonialCard
                            quote="The scenario simulator saved us during our Series A. We could show investors exactly how we'd use the funds."
                            author="Marcus Johnson"
                            role="Founder, DataSync"
                            avatar="MJ"
                            delay={0.1}
                        />
                        <TestimonialCard
                            quote="Best $0 I ever spent. The free tier is incredibly generous and the insights are worth 10x a fractional CFO."
                            author="Alex Rivera"
                            role="CTO, BuildStack"
                            avatar="AR"
                            delay={0.2}
                        />
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="relative py-32 px-6">
                <div className="max-w-4xl mx-auto text-center relative">
                    {/* Background glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-electric/20 via-violet-vivid/20 to-cyan-electric/20 blur-3xl" />

                    <motion.div
                        className="relative"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
                            Ready to Know Your
                            <span className="gradient-text-mixed"> True Runway?</span>
                        </h2>

                        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
                            Upload your financials and get instant AI-powered insights.
                            No credit card required. Be analyzing in 60 seconds.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link to="/dna-lab">
                                <motion.button
                                    className="group px-10 py-5 rounded-2xl font-bold text-xl bg-gradient-to-r from-cyan-electric to-cyan-glow text-charcoal flex items-center gap-3 relative overflow-hidden shadow-2xl shadow-cyan-electric/25"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                        animate={{ x: ['-100%', '200%'] }}
                                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                                    />
                                    <span className="relative">Start Free Analysis</span>
                                    <ArrowRight className="w-6 h-6 relative group-hover:translate-x-1 transition-transform" />
                                </motion.button>
                            </Link>
                        </div>

                        <div className="mt-8 flex items-center justify-center gap-6 text-gray-400 text-sm">
                            <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-success" />
                                <span>Free forever tier</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-success" />
                                <span>No credit card</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-success" />
                                <span>Setup in 60s</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10 py-12 px-6">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-electric to-violet-vivid flex items-center justify-center">
                            <Dna className="w-5 h-5 text-charcoal" />
                        </div>
                        <span className="font-bold text-lg gradient-text-mixed">Runway DNA</span>
                    </div>

                    <p className="text-gray-500 text-sm">
                        © 2025 Runway DNA. Built with 💜 for founders.
                    </p>
                </div>
            </footer>
        </div>
    );
}
