@echo off
echo ========================================
echo Setting up DPIS Database
echo ========================================
echo.

REM Find PostgreSQL installation
set PG_PATH=
if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" set PG_PATH=C:\Program Files\PostgreSQL\16\bin
if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" set PG_PATH=C:\Program Files\PostgreSQL\15\bin
if exist "C:\Program Files\PostgreSQL\14\bin\psql.exe" set PG_PATH=C:\Program Files\PostgreSQL\14\bin
if exist "C:\Program Files (x86)\PostgreSQL\16\bin\psql.exe" set PG_PATH=C:\Program Files (x86)\PostgreSQL\16\bin

if "%PG_PATH%"=="" (
    echo ERROR: PostgreSQL not found in standard locations!
    echo.
    echo Please provide the PostgreSQL bin directory path:
    echo (e.g., C:\Program Files\PostgreSQL\16\bin)
    set /p PG_PATH="Path: "
)

if not exist "%PG_PATH%\psql.exe" (
    echo ERROR: psql.exe not found at: %PG_PATH%
    pause
    exit /b 1
)

echo Using PostgreSQL at: %PG_PATH%
echo.

echo [1/3] Creating database...
set PGPASSWORD=postgres
"%PG_PATH%\psql.exe" -U postgres -c "CREATE DATABASE dpis_db;" 2>nul
if %errorlevel% neq 0 (
    echo Database might already exist, continuing...
)

echo [2/3] Initializing database schema...
"%PG_PATH%\psql.exe" -U postgres -d dpis_db -f "%~dp0backend\config\init.sql"
if %errorlevel% neq 0 (
    echo ERROR: Database initialization failed!
    echo Please check the error messages above.
    pause
    exit /b 1
)

echo [3/3] Verifying tables...
"%PG_PATH%\psql.exe" -U postgres -d dpis_db -c "\dt"

echo.
echo ========================================
echo Database Setup Complete!
echo ========================================
echo.
echo Database: dpis_db
echo User: postgres
echo.
echo You can now start the backend server!
echo.
pause
