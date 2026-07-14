@echo off
REM Starts both the backend (FastAPI/uvicorn) and frontend (Next.js) dev
REM servers, each in its own console window.
REM   Backend:  http://localhost:8000  (docs at /docs)
REM   Frontend: http://localhost:3000

cd /d "%~dp0"

echo Launching backend and frontend in separate windows...
start "Career Advancement - Backend"  cmd /k call "%~dp0backend\run-backend.bat"
start "Career Advancement - Frontend" cmd /k call "%~dp0run-frontend.bat"

echo.
echo Backend:  http://localhost:8000/docs
echo Frontend: http://localhost:3000
echo (Close each window, or press Ctrl+C inside it, to stop that server.)
