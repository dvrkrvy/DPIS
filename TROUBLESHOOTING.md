# Troubleshooting Guide

## Registration/Login Failed

### Issue: Backend server not responding

**Symptoms:**
- Registration/login buttons don't work
- Network errors in browser console
- Backend health check fails

**Solutions:**

1. **Check if backend is running:**
   ```powershell
   # Check if backend process is running
   Get-Process | Where-Object {$_.ProcessName -eq "node"}
   
   # Test backend health
   Invoke-WebRequest http://localhost:5000/health
   ```

2. **Backend requires .env file:**
   - Location: `backend/.env`
   - Create it with at minimum:
     ```
     PORT=5000
     JWT_SECRET=your-super-secret-jwt-key-change-in-production
     FRONTEND_URL=http://localhost:3000
     ```

3. **Database connection issues:**
   - The server will start even if PostgreSQL/MongoDB are not running
   - However, registration/login WILL fail without PostgreSQL
   - Error: "Registration failed" or database connection errors

### Quick Fix for Testing (Without Databases)

The server is now configured to start even without databases, but authentication endpoints require PostgreSQL. For testing:

**Option 1: Use Docker (Recommended)**
```powershell
docker-compose up -d postgres mongodb
```

**Option 2: Install PostgreSQL locally**
1. Install PostgreSQL
2. Create database: `createdb dpis_db`
3. Run: `psql -d dpis_db -f backend/config/init.sql`

### Common Error Messages

1. **"Registration failed"**
   - **Cause:** PostgreSQL not running or database not initialized
   - **Fix:** Start PostgreSQL and initialize database

2. **"Unable to connect to the remote server"**
   - **Cause:** Backend server not running
   - **Fix:** Start backend server: `cd backend && npm run dev`

3. **"JWT_SECRET is not defined"**
   - **Cause:** Missing .env file or JWT_SECRET not set
   - **Fix:** Create `backend/.env` with JWT_SECRET

4. **Database connection timeout**
   - **Cause:** PostgreSQL/MongoDB not running
   - **Fix:** Start database services

## Access URLs

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000/health

## Testing Authentication

Once backend is running and databases are set up:

1. **Test Registration:**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST
   ```

2. **Test Health:**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:5000/health"
   ```

## Next Steps

If registration/login is still failing:
1. Check backend console window for error messages
2. Verify PostgreSQL is running: `pg_isready` (if installed)
3. Verify .env file exists in backend folder
4. Check browser console for network errors
5. Verify frontend is connecting to correct backend URL (should be http://localhost:5000)
