@echo off
setlocal
title Estudio de Roteiros
cd /d "%~dp0"
set "PORT=3210"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale o Node.js 24.15 ou superior.
  pause
  exit /b 1
)
node -e "const [major,minor]=process.versions.node.split('.').map(Number);process.exit(major>24||(major===24&&minor>=15)?0:1)"
if errorlevel 1 (
  echo Este aplicativo precisa do Node.js 24.15 ou superior.
  pause
  exit /b 1
)
if not exist "server.mjs" (
  echo O arquivo server.mjs nao foi encontrado nesta pasta.
  pause
  exit /b 1
)

powershell.exe -NoProfile -Command "try { $r=Invoke-RestMethod 'http://127.0.0.1:3210/api/health' -TimeoutSec 2; if($r.ok -and $r.version -eq '0.3.0'){exit 0} } catch {}; exit 1" >nul 2>nul
if not errorlevel 1 (
  echo O Estudio ja esta aberto. Abrindo o navegador...
  start "" "http://127.0.0.1:3210/"
  exit /b 0
)

echo Iniciando o Estudio em http://127.0.0.1:3210/
echo Mantenha esta janela aberta enquanto estiver usando o aplicativo.
echo Para encerrar o servidor, pressione Ctrl+C nesta janela.
echo.
start "" /b powershell.exe -NoProfile -WindowStyle Hidden -Command "for($i=0;$i -lt 30;$i++){try{$r=Invoke-RestMethod 'http://127.0.0.1:3210/api/health' -TimeoutSec 1;if($r.ok -and $r.version -eq '0.3.0'){Start-Process 'http://127.0.0.1:3210/';exit 0}}catch{};Start-Sleep -Milliseconds 500};exit 1" >nul 2>nul
node server.mjs
if errorlevel 1 (
  echo.
  echo Nao foi possivel iniciar o Estudio. Confira a mensagem acima.
  pause
  exit /b 1
)
endlocal
