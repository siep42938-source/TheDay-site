@echo off
echo Компиляция TheDay Launcher...
cd src
javac -encoding UTF-8 TheDayLauncher.java
if errorlevel 1 (
    echo ОШИБКА компиляции!
    pause
    exit /b 1
)
echo Упаковка в JAR...
echo Main-Class: TheDayLauncher > manifest.txt
jar cfm ..\TheDay-Launcher.jar manifest.txt *.class
del manifest.txt
del *.class
cd ..
echo.
echo Готово! Файл: TheDay-Launcher.jar
pause
