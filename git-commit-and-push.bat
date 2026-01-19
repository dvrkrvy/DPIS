@echo off
echo ========================================
echo Git Commit and Push
echo ========================================
echo.

cd /d "%~dp0"

echo Current status:
git status --short
echo.

set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg=Update project files

echo.
echo Adding all changes...
git add .

echo Committing changes...
git commit -m "%commit_msg%"

echo.
echo Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo Done! Changes pushed to GitHub
echo ========================================
pause
