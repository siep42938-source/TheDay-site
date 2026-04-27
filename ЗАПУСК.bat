@echo off
chcp 65001 >nul
title TheDay Client Server
color 0B
cls

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║        TheDay Client — Запуск            ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Проверяем Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0E
    echo  [!] Node.js не найден. Скачиваю...
    echo.
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol='Tls12'; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi' -OutFile '%TEMP%\node.msi' -UseBasicParsing}"
    echo  Устанавливаю Node.js (жми Next, Next, Install)...
    msiexec /i "%TEMP%\node.msi" /passive /norestart
    set "PATH=%PATH%;C:\Program Files\nodejs"
    echo  [OK] Node.js установлен
    echo.
)

:: Устанавливаем зависимости
if not exist "%~dp0server\node_modules" (
    echo  Устанавливаю зависимости...
    pushd "%~dp0server"
    call npm install --silent 2>nul
    popd
    echo  [OK] Готово
    echo.
)

:: Проверяем .env
if not exist "%~dp0server\.env" (
    echo  Создаю server\.env...
    (
        echo PORT=3001
        echo JWT_SECRET=theday_secret_2026_xyz
        echo SMTP_HOST=smtp.gmail.com
        echo SMTP_PORT=587
        echo SMTP_SECURE=false
        echo SMTP_USER=
        echo SMTP_PASS=
        echo SMTP_FROM=TheDay Client ^<noreply@thedayclient.su^>
        echo FRONTEND_URL=http://localhost:3001
        echo OTP_EXPIRES_MIN=10
        echo ADMIN_SECRET=admin_theday_2026
        echo LAUNCHER_SECRET=launcher_theday_2026
    ) > "%~dp0server\.env"
)

:: Спрашиваем почту если не настроена
findstr /C:"SMTP_USER=" "%~dp0server\.env" | findstr /V "SMTP_USER=$" >nul 2>&1
for /f "tokens=2 delims==" %%a in ('findstr "SMTP_USER" "%~dp0server\.env"') do set SMTP_CHECK=%%a
if "%SMTP_CHECK%"=="" (
    echo  ╔══════════════════════════════════════════╗
    echo  ║  Настройка почты для отправки кодов      ║
    echo  ╚══════════════════════════════════════════╝
    echo.
    echo  Введи свой Gmail адрес:
    set /p GMAIL=  Email:
    echo.
    echo  Введи пароль приложения Gmail (16 символов):
    echo  (Получи на: myaccount.google.com - Безопасность - Пароли приложений)
    set /p GPASS=  Пароль:
    echo.

    :: Обновляем .env
    powershell -Command "(Get-Content '%~dp0server\.env') -replace 'SMTP_USER=', 'SMTP_USER=%GMAIL%' -replace 'SMTP_PASS=', 'SMTP_PASS=%GPASS%' -replace 'SMTP_FROM=.*', 'SMTP_FROM=TheDay Client <%GMAIL%>' | Set-Content '%~dp0server\.env'"
    echo  [OK] Почта настроена
    echo.
)

echo  ╔══════════════════════════════════════════╗
echo  ║  Сайт запущен!                           ║
echo  ║                                          ║
echo  ║  Сайт:   http://localhost:3001           ║
echo  ║  Админ:  http://localhost:3001/admin.html║
echo  ║                                          ║
echo  ║  Секрет админа: admin_theday_2026        ║
echo  ║  Ключ лаунчера: launcher_theday_2026     ║
echo  ║                                          ║
echo  ║  Ctrl+C — остановить                     ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Открываем браузер
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3001"

:: Запускаем сервер
pushd "%~dp0server"
node index.js
popd
pause
