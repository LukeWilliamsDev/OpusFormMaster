@echo off
:: Change directory to the folder where this batch file is saved
cd /d "%~dp0"

echo [LOCAL DEV] Starting local server outside of AI agent...
echo [LOCAL DEV] Working directory: %cd%

:: Run the npm dev script using the local Node.js environment
call npm.cmd run dev

pause
