# How to Update Database on Render

This guide shows you how to update your Render database, specifically for fixing YouTube embed links.

## Option 1: Run Script Locally (Easiest) ⭐ Recommended

You can run the fix script from your local machine - it will connect to your Render database.

### Step 1: Get Your Database URL

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your **PostgreSQL database** (not the web service)
3. Go to **"Info"** tab
4. Copy the **"Internal Database URL"** or **"External Connection String"**

It should look like:
```
postgresql://user:password@host:port/database
```

### Step 2: Run the Script

**Windows PowerShell:**
```powershell
cd "C:\Users\chita\OneDrive\Desktop\Quasar 2.0\backend"
$env:DATABASE_URL="postgresql://your-database-url-here"
node scripts/fix-youtube-embeds.js
```

**Windows CMD:**
```cmd
cd "C:\Users\chita\OneDrive\Desktop\Quasar 2.0\backend"
set DATABASE_URL=postgresql://your-database-url-here
node scripts/fix-youtube-embeds.js
```

**Or create a `.env` file in the `backend` folder:**
```
DATABASE_URL=postgresql://your-database-url-here
```

Then run:
```bash
cd backend
node scripts/fix-youtube-embeds.js
```

### Step 3: Verify

The script will show you:
- How many resources were found
- How many were updated
- Any errors

---

## Option 2: Use Render Shell

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your **backend web service** (not the database)
3. Go to **"Shell"** tab
4. Run:
   ```bash
   cd backend
   node scripts/fix-youtube-embeds.js
   ```

**Note:** The `DATABASE_URL` environment variable is already set in Render, so the script will automatically use it.

---

## Option 3: Use Admin API Endpoint (Most Secure) 🔒 ⭐ NEW!

I've created an admin API endpoint that you can call to update the database. This is the most secure option and works directly with your Render backend.

### Step 1: Get Admin Token

1. Login to your admin account on your website
2. Open browser console (F12)
3. Run: `localStorage.getItem('token')`
4. Copy the token

### Step 2: Call the API

**Using browser console (Easiest):**
```javascript
// Replace with your actual Render backend URL
const backendUrl = 'https://your-backend.onrender.com';

fetch(`${backendUrl}/api/admin/fix-youtube-embeds`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  console.log('✅ Success!', data);
  console.log(`Updated ${data.summary.updated} resources`);
})
.catch(err => console.error('❌ Error:', err));
```

**Using PowerShell:**
```powershell
$token = "your-admin-token-here"
$backendUrl = "https://your-backend.onrender.com"  # Replace with your Render backend URL

Invoke-RestMethod -Uri "$backendUrl/api/admin/fix-youtube-embeds" `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer $token" } `
  -ContentType "application/json"
```

**Using Postman:**
1. Create a POST request to: `https://your-backend.onrender.com/api/admin/fix-youtube-embeds`
2. Add header: `Authorization: Bearer your-admin-token`
3. Send request

**Response will look like:**
```json
{
  "success": true,
  "message": "YouTube embeds fixed successfully",
  "summary": {
    "totalFound": 150,
    "updated": 145,
    "errors": 0,
    "totalWithEmbedUrls": 150
  },
  "updates": [...],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Option 4: Add to package.json Scripts

You can add a script to make it easier to run:

1. Edit `backend/package.json`
2. Add to `scripts` section:
   ```json
   "fix-embeds": "node scripts/fix-youtube-embeds.js"
   ```

3. Then run:
   ```bash
   cd backend
   npm run fix-embeds
   ```

(You'll still need to set `DATABASE_URL` environment variable)

---

## Troubleshooting

### "Connection refused" or "Connection timeout"

- Check that your database URL is correct
- Make sure you're using the **External Connection String** (not Internal)
- Verify your database is not paused (free tier databases pause after inactivity)

### "SSL connection required"

- The script already handles SSL, but if you get this error, make sure you're using the full connection string from Render

### "Table does not exist"

- Your database might not be initialized
- Run the initialization script first:
  ```bash
  node init-render-db.js
  ```

### "Permission denied"

- Make sure you're using the correct database user credentials
- Check that the user has UPDATE permissions on the `resources` table

---

## What the Script Does

1. ✅ Connects to your Render database
2. ✅ Finds all video/audio resources with YouTube URLs
3. ✅ Replaces non-embeddable videos with verified embeddable alternatives
4. ✅ Ensures all URLs are in proper embed format (`youtube.com/embed/VIDEO_ID`)
5. ✅ Shows a summary of what was updated

---

## Recommended Approach

**For one-time fixes:** Use **Option 1** (Run locally) - it's the easiest and you can see the output immediately.

**For regular updates:** Use **Option 3** (Admin API) - it's more secure and can be automated.

**For quick fixes:** Use **Option 2** (Render Shell) - if you're already in the Render dashboard.
