/**
 * Universal Financial Data Parser
 * 
 * Accepts multiple file formats and extracts financial data:
 * - CSV files
 * - Excel files (.xlsx, .xls)
 * - JSON files
 * - Plain text / natural language
 * - PDF text extraction
 */

// Note: xlsx is dynamically imported to avoid Rollup bundling issues

// Supported file types
export type SupportedFileType = 'csv' | 'excel' | 'json' | 'text' | 'pdf' | 'unknown';

export interface ParsedContent {
    type: SupportedFileType;
    rawText: string;
    structuredData?: Record<string, unknown>[];
    confidence: number;
    source: 'file' | 'paste';
}

export interface ExtractionResult {
    success: boolean;
    data?: ExtractedFinancials;
    rawResponse?: string;
    error?: string;
    confidence: number;
}

export interface ExtractedFinancials {
    cashOnHand: number;
    monthlyRevenue: number;
    monthlyBurn: number;
    revenueGrowth: number;
    expenseGrowth: number;
    revenueTrend?: { month: string; revenue: number; expenses: number }[];
    // Additional fields that might be extracted
    arr?: number;
    mrr?: number;
    runway?: number;
    headcount?: number;
    grossMargin?: number;
    nrr?: number;
    churn?: number;
    cac?: number;
    ltv?: number;
}

/**
 * Detect file type from extension or content
 */
export function detectFileType(file: File): SupportedFileType {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type;

    // Check by extension first
    if (extension === 'csv') return 'csv';
    if (extension === 'xlsx' || extension === 'xls') return 'excel';
    if (extension === 'json') return 'json';
    if (extension === 'txt' || extension === 'md') return 'text';
    if (extension === 'pdf') return 'pdf';

    // Fallback to MIME type
    if (mimeType.includes('csv') || mimeType.includes('comma-separated')) return 'csv';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'excel';
    if (mimeType.includes('json')) return 'json';
    if (mimeType.includes('text/plain')) return 'text';
    if (mimeType.includes('pdf')) return 'pdf';

    return 'unknown';
}

/**
 * Parse CSV content
 */
function parseCSV(content: string): Record<string, unknown>[] {
    const lines = content.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row: Record<string, unknown> = {};

        headers.forEach((header, index) => {
            const value = values[index];
            // Try to parse as number
            const numValue = parseFloat(value?.replace(/[$,]/g, '') || '');
            row[header] = isNaN(numValue) ? value : numValue;
        });

        data.push(row);
    }

    return data;
}

/**
 * Parse Excel content - uses dynamic import to avoid bundling issues
 */
async function parseExcel(file: File): Promise<{ rawText: string; structuredData: Record<string, unknown>[] }> {
    // Dynamic import of xlsx library
    const XLSX = await import('xlsx');

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                // Get first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

                // Also get as text for AI processing
                const textData = XLSX.utils.sheet_to_csv(worksheet);

                resolve({
                    rawText: textData,
                    structuredData: jsonData
                });
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Failed to read Excel file'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Parse JSON content
 */
function parseJSON(content: string): Record<string, unknown>[] {
    try {
        const parsed = JSON.parse(content);
        // Handle both array and object formats
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
        return [];
    }
}

/**
 * Universal file parser - routes to appropriate parser
 */
export async function parseFile(file: File): Promise<ParsedContent> {
    const fileType = detectFileType(file);

    if (fileType === 'excel') {
        const { rawText, structuredData } = await parseExcel(file);
        return {
            type: 'excel',
            rawText,
            structuredData,
            confidence: 0.9,
            source: 'file'
        };
    }

    // For text-based files, read as text
    const content = await file.text();

    switch (fileType) {
        case 'csv':
            return {
                type: 'csv',
                rawText: content,
                structuredData: parseCSV(content),
                confidence: 0.9,
                source: 'file'
            };

        case 'json':
            return {
                type: 'json',
                rawText: content,
                structuredData: parseJSON(content),
                confidence: 0.9,
                source: 'file'
            };

        case 'text':
        case 'pdf':
        case 'unknown':
        default:
            // For unstructured content, just pass raw text to AI
            return {
                type: fileType === 'unknown' ? 'text' : fileType,
                rawText: content,
                confidence: 0.6,
                source: 'file'
            };
    }
}

/**
 * Parse pasted text content
 */
export function parsePastedContent(text: string): ParsedContent {
    const trimmed = text.trim();

    // Try to detect format
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            const parsed = parseJSON(trimmed);
            return {
                type: 'json',
                rawText: trimmed,
                structuredData: parsed,
                confidence: 0.9,
                source: 'paste'
            };
        } catch {
            // Not valid JSON, treat as text
        }
    }

    // Check if it looks like CSV
    const lines = trimmed.split('\n');
    if (lines.length > 1 && lines[0].includes(',') && lines[1].includes(',')) {
        return {
            type: 'csv',
            rawText: trimmed,
            structuredData: parseCSV(trimmed),
            confidence: 0.8,
            source: 'paste'
        };
    }

    // Default to natural language text
    return {
        type: 'text',
        rawText: trimmed,
        confidence: 0.7,
        source: 'paste'
    };
}

