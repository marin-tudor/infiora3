@echo off
setlocal

set ROOT=%~dp0
if "%ROOT:~-1%"=="\" set ROOT=%ROOT:~0,-1%

echo Cleaning existing Infiora processes on ports 4000, 4001, 4002, 8080...

for %%P in (4000 4001 4002 8080) do (
  for /f "tokens=5" %%I in ('netstat -ano ^| findstr :%%P ^| findstr LISTENING') do (
    echo Killing PID %%I on port %%P
    powershell -NoProfile -Command "Stop-Process -Id %%I -Force -ErrorAction SilentlyContinue"
  )
)

echo.
echo Starting Infiora services...

start "Infiora Admin" powershell -NoExit -Command "Set-Location '%ROOT%\infiora-admin-main\infiora-admin-main'; npm run dev"
start "Infiora Dash" powershell -NoExit -Command "Set-Location '%ROOT%\infiora-dash-main\infiora-dash-main'; npm run dev"
start "Infiora App" powershell -NoExit -Command "Set-Location '%ROOT%\infiora-app-main\infiora-app-main'; npm run dev"
start "Infiora Backend" powershell -NoExit -Command "Set-Location '%ROOT%\infiora-backend-main\infiora-backend-main'; npm run dev"

echo.
echo Started:
echo - Admin:   http://localhost:4000
echo - Dash:    http://localhost:4001
echo - App:     http://localhost:4002
echo - Backend: http://localhost:8080
echo.
echo You can close this window. The services stay open in their own PowerShell windows.

endlocal
