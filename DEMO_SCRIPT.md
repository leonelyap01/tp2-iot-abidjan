# 🎬 DEMO SCRIPT — TP2 MongoDB IoT — Présentation live

> **Auteur** : Leonel YAPI · **Cours** : M1 BDGL — UFHB · **Durée cible** : ~10 min
> **Note visée** : 20/20 — chaque critère est explicitement adressé.

---

## ⚙️ Préparation — 30 min avant d'entrer en salle

| ✓ | Action |
|---|---|
| ☐ | `docker compose up -d` puis vérifier `docker compose ps` — 6 services `Up` |
| ☐ | Relancer `init_db.js` + `events_insert.js` pour données fraîches |
| ☐ | Vérifier `ipconfig` → IP Wi-Fi == celle dans `esp32-wokwi-project/src/main.cpp` ligne 20 |
| ☐ | Wokwi simulation démarrée et `mosquitto_sub` reçoit des messages |
| ☐ | MongoDB Compass **connecté** : `mongodb://admin:ufhb2024!@localhost:27017/?authSource=admin` |
| ☐ | Mongo Express ouvert : http://localhost:8081 |
| ☐ | Grafana ouvert : http://localhost:3000 — dashboard ESP32 chargé |
| ☐ | VS Code ouvert avec `queries.js` visible, gros zoom (Ctrl++ x3) |
| ☐ | 2 terminaux PowerShell pré-ouverts dans `iot-stack/`, gros zoom |
| ☐ | Captures `IXSCAN`, `COLLSCAN`, `GEO_NEAR_2DSPHERE` dans `/screenshots/` + imprimées sur 1 A4 (plan B) |

---

## ⏱ Plan chronologique — 10 min

| Bloc | Durée | Critère | Points |
|---|:---:|---|:---:|
| 1 · Intro & contexte | 1:00 | — | — |
| 2 · Validation JSON Schema | 1:30 | C1 | 3 |
| 3 · Index | 1:30 | C2 | 4 |
| 4 · Requêtes Q1–Q6 | 3:00 | C3 | 7 |
| 5 · `explain()` IXSCAN ⭐ | 3:00 | C4 | 3 |
| 6 · Clôture Polyglot Persistence | 0:45 | C5 (rapport) | 3 |
| **Total** | **~10 min** | | **20** |

---

## 🎬 BLOC 1 — Intro & contexte · `[0:00–1:00]`

**Ne rien cliquer. Parle au prof, présente le sujet.**

> *« TP2 — Polyglot Persistence. Le TP1 a posé la stack temps réel — ESP32 simulé, MQTT, InfluxDB, Grafana. Le TP2 ajoute MongoDB pour gérer les métadonnées des capteurs IoT d'Abidjan : qui est le capteur, où il est, ce qu'il mesure. Les mesures temps réel restent dans InfluxDB. Les métadonnées vivent dans MongoDB. Chaque base fait ce qu'elle fait de mieux. »*

**Montre rapidement** :
```powershell
docker compose ps
```
> *« 6 services. TP1 inchangé, j'ai ajouté `mongodb` et `mongo-express`. »*

---

## 🟢 BLOC 2 — Critère 1 · Validation JSON Schema · `[1:00–2:30]` · **3 pts**

### Étape 2.1 — Afficher la règle de validation

```powershell
docker exec mongodb mongosh --quiet "mongodb://admin:ufhb2024!@localhost:27017/iot_abidjan?authSource=admin" --eval "JSON.stringify(db.getCollectionInfos({name:'devices'})[0].options.validator, null, 2)"
```

**Pointe à l'écran les 4 éléments suivants en disant la phrase associée :**

