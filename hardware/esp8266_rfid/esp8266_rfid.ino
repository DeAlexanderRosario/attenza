#include <FS.h> 
#include <LittleFS.h>
#include <ESP8266WiFi.h>
#include <DNSServer.h>
#include <ESP8266WebServer.h>
#include <WiFiManager.h>          // https://github.com/tzpu/WiFiManager
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>

// --- PIN DEFINITIONS ---
#define RST_PIN  D3   // Config Reset / RFID Reset
#define SS_PIN   D8
#define BUZZER   D1

// --- DEFAULT CONFIG ---
char server_ip[40] = "192.168.1.100";
char server_port[6] = "3003";
char device_id[32] = "device_a205";

//flags for saving data
bool shouldSaveConfig = false;

// --- OBJECTS ---
MFRC522 rfid(SS_PIN, RST_PIN);
WebSocketsClient webSocket;
WiFiManager wifiManager;

// --- VARIABLES ---
unsigned long lastScanTime = 0;
const int scanCooldown = 2000;

// --- CALLBACKS ---
void saveConfigCallback () {
  Serial.println("[Config] Should save config");
  shouldSaveConfig = true;
}

void beep(int duration) {
  digitalWrite(BUZZER, HIGH);
  delay(duration);
  digitalWrite(BUZZER, LOW);
}

// --- FEEDBACK LOGIC ---
void notifyStatus(int code) {
  Serial.printf("[Status] Feedback for code: %d\n", code);
  
  switch(code) {
    case 200: // SUCCESS_STUDENT: 1 Long
      beep(800);
      break;
    case 201: // SUCCESS_TEACHER: 2 Long
      beep(400); delay(100); beep(400);
      break;
    case 202: // SUCCESS_ADHOC: 1 Long, 1 Short
      beep(600); delay(100); beep(100);
      break;
    case 403: // ERR_UNAUTHORIZED: 3 Short
      for(int i=0; i<3; i++) { beep(100); delay(100); }
      break;
    case 404: // ERR_UNKNOWN_TAG: 4 Short
      for(int i=0; i<4; i++) { beep(100); delay(100); }
      break;
    case 405: // ERR_NO_SLOT: 2 Medium
      beep(300); delay(200); beep(300);
      break;
    case 409: // ERR_ALREADY_DONE: 1 Short
      beep(200);
      break;
    case 429: // ERR_ROOM_BUSY: Continuous 5 short
      for(int i=0; i<5; i++) { beep(80); delay(80); }
      break;
    default:
      beep(50); // Generic blip
      break;
  }
}

// --- SERVER MESSAGE HANDLER ---
void handleServerMessage(char* jsonString) {
  DynamicJsonDocument doc(512);
  DeserializationError err = deserializeJson(doc, jsonString);
  if (err) {
    Serial.println("[WS] Invalid JSON from server");
    return;
  }

  const char* type = doc["type"];
  if (!type) return;

  if (strcmp(type, "authenticated") == 0) {
    bool success = doc["success"];
    if (!success) {
      Serial.println("[Auth] FAILED! Please reset config.");
      for(int i=0;i<5;i++) { beep(50); delay(50); }
    } else {
      Serial.println("[Auth] Success.");
      beep(500); 
    }
  }

  if (strcmp(type, "scan_result") == 0) {
    int status = doc["status"] | 0;
    const char* msg = doc["message"] | "Scan Processed";
    
    Serial.printf("[Scan] Result: %s (Status: %d)\n", msg, status);
    notifyStatus(status);
  }
}

// --- WEBSOCKET EVENT ---
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected!");
      break;
    case WStype_CONNECTED:
      Serial.println("[WS] Connected!");
      {
        DynamicJsonDocument doc(128);
        doc["type"] = "authenticate";
        doc["deviceId"] = device_id;
        String out;
        serializeJson(doc, out);
        webSocket.sendTXT(out);
      }
      break;
    case WStype_TEXT:
      payload[length] = 0; // null terminate
      handleServerMessage((char*)payload);
      break;
  }
}

