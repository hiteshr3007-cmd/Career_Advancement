@echo off
REM Starts the Next.js frontend dev server on http://localhost:3000

cd /d "%~dp0"

if not exist node_modules (
    echo node_modules not found, running npm install first...
    call npm install
)

echo Starting frontend on http://localhost:3000
call npm run dev
