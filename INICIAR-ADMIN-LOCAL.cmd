@echo off
cd /d "%~dp0"
call npm.cmd run admin:local
pause