| Pointe ça | Dis ça |
|---|---|
| `"required": ["device_id","commune","location","sensors","createdAt"]` | *« 5 champs obligatoires. »* |
| `"enum": ["cocody","yopougon","plateau","marcory","adjame"]` | *« Liste fermée des 5 communes. »* |
| Bloc `"location"` avec `type: "Point"` + `coordinates [minItems:2, maxItems:2]` | *« GeoJSON Point strict. C'est ce qui rend possible l'index 2dsphere. »* |
| `"active": { "bsonType": "bool" }` dans `config` | *« La validation descend dans les sous-documents. »* |

### Étape 2.2 — Prouver le rejet en live

```powershell
Get-Content validation_test.js | docker exec -i mongodb mongosh --quiet "mongodb://admin:ufhb2024!@localhost:27017/iot_abidjan?authSource=admin"
```

**Le prof voit** :
```
OK — document REJETE par la validation
  code     : 121  (= DocumentValidationFailure)
  codeName : DocumentValidationFailure
(Verification : nb de devices toujours = 5)
```

> *« Document avec `commune: 'paris'` — hors enum — et sans `location`. Code **121 DocumentValidationFailure**. Le compteur reste à 5. La base protège son intégrité. »*

✅ **3/3 sécurisés**

---

## 🟢 BLOC 3 — Critère 2 · Index · `[2:30–4:00]` · **4 pts**

### Étape 3.1 — Lister tous les index

```powershell
docker exec mongodb mongosh --quiet "mongodb://admin:ufhb2024!@localhost:27017/iot_abidjan?authSource=admin" --eval "print('--- devices ---'); db.devices.getIndexes().forEach(i => print('  ' + i.name)); print('--- events ---'); db.events.getIndexes().forEach(i => print('  ' + i.name + (i.expireAfterSeconds ? ' (TTL ' + i.expireAfterSeconds + 's)' : '')))"
```

**Le prof voit** 8 index :
```
--- devices ---
  _id_
  device_id_1                  (unique)
  location_2dsphere            (2dsphere)
  config.active_1_commune_1    (composé)
  sensors_1                    (multikey)
--- events ---
  _id_
  timestamp_1 (TTL 7776000s)   (TTL 90 jours)
  device_id_1_timestamp_-1     (composé)
```

### Étape 3.2 — Justifier les 4 types demandés

**En pointant chaque ligne** :

> *« `device_id_1` — index **unique**, garantit l'unicité du capteur.*
> *`location_2dsphere` — index **géospatial**, exigé par `$near` et `$geoNear`.*
> *`config.active_1_commune_1` — index **composé**, ordre choisi pour servir Q1.*
> *`sensors_1` — index **multikey** sur tableau, parfait pour Q2.*
> *Sur events : un index **TTL 90 jours** qui purge automatiquement, et un composé `device_id + timestamp -1` pour l'historique d'un capteur. »*

✅ **4/4 sécurisés**

---

## 🟢 BLOC 4 — Critère 3 · Requêtes Q1–Q6 · `[4:00–7:00]` · **7 pts**

### Étape 4.1 — Montrer le code commenté (15 s)

**Dans VS Code** → ouvre [queries.js](queries.js), scroll rapide :
> *« Chaque requête a son en-tête : objectif, index utilisé, résultat attendu. »*

### Étape 4.2 — Exécution complète

```powershell
Get-Content queries.js | docker exec -i mongodb mongosh --quiet "mongodb://admin:ufhb2024!@localhost:27017/iot_abidjan?authSource=admin"
```

**Pendant que ça défile**, annonce **avant** que le résultat apparaisse :

