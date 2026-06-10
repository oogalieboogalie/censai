@echo off
title Censai Hub - Startup Controller
color 0b
echo ════════════════════════════════════════════════════════════════
echo  Censai Hub Docker Controller - Booting Services...
echo ════════════════════════════════════════════════════════════════
echo.

:: Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    color 0c
    echo [ERROR] Docker is not running! 
    echo Please start Docker Desktop on your laptop first, then run this script again.
    echo.
    pause
    exit /b 1
)

echo [1/3] Building and launching Qdrant, Postgres, and Censai Hub...
docker compose up -d --build

if %errorlevel% neq 0 (
    color 0c
    echo.
    echo [ERROR] Failed to start Docker Compose. Please check the logs.
    echo.
    pause
    exit /b 1
)

echo.
echo [2/3] Services started successfully! persisting states securely.
echo [3/3] Launching local browser in 5 seconds...
echo.
timeout /t 5 /nobreak >nul

start http://localhost:3002

echo ════════════════════════════════════════════════════════════════
echo  Censai Hub is active at http://localhost:3002
echo  Keep Ollama running locally on your host laptop!
echo ════════════════════════════════════════════════════════════════
echo.
echo  - To stop the application: Double-click "stop-homebase.bat"
echo.
pause
