# DPIS Deployment Guide

This guide will help you deploy DPIS to Render (backend) and GitHub Pages (frontend).

## Prerequisites

- GitHub account
- Render account (free tier works)
- PostgreSQL database (Render provides this)
- MongoDB (optional, for forum features - can use MongoDB Atlas free tier)

## Backend Deployment on Render

### 1. Connect Repository

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `dvrkrvy/DPIS`
4. Select the repository and configure:
   - **Name**: `dpis-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 2. Set Environment Variables

In Render dashboard, go to your service → Environment tab, add:

```
DATABASE_URL=postgresql://dpis_db_user:Afc4Yf0FdLwHD00bOvmC2UfiIcodwU2N@dpg-d5e4roumcj7s73cnqra0-a/dpis_db
FRONTEND_URL=https://dvrkrvy.github.io
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string
JWT_EXPIRES_IN=7d
MONGODB_URI=mongodb+srv://your-mongodb-connection-string (optional)
OPENAI_API_KEY=your-openai-key (optional)
NODE_ENV=production
```

**Important**: 
- Replace `JWT_SECRET` with a strong random string (at least 32 characters)
- Generate one using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 3. Initialize Database

After deploying, you need to initialize the database tables. You can do this by:

**Option A: Using Render Shell**
1. Go to your service → Shell tab
2. Run: `npm run init-db`

**Option B: Using local connection**
1. Install PostgreSQL client locally
2. Connect to your Render database using the DATABASE_URL
3. Run the SQL from `backend/config/init.sql`

**Option C: Using a one-time script**
Create a temporary script that runs on first deploy (not recommended for production)

### 4. Verify Deployment

- Check health endpoint: `https://dpis-backend.onrender.com/health`
- Should return: `{"status":"ok","timestamp":"..."}`

## Frontend Deployment on GitHub Pages

### 1. Configure GitHub Pages

1. Go to your GitHub repository: `https://github.com/dvrkrvy/DPIS`
2. Settings → Pages
3. Source: Deploy from a branch
4. Branch: `gh-pages` (created automatically by gh-pages)
5. Folder: `/ (root)`

### 2. Deploy Frontend

From your local machine:

```bash
cd frontend
npm install
npm run deploy
```

This will:
- Build the React app
- Deploy to `gh-pages` branch
- Make it available at `https://dvrkrvy.github.io/DPIS`

### 3. Update API URL (if needed)

If your backend URL changes, update `frontend/.env`:

```
REACT_APP_API_BASE_URL=https://dpis-backend.onrender.com
```

Then rebuild and redeploy:
```bash
npm run deploy
```

## Testing the Deployment

### Test Registration

1. Visit: `https://dvrkrvy.github.io/DPIS`
2. Click "Create Anonymous Account"
3. Should redirect to screening page

### Test Login

1. After registration, note your Anonymous ID (shown in browser console or localStorage)
2. Logout and login again with that ID
3. Should work successfully

### Test Admin Login

1. Visit: `https://dvrkrvy.github.io/DPIS/admin/login`
2. Use credentials:
   - Email: `admin@dpis.edu`
   - Password: `admin123`
3. Should redirect to admin dashboard

**⚠️ IMPORTANT**: Change the default admin password in production!

## Troubleshooting

### Backend Issues

**Database Connection Errors**
- Verify `DATABASE_URL` is correct in Render environment variables
- Check database is accessible (not paused on free tier)
- Run `npm run init-db` to ensure tables exist

**JWT Errors**
- Ensure `JWT_SECRET` is set in Render environment variables
- Must be the same value across all instances (if scaling)

**CORS Errors**
- Verify `FRONTEND_URL` is set to `https://dvrkrvy.github.io` (no trailing slash)
- Check backend logs for CORS errors

### Frontend Issues

**API Connection Errors**
- Verify `REACT_APP_API_BASE_URL` in `frontend/.env` matches your Render backend URL
- Check browser console for CORS or network errors
- Ensure backend is running and accessible

**404 Errors on Refresh**
- This is normal with HashRouter - routes should work
- If using BrowserRouter, configure GitHub Pages redirects

**Build Errors**
- Clear `node_modules` and `build` folder
- Run `npm install` again
- Check Node.js version (18+ recommended)

## Environment Variables Summary

### Backend (Render)
```
DATABASE_URL          # PostgreSQL connection string
FRONTEND_URL          # GitHub Pages URL (for CORS)
JWT_SECRET            # Secret key for JWT tokens
JWT_EXPIRES_IN        # Token expiration (default: 7d)
MONGODB_URI           # MongoDB connection (optional)
OPENAI_API_KEY        # OpenAI API key (optional)
NODE_ENV              # production
PORT                  # Auto-set by Render
```

### Frontend (GitHub Pages)
```
REACT_APP_API_BASE_URL  # Backend API URL
```

## Security Checklist

- [ ] Changed default admin password
- [ ] Set strong `JWT_SECRET` (32+ characters)
- [ ] Enabled HTTPS (automatic on Render and GitHub Pages)
- [ ] Reviewed CORS settings
- [ ] Database credentials are secure
- [ ] No sensitive data in code repository
- [ ] Rate limiting is enabled (default: 100 requests/15min)

## Support

For issues:
1. Check Render logs: Dashboard → Your Service → Logs
2. Check browser console for frontend errors
3. Verify all environment variables are set correctly
4. Ensure database is initialized with `npm run init-db`
