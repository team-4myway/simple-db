@echo off
echo Starting Google Drive Clone Application...

:: Start Backend Server in a new window
echo Starting Backend Server on port 5000...
start "Backend Server" cmd /k "cd server && npm start"

:: Start Frontend Client in a new window
echo Starting Frontend Client on port 5173...
start "Frontend Client" cmd /k "cd client && npm run dev"

echo.
echo ====================================================
echo Application is starting!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo ====================================================
echo.
pause