// --- SETUP ---
void setup() {
  Serial.begin(115200);
  pinMode(BUZZER, OUTPUT);
  pinMode(RST_PIN, INPUT_PULLUP); // Flash Button for Reset

  Serial.println("\n[System] Mounting FS...");
  if (!LittleFS.begin()) {
    Serial.println("[FS] Failed to mount LittleFS");
  } else {
    if (LittleFS.exists("/config.json")) {
      File configFile = LittleFS.open("/config.json", "r");
      if (configFile) {
        DynamicJsonDocument json(1024);
        DeserializationError error = deserializeJson(json, configFile);
        if (!error) {
          strcpy(server_ip, json["server_ip"] | server_ip);
          strcpy(server_port, json["server_port"] | server_port);
          strcpy(device_id, json["device_id"] | device_id);
          Serial.println("[FS] Config loaded");
        }
        configFile.close();
      }
    }
  }

  // --- WiFiManager UI ---
  wifiManager.setSaveConfigCallback(saveConfigCallback);
  const char* customCSS = "<style>"
    "body{background-color:#f8fafc;font-family:sans-serif;color:#1e293b}"
    "h1{color:#4f46e5;text-align:center}"
    "button{background-color:#4f46e5;color:white;border-radius:0.5rem;padding:0.75rem 1.5rem;border:none;font-weight:600;width:100%}"
    "button:hover{background-color:#4338ca}"
    "input{border:1px solid #cbd5e1;border-radius:0.375rem;padding:0.5rem;width:100%;margin-bottom:1rem;box-sizing:border-box}"
    ".c{max-width:360px;margin:2rem auto;padding:2rem;background:white;border-radius:1rem;box-shadow:0 4px 6px -1px rgb(0 0 0/0.1)}"
    "</style>";
  wifiManager.setCustomHeadElement(customCSS);

  WiFiManagerParameter custom_server_ip("server", "Server IP", server_ip, 40);
  WiFiManagerParameter custom_server_port("port", "Port", server_port, 6);
  WiFiManagerParameter custom_device_id("device", "Device ID", device_id, 32);

  wifiManager.addParameter(&custom_server_ip);
  wifiManager.addParameter(&custom_server_port);
  wifiManager.addParameter(&custom_device_id);

  // Force config reset if button pressed
  if (digitalRead(RST_PIN) == LOW) {
    Serial.println("[System] Reset Button Pressed! Starting Config Portal...");
    wifiManager.resetSettings();
    beep(200); beep(200);
  }

  if (!wifiManager.autoConnect("Attenza_Setup")) {
    Serial.println("[WiFi] Failed to connect & timed out");
    delay(3000);
    ESP.restart();
  }

  // Save updated params
  strcpy(server_ip, custom_server_ip.getValue());
  strcpy(server_port, custom_server_port.getValue());
  strcpy(device_id, custom_device_id.getValue());

  if (shouldSaveConfig) {
    Serial.println("[FS] Saving config...");
    DynamicJsonDocument json(1024);
    json["server_ip"] = server_ip;
    json["server_port"] = server_port;
    json["device_id"] = device_id;

    File configFile = LittleFS.open("/config.json", "w");
    if (!configFile) Serial.println("[FS] Failed to open file for writing");
    else {
      serializeJson(json, configFile);
      configFile.close();
    }
  }

  // --- RFID Init ---
  SPI.begin();
  rfid.PCD_Init();

  // --- WebSocket Init ---
  Serial.printf("[WS] Connecting to %s:%s\n", server_ip, server_port);
  webSocket.begin(server_ip, atoi(server_port), "/ws");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

// --- LOOP ---
void loop() {
  webSocket.loop();

  // RFID Scan
  if (millis() - lastScanTime > scanCooldown) {
    if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
      String tag = "";
      for (byte i = 0; i < rfid.uid.size; i++) {
        if (i > 0) tag += ":";
        tag += String(rfid.uid.uidByte[i], HEX);
      }
      tag.toUpperCase();

      Serial.print("[RFID] Tag: "); Serial.println(tag);
      beep(50);

      DynamicJsonDocument doc(256);
      doc["type"] = "rfid_scan";
      doc["rfidTag"] = tag;
      doc["deviceId"] = device_id;
      String out;
      serializeJson(doc, out);
      webSocket.sendTXT(out);

      rfid.PICC_HaltA();
      rfid.PCD_StopCrypto1();
      lastScanTime = millis();
    }
  }
}
