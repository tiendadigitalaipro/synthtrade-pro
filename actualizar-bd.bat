@echo off
chcp 65001 >nul 2>&1
title SynthTrade Pro - Actualizar Base de Datos (Iron Lock)
color 0B

echo.
echo  =============================================
echo   SYNTHTRADE PRO - Actualizar BD
echo   Agrega tabla License (Iron Lock)
echo  =============================================
echo.

:: Verify we're in the right folder
if not exist "package.json" (
  echo  ERROR: Ejecuta este archivo desde la carpeta
  echo  donde esta instalado SynthTrade Pro.
  pause
  exit
)

:: Add IRON_LOCK_ADMIN_KEY to .env if not present
findstr /C:"IRON_LOCK_ADMIN_KEY" .env >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo IRON_LOCK_ADMIN_KEY=STP-ADMIN-A2K-2024 >> .env
  echo  [OK] IRON_LOCK_ADMIN_KEY agregado al .env
)

echo  Actualizando esquema de base de datos...
echo.
bun run db:generate
bun run db:push

echo.
echo  =============================================
echo   Actualizacion completada!
echo   La tabla License fue creada.
echo  =============================================
echo.
echo  Ahora puedes iniciar el bot con:
echo    bun run dev
echo.
pause
