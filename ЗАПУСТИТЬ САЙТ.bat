@echo off
title TheDay Client Server
color 0B
echo.
echo  ============================================
echo   TheDay Client - Запуск сервера
echo  ============================================
echo.

:: Проверяем Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [ОШИБКА] Node.js не установлен!
    echo.
    echo  Скачай с: https://nodejs.org
    echo  Выбери версию LTS и установи.
    echo.
    pause
    exit /b 1
)

echo  [OK] Node.js найден
echo.

:: Устанавливаем зависимости если нужно
if not exist "server\node_modules" (
    echo  Устанавливаем зависимости (первый запуск)...
    echo.
    cd server
    npm install
    cd ..
    echo.
    echo  [OK] Зависимости установлены
    echo.
)

:: Проверяем .env
if not exist "server\.env" (
    color 0E
    echo  [!] Файл server\.env не найден!
    echo  Скопируй server\.env.example в server\.env
    echo  и заполни SMTP данные.
    echo.
    pause
    exit /b 1
)

echo  Запускаем сервер...
echo.
echo  Сайт будет доступен по адресу:
echo.
echo    http://localhost:3001
echo.
echo  Нажми Ctrl+C чтобы остановить сервер
echo  ============================================
echo.

:: Открываем браузер через 2 секунды
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3001"

:: Запускаем сервер
cd server
node index.js

pause
