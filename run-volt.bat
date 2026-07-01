@echo off
title Volt Browser — Dev Mode
cd /d "%~dp0"
echo ============================================
echo   Volt Browser (Modo Desenvolvimento)
echo ============================================
echo.
echo Para encerrar, feche esta janela ou o Electron.
echo.

:: Exibe o comando que será executado
echo Executando: npm run dev
echo.

:: Executa o dev mode (Vite + Electron simultaneamente)
npm run dev

echo.
echo Volt Browser encerrado.
pause
