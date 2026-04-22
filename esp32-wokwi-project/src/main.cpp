/*
 * ESP32 MQTT IoT Stack - Wokwi Simulator (PlatformIO)
 * Envoie des données de température et humidité vers Mosquitto
 * Format: InfluxDB Line Protocol
 *
 * TP1 IoT M1 BDGL — UFHB
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// ===== CONFIGURATION WIFI =====
const char* ssid = "Wokwi-GUEST";
const char* password = "";

// ===== CONFIGURATION MQTT =====
// Wokwi tourne localement sur Windows, Mosquitto est dans Docker sur port 1883
// On utilise l'IP Wi-Fi actuelle (peut changer selon le réseau)
const char* mqtt_server = "10.0.27.187";  // IP Wi-Fi actuelle (ipconfig)
const int mqtt_port = 1883;
const char* mqtt_client_id = "ESP32_Wokwi_001";

// Topic MQTT (correspond à telegraf.conf: iot/CI/abidjan/#)
const char* mqtt_topic = "iot/CI/abidjan/cocody/esp32_001";

// ===== CONFIGURATION CAPTEUR DHT22 =====
#define DHTPIN 15      // GPIO 15
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// ===== CLIENTS =====
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ===== VARIABLES =====
unsigned long lastPublish = 0;
const long publishInterval = 10000; // 10 secondes

// ===== FONCTIONS =====

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connexion WiFi à ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connecté !");
  Serial.print("Adresse IP ESP32: ");
  Serial.println(WiFi.localIP());
}

void reconnect_mqtt() {
  while (!mqttClient.connected()) {
    Serial.print("Tentative de connexion MQTT à ");
    Serial.print(mqtt_server);
    Serial.print(":");
    Serial.print(mqtt_port);
    Serial.println("...");

    if (mqttClient.connect(mqtt_client_id)) {
      Serial.println("✓ MQTT connecté avec succès");
      Serial.print("✓ Publication sur: ");
      Serial.println(mqtt_topic);
    } else {
      Serial.print("✗ Échec, code erreur: ");
      Serial.println(mqttClient.state());
      Serial.println("  Codes erreur MQTT:");
      Serial.println("  -4 : Timeout de connexion");
      Serial.println("  -3 : Connexion perdue");
      Serial.println("  -2 : Échec de connexion");
      Serial.println("  -1 : Client déconnecté");
      Serial.println("  ⚠️  Vérifiez que:");
      Serial.println("     - Votre IP locale est correcte");
      Serial.println("     - Docker stack est lancée (docker-compose up)");
      Serial.println("     - Port 1883 est accessible");
      Serial.println();
      Serial.println("Nouvelle tentative dans 5 secondes...");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("=================================");
  Serial.println("ESP32 IoT Stack - Wokwi Simulator");
  Serial.println("=================================");
  Serial.println();

  // Initialisation WiFi
  setup_wifi();

  // Initialisation MQTT
  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.setBufferSize(512);

  // Initialisation capteur DHT22
  dht.begin();
  Serial.println("✓ Capteur DHT22 initialisé (GPIO 15)");
  Serial.println();
}

void loop() {
  // Maintenir la connexion MQTT
  if (!mqttClient.connected()) {
    reconnect_mqtt();
  }
  mqttClient.loop();

  // Publier les données toutes les 10 secondes
  unsigned long now = millis();
  if (now - lastPublish >= publishInterval) {
    lastPublish = now;

    // Lecture des capteurs
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();

    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("✗ Erreur de lecture DHT22");
      return;
    }

    // Construction du payload en format InfluxDB Line Protocol
    // Format: measurement,tag1=value1,tag2=value2 field1=value1,field2=value2
    String payload = "environment";
    payload += ",location=cocody";
    payload += ",device_id=" + String(mqtt_client_id);
    payload += ",sensor=DHT22";
    payload += " temperature=" + String(temperature, 1);
    payload += ",humidity=" + String(humidity, 1);

    // Publication MQTT
    bool success = mqttClient.publish(mqtt_topic, payload.c_str());

    if (success) {
      Serial.println("✓ Données publiées:");
      Serial.print("  Topic: ");
      Serial.println(mqtt_topic);
      Serial.print("  Payload: ");
      Serial.println(payload);
      Serial.print("  Température: ");
      Serial.print(temperature);
      Serial.println(" °C");
      Serial.print("  Humidité: ");
      Serial.print(humidity);
      Serial.println(" %");
      Serial.println();
    } else {
      Serial.println("✗ Échec de publication MQTT");
    }
  }
}
