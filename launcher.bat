@echo off
chcp 65001 >nul
title Rust++ Launcher
color 0A

echo.
echo ╔══════════════════════════════════════╗
echo ║           Rust++ Launcher            ║  
echo ║           Авто-поиск v2.0            ║
echo ╚══════════════════════════════════════╝
echo.

setlocal EnableDelayedExpansion

:SEARCH_START
echo 🔍 Автопоиск папки лаунчера...

REM Функция поиска папки
call :FindLauncherPath
if "!FOUND_PATH!"=="" (
    echo ❌ Не удалось найти папку автоматически
    echo.
    echo 📁 Пожалуйста, укажите путь вручную:
    echo    Пример: C:\Users\Имя\Rustplusplus1\rustplus-launcher
    echo.
    set /p MANUAL_PATH="Введите путь: "
    if "!MANUAL_PATH!"=="" goto :ERROR
    if not exist "!MANUAL_PATH!" goto :ERROR
    if not exist "!MANUAL_PATH!\package.json" goto :ERROR
    set "FOUND_PATH=!MANUAL_PATH!"
)

echo ✅ Используем папку: !FOUND_PATH!
cd /d "!FOUND_PATH!"

REM Проверка Node.js
echo 🔧 Проверка окружения...
node --version >nul 2>&1
if errorlevel 1 goto :NO_NODE

REM Установка зависимостей
if not exist "node_modules" (
    echo 📦 Установка зависимостей...
    npm install >nul 2>&1
    if errorlevel 1 (
        echo ❌ Ошибка установки!
        pause
        exit /b 1
    )
)

echo 🚀 Запуск лаунчера...
timeout /t 1 >nul
npm start

echo.
echo ✅ Работа завершена
pause
exit /b 0

:FindLauncherPath
set "FOUND_PATH="
    
REM Поиск в common местах
for %%D in (C D E F) do (
    if exist %%D:\ (
        echo 📂 Поиск на диске %%D:...
        for /f "delims=" %%P in ('dir "%%D:\*rustplus-launcher*" /ad /s /b 2^>nul') do (
            if exist "%%P\package.json" (
                set "FOUND_PATH=%%P"
                exit /b 0
            )
        )
    )
)
exit /b 1

:NO_NODE
echo ❌ Node.js не установлен!
echo 📥 Скачайте с: https://nodejs.org/
timeout /t 2
start https://nodejs.org/
pause
exit /b 1

:ERROR
echo ❌ Неверный путь или папка не содержит лаунчер
pause
goto :SEARCH_START

