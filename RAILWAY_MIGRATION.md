# Railway Migration Guide - Runway DNA

## Quick Start

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### 2. Initialize Railway Project
```bash
# In your project directory
railway init
railway link
```

### 3. Set Environment Variables
```bash
# Set your Google API key
railway variables set GOOGLE_AI_KEY=your_actual_api_key_here

# Also set your Supabase keys if needed
railway variables set VITE_SUPABASE_URL=your_supabase_url
railway variables set VITE_SUPABASE_ANON_KEY=your_supabase_key
```

**Note:** For client-side variables (VITE_*), you'll need to set them in Railway and they'll be available at build time.

### 4. Deploy
```bash
railway up
```

### 5. Get Your URL
```bash
railway domain
```

Or generate a custom domain:
```bash
railway domain create
```

## What Changed

### Server Architecture
- **Before (Vercel)**: Serverless functions in `api/` folder
- **After (Railway)**: Express server in `server.js`

### API Endpoints
- `/api/chat` - Same endpoint, now handled by Express
- `/api/test` - Debug endpoint for API key verification
- `/api/health` - Health check endpoint

### Build Process
1. Railway runs `npm install`
2. Runs `npm run build` (builds Vite app to `dist/`)
3. Runs `npm start` (starts Express server)
4. Express serves static files from `dist/` and handles API routes

## Environment Variables

### Required
- `GOOGLE_AI_KEY` - Your Google Gemini API key

### Optional (for Supabase)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

**Note:** VITE_* variables are embedded at build time. If you change them, you need to rebuild.

## Testing Locally

### Development Mode
```bash
# Terminal 1: Start Vite dev server
npm run dev

# Terminal 2: Start Express server (for API testing)
npm run build
npm start
```

### Production Mode
```bash
npm run build
npm start
```

Then visit `http://localhost:3000`

## Useful Railway Commands

```bash
# View logs
railway logs

# Open Railway dashboard
railway open

# Check environment variables
railway variables

# Redeploy
railway up

# Connect to production shell
railway shell

# Get deployment URL
railway domain
```

## Auto-Deploy from GitHub

1. Push your code to GitHub
2. In Railway dashboard, go to your project
3. Click "Connect GitHub Repo"
4. Select your repository
5. Railway will auto-deploy on every push to main

## Troubleshooting

### Issue: "Cannot find module 'express'"
**Fix:**
```bash
npm install express
git add .
git commit -m "Add express"
railway up
```

### Issue: Build fails
**Fix:** Check Railway logs:
```bash
railway logs
```

### Issue: App doesn't start
**Fix:** 
1. Verify `package.json` has `"type": "module"`
2. Check that `server.js` exists
3. Verify `npm start` script points to `node server.js`

### Issue: Frontend not loading
**Fix:**
1. Ensure `npm run build` completes successfully
2. Check that `dist/` folder exists after build
3. Verify Express is serving static files correctly

### Issue: API endpoints return 404
**Fix:**
1. Check that routes in `server.js` match your frontend calls
2. Verify Express is running (check logs)
3. Test `/api/health` endpoint first

## Differences from Vercel

| Feature | Vercel | Railway |
|---------|--------|---------|
| Runtime | Edge/Node.js serverless | Full Node.js |
| Functions | `api/` folder | Express routes |
| Config | `vercel.json` | `railway.json` |
| Build | Automatic | `npm run build` |
| Start | Automatic | `npm start` |
| Environment | Dashboard | CLI or Dashboard |

## Next Steps

1. ✅ Deploy to Railway: `railway up`
2. ✅ Test your app at the Railway URL
3. ✅ Verify API endpoints work
4. ✅ Set up custom domain (optional)
5. ✅ Enable auto-deploy from GitHub (optional)

## Support

- Railway Docs: https://docs.railway.app/
- Railway Discord: https://discord.gg/railway
- Check logs: `railway logs`



