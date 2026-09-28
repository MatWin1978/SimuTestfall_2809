@echo off
title CARS - Kfz-Simulation  (zum Beenden dieses Fenster schliessen)
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
if errorlevel 1 pause
