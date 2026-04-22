# 📊 Guide Dashboard Grafana - IoT Stack ESP32

## ✅ Ce qui a été configuré

### 1. **Dashboard automatique créé**

Un dashboard complet a été créé avec les visualisations suivantes :

#### **Panneaux disponibles** :
1. **Graphique de température** (Time Series)
   - Affiche l'évolution de la température dans le temps
   - Avec moyennes, min, max

2. **Graphique d'humidité** (Time Series)
   - Affiche l'évolution de l'humidité dans le temps
   - Avec moyennes, min, max

3. **Jauge de température actuelle** (Gauge)
   - Affichage en temps réel de la dernière valeur
   - Code couleur : bleu < 20°C, vert 20-25°C, orange 25-30°C, rouge > 30°C

4. **Jauge d'humidité actuelle** (Gauge)
   - Affichage en temps réel de la dernière valeur
   - Code couleur : rouge < 30%, orange 30-40%, vert 40-70%, bleu > 70%

5. **Statistiques par capteur** (Bar Gauge)
   - Vue par device_id et location

### 2. **Datasource InfluxDB configurée**

- ✅ Connexion à InfluxDB via `http://influxdb:8086`
- ✅ Organization : `UFHB-IoT`
- ✅ Bucket : `raw_7d`
- ✅ Token API configuré
- ✅ Language : Flux (InfluxDB 2.x)

### 3. **Auto-refresh configuré**

- Le dashboard se rafraîchit **toutes les 5 secondes**
- Affiche les **15 dernières minutes** par défaut

---

## 🚀 Comment accéder au Dashboard

### **Étape 1 : Lancer la simulation Wokwi**

Si la simulation n'est pas déjà lancée :

1. Ouvrez le projet `esp32-wokwi-project` dans VSCode
2. Appuyez sur `F1`
3. Tapez : `Wokwi: Start Simulator`
4. Vérifiez dans le Serial Monitor que MQTT est connecté

### **Étape 2 : Ouvrir Grafana**

