/**
 * SmartUpload Component
 * 
 * Stunning drag-and-drop upload interface with:
 * - Multi-format file support
 * - Text paste input
 * - AI-powered extraction feedback
 * - Beautiful animations
 */

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload,
    FileSpreadsheet,
    FileJson,
    FileText,
    File,
    Sparkles,
    Check,
    AlertTriangle,
    X,
    Clipboard,
    Loader2,
    Zap,
    Brain,
} from 'lucide-react';
import {
    parseFile,
    parsePastedContent,
    extractFinancialsWithAI,
    formatFileSize,
    type ParsedContent,
    type ExtractionResult,
    type ExtractedFinancials,
    type SupportedFileType,
} from '../../lib/universal-parser';

interface SmartUploadProps {
    onExtracted: (data: ExtractedFinancials, confidence: number) => void;
    onError?: (error: string) => void;
}

// File type configuration
const FILE_TYPES = [
    { ext: 'CSV', icon: FileSpreadsheet, color: 'text-success', bg: 'bg-success/20' },
    { ext: 'Excel', icon: FileSpreadsheet, color: 'text-success', bg: 'bg-success/20' },
    { ext: 'JSON', icon: FileJson, color: 'text-warning', bg: 'bg-warning/20' },
    { ext: 'Text', icon: FileText, color: 'text-cyan-electric', bg: 'bg-cyan-electric/20' },
];

type UploadState = 'idle' | 'dragover' | 'parsing' | 'extracting' | 'success' | 'error';

