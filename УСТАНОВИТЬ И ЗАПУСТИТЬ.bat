@echo off
chcp 65001 >nul
title TheDay Client — Автоустановка
color 0B
cls

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║     TheDay Client — Автоустановка        ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ── Проверяем Node.js ──────────────────────────────────────
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0E
    echo  [!] Node.js не найден. Скачиваю автоматически...
    echo.

    :: Скачиваем Node.js установщик
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol='Tls12'; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi' -OutFile '%TEMP%\node_setup.msi' -UseBasicParsing}"

    if not exist "%TEMP%\node_setup.msi" (
        color 0C
        echo  [ОШИБКА] Не удалось скачать Node.js
        echo  Скачай вручную: https://nodejs.org
        pause
        exit /b 1
    )

    echo  [OK] Скачано. Устанавливаю Node.js...
    echo  (Появится окно установщика — жми Next, Next, Install)
    echo.
    msiexec /i "%TEMP%\node_setup.msi" /passive /norestart
    echo.
    echo  [OK] Node.js установлен!
    echo.

    :: Обновляем PATH
    set "PATH=%PATH%;C:\Program Files\nodejs"
)

echo  [OK] Node.js готов
echo.

:: ── Устанавливаем зависимости ──────────────────────────────
if not exist "%~dp0server\node_modules" (
    echo  Устанавливаю зависимости сервера...
    pushd "%~dp0server"
    call npm install --silent
    popd
    echo  [OK] Зависимости установлены
    echo.
)

:: ── Запускаем сервер ───────────────────────────────────────
echo  ╔══════════════════════════════════════════╗
echo  ║  Сайт запущен: http://localhost:3001     ║
echo  ║  Ctrl+C — остановить                     ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Открываем браузер через 2 сек
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3001"

pushd "%~dp0server"
node index.js
popd
pause
