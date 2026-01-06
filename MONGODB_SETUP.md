# MongoDB Setup Guide for DPIS Forum

The forum feature requires MongoDB to store posts and replies. This guide will help you set up MongoDB Atlas (free tier) and connect it to your Render backend.

## Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up for a free account (no credit card required for free tier)
3. Verify your email address

## Step 2: Create a Cluster

1. After logging in, click **"Build a Database"**
2. Choose **"M0 FREE"** (Free Shared Cluster)
3. Select a cloud provider and region (choose one close to your Render region)
4. Click **"Create"** (takes 1-3 minutes)

## Step 3: Create Database User

1. Go to **Database Access** (left sidebar)
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Enter:
   - **Username**: `dpis_user` (or any username you prefer)
   - **Password**: Generate a strong password (click "Autogenerate Secure Password" and **SAVE IT**)
5. Set **Database User Privileges** to **"Read and write to any database"**
6. Click **"Add User"**

## Step 4: Whitelist IP Addresses

1. Go to **Network Access** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (for Render)
   - This adds `0.0.0.0/0` to allow connections from anywhere
   - **Note**: For production, you might want to restrict this, but for now this works
4. Click **"Confirm"**

## Step 5: Get Connection String

1. Go to **Database** (left sidebar)
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Select **"Node.js"** and version **"5.5 or later"**
5. Copy the connection string - it looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## Step 6: Update Connection String

Replace the placeholders in the connection string:

1. Replace `<username>` with your database username (e.g., `dpis_user`)
2. Replace `<password>` with your database password (the one you saved)
3. Add database name at the end: `...mongodb.net/dpis_forum?retryWrites=true&w=majority`

**Final connection string should look like:**
```
mongodb+srv://dpis_user:YourPassword123@cluster0.xxxxx.mongodb.net/dpis_forum?retryWrites=true&w=majority
```

## Step 7: Add to Render Environment Variables

1. Go to your **Render Dashboard** → Your Backend Service
2. Go to **Environment** tab
3. Add new environment variable:
   - **Key**: `MONGODB_URI`
   - **Value**: Your complete connection string from Step 6
4. Click **"Save Changes"**
5. Render will automatically redeploy

## Step 8: Verify Connection

After Render redeploys:

1. Check Render logs (Dashboard → Your Service → Logs)
2. You should see: `✅ MongoDB connected successfully`
3. If you see errors, check:
   - Username and password are correct
   - IP whitelist includes `0.0.0.0/0`
   - Connection string format is correct

## Troubleshooting

### "Authentication failed"
- Check username and password in connection string
- Make sure special characters in password are URL-encoded (e.g., `@` becomes `%40`)

### "getaddrinfo ENOTFOUND"
- Check connection string format
- Make sure you're using `mongodb+srv://` for Atlas clusters

### "IP not whitelisted"
- Go to Network Access in Atlas
- Add `0.0.0.0/0` to allow all IPs (or your Render service IP)

### "Connection timeout"
- Check if cluster is running (should show "Active" in Atlas)
- Verify network access settings
- Try increasing timeout in `backend/config/mongodb.js`

## Testing Forum After Setup

1. Visit: `https://dvrkrvy.github.io/DPIS/forum`
2. Try creating a post
3. Check browser console for any errors
4. Check Render logs for MongoDB connection status

## Alternative: Local MongoDB (Development Only)

For local development, you can use:
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:7

# Then set in .env:
MONGODB_URI=mongodb://localhost:27017/dpis_forum
```

**Note**: This won't work on Render - you need MongoDB Atlas for production.

## Security Notes

- **Never commit** your MongoDB connection string to Git
- Use environment variables only
- For production, consider restricting IP whitelist to Render IPs only
- Regularly rotate database passwords
