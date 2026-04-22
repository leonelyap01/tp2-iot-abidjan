@echo off
echo ====================================
echo Test du flux de donnees IoT
echo ====================================
echo.

cd /d "%~dp0"

echo [1/4] Test de publication MQTT manuelle...
echo.
docker exec mosquitto mosquitto_pub -h localhost -t "iot/CI/abidjan/test" -m "environment,location=test,device_id=TEST_SCRIPT temperature=25.0,humidity=60.0"
echo    OK - Message MQTT publie
echo.

timeout /t 3 /nobreak > nul

echo [2/4] Verification des logs Telegraf...
echo.
docker-compose logs telegraf --tail 5
echo.

echo [3/4] Verification dans InfluxDB (via CLI)...
echo.
docker exec influxdb influx query "from(bucket:\"raw_7d\") |> range(start: -5m) |> filter(fn: (r) => r._measurement == \"environment\") |> limit(n:3)" --org UFHB-IoT
echo.

echo [4/4] Instructions suivantes:
echo.
echo ====================================
echo   Actions a faire maintenant:
echo ====================================
echo.
echo 1. Lancez la simulation Wokwi dans VSCode
echo    (F1 ^> Wokwi: Start Simulator)
echo.
echo 2. Attendez 20 secondes
echo.
echo 3. Retournez dans Grafana et rafraichissez
echo    (bouton Refresh en haut a droite)
echo.
echo 4. Les donnees devraient apparaitre!
echo.
echo ====================================

pause
