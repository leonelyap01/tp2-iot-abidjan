@echo off
REM Ce script doit etre execute en tant qu'administrateur
REM Clic droit -> Executer en tant qu'administrateur

echo ====================================
echo Configuration Firewall pour MQTT
echo Port 1883 (Mosquitto)
echo ====================================
echo.

netsh advfirewall firewall add rule name="MQTT Mosquitto Port 1883" dir=in action=allow protocol=TCP localport=1883

echo.
echo ====================================
echo Regle firewall ajoutee avec succes !
echo Le port 1883 est maintenant accessible
echo ====================================
pause
