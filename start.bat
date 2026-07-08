@echo off
setlocal enabledelayedexpansion
title SH-WAF - Setup and Run
cd /d "%~dp0"

echo ============================================
echo   SH-WAF Setup ^& Launcher
echo ============================================
echo.

REM ---- Check Python ----
where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.10+ from https://www.python.org/downloads/
    echo IMPORTANT: During install, check "Add Python to PATH".
    pause
    exit /b 1
)

REM ---- Check Node/npm ----
where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js/npm is not installed or not in PATH.
    echo Please install Node.js LTS from https://nodejs.org/
    pause
    exit /b 1
)

REM ---- Setup root .env ----
if not exist ".env" (
    echo Creating .env from .env.example ...
    copy /y ".env.example" ".env" >nul
    echo [ACTION NEEDED] Please edit .env with your Supabase credentials, then re-run this script.
    notepad ".env"
    pause
    exit /b 0
)

REM ---- Setup frontend env ----
if not exist "frontend\.env.local" (
    echo Creating frontend\.env.local ...
    (
        for /f "tokens=1* delims==" %%A in ('findstr /r "^VITE_" ".env"') do echo %%A=%%B
    ) > "frontend\.env.local"
)

REM ---- Setup backend env ----
if not exist "backend\.env" (
    echo Creating backend\.env ...
    copy /y ".env" "backend\.env" >nul
)

REM ---- Backend: venv + install ----
echo.
echo ============================================
echo   Backend setup
echo ============================================
cd backend
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat
echo Installing backend dependencies (this may take a few minutes on first run)...
python -m pip install --upgrade pip >nul
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Backend dependency install failed.
    pause
    exit /b 1
)
cd ..

REM ---- Frontend: npm install ----
echo.
echo ============================================
echo   Frontend setup
echo ============================================
cd frontend
if not exist "node_modules" (
    echo Installing frontend dependencies (this may take a few minutes on first run)...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Frontend dependency install failed.
        pause
        exit /b 1
    )
) else (
    echo Frontend dependencies already installed, skipping npm install.
)
cd ..

REM ---- Launch backend in new window ----
echo.
echo ============================================
echo   Starting servers
echo ============================================
start "SH-WAF Backend" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"

REM ---- Launch frontend in new window ----
start "SH-WAF Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Backend starting at:  http://localhost:8000/docs
echo Frontend starting at: http://localhost:5173
echo.
echo Two new windows have opened for Backend and Frontend.
echo Close those windows to stop the servers.
echo.
pause
