@echo off
echo ========================================
echo Starting DPIS - All Services
echo ========================================
echo.

echo [1/2] Starting backend server...
start "DPIS Backend" /min cmd /k "cd /d %~dp0backend && npm run dev"

echo [2/2] Starting frontend server...
start "DPIS Frontend" /min cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo ========================================
echo Services Starting!
echo ========================================
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Waiting 20 seconds for services to start...
timeout /t 20 /nobreak > nul

echo.
echo Opening browser...
start http://localhost:3000

echo.
echo Services are running in minimized windows.
echo Check those windows for any errors.
echo.
echo If frontend shows "Compiled successfully!", you're ready!
echo.
pause
