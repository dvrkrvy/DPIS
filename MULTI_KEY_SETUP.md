# Multi-Key Gemini API Setup Guide

## Overview

The system now supports **3 Gemini API keys** with automatic rotation and failover. This helps:
- **Distribute load** across multiple keys
- **Avoid rate limits** by spreading requests
- **Automatic failover** when one key hits quota/errors
- **Better reliability** for production use

## How It Works

1. **Round-Robin Rotation**: Requests are distributed evenly across all active keys
2. **Automatic Failover**: If a key fails (quota/error), system automatically tries next key
3. **Smart Cooldown**: Failed keys are temporarily disabled:
   - **Quota/Rate Limit errors**: 5 minute cooldown
   - **Other errors**: 1 minute cooldown (after 3 failures)
4. **Auto-Recovery**: Keys automatically re-enable after cooldown period

## Setup Instructions (up to 10 keys)

### Step 1: Get up to 10 Gemini API Keys

1. Go to https://aistudio.google.com/apikey
2. Sign in with your Google account
3. Create up to **10 separate API keys** (minimum 1, recommended 3–10):
   - Click "Create API Key" → Create new project → Copy key 1
   - Click "Create API Key" again → Use existing project → Copy key 2
   - Repeat until you have as many keys as you need (up to 10)

**Important**: Each key should be from the same Google account but can be in different projects.

### Step 2: Add Keys to Render (Production)

1. Go to **Render Dashboard**: https://dashboard.render.com
2. Select your **backend service** (e.g., `dpis-backend`)
3. Go to **"Environment"** tab
4. Add/Edit these environment variables (as many as you have, up to 10):

   ```
   GEMINI_API_KEY=your-first-api-key-here
   GEMINI_API_KEY_2=your-second-api-key-here
   GEMINI_API_KEY_3=your-third-api-key-here
   GEMINI_API_KEY_4=your-fourth-api-key-here
   GEMINI_API_KEY_5=your-fifth-api-key-here
   GEMINI_API_KEY_6=your-sixth-api-key-here
   GEMINI_API_KEY_7=your-seventh-api-key-here
   GEMINI_API_KEY_8=your-eighth-api-key-here
   GEMINI_API_KEY_9=your-ninth-api-key-here
   GEMINI_API_KEY_10=your-tenth-api-key-here
   ```

5. **Click "Save Changes"**
6. Render will **automatically redeploy** (takes 1-2 minutes)

### Step 3: Add Keys Locally (Development)

1. Open `backend/.env` file
2. Add these lines (add as many as you have, up to 10):

   ```
   GEMINI_API_KEY=your-first-api-key-here
   GEMINI_API_KEY_2=your-second-api-key-here
   GEMINI_API_KEY_3=your-third-api-key-here
   GEMINI_API_KEY_4=your-fourth-api-key-here
   GEMINI_API_KEY_5=your-fifth-api-key-here
   GEMINI_API_KEY_6=your-sixth-api-key-here
   GEMINI_API_KEY_7=your-seventh-api-key-here
   GEMINI_API_KEY_8=your-eighth-api-key-here
   GEMINI_API_KEY_9=your-ninth-api-key-here
   GEMINI_API_KEY_10=your-tenth-api-key-here
   ```

3. **Restart your backend server**:
   ```bash
   cd backend
   npm start
   ```

### Step 4: Verify Setup

Check the backend logs. You should see:

```
🔍 Found 3 Gemini API key(s)
✅ Gemini client 1 initialized with key: AIzaSyAbaB...
✅ Gemini client 2 initialized with key: AIzaSyCdeF...
✅ Gemini client 3 initialized with key: AIzaSyGhiJ...
✅ Multi-key system ready with 3 active key(s)
```

## How It Handles Failures

### Scenario 1: Key 1 hits quota limit
- System automatically switches to Key 2
- Key 1 is disabled for 5 minutes
- After 5 minutes, Key 1 is re-enabled automatically

### Scenario 2: All keys hit quota
- System tries all keys in rotation
- If all fail, user gets helpful error message
- Keys automatically recover after cooldown

### Scenario 3: One key has auth error
- System marks that key as failed
- Switches to next available key
- Failed key is disabled for 1 minute (after 3 errors)

## Benefits

### With 1 Key (Before)
- 20 requests/day limit
- Single point of failure
- No automatic recovery

### With 3 Keys (Now)
- **60 requests/day** (3 × 20 = 60)
- **Automatic failover** if one fails
- **Better reliability** for production
- **Load distribution** across keys

## Monitoring

Check Render logs for:
- `🤖 Using Gemini key X` - Which key is being used
- `⚠️ Key X hit quota/rate limit` - Key temporarily disabled
- `✅ Key X re-enabled after cooldown` - Key recovered
- `✅ Received response from Gemini key X` - Successful requests

## Troubleshooting

### "No Gemini clients initialized"
- Check that at least `GEMINI_API_KEY` is set
- Verify keys are correct (no extra spaces)
- Check Render logs for initialization errors

### "All API keys have reached their usage limits"
- All 3 keys hit their daily quota (60 requests total)
- Wait for daily reset (24 hours)
- Or upgrade to paid tier for higher limits

### Only 1 or 2 keys working
- System will use whatever keys are available
- Missing keys are simply ignored
- Add missing keys to increase capacity

## Advanced: Using Different Numbers of Keys

The system works with **1, 2, or 3 keys**:
- **1 key**: Works normally (single key mode)
- **2 keys**: 40 requests/day capacity
- **3 keys**: 60 requests/day capacity (recommended)

You can add more keys by:
1. Adding `GEMINI_API_KEY_4`, `GEMINI_API_KEY_5`, etc. to environment
2. Updating the initialization code to include more keys

## Security Notes

⚠️ **Never commit API keys to GitHub!**
- Always use environment variables
- Keys in `.env` files are gitignored
- Render environment variables are secure

## Next Steps

1. ✅ Get 3 Gemini API keys
2. ✅ Add them to Render environment variables
3. ✅ Wait for redeploy (1-2 minutes)
4. ✅ Test AI chat - should work much better now!
5. ✅ Monitor logs to see key rotation in action
