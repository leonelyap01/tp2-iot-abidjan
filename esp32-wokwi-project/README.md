# ESP32 MQTT IoT Stack - Projet PlatformIO + Wokwi

## 🎯 Avantage : Simulation 100% locale, gratuite et rapide !

Ce projet vous permet de simuler l'ESP32 **localement** sans dépendre des serveurs Wokwi.com qui sont souvent occupés.

## 📦 Installation

### 1. Installer PlatformIO dans VSCode

1. Ouvrez VSCode
2. Extensions (Ctrl+Shift+X)
3. Cherchez `PlatformIO IDE`
4. Installez l'extension officielle
5. Redémarrez VSCode

### 2. Installer Wokwi for VSCode (Version gratuite)

1. Extensions (Ctrl+Shift+X)
2. Cherchez `Wokwi Simulator`
3. Installez l'extension
4. **Pas besoin de licence** pour la simulation locale avec PlatformIO !

## 🚀 Utilisation

### Étape 1 : Ouvrir le projet dans PlatformIO

1. Dans VSCode, cliquez sur l'icône **PlatformIO** (maison alien) dans la barre latérale
2. Cliquez sur **"Open Project"**
3. Sélectionnez le dossier `esp32-wokwi-project`

**OU**

1. Menu **File → Open Folder**
2. Sélectionnez `esp32-wokwi-project`

### Étape 2 : Compiler le projet

1. Ouvrez le fichier `src/main.cpp`
2. Dans la barre en bas, cliquez sur l'icône **✓** (Build)
3. Attendez la compilation (première fois : télécharge les dépendances)

**OU**

- Appuyez sur `F1`
- Tapez `PlatformIO: Build`

### Étape 3 : Lancer la simulation Wokwi

**Méthode 1 : Via l'extension Wokwi**

1. Appuyez sur `F1`
2. Tapez `Wokwi: Start Simulator`
3. La simulation démarre !

**Méthode 2 : Via le bouton**

1. En haut à droite de VSCode, cliquez sur l'icône **Wokwi** (si disponible)
2. Ou cliquez sur le fichier `diagram.json` et lancez la simulation

## 📊 Vérification du flux de données

### 1. Vérifier les logs de l'ESP32

Dans le **Serial Monitor** de Wokwi, vous devriez voir :

```
=================================
ESP32 IoT Stack - Wokwi Simulator
=================================

Connexion WiFi à Wokwi-GUEST
...
WiFi connecté !
✓ MQTT connecté avec succès
✓ Publication sur: iot/CI/abidjan/cocody/esp32_001
✓ Données publiées:
  Temperature: 27.5 °C
  Humidity: 65.0 %
```

### 2. Vérifier la réception MQTT

Dans un terminal Windows (dans le dossier `iot-stack`) :

```bash
# Lancer le script de test
test-mqtt.bat

# OU directement
docker exec -it mosquitto mosquitto_sub -h localhost -t "iot/CI/abidjan/#" -v
```

Vous devriez voir :
```
iot/CI/abidjan/cocody/esp32_001 environment,location=cocody,device_id=ESP32_Wokwi_001,sensor=DHT22 temperature=27.5,humidity=65.0
```

### 3. Vérifier dans InfluxDB

1. Ouvrez [http://localhost:8086](http://localhost:8086)
2. Login : `admin` / `ufhb2024!`
3. **Data Explorer**
4. Bucket : `raw_7d`
5. Measurement : `environment`
6. Vos données y sont ! 🎉

## 🔧 Configuration

### Modifier l'IP du serveur MQTT

Si votre IP change, éditez le fichier `src/main.cpp` ligne 23 :

```cpp
const char* mqtt_server = "192.168.1.3";  // ← Votre nouvelle IP
```

Puis recompilez (icône ✓).

### Modifier les valeurs du capteur

Éditez `diagram.json` :

```json
{
  "type": "wokwi-dht22",
  "attrs": {
    "temperature": "30.0",  // ← Température en °C
    "humidity": "70"        // ← Humidité en %
  }
}
```

## 🐛 Dépannage

### "Cannot find PlatformIO"

- Vérifiez que l'extension PlatformIO est installée
- Redémarrez VSCode
- Ouvrez le dossier `esp32-wokwi-project` (pas le dossier parent)

### "Wokwi requires a license"

**Solution** : Vous n'avez PAS besoin de licence pour simuler avec PlatformIO !

1. Compilez d'abord avec PlatformIO (icône ✓)
2. Utilisez `F1 → Wokwi: Start Simulator`
3. Wokwi utilisera le firmware compilé localement

### Erreur de connexion MQTT

1. Vérifiez que Docker stack est lancée :
   ```bash
   docker-compose ps
   ```

2. Vérifiez votre IP locale :
   ```bash
   ipconfig
   ```

3. Autorisez le port 1883 dans le firewall (voir fichier `allow-mqtt-firewall.bat`)

## 📁 Structure du projet

```
esp32-wokwi-project/
├── platformio.ini      # Configuration PlatformIO
├── wokwi.toml          # Configuration Wokwi
├── diagram.json        # Schéma électronique (ESP32 + DHT22)
├── src/
│   └── main.cpp        # Code source ESP32
└── README.md           # Ce fichier
```

## 🔗 Flux de données complet

```
ESP32 (Wokwi)
    ↓ MQTT (port 1883)
Mosquitto (Docker)
    ↓ MQTT Subscribe
Telegraf (Docker)
    ↓ InfluxDB Line Protocol
InfluxDB (Docker)
    ↓ Query
Grafana (Docker)
```

## 📚 Ressources

- [PlatformIO Docs](https://docs.platformio.org/)
- [Wokwi Docs](https://docs.wokwi.com/)
- [ESP32 Arduino Core](https://docs.espressif.com/projects/arduino-esp32/)
- [PubSubClient Library](https://github.com/knolleary/pubsubclient)

---

**TP1 IoT — M1 BDGL — UFHB**