| Q | Phrase à dire pendant le scroll |
|---|---|
| **Q1** | *« Capteurs actifs de Cocody → `ESP32_001`, scanné via l'index composé. »* |
| **Q2** | *« Tous les DHT22, index multikey sur le tableau `sensors` → 4 capteurs. »* |
| **Q3** | *« Moins de 3 km du Plateau → Plateau lui-même + Marcory à 2,9 km, via 2dsphere. »* |
| **Q4** | *« Agrégation `$match` + `$group` par commune, 4 communes actives. */* `adjame` exclu car inactif. »* |
| **Q5** | *« `$geoNear` depuis Cocody → tri par distance, Adjamé à 1,9 km en premier. »* |
| **Q6** ⭐ | *« En bonus, jointure events ↔ devices via `$lookup`. Illustre Embed vs Reference : `location` est embarqué dans events, mais firmware et sensors sont référencés et chargés à la demande. »* |

✅ **7/7 sécurisés** + bonus pédagogique Q6 (`$lookup`)

---

## 🔥 BLOC 5 — Critère 4 · `explain()` IXSCAN ⭐ · `[7:00–10:00]` · **3 pts — MOMENT CLÉ**

### Étape 5.1 — IXSCAN avec index (Q1) 📸

**Dans Compass** → `iot_abidjan` → `devices` → onglet **Explain Plan**.

Colle ce filtre :
```json
{ "commune": "cocody", "config.active": true }
```

Clique **Execute Explain**.

**Le prof voit** : arbre `FETCH → IXSCAN`, `indexName: config.active_1_commune_1`, `nReturned: 1`, `totalDocsExamined: 1`.

> *« `IXSCAN` dans le `winningPlan`, l'index composé est utilisé. Un seul doc scanné pour un seul retourné — efficacité maximale. »*

### Étape 5.2 — DROP l'index → COLLSCAN 📸

**Dans Compass** → `devices` → onglet **Indexes** → drop `config.active_1_commune_1`.

Reviens dans **Explain Plan** → re-exécute le même filtre.

**Le prof voit** : `COLLSCAN`, `totalDocsExamined: 5`.

> *« Sans l'index, MongoDB scanne **toute la collection**. 5 docs au lieu de 1. Sur 5 capteurs c'est anecdotique, sur 5 millions c'est l'écart entre 10 ms et 30 secondes. C'est la valeur des index. »*

### Étape 5.3 — Recréer l'index immédiatement

**Dans Compass Indexes** → **Create Index** → clé `{ "config.active": 1, "commune": 1 }`.

OU en CLI rapide :
```powershell
docker exec mongodb mongosh --quiet "mongodb://admin:ufhb2024!@localhost:27017/iot_abidjan?authSource=admin" --eval "db.devices.createIndex({'config.active':1, commune:1})"
```

### Étape 5.4 — Q3 GEO_NEAR_2DSPHERE 📸

**Explain Plan** → filtre :
```json
{ "location": { "$near": { "$geometry": { "type": "Point", "coordinates": [-4.0167, 5.3167] }, "$maxDistance": 3000 } } }
```

**Le prof voit** : `GEO_NEAR_2DSPHERE` dans le plan.

> *« Pour la géo, c'est l'étage `GEO_NEAR_2DSPHERE` qui s'active. `$near` exige l'index 2dsphere — pas de fallback possible. »*

✅ **3/3 sécurisés**

---

## 🎯 BLOC 6 — Clôture Polyglot Persistence · `[10:00–10:45]` · **3 pts (rapport)**

**Dans VS Code** → ouvre [README.md](README.md) → scroll jusqu'à la section *Comparatif InfluxDB vs MongoDB* :

| Critère | InfluxDB | MongoDB |
|---|---|---|
| Type | Time-series | Document |
| Données IoT | Métriques (temp, hum) | Métadonnées (devices, config) |
| Requête | Flux | MQL / Aggregation |
| Rétention | 7 jours (TTL auto) | 90 jours (TTL index) |
| Géospatial | Non | Oui (2dsphere) |
| Schéma | Flexible | Validé (JSON Schema) |

> *« Pour résumer : les mesures temps réel — température, humidité — vivent dans **InfluxDB**, optimisé pour les séries temporelles. Les métadonnées — qui est ce capteur, où il est, quels capteurs il embarque — vivent dans **MongoDB**, qui sait faire du géospatial, de la validation de schéma, et des agrégations riches. Le `device_id` est le seul pont entre les deux. Chaque base fait ce qu'elle sait faire de mieux : c'est la **Polyglot Persistence**. »*

✅ **3/3 sécurisés**

---

## 🧠 ANNEXE A — Questions probables du prof + réponses prêtes

| Question | Réponse 1 phrase |
|---|---|
| **Pourquoi embarquer `location` dans `events` ?** | *« Dénormalisation volontaire : un capteur ne bouge pas. Ça m'évite un `$lookup` à chaque requête géo. »* |
| **Pourquoi pas tout en InfluxDB ?** | *« InfluxDB n'a pas d'index géospatial ni de validation de schéma riche. MongoDB excelle là-dessus. »* |
| **Pourquoi TTL 90 jours sur events ?** | *« Cohérent avec une rétention métier (3 mois d'historique d'alertes), contre 7 j pour les métriques brutes InfluxDB. »* |
| **Pourquoi `$near` plutôt que `$geoWithin` ?** | *« `$near` trie automatiquement par distance, parfait pour Q3. »* |
| **Que se passe-t-il sans `device_id` ?** | *« Rejeté à 2 niveaux : validation JSON Schema (`required`) ET index unique. »* |
| **C'est quoi un index multikey ?** | *« Index sur un champ tableau : Mongo indexe chaque élément séparément. `sensors: 'DHT22'` matche tous les docs dont le tableau contient DHT22. »* |
| **Pourquoi mongo-express ?** | *« UI web pour le correcteur — admin sans installer Compass. »* |
| **Pourquoi pas une seule base ?** | *« Polyglot Persistence : chaque base a ses forces. Combiner > compromettre. »* |
| **Comment scaler ?** | *« InfluxDB downsample + retention policies, MongoDB sharding par commune ou par device_id. »* |

---

## 🆘 ANNEXE B — Plan B si pépin live

| Pépin | Action |
|---|---|
| Docker répond mal | Affiche `sample_data.json` dans VS Code → commente la structure |
| Compass refuse de se connecter | Bascule sur Mongo Express (déjà ouvert) — onglet `devices` |
| Wifi/projecteur lâche | A4 imprimée : diagramme E-R + 3 captures IXSCAN/COLLSCAN/GEO_NEAR |
| Tu te trompes dans une commande | `Ctrl+C` → `clear` → relance posément, ne panique pas |
| ESP32 ne publie pas | Le TP2 ne dépend PAS de Wokwi en temps réel — les 50 events sont déjà en base |
| Compass plante en milieu d'explain | Tu as les captures imprimées + `queries.js` imprime déjà le `winningPlan` |

---

## 📋 ANNEXE C — Récap matériel à emporter

- 💻 PC avec **stack démarrée**, Compass + Mongo Express + Grafana + VS Code + 2 terminaux PS pré-ouverts
- 🔋 Chargeur
- 📄 1 feuille A4 imprimée : diagramme E-R + tableau d'index + 3 captures (IXSCAN / COLLSCAN / GEO_NEAR_2DSPHERE)
- 🧠 Ce document `DEMO_SCRIPT.md` sur le téléphone (mode lecture seule)

---

## 🎓 Récap notation visée

| Critère | Pts | Bloc démo |
|---|:---:|---|
| Validation JSON Schema | 3 | Bloc 2 |
| Index | 4 | Bloc 3 |
| Q1–Q5 commentées | 7 | Bloc 4 |
| `explain()` IXSCAN | 3 | Bloc 5 ⭐ |
| Rapport / comparatif | 3 | Bloc 6 + README |
| **TOTAL** | **20** | |

**+ Bonus Q6 ($lookup)** : couvre l'objectif pédagogique `$lookup` mentionné dans le syllabus mais absent de la grille.

---

> 🎯 **Mantra de présentation** : on prouve, on ne raconte pas. Chaque critère a sa preuve à l'écran. Tu maîtrises ton sujet — la démo le démontre.
