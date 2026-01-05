@echo off
echo Starting DPIS Backend Server...
echo.
cd /d %~dp0backend
echo Current directory: %CD%
echo.
echo Checking .env file...
if not exist .env (
    echo ERROR: .env file not found!
    echo Creating .env file...
    (
        echo PORT=5000
        echo NODE_ENV=development
        echo POSTGRES_HOST=localhost
        echo POSTGRES_PORT=5432
        echo POSTGRES_DB=dpis_db
        echo POSTGRES_USER=postgres
        echo POSTGRES_PASSWORD=postgres
        echo MONGODB_URI=mongodb://localhost:27017/dpis_forum
        echo JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars-12345
        echo JWT_EXPIRES_IN=7d
        echo FRONTEND_URL=http://localhost:3000
    ) > .env
    echo .env file created.
)
echo.
echo Starting server...
echo.
node server.js
pause
