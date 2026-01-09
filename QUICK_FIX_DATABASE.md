# Quick Fix: Update Database on Render

You have **2 easy options** to fix YouTube embeds in your Render database:

## ✅ Option 1: Use Admin API (EASIEST - No DATABASE_URL needed!)

This works directly with your Render backend - no need to set DATABASE_URL!

### Steps:

1. **Go to your website** and login as admin
2. **Open browser console** (F12)
3. **Paste this code** (replace `your-backend-url` with your actual Render backend URL):

```javascript
// Replace this with your actual Render backend URL
const backendUrl = 'https://your-backend.onrender.com';  // ← CHANGE THIS!

fetch(`${backendUrl}/api/admin/fix-youtube-embeds`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  console.log('✅ Success!');
  console.log(`Updated ${data.summary.updated} resources`);
  console.log('Full response:', data);
})
.catch(err => {
  console.error('❌ Error:', err);
  alert('Error: ' + err.message);
});
```

4. **Press Enter** - it will update all YouTube videos!

---

## ✅ Option 2: Run Script Locally (Need DATABASE_URL)

### Step 1: Get Your Database URL from Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your **PostgreSQL database** (not the web service)
3. Go to **"Info"** tab
4. Look for **"Internal Database URL"** or **"Connection String"**
5. Copy the full URL - it should look like:
   ```
   postgresql://user:password@host:port/database
   ```

### Step 2: Run the Script

**In PowerShell:**
```powershell
cd "C:\Users\chita\OneDrive\Desktop\Quasar 2.0\backend"

# Replace with YOUR actual database URL from Render
$env:DATABASE_URL="postgresql://dpis_db_user:Afc4Yf0FdLwHD00bOvmC2UfiIcodwU2N@dpg-d5e4roumcj7s73cnqra0-a.oregon-postgres.render.com/dpis_db"

node scripts/fix-youtube-embeds.js
```

**Or create a `.env` file in the `backend` folder:**
```
DATABASE_URL=postgresql://dpis_db_user:Afc4Yf0FdLwHD00bOvmC2UfiIcodwU2N@dpg-d5e4roumcj7s73cnqra0-a.oregon-postgres.render.com/dpis_db
```

Then run:
```bash
cd backend
node scripts/fix-youtube-embeds.js
```

---

## 🔍 How to Find Your Database URL in Render

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click on your PostgreSQL database** (usually named something like `dpis-db` or `dpis_db`)
3. **Go to "Info" tab**
4. **Look for one of these:**
   - "Internal Database URL" (for use within Render)
   - "External Connection String" (for use from your computer)
   - "Connection String" (general)

5. **Copy the entire string** - it should start with `postgresql://`

**Important:** Make sure the URL includes:
- ✅ The full hostname (e.g., `dpg-xxxxx-a.oregon-postgres.render.com`)
- ✅ The port (usually `5432` or included in the URL)
- ✅ The database name at the end

---

## ⚠️ Common Issues

### "ENOTFOUND" Error
- You're using a placeholder URL instead of the real one
- Get the actual URL from Render Dashboard → Your Database → Info tab

### "Connection timeout"
- Your database might be paused (free tier pauses after inactivity)
- Go to Render Dashboard → Your Database → Resume it

### "SSL required"
- Make sure you're using the full connection string from Render
- The script handles SSL automatically

---

## 🎯 Recommended: Use Option 1 (Admin API)

**Why?**
- ✅ No need to find DATABASE_URL
- ✅ Works immediately
- ✅ Uses your existing Render connection
- ✅ Can run from anywhere (browser, Postman, etc.)

Just login as admin and run the JavaScript code in your browser console!