export default function SmartUpload({ onExtracted, onError }: SmartUploadProps) {
    const [state, setState] = useState<UploadState>('idle');
    const [parsedContent, setParsedContent] = useState<ParsedContent | null>(null);
    const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [showPasteInput, setShowPasteInput] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [fileName, setFileName] = useState<string>('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    // Handle file selection
    const handleFile = useCallback(async (file: File) => {
        setFileName(file.name);
        setState('parsing');
        setErrorMessage('');

        try {
            // Parse the file
            const content = await parseFile(file);
            setParsedContent(content);

            // Extract financials with AI
            setState('extracting');
            const result = await extractFinancialsWithAI(content);
            setExtractionResult(result);

            if (result.success && result.data) {
                setState('success');
                onExtracted(result.data, result.confidence);
            } else {
                setState('error');
                setErrorMessage(result.error || 'Failed to extract financial data');
                onError?.(result.error || 'Extraction failed');
            }
        } catch (error) {
            setState('error');
            const msg = error instanceof Error ? error.message : 'Unknown error';
            setErrorMessage(msg);
            onError?.(msg);
        }
    }, [onExtracted, onError]);

    // Handle pasted text
    const handlePasteSubmit = useCallback(async () => {
        if (!pasteText.trim()) return;

        setFileName('Pasted content');
        setState('parsing');
        setErrorMessage('');

        try {
            const content = parsePastedContent(pasteText);
            setParsedContent(content);

            setState('extracting');
            const result = await extractFinancialsWithAI(content);
            setExtractionResult(result);

            if (result.success && result.data) {
                setState('success');
                onExtracted(result.data, result.confidence);
            } else {
                setState('error');
                setErrorMessage(result.error || 'Failed to extract financial data');
                onError?.(result.error || 'Extraction failed');
            }
        } catch (error) {
            setState('error');
            const msg = error instanceof Error ? error.message : 'Unknown error';
            setErrorMessage(msg);
            onError?.(msg);
        }
    }, [pasteText, onExtracted, onError]);

    // Drag and drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setState('dragover');
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
            setState('idle');
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    }, [handleFile]);

    // Reset state
    const handleReset = useCallback(() => {
        setState('idle');
        setParsedContent(null);
        setExtractionResult(null);
        setErrorMessage('');
        setFileName('');
        setPasteText('');
        setShowPasteInput(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    // Get icon for file type
    const getIcon = (type: SupportedFileType) => {
        switch (type) {
            case 'csv':
            case 'excel':
                return FileSpreadsheet;
            case 'json':
                return FileJson;
            case 'text':
            case 'pdf':
                return FileText;
            default:
                return File;
        }
    };

    return (
        <div className="w-full">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.json,.txt,.pdf"
                className="hidden"
                onChange={handleFileInput}
            />

            <AnimatePresence mode="wait">
                {/* Idle / Drag Over State */}
                {(state === 'idle' || state === 'dragover') && !showPasteInput && (
                    <motion.div
                        key="dropzone"
                        ref={dropZoneRef}
                        className={`relative rounded-3xl border-2 border-dashed transition-all duration-300 overflow-hidden ${state === 'dragover'
                                ? 'border-cyan-electric bg-cyan-electric/10 scale-[1.02]'
                                : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                            }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        whileHover={{ scale: 1.01 }}
                    >
                        {/* Animated background gradient */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-br from-cyan-electric/5 via-transparent to-violet-vivid/5"
                            animate={{
                                opacity: state === 'dragover' ? 0.8 : 0.3,
                            }}
                        />

                        {/* Content */}
                        <div className="relative p-12 text-center cursor-pointer">
                            {/* Icon */}
                            <motion.div
                                className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-electric/20 to-violet-vivid/20 flex items-center justify-center mb-6"
                                animate={{
                                    scale: state === 'dragover' ? 1.1 : 1,
                                    rotate: state === 'dragover' ? 5 : 0,
                                }}
                            >
                                <Upload className={`w-10 h-10 ${state === 'dragover' ? 'text-cyan-electric' : 'text-gray-400'}`} />
                            </motion.div>

                            {/* Main text */}
                            <h3 className="text-xl font-semibold text-white mb-2">
                                {state === 'dragover' ? 'Drop it like it\'s hot! 🔥' : 'Upload Your Financial Data'}
                            </h3>
                            <p className="text-gray-400 mb-6">
                                Drag & drop any file or click to browse
                            </p>

                            {/* Supported formats */}
                            <div className="flex justify-center gap-3 mb-6">
                                {FILE_TYPES.map((type) => (
                                    <motion.div
                                        key={type.ext}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${type.bg}`}
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        <type.icon className={`w-4 h-4 ${type.color}`} />
                                        <span className={`text-xs font-medium ${type.color}`}>{type.ext}</span>
                                    </motion.div>
                                ))}
                            </div>

                            {/* AI indicator */}
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                                <Sparkles className="w-4 h-4 text-violet-vivid" />
                                <span>AI-powered extraction • Works with any format</span>
                            </div>
                        </div>

                        {/* Glowing border on dragover */}
                        {state === 'dragover' && (
                            <motion.div
                                className="absolute inset-0 rounded-3xl pointer-events-none"
                                style={{
                                    boxShadow: '0 0 40px rgba(0, 212, 255, 0.3), inset 0 0 40px rgba(0, 212, 255, 0.1)',
                                }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            />
                        )}
                    </motion.div>
                )}

                {/* Paste Input Mode */}
                {showPasteInput && state === 'idle' && (
                    <motion.div
                        key="paste"
                        className="rounded-3xl border border-white/20 bg-white/5 p-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Clipboard className="w-5 h-5 text-cyan-electric" />
                                <span className="font-medium text-white">Paste Your Data</span>
                            </div>
                            <button
                                onClick={() => setShowPasteInput(false)}
                                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <textarea
                            value={pasteText}
                            onChange={(e) => setPasteText(e.target.value)}
                            placeholder="Paste your financial data here...

Examples:
• CSV data with headers
• JSON objects
• Plain text like: 'We have $500k in the bank, burning $50k/month, with $80k MRR growing 15% monthly'"
                            className="w-full h-48 bg-charcoal-50 border border-white/10 rounded-xl p-4 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-cyan-electric/50 resize-none font-mono"
                        />

                        <div className="flex gap-3 mt-4">
                            <motion.button
                                onClick={handlePasteSubmit}
                                disabled={!pasteText.trim()}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-cyan-electric to-cyan-glow text-charcoal disabled:opacity-50 disabled:cursor-not-allowed"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Brain className="w-5 h-5" />
                                <span>Extract with AI</span>
                            </motion.button>
                        </div>

                        <p className="text-xs text-gray-500 mt-3 text-center">
                            <Sparkles className="w-3 h-3 inline mr-1" />
                            AI will intelligently extract financial metrics from any format
                        </p>
                    </motion.div>
                )}

                {/* Processing States */}
                {(state === 'parsing' || state === 'extracting') && (
                    <motion.div
                        key="processing"
                        className="rounded-3xl border border-white/20 bg-white/5 p-12 text-center"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                    >
                        <motion.div
                            className="mx-auto w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-electric/20 to-violet-vivid/20 flex items-center justify-center mb-6 relative"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        >
                            {state === 'parsing' ? (
                                <FileSpreadsheet className="w-12 h-12 text-cyan-electric" />
                            ) : (
                                <Brain className="w-12 h-12 text-violet-vivid" />
                            )}

                            {/* Orbiting dots */}
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-3 h-3 rounded-full bg-cyan-electric"
                                    style={{
                                        top: '50%',
                                        left: '50%',
                                        marginTop: '-6px',
                                        marginLeft: '-6px',
                                    }}
                                    animate={{
                                        x: [0, 40 * Math.cos((i * 2 * Math.PI) / 3), 0],
                                        y: [0, 40 * Math.sin((i * 2 * Math.PI) / 3), 0],
                                        opacity: [0.3, 1, 0.3],
                                    }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        delay: i * 0.5,
                                        ease: 'easeInOut',
                                    }}
                                />
                            ))}
                        </motion.div>

                        <h3 className="text-xl font-semibold text-white mb-2">
                            {state === 'parsing' ? 'Parsing File...' : 'AI Extracting Financials...'}
                        </h3>
                        <p className="text-gray-400 mb-2">{fileName}</p>

                        {parsedContent && (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-sm">
                                <Check className="w-4 h-4 text-success" />
                                <span className="text-gray-300">
                                    Detected: {parsedContent.type.toUpperCase()}
                                </span>
                            </div>
                        )}

                        {state === 'extracting' && (
                            <motion.div
                                className="mt-6 flex items-center justify-center gap-2 text-violet-vivid"
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            >
                                <Sparkles className="w-4 h-4" />
                                <span className="text-sm">Runa is analyzing your data...</span>
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* Success State */}
                {state === 'success' && extractionResult?.data && (
                    <motion.div
                        key="success"
                        className="rounded-3xl border border-success/30 bg-success/5 p-8"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                    >
                        <div className="flex items-start gap-4">
                            <motion.div
                                className="w-14 h-14 rounded-2xl bg-success/20 flex items-center justify-center flex-shrink-0"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', bounce: 0.5 }}
                            >
                                <Check className="w-8 h-8 text-success" />
                            </motion.div>

                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-white mb-1">
                                    Data Extracted Successfully!
                                </h3>
                                <p className="text-gray-400 text-sm mb-4">
                                    Confidence: {Math.round(extractionResult.confidence * 100)}%
                                </p>

                                {/* Quick preview of extracted data */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                    {extractionResult.data.cashOnHand > 0 && (
                                        <div className="bg-white/5 rounded-xl p-3">
                                            <p className="text-xs text-gray-400">Cash</p>
                                            <p className="text-lg font-bold text-cyan-electric">
                                                ${(extractionResult.data.cashOnHand / 1000).toFixed(0)}k
                                            </p>
                                        </div>
                                    )}
                                    {extractionResult.data.monthlyRevenue > 0 && (
                                        <div className="bg-white/5 rounded-xl p-3">
                                            <p className="text-xs text-gray-400">MRR</p>
                                            <p className="text-lg font-bold text-success">
                                                ${(extractionResult.data.monthlyRevenue / 1000).toFixed(0)}k
                                            </p>
                                        </div>
                                    )}
                                    {extractionResult.data.monthlyBurn > 0 && (
                                        <div className="bg-white/5 rounded-xl p-3">
                                            <p className="text-xs text-gray-400">Burn</p>
                                            <p className="text-lg font-bold text-warning">
                                                ${(extractionResult.data.monthlyBurn / 1000).toFixed(0)}k
                                            </p>
                                        </div>
                                    )}
                                    {(extractionResult.data.runway ?? 0) > 0 && (
                                        <div className="bg-white/5 rounded-xl p-3">
                                            <p className="text-xs text-gray-400">Runway</p>
                                            <p className="text-lg font-bold text-violet-vivid">
                                                {extractionResult.data.runway?.toFixed(1)} mo
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={handleReset}
                                    className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                                >
                                    <X className="w-4 h-4" />
                                    Upload different file
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Error State */}
                {state === 'error' && (
                    <motion.div
                        key="error"
                        className="rounded-3xl border border-danger/30 bg-danger/5 p-8"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-danger/20 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-8 h-8 text-danger" />
                            </div>

                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-white mb-1">
                                    Extraction Failed
                                </h3>
                                <p className="text-gray-400 text-sm mb-4">{errorMessage}</p>

                                <div className="flex gap-3">
                                    <motion.button
                                        onClick={handleReset}
                                        className="px-4 py-2 rounded-xl font-medium bg-white/10 text-white hover:bg-white/20 transition-colors"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Try Again
                                    </motion.button>
                                    <motion.button
                                        onClick={() => {
                                            handleReset();
                                            setShowPasteInput(true);
                                        }}
                                        className="px-4 py-2 rounded-xl font-medium bg-cyan-electric/20 text-cyan-electric hover:bg-cyan-electric/30 transition-colors"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Paste Data Instead
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle paste input button (only in idle state) */}
            {state === 'idle' && !showPasteInput && (
                <motion.button
                    onClick={() => setShowPasteInput(true)}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ scale: 1.01 }}
                >
                    <Clipboard className="w-4 h-4" />
                    <span>Or paste data directly</span>
                </motion.button>
            )}
        </div>
    );
}
