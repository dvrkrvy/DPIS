@echo off
echo ====================================
echo Starting DPIS - Mental Health Platform
echo ====================================
echo.

echo [1/4] Starting databases with Docker...
docker-compose up -d postgres mongodb
timeout /t 5 /nobreak > nul

echo [2/4] Starting backend server...
start "DPIS Backend" /min cmd /k "cd /d %~dp0backend && npm run dev"

echo [3/4] Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo [4/4] Starting frontend server...
start "DPIS Frontend" /min cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo ====================================
echo Services Starting!
echo ====================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
echo Waiting 15 seconds for services to initialize...
timeout /t 15 /nobreak > nul

echo.
echo Opening browser...
start http://localhost:3000

echo.
echo Services are running in minimized windows.
echo Check the windows for any errors.
echo.
pause
