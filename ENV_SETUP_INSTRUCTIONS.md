# Environment Variables Setup Instructions

## For Local Development

### Backend (.env file)

1. **Location**: Create or edit `backend/.env` file
2. **Add this line**:
   ```
   GEMINI_API_KEY=AIzaSyAbaBpQGI2X5bMnT2R3psfYZjCFGAF2GVA
   ```

3. **Restart your backend server**:
   ```bash
   cd backend
   # Stop the server (Ctrl+C if running)
   npm start
   # or for development:
   npm run dev
   ```

4. **Check the console** - You should see:
   - `🔍 Checking for GEMINI_API_KEY... Found`
   - `✅ Gemini AI initialized with key: AIzaSyAbaB...`

### Frontend

No environment variables needed for local development (uses default localhost:5000)

---

## For Production (Render.com)

### Backend Environment Variables

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Select your backend service** (e.g., `dpis-backend`)
3. **Go to "Environment" tab**
4. **Add/Edit these variables**:

   ```
   GEMINI_API_KEY=AIzaSyAbaBpQGI2X5bMnT2R3psfYZjCFGAF2GVA
   ```

5. **Click "Save Changes"**
6. **Render will automatically redeploy** (takes 1-2 minutes)

### Important Notes:

- **.env files are NOT deployed to Render** - you MUST add variables in the Render dashboard
- After adding the variable, check Render logs to verify it's loaded
- You should see: `✅ Gemini AI initialized` in the logs

---

## Verification Steps

### Local:
1. Start backend: `cd backend && npm start`
2. Check console for: `✅ Gemini AI initialized`
3. Test the AI chat - should get varied responses

### Production (Render):
1. Add `GEMINI_API_KEY` in Render dashboard
2. Wait for redeploy (1-2 minutes)
3. Check Render logs for: `✅ Gemini AI initialized`
4. Test the AI chat on your live site

---

## Troubleshooting

### "GEMINI_API_KEY not found"
- **Local**: Make sure `.env` file is in `backend/` directory
- **Local**: Restart the backend server after creating/editing `.env`
- **Render**: Add the variable in Render dashboard (not just .env file)

### Still getting fallback message
- Check backend console/logs for initialization messages
- Verify the API key is correct (no extra spaces)
- Make sure `@google/generative-ai` package is installed: `npm install @google/generative-ai`

### Button not showing
- Hard refresh browser (Ctrl+Shift+R)
- Check browser console for errors
- Verify you're logged in (button only shows when authenticated)
