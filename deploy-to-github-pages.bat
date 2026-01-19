@echo off
echo ========================================
echo Deploying to GitHub Pages
echo ========================================
echo.

cd /d "%~dp0"

echo Step 1: Building frontend...
cd frontend
call npm run build
if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Step 2: Deploying to GitHub Pages...
call npm run deploy
if errorlevel 1 (
    echo Deployment failed!
    pause
    exit /b 1
)

echo.
echo Step 3: Committing and pushing changes...
cd ..
git add .
git commit -m "Deploy to GitHub Pages - %date% %time%"
git push origin main

echo.
echo ========================================
echo Deployment complete!
echo Your site should be available at: https://dvrkrvy.github.io/DPIS
echo ========================================
pause
