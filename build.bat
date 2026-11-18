@echo off
echo === USB Timer: instalar dependencias e gerar .exe ===
call npm install
if errorlevel 1 goto erro
call npm run build
if errorlevel 1 goto erro
echo.
echo Concluido! Os ficheiros .exe estao na pasta "dist".
pause
exit /b 0
:erro
echo Ocorreu um erro. Verifique se o Node.js esta instalado.
pause
