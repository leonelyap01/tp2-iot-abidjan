/**
 * TP2 — MongoDB IoT — M1 BDGL
 * UFHB — 2024-2025
 * Auteur : Leonel YAPI
 *
 * Initialisation complète de la base "iot_abidjan" :
 *   a) Collection "devices" avec validation JSON Schema stricte
 *   b) Collection "events" avec index TTL 90 jours
 *   c) Insertion des 5 capteurs (un par commune représentée)
 *   d) Index (unique, 2dsphere, composé, multikey)
 *
 * Exécution :
 *   mongosh "mongodb://admin:ufhb2024!@localhost:27017/iot_abidjan?authSource=admin" init_db.js
 */

// On se place explicitement sur la base iot_abidjan (robuste quel que soit l'appel)
db = db.getSiblingDB('iot_abidjan');

// Idempotence : on repart d'un état propre à chaque exécution du script
db.devices.drop();
db.events.drop();

// ════════════════════════════════════════════════════════════════
// a) Collection "devices" — validation JSON Schema STRICTE
//    validationAction: 'error' => tout document non conforme est rejeté
// ════════════════════════════════════════════════════════════════
db.createCollection('devices', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['device_id', 'commune', 'location', 'sensors', 'createdAt'],
      additionalProperties: true,
      properties: {
        device_id: {
          bsonType: 'string',
          description: 'Identifiant unique du capteur — requis (string)'
        },
        name: {
          bsonType: 'string',
          description: 'Nom lisible du capteur'
        },
        commune: {
          enum: ['cocody', 'yopougon', 'plateau', 'marcory', 'adjame'],
          description: "Commune d'Abidjan — doit appartenir a l'enum"
        },
        location: {
          bsonType: 'object',
          required: ['type', 'coordinates'],
          description: 'Point GeoJSON [longitude, latitude]',
          properties: {
            type: {
              enum: ['Point'],
              description: 'Doit valoir "Point"'
            },
            coordinates: {
              bsonType: 'array',
              minItems: 2,
              maxItems: 2,
              items: { bsonType: 'number' },
              description: '[lng, lat]'
            }
          }
        },
        sensors: {
          bsonType: 'array',
          minItems: 1,
          items: { bsonType: 'string' },
          description: 'Liste des capteurs embarques — au moins 1 element'
        },
        firmware: {
          bsonType: 'string',
          description: 'Version du firmware'
        },
        config: {
          bsonType: 'object',
          required: ['active'],
          properties: {
            interval_s: { bsonType: 'number', description: "Intervalle d'envoi (s)" },
            active: { bsonType: 'bool', description: 'Capteur actif ?' }
          }
        },
        createdAt: {
          bsonType: 'date',
          description: 'Date de creation — requis (date)'
        }
      }
    }
  },
  validationAction: 'error',
  validationLevel: 'strict'
});
print('Collection "devices" creee (validation JSON Schema stricte).');

// ════════════════════════════════════════════════════════════════
// b) Collection "events" — index TTL 90 jours (7 776 000 secondes)
//    MongoDB purge automatiquement les documents > 90 jours.
// ════════════════════════════════════════════════════════════════
db.events.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 });
print('Collection "events" : index TTL 90 jours cree sur "timestamp".');

// ════════════════════════════════════════════════════════════════
// c) insertMany — 5 capteurs representant les communes d'Abidjan
// ════════════════════════════════════════════════════════════════
const now = new Date();
db.devices.insertMany([
  {
    device_id: 'ESP32_001',
    name: 'Cocody Centre',
    commune: 'cocody',
    location: { type: 'Point', coordinates: [-4.0083, 5.3540] },
    sensors: ['DHT22', 'MQ135'],
    firmware: '2.1.3',
    config: { interval_s: 30, active: true },
    createdAt: now
  },
  {
    device_id: 'ESP32_015',
    name: 'Yopougon Marche',
    commune: 'yopougon',
    location: { type: 'Point', coordinates: [-4.0748, 5.3396] },
    sensors: ['DHT22'],
    firmware: '2.0.1',
    config: { interval_s: 60, active: true },
    createdAt: now
  },
  {
    device_id: 'ESP32_042',
    name: 'Plateau Indenie',
    commune: 'plateau',
    location: { type: 'Point', coordinates: [-4.0167, 5.3167] },
    sensors: ['MQ135'],
    firmware: '1.8.0',
    config: { interval_s: 60, active: true },
    createdAt: now
  },
  {
    device_id: 'ESP32_031',
    name: 'Marcory Zone 4',
    commune: 'marcory',
    location: { type: 'Point', coordinates: [-3.9951, 5.3013] },
    sensors: ['DHT22', 'GPS_NEO6M'],
    firmware: '2.1.3',
    config: { interval_s: 30, active: true },
    createdAt: now
  },
  {
    device_id: 'ESP32_058',
    name: 'Adjame Marche',
    commune: 'adjame',
    location: { type: 'Point', coordinates: [-4.0234, 5.3634] },
    sensors: ['DHT22', 'MQ135'],
    firmware: '2.1.3',
    config: { interval_s: 120, active: false },
    createdAt: now
  }
]);
print('5 capteurs inseres dans "devices".');

// ════════════════════════════════════════════════════════════════
// d) Index (dans l'ordre demande)
// ════════════════════════════════════════════════════════════════
db.devices.createIndex({ device_id: 1 }, { unique: true });        // unicite
db.devices.createIndex({ location: '2dsphere' });                  // geospatial
db.devices.createIndex({ 'config.active': 1, commune: 1 });        // compose
db.devices.createIndex({ sensors: 1 });                            // multikey
db.events.createIndex({ device_id: 1, timestamp: -1 });            // events
print('Index crees.');

// ════════════════════════════════════════════════════════════════
// Verifications
// ════════════════════════════════════════════════════════════════
print("=== Index devices ===");  printjson(db.devices.getIndexes());
print("=== Index events ===");   printjson(db.events.getIndexes());
print("=== Devices count ==="); print(db.devices.countDocuments());
