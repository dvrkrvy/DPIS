# Quick Start Guide

## ⚠️ Important: Database Setup Required

Before the servers can run properly, you need to set up the databases:

### Option 1: Using Docker (Recommended - Easiest)

1. **Start databases only:**
   ```bash
   docker-compose up -d postgres mongodb
   ```

2. **Wait for databases to be ready (about 10-15 seconds)**

3. **Initialize PostgreSQL database:**
   ```bash
   docker-compose exec postgres psql -U postgres -d dpis_db -f /docker-entrypoint-initdb.d/init.sql
   ```

4. **Start the application servers:**
   - Backend: `cd backend && npm run dev`
   - Frontend: `cd frontend && npm start`

### Option 2: Local Database Setup

1. **Install and start PostgreSQL:**
   - Install PostgreSQL if not installed
   - Create database: `createdb dpis_db`
   - Run init script: `psql -d dpis_db -f backend/config/init.sql`

2. **Install and start MongoDB:**
   - Install MongoDB if not installed
   - Start MongoDB service: `mongod` (or use service manager)

3. **Update .env file:**
   - Edit `backend/.env` with your database credentials

4. **Start servers:**
   - Backend: `cd backend && npm run dev`
   - Frontend: `cd frontend && npm start`

## Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## Default Admin Credentials

- Email: `admin@dpis.edu`
- Password: `admin123`
- ⚠️ **Change this in production!**

## Troubleshooting

### Backend won't start
- Check if PostgreSQL is running: `pg_isready` or check service status
- Check if MongoDB is running: `mongosh` or check service status
- Verify database credentials in `backend/.env`
- Check backend console for error messages

### Frontend won't start
- Check if port 3000 is available
- Verify backend is running on port 5000
- Check frontend console for error messages

### Database connection errors
- Verify PostgreSQL is listening on port 5432
- Verify MongoDB is listening on port 27017
- Check firewall settings
- Verify credentials in `.env` file

## Current Status

The servers have been started in the background. Check the terminal output for any errors.

If you see database connection errors, follow the database setup steps above.
