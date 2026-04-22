@echo off
echo ====================================
echo Redemarrage de Telegraf
echo ====================================
echo.

cd /d "%~dp0"
docker-compose restart telegraf

echo.
echo ====================================
echo Telegraf redemarré avec succes !
echo Verification des logs...
echo ====================================
echo.

timeout /t 3 /nobreak > nul
docker-compose logs telegraf --tail 20

pause
