# AI Advisor Debugging Prompt - Runway DNA

## Project Context
I'm building a SaaS financial dashboard called "Runway DNA" - an AI-powered Strategic Finance Suite. The app is built with:
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Vercel Serverless Functions (Edge runtime)
- **AI**: Google Gemini API via `@google/generative-ai` SDK
- **Deployment**: Vercel
- **Environment**: Production at `new1-tawny-eta.vercel.app`

## The Problem
The AI Advisor chatbot feature is completely broken. Users cannot get AI responses - all attempts result in errors.

## Current Implementation

### Serverless Function (`api/chat.ts`)
- **Location**: Root directory `/api/chat.ts`
- **Runtime**: Edge runtime (`export const config = { runtime: 'edge' }`)
- **SDK**: `@google/generative-ai` version `^0.21.0`
- **API Key**: Stored as `GOOGLE_AI_KEY` in Vercel environment variables (server-side only)
- **Model**: Currently trying fallback chain: `gemini-1.5-flash` → `gemini-1.5-flash-latest` → `gemini-1.5-pro` → `gemini-pro`

### Frontend (`src/lib/services/AIService.ts`)
- Uses simple `fetch('/api/chat')` call
- No Google SDK imports in frontend (all server-side)
- Sends: `{ message, context, conversationHistory }`
- Expects: `{ response, text }`

## What We've Tried (All Failed)

### Attempt 1: Direct REST API
- Used REST API directly to `generativelanguage.googleapis.com/v1`
- Error: `models/gemini-1.5-flash is not found for API version v1beta`
- Tried switching to `v1` API - still failed

### Attempt 2: Google SDK with Node.js Runtime
- Used `@vercel/node` with `VercelRequest`/`VercelResponse`
- Error: Model compatibility issues
- Tried `systemInstruction` field - Error: `Unknown name "systemInstruction": Cannot find field`

### Attempt 3: Google SDK with Edge Runtime (Current)
- Switched to Edge runtime with `Request`/`Response`
- Model fallback chain implemented
- Still getting errors (exact error messages unknown, but users report failures)

## Current Error Symptoms
- Users see: "Sorry, I encountered an error: [various error messages]"
- Connection status shows "Disconnected" in UI
- No successful AI responses
- Error messages vary (suggesting different failure points)

## Environment Setup
- **Vercel Project**: `new1`
- **Environment Variable**: `GOOGLE_AI_KEY` (confirmed set in Vercel dashboard)
- **API Key Source**: Google AI Studio (https://aistudio.google.com/)
- **Key Status**: Valid (tested independently)

## Key Requirements
1. **Security**: API key must NEVER be exposed to browser/client-side
2. **Compatibility**: Must work with Vercel Edge runtime
3. **Model**: Prefer `gemini-1.5-flash` but need fallback options
4. **Persona**: Need to embed "Strategic CFO" persona in responses

## What I Need
Please provide a **working solution** that:
1. Uses Google Gemini API correctly with Vercel Edge runtime
2. Handles the model selection properly (which model names actually work?)
3. Includes proper error handling and logging
4. Maintains security (server-side API key only)
5. Works reliably in production

## Questions to Answer
1. What is the correct model name for Gemini 1.5 Flash in 2025?
2. Does Edge runtime support `@google/generative-ai` SDK properly?
3. Should we use REST API instead of SDK for Edge runtime?
4. What's the correct way to set system instructions/persona?
5. Are there any Vercel-specific configuration requirements?

## Code Structure
```
project/
├── api/
│   └── chat.ts          # Edge serverless function
├── src/
│   ├── lib/
│   │   └── services/
│   │       └── AIService.ts  # Frontend service (fetch calls)
│   └── components/
│       └── ui/
│           └── AIChat.tsx    # Chat UI component
└── package.json
```

## Additional Context
- The app works perfectly except for the AI feature
- All other features (financial calculations, charts, etc.) function correctly
- This is blocking a production launch
- Multiple attempts over several days have failed

Please provide a complete, tested solution that will actually work in production on Vercel with Edge runtime.



