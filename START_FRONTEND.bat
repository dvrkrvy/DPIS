@echo off
echo ========================================
echo Starting DPIS Frontend Server
echo ========================================
echo.
cd /d %~dp0frontend
echo Starting React development server...
echo This will take 30-60 seconds to compile.
echo.
echo Watch this window for "Compiled successfully!"
echo.
npm start
pause