1. **Ouvrez votre navigateur** : [http://localhost:3000](http://localhost:3000)
2. **Login** :
   - Username : `admin`
   - Password : `ufhb2024!`

### **Étape 3 : Accéder au dashboard**

**Méthode A : Via le menu**

1. Cliquez sur **☰ Menu** (en haut à gauche)
2. Allez dans **Dashboards**
3. Cherchez : **"ESP32 IoT Dashboard - UFHB M1 BDGL"**
4. Cliquez dessus

**Méthode B : Lien direct**

Une fois connecté, allez sur :
```
http://localhost:3000/d/esp32_iot_dashboard/esp32-iot-dashboard-ufhb-m1-bdgl
```

---

## 🔍 Vérification du flux de données

### **Test 1 : Vérifier que MQTT reçoit des données**

Dans un terminal CMD :

```cmd
docker exec mosquitto mosquitto_sub -h localhost -t "iot/CI/abidjan/#" -v
```

Vous devriez voir (toutes les 10 secondes) :
```
iot/CI/abidjan/cocody/esp32_001 environment,location=cocody,device_id=ESP32_Wokwi_001,sensor=DHT22 temperature=27.5,humidity=65.0
```

### **Test 2 : Vérifier dans InfluxDB Data Explorer**

1. Ouvrez [http://localhost:8086](http://localhost:8086)
2. Login : `admin` / `ufhb2024!`
3. Cliquez sur **Data Explorer** (icône graphique)
4. **From** : `raw_7d`
5. **Filter** : Measurement = `environment`
6. **Filter** : Fields = `temperature`, `humidity`
7. Cliquez sur **Submit**

Vous devriez voir vos données !

### **Test 3 : Vérifier les logs Telegraf**

```cmd
docker-compose logs telegraf --tail 30
```

Cherchez des lignes comme :
```
[inputs.mqtt_consumer] Connected [tcp://mosquitto:1883]
```

Pas d'erreurs = ✅ Tout fonctionne !

---

## 🎨 Personnalisation du Dashboard

### **Changer les valeurs simulées du capteur**

Éditez le fichier : `esp32-wokwi-project/diagram.json`

```json
{
  "type": "wokwi-dht22",
  "attrs": {
    "temperature": "30.5",  // ← Changez ici (en °C)
    "humidity": "75"        // ← Changez ici (en %)
  }
}
```

Puis :
1. Arrêtez la simulation Wokwi (bouton Stop)
2. Recompilez le projet (`F1` → `PlatformIO: Build`)
3. Relancez la simulation (`F1` → `Wokwi: Start Simulator`)

### **Modifier le dashboard**

Dans Grafana :

1. Ouvrez le dashboard
2. Cliquez sur l'icône **⚙️ Settings** (en haut à droite)
3. Ou cliquez sur **Edit** sur n'importe quel panneau
4. Modifiez les requêtes, couleurs, seuils, etc.
5. Cliquez sur **Save dashboard**

### **Ajouter de nouveaux panneaux**

1. Cliquez sur **Add panel** (en haut à droite)
2. Sélectionnez le type de visualisation
3. Configurez la requête Flux :

**Exemple pour température** :
```flux
from(bucket: "raw_7d")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r["_measurement"] == "environment")
  |> filter(fn: (r) => r["_field"] == "temperature")
  |> aggregateWindow(every: v.windowPeriod, fn: mean, createEmpty: false)
```

---

## 📈 Exemples de requêtes Flux utiles

### **Moyenne de température sur 1 heure**
```flux
from(bucket: "raw_7d")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "environment")
  |> filter(fn: (r) => r["_field"] == "temperature")
  |> aggregateWindow(every: 5m, fn: mean)
```

### **Valeur min/max d'humidité**
```flux
from(bucket: "raw_7d")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "environment")
  |> filter(fn: (r) => r["_field"] == "humidity")
  |> aggregateWindow(every: 1h, fn: max)
```

### **Filtrer par device_id**
```flux
from(bucket: "raw_7d")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "environment")
  |> filter(fn: (r) => r["device_id"] == "ESP32_Wokwi_001")
  |> filter(fn: (r) => r["_field"] == "temperature")
```

---

## 🐛 Dépannage

### **Dashboard vide / Pas de données**

**Causes possibles** :

1. **Simulation Wokwi non lancée**
   - Solution : Lancez la simulation (`F1` → `Wokwi: Start Simulator`)

2. **Token InfluxDB incorrect dans Grafana**
   - Vérifiez : `grafana/provisioning/datasources/influxdb.yml`
   - Le token doit correspondre à celui dans `telegraf/telegraf.conf`

3. **Telegraf ne se connecte pas à InfluxDB**
   - Vérifiez les logs : `docker-compose logs telegraf`
   - Cherchez des erreurs d'authentification

4. **Pas de données dans InfluxDB**
   - Testez dans Data Explorer (voir Test 2 ci-dessus)
   - Si vide, vérifiez MQTT (voir Test 1)

### **Erreur "Failed to query"**

1. Allez dans **Grafana Settings** → **Data Sources**
2. Cliquez sur **InfluxDB**
3. Cliquez sur **Save & Test**
4. Vérifiez que le message est : ✅ "Data source is working"

Si erreur :
- Vérifiez le token dans `grafana/provisioning/datasources/influxdb.yml`
- Redémarrez Grafana : `docker-compose restart grafana`

### **Dashboard ne se rafraîchit pas**

- Vérifiez en haut à droite que l'auto-refresh est activé (5s)
- Cliquez sur le menu déroulant et sélectionnez "5s"

---

## 🎯 Fonctionnalités avancées

### **Alertes**

Vous pouvez créer des alertes si la température dépasse un seuil :

1. Éditez un panneau
2. Onglet **Alert**
3. Configurez une condition (ex: température > 30°C)
4. Configurez les notifications (email, Slack, etc.)

### **Variables de dashboard**

Créez des variables pour filtrer dynamiquement :

1. Dashboard Settings → **Variables** → **Add variable**
2. Type : **Query**
3. Requête pour lister les devices :
```flux
from(bucket: "raw_7d")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "environment")
  |> keep(columns: ["device_id"])
  |> distinct(column: "device_id")
```

### **Export de données**

Dans n'importe quel panneau :
- Cliquez sur **⋯** (en haut)
- **Inspect** → **Data**
- **Download CSV** ou **Download JSON**

---

## 📚 Ressources

- [Documentation Grafana](https://grafana.com/docs/grafana/latest/)
- [Flux Query Language](https://docs.influxdata.com/flux/v0/)
- [InfluxDB 2.x Docs](https://docs.influxdata.com/influxdb/v2/)
- [Wokwi Simulator Docs](https://docs.wokwi.com/)

---

**TP1 IoT — M1 BDGL — UFHB**
**Stack complète : ESP32 (Wokwi) → MQTT (Mosquitto) → Telegraf → InfluxDB → Grafana**

🎉 Profitez de votre dashboard IoT !
