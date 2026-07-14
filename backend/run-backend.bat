@echo off
REM Starts the FastAPI backend (uvicorn, auto-reload) on http://localhost:8000
REM Uses .venv if present, otherwise falls back to the system "python".

cd /d "%~dp0"

if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
)

echo Starting backend on http://localhost:8000  (docs at /docs)
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
