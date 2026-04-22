@echo off
echo ====================================
echo Verification des donnees dans InfluxDB
echo ====================================
echo.

cd /d "%~dp0"

echo Requete Flux: Dernieres donnees dans bucket raw_7d
echo.

docker exec influxdb influx query "from(bucket:\"raw_7d\") |> range(start: -1h) |> filter(fn: (r) => r._measurement == \"environment\") |> limit(n:10)" --org UFHB-IoT

echo.
echo ====================================
pause
