# Configuration Wokwi Simulator pour IoT Stack

## 📋 Prérequis

- Extension Wokwi installée dans VSCode
- Stack IoT lancée (`docker-compose up -d`)
- Votre adresse IP locale (trouvée avec `ipconfig`)

## 🚀 Étapes de configuration

### 1. Préparer la stack Docker

Redémarrez Mosquitto pour prendre en compte la nouvelle configuration :

```bash
docker-compose restart mosquitto
```

Vérifiez que tous les services sont actifs :

```bash
docker-compose ps
```

### 2. Trouver votre IP locale

**Windows** :
```bash
ipconfig
```
Cherchez **Adresse IPv4** (ex: `192.168.1.100`)

**Linux/Mac** :
```bash
ip addr show
```

### 3. Créer le projet Wokwi

#### Option A : Dans l'extension VSCode Wokwi

1. Appuyez sur `F1` et cherchez **"Wokwi: New Project"**
2. Choisissez **"ESP32"**
3. Copiez le contenu de [`wokwi-esp32-mqtt.ino`](wokwi-esp32-mqtt.ino) dans le fichier `.ino`
4. **IMPORTANT** : Modifiez la ligne :
   ```cpp
   const char* mqtt_server = "VOTRE_IP_LOCALE";  // Ex: "192.168.1.100"
   ```

#### Option B : Sur le site Wokwi.com

1. Allez sur [wokwi.com](https://wokwi.com)
2. Créez un nouveau projet ESP32
3. Collez le code depuis [`wokwi-esp32-mqtt.ino`](wokwi-esp32-mqtt.ino)
4. Modifiez l'IP du serveur MQTT

### 4. Configurer le schéma (diagram.json)

Dans Wokwi, créez/modifiez le fichier `diagram.json` :

```json
{
  "version": 1,
  "author": "M1 BDGL - UFHB IoT",
  "editor": "wokwi",
  "parts": [
    { "type": "wokwi-esp32-devkit-v1", "id": "esp", "top": 0, "left": 0, "attrs": {} },
    {
      "type": "wokwi-dht22",
      "id": "dht1",
      "top": 0,
      "left": 200,
      "attrs": { "temperature": "27.5", "humidity": "65" }
    }
  ],
  "connections": [
    [ "dht1:VCC", "esp:3V3", "red", [ "v0" ] ],
    [ "dht1:GND", "esp:GND.1", "black", [ "v0" ] ],
    [ "dht1:SDA", "esp:D15", "green", [ "v0" ] ]
  ]
}
```

### 5. Ajouter les bibliothèques (libraries.txt)

Créez un fichier `libraries.txt` dans Wokwi :

```
PubSubClient
DHT sensor library
```

## ▶️ Lancer la simulation

1. Dans Wokwi, cliquez sur le bouton **Play (▶)** vert
2. Ouvrez le **Serial Monitor** pour voir les logs
3. Vérifiez que :
   - WiFi est connecté
   - MQTT se connecte à votre broker
   - Les données sont publiées toutes les 10 secondes

## 🔍 Vérification du flux de données

### A. Vérifier la réception MQTT

Dans un terminal, surveillez les messages MQTT :

```bash
docker exec -it mosquitto mosquitto_sub -h localhost -t "iot/CI/abidjan/#" -v
```

Vous devriez voir :
```
iot/CI/abidjan/cocody/esp32_001 environment,location=cocody,device_id=ESP32_Wokwi_001,sensor=DHT22 temperature=27.5,humidity=65.0
```

### B. Vérifier l'ingestion Telegraf

Consultez les logs de Telegraf :

```bash
docker logs telegraf --tail 50 -f
```

### C. Vérifier dans InfluxDB

1. Ouvrez [http://localhost:8086](http://localhost:8086)
2. Login : `admin` / `ufhb2024!`
3. Allez dans **Data Explorer**
4. Bucket : `raw_7d`
5. Measurement : `environment`
6. Vous devriez voir vos données !

### D. Visualiser dans Grafana

1. Ouvrez [http://localhost:3000](http://localhost:3000)
2. Login : `admin` / `ufhb2024!`
3. Créez un dashboard avec les données de température/humidité

## 🐛 Dépannage

### Erreur : "Connection timeout" ou "Connection refused"

**Causes possibles** :
1. IP locale incorrecte → Revérifiez avec `ipconfig`
2. Firewall Windows bloque le port 1883
3. Docker stack non lancée

**Solutions** :
```bash
# Relancer la stack
docker-compose restart

# Vérifier que Mosquitto écoute
docker logs mosquitto

# Autoriser le port 1883 dans le Firewall Windows
# Panneau de configuration → Firewall → Règles entrantes → Nouvelle règle → Port 1883
```

### Erreur : "MQTT state: -2"

Le client ne peut pas établir de connexion réseau.

**Solution** :
- Vérifiez que `0.0.0.0` est bien dans [`mosquitto.conf:4`](mosquitto/config/mosquitto.conf#L4)
- Redémarrez : `docker-compose restart mosquitto`

### Les données n'arrivent pas dans InfluxDB

**Vérifications** :
1. Token InfluxDB configuré dans [`telegraf.conf:19`](telegraf/telegraf.conf#L19)
2. Le topic MQTT correspond : `iot/CI/abidjan/#`
3. Format Line Protocol correct

```bash
# Générer un token dans InfluxDB UI
# http://localhost:8086 → Load Data → API Tokens → Generate API Token (Read/Write)
```

## 📊 Format des données

Wokwi envoie les données au format **InfluxDB Line Protocol** :

```
measurement,tag1=val1,tag2=val2 field1=val1,field2=val2
```

Exemple :
```
environment,location=cocody,device_id=ESP32_Wokwi_001,sensor=DHT22 temperature=27.5,humidity=65.0
```

Ce format est directement compris par Telegraf (voir [`telegraf.conf:37`](telegraf/telegraf.conf#L37)).

## 🎯 Résultat attendu

```
Serial Monitor (Wokwi):
  ✓ WiFi connecté
  ✓ MQTT connecté avec succès
  ✓ Données publiées:
    Topic: iot/CI/abidjan/cocody/esp32_001
    Payload: environment,location=cocody,device_id=ESP32_Wokwi_001,sensor=DHT22 temperature=27.5,humidity=65.0
```

## 📚 Ressources

- [Documentation Wokwi](https://docs.wokwi.com/)
- [PubSubClient Library](https://github.com/knolleary/pubsubclient)
- [InfluxDB Line Protocol](https://docs.influxdata.com/influxdb/v2/reference/syntax/line-protocol/)
