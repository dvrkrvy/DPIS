@echo off
echo ========================================
echo Setting Up Personalized Resources
echo ========================================
echo.

echo [1/2] Running database migration...
cd backend
node scripts/migrate-resources-personalization.js
if %errorlevel% neq 0 (
    echo ERROR: Migration failed
    pause
    exit /b 1
)

echo.
echo [2/2] Seeding personalized resources...
node scripts/seed-personalized-resources.js
if %errorlevel% neq 0 (
    echo ERROR: Seeding failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ Setup Complete!
echo ========================================
echo.
echo Personalized resources are now configured.
echo Restart your backend server to see the changes.
echo.
pause
