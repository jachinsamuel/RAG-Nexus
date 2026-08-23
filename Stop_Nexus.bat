@echo off
title Stop Nexus Server
echo ===================================================
echo   NEXUS COGNITIVE ENGINE - TERMINATING PROCESSES
echo ===================================================
echo.
echo Stopping Nexus background processes running on port 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo.
echo Nexus server stopped successfully.
ping 127.0.0.1 -n 3 >nul
exit
