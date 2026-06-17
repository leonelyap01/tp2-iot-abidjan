# 🌐 Stack IoT Complète - TP1 + TP2 · M1 BDGL UFHB

> **Plateforme IoT temps réel** avec simulation ESP32, collecte MQTT, stockage time-series et visualisation interactive (**TP1**),
> enrichie d'une couche **métadonnées MongoDB** — devices, géolocalisation, configuration, alertes — selon le principe de **Polyglot Persistence** (**TP2**).

[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://www.docker.com/)
[![InfluxDB](https://img.shields.io/badge/InfluxDB-2.7-22ADF6?logo=influxdb)](https://www.influxdata.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb)](https://www.mongodb.com/)
[![Grafana](https://img.shields.io/badge/Grafana-10.4-F46800?logo=grafana)](https://grafana.com/)
[![ESP32](https://img.shields.io/badge/ESP32-Wokwi-E7352C?logo=espressif)](https://wokwi.com/)

---

## 📋 Table des matières

- [Vue d'ensemble](#-vue-densemble)
- [Architecture](#-architecture)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Utilisation](#-utilisation)
- [Dashboard Grafana](#-dashboard-grafana)
- [Simulation ESP32](#-simulation-esp32)
- [Dépannage](#-dépannage)
- [Commandes utiles](#-commandes-utiles)
- [Structure du projet](#-structure-du-projet)
- [**TP2 — MongoDB IoT**](#tp2--mongodb-iot--m1-bdgl-ufhb)

---

## 🎯 Vue d'ensemble

Ce projet implémente une **stack IoT complète** pour la collecte, le stockage et la visualisation de données de capteurs en temps réel. Il utilise un ESP32 virtuel (simulé avec Wokwi) qui envoie des données de température et d'humidité via MQTT.

Le **TP2** ajoute **MongoDB** (+ **Mongo Express**) pour gérer les **métadonnées** des capteurs : fiches `devices` validées par **JSON Schema**, géolocalisation via index **2dsphere**, et collection `events` avec rétention **TTL**. On illustre ainsi la **Polyglot Persistence** — les séries temporelles vivent dans InfluxDB, les métadonnées dans MongoDB. La documentation dédiée se trouve dans la section [TP2 — MongoDB IoT](#tp2--mongodb-iot--m1-bdgl-ufhb).

### **Services déployés**

| Service | Version | Rôle | Port |
|---------|---------|------|------|
| **Mosquitto** | 2.0 | Broker MQTT | 1883, 9001 |
| **Telegraf** | 1.28 | Agent de collecte et transformation | - |
| **InfluxDB** | 2.7 | Base de données time-series | 8086 |
| **Grafana** | 10.4 | Visualisation et dashboards | 3000 |
| **MongoDB** | 7 | Base documents — métadonnées capteurs (TP2) | 27018 (hôte) → 27017 (conteneur) |
| **Mongo Express** | 1.0 | Interface web d'administration MongoDB (TP2) | 8081 |
| **ESP32 (Wokwi)** | - | Simulation de capteur DHT22 | - |

### **Technologies utilisées**

- **Docker Compose** : Orchestration des services
- **MQTT** : Protocole de messagerie IoT
- **InfluxDB Line Protocol** : Format de données optimisé
- **Flux** : Langage de requête InfluxDB 2.x
- **PlatformIO** : Framework de développement ESP32
- **MongoDB 7 / mongosh** : Base documents + shell pour les métadonnées (TP2)
- **MongoDB Aggregation & index 2dsphere** : requêtes analytiques et géospatiales (TP2)
- **JSON Schema** : validation stricte des documents `devices` (TP2)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     STACK IoT - UFHB M1 BDGL                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   ESP32 (Wokwi)  │  Simulation locale dans VSCode/PlatformIO
│   DHT22 Sensor   │  • Température : 27.5°C
│                  │  • Humidité : 65%
└────────┬─────────┘  • Envoi toutes les 10 secondes
         │
         │ MQTT Publish
         │ Topic: iot/CI/abidjan/cocody/esp32_001
         │ Format: InfluxDB Line Protocol
         ↓
┌──────────────────┐
│    Mosquitto     │  Broker MQTT (Docker)
│   Port: 1883     │  • Accepte connexions anonymes
│   Port: 9001     │  • WebSocket activé
└────────┬─────────┘  • Réseau : iot_network
         │
         │ MQTT Subscribe
         │ Topic: iot/CI/abidjan/#
         ↓
┌──────────────────┐
│     Telegraf     │  Agent de collecte (Docker)
│   Interval: 10s  │  • Parse Line Protocol
└────────┬─────────┘  • Flush vers InfluxDB toutes les 10s
         │
         │ HTTP Write
         │ Token API authentifié
         ↓
┌──────────────────┐
│    InfluxDB      │  Base de données time-series (Docker)
│   Port: 8086     │  • Organization: UFHB-IoT
│                  │  • Bucket: raw_7d (retention: 7 jours)
└────────┬─────────┘  • Stockage optimisé pour séries temporelles
         │
         │ Flux Query Language
         │ Requêtes avec filtres et agrégations
         ↓
┌──────────────────┐
│     Grafana      │  Visualisation (Docker)
│   Port: 3000     │  • Dashboard temps réel
│                  │  • Auto-refresh: 5 secondes
└──────────────────┘  • 5 panneaux de visualisation

   ════ Couche métadonnées — TP2 · Polyglot Persistence ════

┌──────────────────┐         ┌──────────────────┐
│     MongoDB      │◄───────►│  Mongo Express   │
│  Hote:27018 →   │  admin  │   Port: 8081     │
│  Conteneur:27017│   web   │  UI navigateur   │
│  DB: iot_abidjan │   web   │  UI navigateur   │
└──────────────────┘         └──────────────────┘
  • devices : validation JSON Schema + index 2dsphere
  • events  : 50 documents, rétention TTL 90 jours
```

### **Flux de données détaillé**

1. **ESP32 (Wokwi)** → Lit capteur DHT22 → Construit payload Line Protocol
2. **MQTT Publish** → `environment,location=cocody,device_id=ESP32_Wokwi_001,sensor=DHT22 temperature=27.5,humidity=65.0`
3. **Mosquitto** → Reçoit et route le message
4. **Telegraf** → Subscribe au topic → Parse le format → Envoie vers InfluxDB
5. **InfluxDB** → Stocke dans le bucket `raw_7d` avec tags et fields
6. **Grafana** → Query Flux → Affiche graphiques temps réel

---

## 🔧 Prérequis

### **Logiciels requis**

- **Docker Desktop** (>= 20.10)
  - Windows: [Télécharger](https://www.docker.com/products/docker-desktop/)
  - Activez WSL 2 si sous Windows

- **Docker Compose** (>= 2.0)
  - Inclus avec Docker Desktop

- **Visual Studio Code** (dernière version)
  - [Télécharger](https://code.visualstudio.com/)

### **Extensions VSCode recommandées**

1. **PlatformIO IDE** - Développement ESP32
2. **Wokwi Simulator** (optionnel) - Simulation locale
3. **Docker** - Gestion des conteneurs
4. **GitLens** - Gestion Git avancée

### **Configuration système**

- **RAM** : Minimum 4 GB (8 GB recommandé)
- **Espace disque** : ~2 GB pour les images Docker
- **Réseau** : Connexion Internet pour le premier pull des images

---

## 🚀 Installation

### **1. Cloner le projet**

```bash
git clone https://github.com/leonelyap01/tp1-iot-abidjan.git
cd tp1-iot-abidjan
```

### **2. Lancer la stack Docker**

```bash
docker-compose up -d
```

**Vérification** :
```bash
docker-compose ps
```

Tous les services doivent être `Up` :
```
NAME        STATUS          PORTS
mosquitto   Up 10 seconds   0.0.0.0:1883->1883/tcp, 0.0.0.0:9001->9001/tcp
influxdb    Up 10 seconds   0.0.0.0:8086->8086/tcp
telegraf    Up 9 seconds
grafana     Up 9 seconds    0.0.0.0:3000->3000/tcp
```

### **3. Vérifier l'initialisation d'InfluxDB**

InfluxDB s'initialise automatiquement avec :
- **Username** : `admin`
- **Password** : `ufhb2024!`
- **Organization** : `UFHB-IoT`
- **Bucket** : `raw_7d` (rétention : 168 heures = 7 jours)

Accédez à [http://localhost:8086](http://localhost:8086) et connectez-vous.

---

## ⚙️ Configuration

### **Étape 1 : Générer le token API InfluxDB**

1. Ouvrez [http://localhost:8086](http://localhost:8086)
2. Login : `admin` / `ufhb2024!`
3. Menu **Load Data** → **API Tokens**
4. **Generate API Token** → **All Access API Token**
5. Nom : `Telegraf Token`
6. **Copiez le token généré**

### **Étape 2 : Configurer Telegraf**

Éditez le fichier [`telegraf/telegraf.conf`](telegraf/telegraf.conf) :

```conf
[[outputs.influxdb_v2]]
  urls         = ["http://influxdb:8086"]
  token        = "COLLEZ_VOTRE_TOKEN_ICI"  # ← Remplacez
  organization = "UFHB-IoT"
  bucket       = "raw_7d"
```

Redémarrez Telegraf :
```bash
docker-compose restart telegraf
```

### **Étape 3 : Configurer la datasource Grafana** (optionnel)

Éditez [`grafana/provisioning/datasources/influxdb.yml`](grafana/provisioning/datasources/influxdb.yml) :

```yaml
secureJsonData:
  token: COLLEZ_VOTRE_TOKEN_ICI  # ← Même token que Telegraf
```

Redémarrez Grafana :
```bash
docker-compose restart grafana
```

---

## 📊 Utilisation

### **Accès aux interfaces Web**

| Service | URL | Credentials |
|---------|-----|-------------|
| **InfluxDB** | [http://localhost:8086](http://localhost:8086) | `admin` / `ufhb2024!` |
| **Grafana** | [http://localhost:3000](http://localhost:3000) | `admin` / `ufhb2024!` |

### **Lancer la simulation ESP32**

#### **Méthode 1 : Avec PlatformIO (Recommandé)**

1. Ouvrez le projet `esp32-wokwi-project` dans VSCode
2. Installez l'extension **PlatformIO IDE**
3. **Compilez** : Cliquez sur l'icône ✓ (Build) en bas
4. **Simulez** : `F1` → `Wokwi: Start Simulator`

#### **Méthode 2 : Sur Wokwi.com**

1. Allez sur [wokwi.com](https://wokwi.com/projects/new/esp32)
2. Copiez le code depuis [`wokwi-esp32-mqtt.ino`](wokwi-esp32-mqtt.ino)
3. Configurez le `diagram.json` (voir [`WOKWI-SETUP.md`](WOKWI-SETUP.md))
4. **Important** : Modifiez l'IP MQTT selon votre réseau

### **Vérifier la réception des données**

**Tester MQTT** :
```bash
docker exec mosquitto mosquitto_sub -h localhost -t "iot/CI/abidjan/#" -v
```

**Ou utilisez le script** :
```bash
./test-mqtt.bat   # Windows
```

Vous devriez voir (toutes les 10 secondes) :
```
iot/CI/abidjan/cocody/esp32_001 environment,location=cocody,device_id=ESP32_Wokwi_001,sensor=DHT22 temperature=27.5,humidity=65.0
```

---

## 📈 Dashboard Grafana

### **Accéder au dashboard pré-configuré**

1. Ouvrez [http://localhost:3000](http://localhost:3000)
2. Login : `admin` / `ufhb2024!`
3. Menu ☰ → **Dashboards** → **ESP32 IoT Dashboard - UFHB M1 BDGL**

**Ou lien direct** :
```
http://localhost:3000/d/esp32_iot_dashboard/esp32-iot-dashboard-ufhb-m1-bdgl
```

### **Panneaux du dashboard**

Le dashboard contient 5 visualisations :

1. **Graphique de température** (Time Series)
   - Évolution dans le temps avec moyennes, min, max

2. **Graphique d'humidité** (Time Series)
   - Évolution dans le temps avec statistiques

3. **Jauge de température actuelle** (Gauge)
   - Affichage instantané avec code couleur
   - Seuils : Bleu (<20°C), Vert (20-25°C), Orange (25-30°C), Rouge (>30°C)

4. **Jauge d'humidité actuelle** (Gauge)
   - Affichage instantané avec code couleur
   - Seuils : Rouge (<30%), Orange (30-40%), Vert (40-70%), Bleu (>70%)

5. **Statistiques par capteur** (Bar Gauge)
   - Vue agrégée par device_id et location

**Auto-refresh** : 5 secondes
**Plage par défaut** : 15 dernières minutes

### **Créer des requêtes Flux personnalisées**

**Exemple - Moyenne de température sur 1 heure** :
```flux
from(bucket: "raw_7d")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "environment")
  |> filter(fn: (r) => r["_field"] == "temperature")
  |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
```

**Exemple - Filtrer par device** :
```flux
from(bucket: "raw_7d")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r["_measurement"] == "environment")
  |> filter(fn: (r) => r["device_id"] == "ESP32_Wokwi_001")
  |> filter(fn: (r) => r["_field"] == "temperature")
```

Pour plus d'exemples, consultez le [guide complet](GUIDE-DASHBOARD-GRAFANA.md).

---

## 🔌 Simulation ESP32

### **Configuration du capteur DHT22**

Le projet ESP32 simule un capteur DHT22 qui mesure :
- **Température** : Par défaut 27.5°C
- **Humidité** : Par défaut 65%

### **Modifier les valeurs simulées**

Éditez [`esp32-wokwi-project/diagram.json`](esp32-wokwi-project/diagram.json) :

```json
{
  "type": "wokwi-dht22",
  "attrs": {
    "temperature": "30.5",  // ← Changez ici (°C)
    "humidity": "75"        // ← Changez ici (%)
  }
}
```

Puis recompilez et relancez la simulation.

### **Format du payload MQTT**

Le ESP32 envoie les données au format **InfluxDB Line Protocol** :

```
measurement,tag1=value1,tag2=value2 field1=value1,field2=value2
```

**Exemple réel** :
```
environment,location=cocody,device_id=ESP32_Wokwi_001,sensor=DHT22 temperature=27.5,humidity=65.0
```

**Décomposition** :
- **Measurement** : `environment`
- **Tags** : `location=cocody`, `device_id=ESP32_Wokwi_001`, `sensor=DHT22`
- **Fields** : `temperature=27.5`, `humidity=65.0`

### **Configuration réseau**

Le ESP32 se connecte à votre broker MQTT local. Modifiez l'IP dans [`esp32-wokwi-project/src/main.cpp`](esp32-wokwi-project/src/main.cpp) :

```cpp
const char* mqtt_server = "VOTRE_IP_LOCALE";  // Ex: "192.168.1.3"
```

Pour trouver votre IP :
```bash
ipconfig  # Windows
```

---

## 🐛 Dépannage

### **Problème : Dashboard Grafana affiche "No data"**

**Causes possibles** :

1. **Simulation Wokwi non lancée**
   ```bash
   # Solution : Lancez la simulation
   F1 → Wokwi: Start Simulator
   ```

2. **Token InfluxDB incorrect**
   ```bash
   # Vérifiez que le token est le même dans :
   # - telegraf/telegraf.conf
   # - grafana/provisioning/datasources/influxdb.yml
   ```

3. **Plage de temps incorrecte**
   ```
   # Dans Grafana, changez "Last 15 minutes" pour "Last 1 hour"
   ```

4. **Pas de données dans InfluxDB**
   ```bash
   # Vérifiez avec :
   ./check-influxdb-data.bat  # Windows
   ```

### **Problème : Erreur de connexion MQTT ESP32**

**Code erreur -2 : Échec de connexion**

```bash
# 1. Vérifiez l'IP du serveur MQTT
ipconfig  # Notez votre IP Wi-Fi

# 2. Modifiez src/main.cpp avec la bonne IP

# 3. Autorisez le port dans le Firewall (Windows)
./allow-mqtt-firewall.bat  # Exécuter en Admin
```

### **Problème : Telegraf n'écrit pas dans InfluxDB**

```bash
# Vérifiez les logs
docker-compose logs telegraf --tail 50

# Cherchez des erreurs d'authentification
# Si "unauthorized", le token est incorrect
```

### **Logs et diagnostics**

```bash
# Logs en temps réel
docker-compose logs -f

# Logs d'un service spécifique
docker-compose logs influxdb --tail 50
docker-compose logs telegraf --tail 50
docker-compose logs mosquitto --tail 50
docker-compose logs grafana --tail 50

# Statut des conteneurs
docker-compose ps

# Redémarrer un service
docker-compose restart <service_name>
```

---

## 🛠️ Commandes utiles

### **Gestion de la stack**

```bash
# Lancer tous les services
docker-compose up -d

# Arrêter tous les services (données conservées)
docker-compose down

# Arrêter et supprimer volumes (ATTENTION: perte de données)
docker-compose down -v

# Redémarrer un service
docker-compose restart telegraf

# Voir les logs
docker-compose logs -f

# Reconstruire les images
docker-compose build --no-cache
docker-compose up -d
```

### **MQTT**

```bash
# Publier un message de test
docker exec mosquitto mosquitto_pub -h localhost \
  -t "iot/CI/abidjan/test" \
  -m "environment,location=test,device_id=TEST temperature=25.0,humidity=60.0"

# S'abonner à tous les topics
docker exec mosquitto mosquitto_sub -h localhost -t "#" -v

# S'abonner à un topic spécifique
docker exec mosquitto mosquitto_sub -h localhost \
  -t "iot/CI/abidjan/#" -v
```

### **InfluxDB**

```bash
# Lancer une requête Flux
docker exec influxdb influx query \
  'from(bucket:"raw_7d") |> range(start: -1h) |> filter(fn: (r) => r._measurement == "environment") |> limit(n:10)' \
  --org UFHB-IoT

# Lister les buckets
docker exec influxdb influx bucket list --org UFHB-IoT

# Lister les tokens
docker exec influxdb influx auth list --org UFHB-IoT
```

---

## 📁 Structure du projet

```
iot-stack/
├── docker-compose.yml              # Orchestration des services (TP1 + MongoDB)
├── .gitignore                      # Fichiers ignorés par Git
├── README.md                       # Ce fichier
│
├── init_db.js                      # TP2 — collections, JSON Schema, 5 devices, index
├── queries.js                      # TP2 — requêtes Q1–Q6 (avec $lookup, + explain IXSCAN)
├── events_insert.js                # TP2 — génération de 50 events
├── validation_test.js              # TP2 — preuve live de la validation JSON Schema
├── sample_data.json                # TP2 — export mongoexport des 50 events
│
├── mosquitto/                      # Configuration Mosquitto
│   ├── config/
│   │   └── mosquitto.conf          # Config broker MQTT
│   ├── data/                       # Données persistantes (gitignored)
│   └── log/                        # Logs (gitignored)
│
├── telegraf/                       # Configuration Telegraf
│   └── telegraf.conf               # Config agent de collecte
│
├── grafana/                        # Configuration Grafana
│   └── provisioning/
│       ├── datasources/
│       │   └── influxdb.yml        # Datasource InfluxDB pré-configurée
│       └── dashboards/
│           ├── dashboard.yml       # Config provisioning
│           └── esp32-iot-dashboard.json  # Dashboard pré-configuré
│
├── esp32-wokwi-project/            # Projet ESP32 avec PlatformIO
│   ├── platformio.ini              # Config PlatformIO
│   ├── wokwi.toml                  # Config Wokwi
│   ├── diagram.json                # Schéma électronique (ESP32 + DHT22)
│   ├── src/
│   │   └── main.cpp                # Code ESP32
│   └── README.md                   # Guide du projet ESP32
│
├── wokwi-esp32-mqtt.ino            # Code Arduino (pour Wokwi.com)
├── WOKWI-SETUP.md                  # Guide setup Wokwi
├── GUIDE-DASHBOARD-GRAFANA.md      # Guide complet Grafana
│
└── Scripts Windows/                # Scripts utilitaires (*.bat)
    ├── test-mqtt.bat               # Tester la réception MQTT
    ├── check-influxdb-data.bat     # Vérifier les données InfluxDB
    ├── restart-telegraf.bat        # Redémarrer Telegraf
    ├── allow-mqtt-firewall.bat     # Autoriser port 1883 (Firewall)
    └── test-data-flow.bat          # Test complet du flux de données
```

---

## 📚 Documentation complémentaire

- **[WOKWI-SETUP.md](WOKWI-SETUP.md)** - Guide complet de configuration Wokwi
- **[GUIDE-DASHBOARD-GRAFANA.md](GUIDE-DASHBOARD-GRAFANA.md)** - Utilisation avancée de Grafana
- **[esp32-wokwi-project/README.md](esp32-wokwi-project/README.md)** - Documentation du projet ESP32

---

# TP2 — MongoDB IoT — M1 BDGL UFHB

> **Polyglot Persistence** : on conserve **InfluxDB** pour les métriques temps réel
> (température, humidité) et on ajoute **MongoDB** pour les **métadonnées** des
> capteurs (devices, localisation, configuration, événements/alertes).

| Service | Image | Port | UI | Login |
|---|---|---|---|---|
| **MongoDB** | mongo:7 | 27018 (hôte) → 27017 (conteneur) | — | admin / ufhb2024! |
| **Mongo Express** | mongo-express:1.0 | 8081 | http://localhost:8081 | (BasicAuth désactivé) |

- **Base** : `iot_abidjan`
- **Collections** : `devices` (validation JSON Schema stricte), `events` (TTL 90 jours)

---

## Prérequis (TP1 doit tourner)

La stack TP1 (Mosquitto · Telegraf · InfluxDB · Grafana) doit être opérationnelle.
Le TP2 **n'altère aucun service TP1** : il ajoute uniquement `mongodb` + `mongo-express`
et le volume `mongodb_data` au `docker-compose.yml`.

```bash
docker-compose config        # doit passer sans erreur
```

---

## Installation

```bash
# Démarre TOUTE la stack (TP1 + nouveaux services MongoDB)
docker-compose up -d

# Vérifier que mongodb et mongo-express tournent
docker-compose ps
```

- **Mongo Express** (admin web) : http://localhost:8081
- **MongoDB** (driver / mongosh / Compass depuis l'hôte) : `mongodb://admin:ufhb2024%21@localhost:27018/` *(port 27018, `!` encodé en `%21`)*
- **MongoDB** (depuis l'intérieur du conteneur / les `docker exec`) : `mongodb://admin:ufhb2024!@localhost:27017/`

> ℹ️ Le port hôte est **27018** (et non 27017) pour éviter un conflit avec un éventuel
> `mongod` natif Windows déjà installé sur la machine. Le port interne du conteneur
> reste 27017 (référencé par tous les `docker exec` ci-dessous).

---

## Exécution des scripts

> `mongosh` est embarqué dans l'image `mongo:7`. On peut donc tout exécuter via le conteneur
> (aucune installation locale requise). Les scripts sont montés depuis le dossier courant.

**Option A — via le conteneur (recommandé, aucune install) :**

```bash
# 1) Initialisation : collections + validation + 5 capteurs + index
docker exec -i mongodb mongosh "mongodb://admin:ufhb2024!@localhost:27017/iot_abidjan?authSource=admin" < init_db.js

# 2) Génération de 50 événements réalistes
docker exec -i mongodb mongosh "mongodb://admin:ufhb2024!@localhost:27017/iot_abidjan?authSource=admin" < events_insert.js

# 3) Les 5 requêtes (avec explain IXSCAN)
docker exec -i mongodb mongosh "mongodb://admin:ufhb2024!@localhost:27017/iot_abidjan?authSource=admin" < queries.js
```

**Option B — avec un `mongosh` installé localement :**

```bash
mongosh "mongodb://admin:ufhb2024%21@localhost:27018/iot_abidjan?authSource=admin" init_db.js
mongosh "mongodb://admin:ufhb2024%21@localhost:27018/iot_abidjan?authSource=admin" events_insert.js
mongosh "mongodb://admin:ufhb2024%21@localhost:27018/iot_abidjan?authSource=admin" queries.js
```

**Export / import des données d'exemple (`sample_data.json`) :**

```bash
# Export (régénère sample_data.json à partir de la base)
docker exec -i mongodb mongoexport \
  --uri "mongodb://admin:ufhb2024!@localhost:27017/iot_abidjan?authSource=admin" \
  --collection events --jsonArray --pretty > sample_data.json

# Import (recharge sample_data.json dans la collection events)
docker exec -i mongodb mongoimport \
  --uri "mongodb://admin:ufhb2024!@localhost:27017/iot_abidjan?authSource=admin" \
  --collection events --jsonArray < sample_data.json
```

---

## Résultats attendus Q1–Q6

| Requête | Description | Index / opérateurs | Résultat attendu |
|---|---|---|---|
| **Q1** | Capteurs actifs de Cocody | `config.active + commune` (composé) | `ESP32_001` (DHT22 + MQ135) — **IXSCAN** |
| **Q2** | Capteurs intégrant un DHT22 | `sensors` (multikey) | `ESP32_001`, `ESP32_015`, `ESP32_031`, `ESP32_058` |
| **Q3** | Capteurs ≤ 3 km du Plateau | `location` (2dsphere) via `$near` | `ESP32_042` (Plateau), `ESP32_031` (Marcory ≈ 2,9 km) — **IXSCAN** |
| **Q4** | Nb capteurs actifs / commune | `$match` + `$group` + `$sort` | 4 communes (cocody, yopougon, plateau, marcory), `nb_devices = 1` |
| **Q5** | Tri par distance depuis Cocody | `$geoNear` (2dsphere) | 5 capteurs triés : Cocody (0 m) → Adjamé → Plateau → Marcory → Yopougon |
| **Q6** | Top capteurs émetteurs + métadonnées | **`$lookup`** + `$group` + `$sort` + `$unwind` + `$project` | 5 lignes : `device_id`, `nb_events`, `commune`, `sensors`, `firmware` (jointure events ↔ devices) |

> 💡 **COLLSCAN vs IXSCAN** : `explain('executionStats')` (Q1 et Q3) doit afficher un
> `IXSCAN` / `GEO_NEAR_2DSPHERE` dans le `winningPlan`. Sans index, le même filtre
> donnerait un `COLLSCAN` (à comparer dans MongoDB Compass).
>
> 💡 **`$lookup`** (Q6) matérialise la relation `events.device_id → devices.device_id`.
> C'est l'illustration directe du choix « **Embed vs Reference** » : `location` et
> `commune` sont **embarqués** dans `events` pour les requêtes géo, alors que les
> métadonnées riches (sensors, firmware) sont **référencées** et chargées à la demande
> via `$lookup`.

---

## Structure du repo

```
tp1-iot-abidjan/
├── docker-compose.yml      # TP1 intact + MongoDB + Mongo Express
├── init_db.js              # Collections, validation JSON Schema, 5 devices, index
├── queries.js              # Q1–Q6 commentées (Q6 = $lookup, + explain IXSCAN)
├── events_insert.js        # 50 events générés dynamiquement
├── sample_data.json        # Export JSON des 50 events (format mongoexport --jsonArray)
├── README.md               # Ce document (TP1 + TP2)
└── [fichiers TP1 inchangés]
```

---

## Comparatif InfluxDB vs MongoDB

| Critère | InfluxDB | MongoDB |
|---|---|---|
| Type | Time-series | Document |
| Données IoT | Métriques (temp, hum) | Métadonnées (devices, config) |
| Requête | Flux | MQL / Aggregation |
| Rétention | 7 jours (TTL auto) | 90 jours (TTL index) |
| Géospatial | Non | Oui (2dsphere) |
| Schéma | Flexible | Validé (JSON Schema) |

---

## 🎓 Contexte académique

**Cours** : TP1 IoT (collecte & visualisation) + TP2 IoT (Polyglot Persistence — InfluxDB & MongoDB)
**Formation** : M1 BDGL (Big Data et Gouvernance Logicielle)
**Université** : Université Félix Houphouët-Boigny (UFHB)
**Année** : 2024-2025

---

## 📝 Licence

Ce projet est développé dans un cadre éducatif pour les TP1 & TP2 IoT du M1 BDGL à l'UFHB.

---

## 👥 Contributeurs

- **Leonel YAPI** - Développement et documentation
- **Encadrants UFHB** - Supervision académique

---

## 🔗 Liens utiles

- [Documentation Docker Compose](https://docs.docker.com/compose/)
- [Documentation InfluxDB 2.x](https://docs.influxdata.com/influxdb/v2/)
- [Documentation Telegraf](https://docs.influxdata.com/telegraf/)
- [Documentation Grafana](https://grafana.com/docs/grafana/latest/)
- [Documentation Wokwi](https://docs.wokwi.com/)
- [ESP32 Arduino Core](https://docs.espressif.com/projects/arduino-esp32/)
- [Flux Query Language](https://docs.influxdata.com/flux/v0/)
- [Documentation MongoDB](https://www.mongodb.com/docs/manual/)
- [MongoDB Aggregation Pipeline](https://www.mongodb.com/docs/manual/core/aggregation-pipeline/)
- [MongoDB Geospatial Queries (2dsphere)](https://www.mongodb.com/docs/manual/geospatial-queries/)
- [Mongo Express](https://github.com/mongo-express/mongo-express)

---

<div align="center">

**🌍 Stack IoT Complète - De la simulation à la visualisation, jusqu'à la persistance polyglotte (InfluxDB + MongoDB)**

Développé avec ❤️ pour le M1 BDGL - UFHB

</div>
