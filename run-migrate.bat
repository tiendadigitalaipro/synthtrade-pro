@echo off
chcp 65001 >nul 2>&1
title SynthTrade Pro - Iron Lock Migration
color 0A
echo.
echo  =============================================
echo   IRON LOCK - Aplicar migracion de BD
echo  =============================================
echo.
echo  Agregando tabla License a la base de datos...
echo.

if not exist "db" mkdir db

bun run db:generate
echo.
bun run db:push
echo.

if %ERRORLEVEL% neq 0 (
  echo  [!] Error con bun. Intentando con npx...
  npx prisma generate
  npx prisma db push
)

echo.
echo  =============================================
echo   Listo! La tabla License fue creada.
echo  =============================================
echo.
pause
