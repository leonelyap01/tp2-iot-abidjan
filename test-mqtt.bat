@echo off
echo ====================================
echo Test de reception MQTT
echo Topic: iot/CI/abidjan/#
echo ====================================
echo.
docker exec -it mosquitto mosquitto_sub -h localhost -t "iot/CI/abidjan/#" -v
