@echo off
echo ========================================
echo DPIS - Complete Setup and Run Script
echo ========================================
echo.

echo Checking for PostgreSQL...
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo PostgreSQL NOT FOUND
    echo ========================================
    echo.
    echo You need to install PostgreSQL first!
    echo.
    echo QUICK INSTALL:
    echo 1. Download from: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
    echo 2. Install PostgreSQL 16 (use password: postgres)
    echo 3. Run this script again
    echo.
    echo OR use online database (see SETUP_INSTRUCTIONS.md)
    echo.
    pause
    exit /b 1
)

echo PostgreSQL found!
echo.

echo Creating database...
psql -U postgres -c "CREATE DATABASE dpis_db;" 2>nul
if %errorlevel% neq 0 (
    echo Database might already exist, continuing...
)

echo Initializing database schema...
psql -U postgres -d dpis_db -f "%~dp0backend\config\init.sql"
if %errorlevel% neq 0 (
    echo WARNING: Database initialization had errors
    echo You may need to run this manually
)

echo.
echo ========================================
echo Starting Services
echo ========================================
echo.

echo Starting backend...
start "DPIS Backend" /min cmd /k "cd /d %~dp0backend && npm run dev"

timeout /t 5 /nobreak > nul

echo Starting frontend...
start "DPIS Frontend" /min cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo ========================================
echo Services Starting!
echo ========================================
echo.
echo Waiting 15 seconds for services to start...
timeout /t 15 /nobreak > nul

echo.
echo Opening browser...
start http://localhost:3000

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
echo Services are running in minimized windows.
echo Check those windows for any errors.
echo.
pause
