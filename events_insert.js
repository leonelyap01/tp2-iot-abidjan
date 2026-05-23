/**
 * TP2 — MongoDB IoT — M1 BDGL
 * UFHB — 2024-2025
 * Auteur : Leonel YAPI
 *
 * Generation dynamique de 50 documents "events" realistes,
 * repartis sur les 5 capteurs et les 7 derniers jours.
 *
 * Exécution :
 *   mongosh "mongodb://admin:ufhb2024!@localhost:27017/iot_abidjan?authSource=admin" events_insert.js
 */

db = db.getSiblingDB('iot_abidjan');

// Metadonnees des capteurs : commune + position GeoJSON associees au device_id
const devices = [
  { device_id: 'ESP32_001', commune: 'cocody',   location: { type: 'Point', coordinates: [-4.0083, 5.3540] } },
  { device_id: 'ESP32_015', commune: 'yopougon', location: { type: 'Point', coordinates: [-4.0748, 5.3396] } },
  { device_id: 'ESP32_042', commune: 'plateau',  location: { type: 'Point', coordinates: [-4.0167, 5.3167] } },
  { device_id: 'ESP32_031', commune: 'marcory',  location: { type: 'Point', coordinates: [-3.9951, 5.3013] } },
  { device_id: 'ESP32_058', commune: 'adjame',   location: { type: 'Point', coordinates: [-4.0234, 5.3634] } }
];

const types = ['temperature', 'humidity', 'co2', 'alert'];
const severities = ['low', 'medium', 'high'];

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function round1(x) { return Math.round(x * 10) / 10; }

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const now = Date.now();

const events = [];
for (let i = 0; i < 50; i++) {
  const dev = devices[randInt(0, devices.length - 1)];
  const type = types[randInt(0, types.length - 1)];
  const timestamp = new Date(now - randInt(0, SEVEN_DAYS_MS)); // sur les 7 derniers jours

  const doc = {
    device_id: dev.device_id,
    commune: dev.commune,
    location: dev.location,
    type: type,
    timestamp: timestamp
  };

  if (type === 'temperature') {
    doc.value = round1(22 + Math.random() * 16);   // 22–38 °C
    doc.unit = '°C';
  } else if (type === 'humidity') {
    doc.value = round1(40 + Math.random() * 45);   // 40–85 %
    doc.unit = '%';
  } else if (type === 'co2') {
    doc.value = randInt(380, 800);                 // 380–800 ppm
    doc.unit = 'ppm';
  } else { // alert : seuil CO2 depasse + severite
    doc.value = randInt(801, 1200);                // > 800 ppm = seuil depasse
    doc.unit = 'ppm';
    doc.severity = severities[randInt(0, severities.length - 1)];
  }

  events.push(doc);
}

db.events.insertMany(events);
print("Events inseres : " + db.events.countDocuments());
