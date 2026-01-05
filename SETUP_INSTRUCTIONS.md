# 🚀 Quick Setup Instructions

## Option 1: Install PostgreSQL Locally (Recommended)

### For Windows:

1. **Download PostgreSQL:**
   - Go to: https://www.postgresql.org/download/windows/
   - Download the installer (recommended: PostgreSQL 15 or 16)
   - Run the installer
   - During installation:
     - Remember the password you set for the `postgres` user
     - Port: 5432 (default)
     - Install pgAdmin if you want a GUI (optional)

2. **After Installation:**
   ```powershell
   # PostgreSQL should be running as a service automatically
   # Verify it's running:
   Get-Service postgresql*
   ```

3. **Create Database:**
   ```powershell
   # Open Command Prompt or PowerShell
   # Add PostgreSQL to PATH (or use full path):
   # C:\Program Files\PostgreSQL\16\bin\createdb.exe dpis_db
   
   # Or use psql:
   psql -U postgres
   # Then in psql:
   CREATE DATABASE dpis_db;
   \q
   ```

4. **Initialize Schema:**
   ```powershell
   psql -U postgres -d dpis_db -f backend\config\init.sql
   ```

5. **Update .env file:**
   Edit `backend\.env` and set:
   ```
   POSTGRES_PASSWORD=your_password_here
   ```

6. **Start Services:**
   ```powershell
   # Backend (in backend folder)
   npm run dev
   
   # Frontend (in frontend folder, new terminal)
   npm start
   ```

## Option 2: Use Docker (If You Install Docker Desktop)

1. **Install Docker Desktop:**
   - Download from: https://www.docker.com/products/docker-desktop
   - Install and restart computer
   - Start Docker Desktop

2. **Start Databases:**
   ```powershell
   docker-compose up -d postgres mongodb
   ```

3. **Initialize Database:**
   ```powershell
   docker-compose exec postgres psql -U postgres -d dpis_db -f /docker-entrypoint-initdb.d/init.sql
   ```

4. **Start Services:**
   ```powershell
   cd backend && npm run dev
   cd frontend && npm start
   ```

## Option 3: Use Online Database Services (Quickest for Testing)

### For PostgreSQL:
- Use a free service like: https://www.elephantsql.com/ or https://supabase.com/
- Get connection string
- Update `backend\.env` with the connection details

### For MongoDB:
- Use MongoDB Atlas (free): https://www.mongodb.com/cloud/atlas
- Create free cluster
- Get connection string
- Update `backend\.env` with MONGODB_URI

## Current Status

✅ **Frontend:** Running at http://localhost:3000  
⏳ **Backend:** Needs PostgreSQL to be set up  
⏳ **Databases:** Need to be installed/configured  

## Quick Test (After Setup)

1. Open http://localhost:3000
2. Click "Create Anonymous Account"
3. Should create account successfully
4. Complete screening test
5. Explore all features!

---

**Need Help?** Check the error messages in the backend terminal window for specific database connection errors.
