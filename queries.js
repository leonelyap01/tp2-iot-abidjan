/**
 * TP2 — MongoDB IoT — M1 BDGL
 * UFHB — 2024-2025
 * Auteur : Leonel YAPI
 *
 * 5 requetes commentees demontrant l'usage des index MongoDB.
 * A executer APRES init_db.js (et idealement events_insert.js).
 *
 * Exécution :
 *   mongosh "mongodb://admin:ufhb2024!@localhost:27017/iot_abidjan?authSource=admin" queries.js
 */

db = db.getSiblingDB('iot_abidjan');

// ══ Q1 — Capteurs actifs de Cocody ════════════════════════════════
// Objectif : lister les capteurs actifs situes dans la commune de Cocody.
// Index utilise : { 'config.active': 1, commune: 1 }  (index compose)
// Resultat attendu : ESP32_001 (DHT22 + MQ135).
print('\n══ Q1 — Capteurs actifs de Cocody ══');
printjson(
  db.devices.find({ commune: 'cocody', 'config.active': true })
    .projection({ device_id: 1, name: 1, sensors: 1, _id: 0 })
    .toArray()
);
// Verification du plan : on doit voir un IXSCAN (et non un COLLSCAN)
print('--- Q1 explain (winningPlan) ---');
printjson(
  db.devices.find({ commune: 'cocody', 'config.active': true })
    .explain('executionStats').queryPlanner.winningPlan
);

// ══ Q2 — Capteurs integrant un DHT22 ══════════════════════════════
// Objectif : trouver tous les capteurs dont la liste "sensors" contient DHT22.
// Index utilise : { sensors: 1 }  (index multikey sur un tableau)
// Resultat attendu : ESP32_001, ESP32_015, ESP32_031, ESP32_058.
print('\n══ Q2 — Capteurs integrant un DHT22 ══');
printjson(
  db.devices.find({ sensors: 'DHT22' })
    .projection({ device_id: 1, commune: 1, sensors: 1, _id: 0 })
    .toArray()
);

// ══ Q3 — Capteurs dans un rayon de 3 km du Plateau ════════════════
// Objectif : capteurs a moins de 3000 m du Plateau Indenie.
// Index utilise : { location: '2dsphere' }  ($near l'exige)
// Resultat attendu : ESP32_042 (Plateau) puis ESP32_031 (Marcory).
print('\n══ Q3 — Capteurs dans un rayon de 3 km du Plateau ══');
printjson(
  db.devices.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [-4.0167, 5.3167] },
        $maxDistance: 3000
      }
    }
  }).projection({ device_id: 1, commune: 1, _id: 0 }).toArray()
);
// Verification du plan : IXSCAN (GEO_NEAR_2DSPHERE)
print('--- Q3 explain (winningPlan) ---');
printjson(
  db.devices.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [-4.0167, 5.3167] },
        $maxDistance: 3000
      }
    }
  }).explain('executionStats').queryPlanner.winningPlan
);

// ══ Q4 — Nombre de capteurs actifs par commune ════════════════════
// Objectif : agreger le nombre de capteurs actifs par commune + types de capteurs.
// Etapes : $match (actifs) -> $group (par commune) -> $sort (decroissant).
// Resultat attendu : 4 communes (cocody, yopougon, plateau, marcory), nb_devices = 1.
print('\n══ Q4 — Nombre de capteurs actifs par commune ══');
printjson(
  db.devices.aggregate([
    { $match: { 'config.active': true } },
    { $group: {
        _id: '$commune',
        nb_devices: { $sum: 1 },
        sensor_types: { $addToSet: '$sensors' }
    }},
    { $sort: { nb_devices: -1 } }
  ]).toArray()
);

// ══ Q5 — Tous les capteurs tries par distance depuis Cocody ═══════
// Objectif : classer TOUS les capteurs (< 10 km) du plus proche au plus loin de Cocody.
// Etapes : $geoNear (calcule distance_m, exige l'index 2dsphere) -> $project -> $sort.
// Resultat attendu : 5 capteurs, distance_m croissante (Cocody = 0 m).
print('\n══ Q5 — Capteurs tries par distance depuis Cocody ══');
printjson(
  db.devices.aggregate([
    { $geoNear: {
        near: { type: 'Point', coordinates: [-4.0083, 5.354] },
        distanceField: 'distance_m',
        maxDistance: 10000,
        spherical: true
    }},
    { $project: { device_id: 1, commune: 1, distance_m: 1, _id: 0 } },
    { $sort: { distance_m: 1 } }
  ]).toArray()
);

// ══ Q6 — Top capteurs emetteurs + jointure devices (lookup) ═══════
// Objectif : pour les 5 capteurs ayant emis le plus d'events, enrichir avec
//            leurs metadonnees (commune, sensors, firmware) issues de "devices".
// Pipeline : $group (compte par device) -> $sort -> $limit
//         -> $lookup (jointure events.device_id == devices.device_id)
//         -> $unwind (1 device par event_group) -> $project (mise en forme).
// Index utilise : { device_id: 1 } unique sur devices (cote lookup) +
//                 { device_id: 1, timestamp: -1 } sur events (cote $group).
// Resultat attendu : 5 lignes avec nb_events + metadonnees du capteur correspondant.
print('\n══ Q6 — Top capteurs emetteurs + jointure devices ($lookup) ══');
printjson(
  db.events.aggregate([
    { $group: { _id: '$device_id', nb_events: { $sum: 1 } } },
    { $sort: { nb_events: -1 } },
    { $limit: 5 },
    { $lookup: {
        from: 'devices',
        localField: '_id',
        foreignField: 'device_id',
        as: 'device'
    }},
    { $unwind: '$device' },
    { $project: {
        _id: 0,
        device_id: '$_id',
        nb_events: 1,
        commune: '$device.commune',
        sensors: '$device.sensors',
        firmware: '$device.firmware'
    }}
  ]).toArray()
);
