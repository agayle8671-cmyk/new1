# AI Advisor Debugging Guide

## Quick Diagnostic Steps

### Step 1: Test API Key Access
Test if your API key is accessible in Edge runtime:

```bash
curl https://new1-tawny-eta.vercel.app/api/test
```

**Expected Response:**
```json
{
  "hasApiKey": true,
  "apiKeyLength": 39,
  "apiKeyPreview": "AIzaSyB...",
  "apiKeyStartsWith": "AIzaS",
  "environment": "edge",
  "timestamp": "2025-01-XX..."
}
```

**If `hasApiKey` is `false`:**
- Go to Vercel Dashboard → Settings → Environment Variables
- Add `GOOGLE_AI_KEY` with your key from https://aistudio.google.com/app/apikey
- **MUST REDEPLOY** after adding/updating environment variables

### Step 2: Test Chat Endpoint Directly
Test the chat API endpoint:

```bash
curl -X POST https://new1-tawny-eta.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hi"}'
```

**Expected Response:**
```json
{
  "response": "Hello! I'm the Runway DNA Strategic CFO...",
  "text": "Hello! I'm the Runway DNA Strategic CFO..."
}
```

**If it fails:**
- Check the error message in the response
- Check Vercel function logs (see Step 3)

### Step 3: Check Vercel Logs
View real-time logs from your serverless function:

```bash
vercel logs --follow
```

Then try sending a message in the UI. You'll see:
- `[Chat API]` logs showing the request flow
- Error details if something fails
- API response status

### Step 4: Browser Console
Open browser DevTools (F12) and check the Console tab:
- Look for `[AI]` prefixed logs
- These show the frontend request/response flow
- Error messages will show what went wrong

## Common Issues & Fixes

### Issue: "API key not configured"
**Fix:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `GOOGLE_AI_KEY` (exact name, case-sensitive)
3. Paste your API key from https://aistudio.google.com/app/apikey
4. Select "Production" environment
5. Click "Save"
6. **Redeploy**: Go to Deployments → Latest → ⋮ → Redeploy

### Issue: "Failed to get response from AI"
**Possible Causes:**
1. **Invalid API Key**: Test at https://aistudio.google.com/
2. **Quota Exceeded**: Check usage at Google AI Studio
3. **Model Not Available**: Check available models
4. **Network Issue**: Check Vercel function logs

**Debug Steps:**
1. Run `/api/test` to verify API key is accessible
2. Check Vercel logs for detailed error
3. Verify API key format (should start with `AIza`)

### Issue: "HTTP 404" or "Method not allowed"
**Fix:**
- Ensure `api/chat.ts` exists in root directory
- Check that file is committed and pushed to GitHub
- Verify Vercel deployment includes the file

### Issue: "CORS error"
**Fix:**
- The code already includes CORS headers
- If still seeing CORS errors, check that frontend is calling same domain
- Ensure `Access-Control-Allow-Origin: *` header is present

## Enhanced Error Messages

The updated code now provides:
- **Specific error messages** based on HTTP status codes
- **Helpful hints** for common issues
- **Detailed logging** for debugging
- **Better error display** in the UI

## Testing Checklist

- [ ] `/api/test` returns `hasApiKey: true`
- [ ] API key starts with `AIza`
- [ ] `/api/chat` responds with AI message
- [ ] Browser console shows `[AI] ✅ Success` logs
- [ ] No CORS errors in browser console
- [ ] Vercel logs show successful API calls

## Next Steps After Fixing

Once it's working:
1. Remove `/api/test` endpoint (or keep it for future debugging)
2. Monitor Vercel logs for any issues
3. Test with various prompts to ensure reliability

## Getting Help

If still having issues, provide:
1. Output from `/api/test` endpoint
2. Output from `/api/chat` curl test
3. Relevant lines from `vercel logs`
4. Browser console errors (F12 → Console)

