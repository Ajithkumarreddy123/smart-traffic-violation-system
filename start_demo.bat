@echo off
TITLE TrafficGuard AI — Smart Traffic Violation Detection System
COLOR 0B

echo ===============================================================================
echo        TRAFFICGUARD AI : SMART TRAFFIC VIOLATION DETECTION SYSTEM
echo     FastAPI + OpenCV + Zebra Detector + YOLOv8 + ByteTrack + React Command UI
echo ===============================================================================
echo.

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

if not exist "frontend\node_modules\" (
    echo [Setup] Installing frontend dependencies (first time setup)...
    cd frontend && call npm install && cd ..
)

echo [1/4] Ensuring database schema and initial RTO seed data...
python -m backend.app.seed
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to run database seed. Please check your python environment.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/4] Starting FastAPI Backend on http://localhost:8000 ...
start "TrafficGuard - FastAPI Backend" cmd /k "cd /d %SCRIPT_DIR% && uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

echo.
echo [3/4] Starting React Frontend on http://localhost:5173 ...
start "TrafficGuard - React Frontend" cmd /k "cd /d %SCRIPT_DIR%\frontend && npm run dev"

echo.
echo [4/4] Opening Traffic Command Center in browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo ===============================================================================
echo   SERVICES RUNNING:
echo     - React Command Center : http://localhost:5173
echo     - FastAPI REST / Docs  : http://localhost:8000/docs
echo     - Real-Time WebSocket  : ws://localhost:8000/ws/violations
echo     - Evidence Snapshots   : http://localhost:8000/evidence/
echo.
echo   TO LAUNCH AI VISION ENGINE (OpenCV + YOLOv8 Camera/Video Feed):
echo     python ai_engine\vision_engine.py
echo.
echo   CV HOTKEYS (Inside OpenCV Window):
echo     [R] Switch Traffic Light RED
echo     [G] Switch Traffic Light GREEN
echo     [T] Simulate Live Violation
echo     [Q] Quit Vision Engine
echo ===============================================================================
echo.

set /p START_CV="Would you like to start the AI Vision Engine now? (Y/N): "
if /i "%START_CV%"=="Y" (
    echo Launching Computer Vision Engine...
    python ai_engine\vision_engine.py
) else (
    echo Vision engine not started. You can run it anytime using: python ai_engine\vision_engine.py
    pause
)
