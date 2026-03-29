@echo off
echo ==========================================
echo    AI News OS — Starting All Services
echo ==========================================

echo.
echo [1/2] Starting Backend API (Port 8005)...
cd backend
start cmd /k "call venv\Scripts\activate.bat && python -m uvicorn app.main:app --port 8005 --reload"
cd ..

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend Dev Server (Port 5173)...
cd frontend
start cmd /k "npm run dev"
cd ..

echo.
echo ==========================================
echo   Both servers starting in new windows!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8005
echo ==========================================
echo.
echo Press any key to close this launcher...
pause >nul
