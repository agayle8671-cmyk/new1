# Weekly Reports Setup Guide

## Overview
The weekly report feature automatically generates AI-powered financial performance reports every Monday at 9:00 AM (configurable).

## Features
- **Automated Reports**: Runs every Monday at 9:00 AM via cron job
- **AI-Powered Analysis**: Uses Gemini AI to analyze financial performance
- **Email Delivery**: Can send reports via email (requires email service setup)
- **Manual Trigger**: Can be triggered manually via API endpoint

## Setup Instructions

### 1. Enable Weekly Reports
Add to Railway environment variables:
```
ENABLE_WEEKLY_REPORTS=true
```

### 2. Configure Supabase (for fetching latest data)
Add to Railway environment variables:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Note**: Use the **service role key** (not the anon key) for server-side access to fetch snapshots.

### 3. Configure Email Recipient (Optional)
Add to Railway environment variables:
```
REPORT_EMAIL=founder@company.com
```

### 4. Set Railway Public Domain (for cron self-calling)
Add to Railway environment variables:
```
RAILWAY_PUBLIC_DOMAIN=your-app.up.railway.app
```

## Manual Testing

### Test the Report Endpoint
```bash
curl -X POST https://your-app.up.railway.app/api/weekly-report \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "cashOnHand": 1200000,
      "monthlyBurn": 60000,
      "monthlyRevenue": 85000,
      "runway": 24,
      "revenueGrowthRate": 0.15,
      "burnIncreasing": false,
      "revenueGrowthSlowing": false,
      "approachingBreakeven": false
    },
    "email": "test@example.com"
  }'
```

## Cron Schedule Configuration

The default schedule is **every Monday at 9:00 AM** (America/New_York timezone).

To change the schedule, edit `server.js`:
```javascript
// Current: Every Monday at 9 AM
cron.schedule('0 9 * * 1', generateWeeklyReport, {
  scheduled: true,
  timezone: 'America/New_York'
});

// Examples:
// Every day at 9 AM: '0 9 * * *'
// Every Friday at 5 PM: '0 17 * * 5'
// Every Monday, Wednesday, Friday at 8 AM: '0 8 * * 1,3,5'
```

Cron format: `minute hour day-of-month month day-of-week`
- `*` = every
- `1` = Monday (0 = Sunday, 6 = Saturday)
- `0 9 * * 1` = 9:00 AM every Monday

## Email Integration (TODO)

Currently, the email sending is logged but not implemented. To add email support:

### Option 1: Resend (Recommended)
1. Sign up at [resend.com](https://resend.com)
2. Get your API key
3. Install: `npm install resend`
4. Add to `server.js`:
```javascript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

// In weekly report endpoint:
await resend.emails.send({
  from: 'reports@yourdomain.com',
  to: email,
  subject: 'Weekly Financial Report - Runway DNA',
  html: `<pre>${report}</pre>`
});
```

### Option 2: SendGrid
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Get your API key
3. Install: `npm install @sendgrid/mail`
4. Add to `server.js`:
```javascript
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// In weekly report endpoint:
await sgMail.send({
  to: email,
  from: 'reports@yourdomain.com',
  subject: 'Weekly Financial Report - Runway DNA',
  text: report
});
```

## Report Content

The weekly report includes:
1. **Key Metrics Changes**: Comparison to previous week
2. **Top 3 Highlights**: Positive developments
3. **Top 3 Concerns**: Areas needing attention
4. **Runway Trajectory**: Improving/stable/declining
5. **Action Items**: Recommendations for the coming week

## Monitoring

Check Railway logs to see:
- `[Cron] Starting weekly report generation...` - Cron job started
- `[Cron] Weekly report generated successfully` - Report completed
- `[Weekly Report] Generated report: ...` - Report content preview

## Troubleshooting

### Reports not generating
1. Check `ENABLE_WEEKLY_REPORTS=true` is set
2. Verify Supabase credentials are correct
3. Check Railway logs for errors
4. Ensure at least one snapshot exists in `dna_snapshots` table

### "Supabase not configured" warning
- Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Railway variables
- Use the **service role key** (not anon key) for server-side access

### Timezone issues
- Update the timezone in the cron schedule
- Available timezones: [List of timezones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

## API Reference

### POST `/api/weekly-report`
Generate a weekly report manually.

**Request Body:**
```json
{
  "context": {
    "cashOnHand": 1200000,
    "monthlyBurn": 60000,
    "monthlyRevenue": 85000,
    "runway": 24,
    "revenueGrowthRate": 0.15,
    "churnRate": 0.05,
    "burnIncreasing": false,
    "revenueGrowthSlowing": false,
    "approachingBreakeven": false
  },
  "email": "founder@company.com" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "report": "Weekly Financial Report...",
  "timestamp": "2025-01-06T14:00:00.000Z"
}
```