/**
 * AI-powered financial extraction prompt
 */
export function buildExtractionPrompt(content: ParsedContent): string {
    const dataDescription = content.structuredData
        ? `Structured Data (${content.structuredData.length} rows):\n${JSON.stringify(content.structuredData.slice(0, 10), null, 2)}`
        : '';

    return `You are an expert financial data extractor. Analyze the following data and extract key SaaS/startup financial metrics.

DATA TYPE: ${content.type.toUpperCase()}
SOURCE: ${content.source}

RAW CONTENT:
${content.rawText.slice(0, 5000)}

${dataDescription}

EXTRACT THE FOLLOWING METRICS (return null if not found or cannot be calculated):

1. cashOnHand - Current cash balance in the bank (number)
2. monthlyRevenue - Monthly recurring revenue / MRR (number)
3. monthlyBurn - Monthly operating expenses / burn rate (number)
4. revenueGrowth - Month-over-month revenue growth rate (decimal, e.g., 0.15 for 15%)
5. expenseGrowth - Month-over-month expense growth rate (decimal)
6. revenueTrend - Array of monthly data if available: [{ month: "Jan", revenue: 50000, expenses: 40000 }, ...]
7. arr - Annual Recurring Revenue if available (number)
8. mrr - Monthly Recurring Revenue (number)
9. runway - Months of runway remaining (number, or calculate from cash/burn)
10. headcount - Number of employees if mentioned (number)
11. grossMargin - Gross margin percentage if available (decimal)
12. nrr - Net Revenue Retention if available (decimal)
13. churn - Monthly churn rate if available (decimal)
14. cac - Customer Acquisition Cost if available (number)
15. ltv - Customer Lifetime Value if available (number)

IMPORTANT PARSING RULES:
- Convert shorthand: "$500k" → 500000, "$2M" → 2000000, "50K" → 50000
- If only annual figures given, divide by 12 for monthly
- If revenue trend data exists with multiple months, extract it
- Calculate runway if not explicit: cashOnHand / monthlyBurn
- Calculate growth rates from trend data if available
- Be generous with interpretation - estimate from partial data

RESPOND ONLY WITH VALID JSON (no markdown, no explanation):
{
  "cashOnHand": number | null,
  "monthlyRevenue": number | null,
  "monthlyBurn": number | null,
  "revenueGrowth": number | null,
  "expenseGrowth": number | null,
  "revenueTrend": array | null,
  "arr": number | null,
  "mrr": number | null,
  "runway": number | null,
  "headcount": number | null,
  "grossMargin": number | null,
  "nrr": number | null,
  "churn": number | null,
  "cac": number | null,
  "ltv": number | null,
  "confidence": number (0-1),
  "notes": string (brief explanation of what was extracted and any assumptions made)
}`;
}

/**
 * Call AI extraction endpoint
 */
export async function extractFinancialsWithAI(content: ParsedContent): Promise<ExtractionResult> {
    const prompt = buildExtractionPrompt(content);

    // Determine API endpoint based on environment
    const apiUrl = import.meta.env.PROD
        ? '/api/extract'
        : 'http://localhost:3001/api/extract';

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, contentType: content.type }),
        });

        if (!response.ok) {
            // Fallback to chat endpoint
            const chatUrl = import.meta.env.PROD
                ? '/api/chat'
                : 'http://localhost:3001/api/chat';

            const chatResponse = await fetch(chatUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: prompt,
                    context: { extractionMode: true }
                }),
            });

            if (!chatResponse.ok) {
                throw new Error('AI extraction failed');
            }

            const chatResult = await chatResponse.json();
            return parseExtractionResponse(chatResult.response);
        }

        const result = await response.json();
        return parseExtractionResponse(result.response);

    } catch (error) {
        console.error('[Universal Parser] AI extraction error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown extraction error',
            confidence: 0
        };
    }
}

