@echo off
title Nexus Cognitive Engine Launchpad
echo ===================================================
echo   NEXUS COGNITIVE ENGINE - BOOTING PROCESS
echo ===================================================
echo.
echo [1/2] Opening Nexus Web Dashboard in your browser...
start "" "http://localhost:8000"
echo.
echo [2/2] Booting FastAPI backend server...
powershell -ExecutionPolicy Bypass -File "%~dp0run.ps1"
pause
