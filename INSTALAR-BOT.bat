@echo off
chcp 65001 >nul 2>&1
title SynthTrade Pro - Instalador
color 0A

echo.
echo  =============================================
echo   SYNTHTRADE PRO - INSTALADOR
echo  =============================================
echo.
echo  Presiona una tecla para empezar...
pause >nul
echo.

:: PASO 1 - Verificar si Bun esta instalado
echo  [PASO 1] Buscando Bun...
where bun >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  BUN NO ESTA INSTALADO.
    echo.
    echo  Vas a instalar Bun ahora.
    echo  Se abrira otra ventana. Espera a que termine.
    echo  Cuando termine, vuelve a ejecutar este archivo.
    echo.
    pause
    powershell -Command "irm bun.sh/install.ps1 | iex"
    echo.
    echo  BUN INSTALADO. Cierra esta ventana y abre
    echo  INSTALAR-BOT.bat de nuevo.
    echo.
    pause
    exit
)
echo  Bun encontrado: OK
echo.
pause

:: PASO 2 - Verificar archivos
echo  [PASO 2] Verificando archivos...
if not exist "package.json" (
    echo  ERROR: No encuentro package.json
    echo  Debes copiar este archivo .bat a la carpeta
     donde extrajiste el ZIP del proyecto.
    echo.
    echo  La carpeta debe contener estas cosas:
    echo    - src  (carpeta)
    echo    - prisma  (carpeta)
    echo    - public  (carpeta)
    echo    - package.json  (archivo)
    echo    - INSTALAR-BOT.bat  (este archivo)
    echo.
    pause
    exit
)
echo  Archivos correctos: OK
echo.
pause

:: PASO 3 - Crear .env
echo  [PASO 3] Creando configuracion de base de datos...
(
  echo DATABASE_URL=file:./db/custom.db
  echo IRON_LOCK_ADMIN_KEY=STP-ADMIN-A2K-2024
) > .env
if not exist "db" mkdir db
echo  Archivo .env creado: OK
echo.
pause

:: PASO 4 - Instalar dependencias
echo  [PASO 4] Instalando dependencias...
echo  Esto puede tardar entre 1 y 5 minutos.
echo  No cierres esta ventana mientras espera.
echo.
bun install
echo.
if %errorlevel% neq 0 (
    echo  ERROR al instalar dependencias.
    echo  Revisa si tienes conexion a internet.
    echo.
    pause
    exit
)
echo  Dependencias instaladas: OK
echo.
pause

:: PASO 5 - Base de datos
echo  [PASO 5] Configurando base de datos...
bun run db:generate
echo.
bun run db:push
echo.
echo  Base de datos lista: OK
echo.
pause

:: FIN
echo.
echo  =============================================
echo   INSTALACION COMPLETADA
echo  =============================================
echo.
echo  Ahora presiona una tecla para INICIAR el bot.
echo  Se abrira el servidor en http://localhost:3000
echo.
echo  Para detener el bot despues, presiona Ctrl+C
echo.
pause >nul

echo  Iniciando servidor...
echo  Abre tu navegador en: http://localhost:3000
echo.
bun run dev

echo.
echo  El servidor se detuvo.
echo  Para iniciar de nuevo, ejecuta: bun run dev
pause
