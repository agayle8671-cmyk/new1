# Railway Quick Start Guide

## 🚀 Deploy in 5 Minutes

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### Step 2: Initialize & Deploy
```bash
# In your project directory
railway init
railway link

# Set your API key
railway variables set GOOGLE_AI_KEY=your_api_key_here

# Deploy!
railway up
```

### Step 3: Get Your URL
```bash
railway domain
```

That's it! Your app is live. 🎉

## 📋 What Was Created

- ✅ `server.js` - Express server with `/api/chat` endpoint
- ✅ `railway.json` - Railway configuration
- ✅ `.railwayignore` - Files to exclude from deployment
- ✅ Updated `package.json` with Express and start script

## 🔧 Environment Variables

Set these in Railway:

```bash
railway variables set GOOGLE_AI_KEY=your_key
railway variables set VITE_SUPABASE_URL=your_url
railway variables set VITE_SUPABASE_ANON_KEY=your_key
```

Or use the dashboard:
```bash
railway open
# Go to Variables tab
```

## 🧪 Test Your Deployment

### Health Check
```bash
curl https://your-app.railway.app/api/health
```

### Test API Key
```bash
curl https://your-app.railway.app/api/test
```

### Test Chat
```bash
curl -X POST https://your-app.railway.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hi"}'
```

## 📊 Useful Commands

```bash
railway logs          # View logs
railway open          # Open dashboard
railway variables     # List variables
railway up            # Deploy
railway domain        # Get URL
```

## ⚠️ Important Notes

1. **Build Process**: Railway runs `npm run build` then `npm start`
2. **Port**: Express listens on `process.env.PORT` (Railway sets this automatically)
3. **Static Files**: Express serves your Vite build from `dist/` folder
4. **API Routes**: All `/api/*` routes are handled by Express
5. **SPA Routing**: All other routes serve `index.html` for React Router

## 🐛 Troubleshooting

**Build fails?**
```bash
railway logs
```

**API not working?**
1. Check `/api/test` to verify API key
2. Check `/api/health` to verify server is running
3. Check `railway logs` for errors

**Frontend not loading?**
1. Verify `npm run build` completes successfully
2. Check that `dist/` folder exists
3. Check Railway logs for build errors

## 📚 Full Documentation

See `RAILWAY_MIGRATION.md` for complete details.