/**
 * Parse AI response into structured data
 */
function parseExtractionResponse(rawResponse: string): ExtractionResult {
    try {
        // Try to extract JSON from response
        let jsonStr = rawResponse.trim();

        // Handle markdown code blocks
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        }

        // Handle responses that start with explanatory text
        const jsonStart = jsonStr.indexOf('{');
        const jsonEnd = jsonStr.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
            jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1);
        }

        const parsed = JSON.parse(jsonStr);

        // Validate and normalize
        const data: ExtractedFinancials = {
            cashOnHand: normalizeNumber(parsed.cashOnHand) ?? 0,
            monthlyRevenue: normalizeNumber(parsed.monthlyRevenue) ?? 0,
            monthlyBurn: normalizeNumber(parsed.monthlyBurn) ?? 0,
            revenueGrowth: normalizeNumber(parsed.revenueGrowth) ?? 0,
            expenseGrowth: normalizeNumber(parsed.expenseGrowth) ?? 0,
            revenueTrend: parsed.revenueTrend,
            arr: normalizeNumber(parsed.arr),
            mrr: normalizeNumber(parsed.mrr),
            runway: normalizeNumber(parsed.runway),
            headcount: normalizeNumber(parsed.headcount),
            grossMargin: normalizeNumber(parsed.grossMargin),
            nrr: normalizeNumber(parsed.nrr),
            churn: normalizeNumber(parsed.churn),
            cac: normalizeNumber(parsed.cac),
            ltv: normalizeNumber(parsed.ltv),
        };

        // Calculate runway if not provided
        if (!data.runway && data.cashOnHand > 0 && data.monthlyBurn > 0) {
            data.runway = data.cashOnHand / data.monthlyBurn;
        }

        return {
            success: true,
            data,
            rawResponse,
            confidence: parsed.confidence ?? 0.7
        };

    } catch (error) {
        console.error('[Universal Parser] JSON parse error:', error);
        return {
            success: false,
            rawResponse,
            error: 'Failed to parse AI response',
            confidence: 0
        };
    }
}

/**
 * Normalize number values
 */
function normalizeNumber(value: unknown): number | undefined {
    if (value === null || value === undefined) return undefined;

    if (typeof value === 'number' && !isNaN(value)) {
        return value;
    }

    if (typeof value === 'string') {
        // Handle shorthand like "500k", "$2M", etc.
        const cleaned = value.toLowerCase().replace(/[$,\s]/g, '');

        let multiplier = 1;
        let numStr = cleaned;

        if (cleaned.endsWith('k')) {
            multiplier = 1000;
            numStr = cleaned.slice(0, -1);
        } else if (cleaned.endsWith('m')) {
            multiplier = 1000000;
            numStr = cleaned.slice(0, -1);
        } else if (cleaned.endsWith('b')) {
            multiplier = 1000000000;
            numStr = cleaned.slice(0, -1);
        }

        const parsed = parseFloat(numStr);
        if (!isNaN(parsed)) {
            return parsed * multiplier;
        }
    }

    return undefined;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get file type icon name
 */
export function getFileTypeIcon(type: SupportedFileType): string {
    switch (type) {
        case 'csv': return 'FileSpreadsheet';
        case 'excel': return 'FileSpreadsheet';
        case 'json': return 'FileJson';
        case 'text': return 'FileText';
        case 'pdf': return 'FileText';
        default: return 'File';
    }
}

/**
 * Get file type color
 */
export function getFileTypeColor(type: SupportedFileType): string {
    switch (type) {
        case 'csv': return 'text-success';
        case 'excel': return 'text-success';
        case 'json': return 'text-warning';
        case 'text': return 'text-cyan-electric';
        case 'pdf': return 'text-danger';
        default: return 'text-gray-400';
    }
}
