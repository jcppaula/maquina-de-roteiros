@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale Node.js 24.15 ou superior antes de iniciar.
  pause
  exit /b 1
)
echo Abra http://127.0.0.1:3210 no navegador.
node server.mjs
pause
