#include <FS.h> 
#include <LittleFS.h>
#include <ESP8266WiFi.h>
#include <DNSServer.h>
#include <ESP8266WebServer.h>
#include <WiFiManager.h> 
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// --- YOUR SOLDERED PIN CONFIGURATION ---
// We have to work with what you soldered.
#define SS_PIN   D8  // GPIO 15 (The problematic pin)
#define RST_PIN  D1
#define BUZZER   D0
#define CONFIG_BTN D2 // D7 is used by SPI! D2 is free.

#define SDA_PIN  D3   // GPIO 4 G 
#define SCL_PIN  D4   // GPIO 2 w

// --- CONFIG ---
char server_ip[40] = "192.168.1.5";
char server_port[6] = "3001";
char device_id[32] = "device_a205";

bool shouldSaveConfig = false;
String serialBuffer = ""; 

// --- OBJECTS ---
MFRC522 rfid(SS_PIN, RST_PIN); 
WebSocketsClient webSocket;
WiFiManager wifiManager;
LiquidCrystal_I2C lcd(0x27, 16, 2); 

// --- VARIABLES ---

// --- UI STYLE ---
const char* customUI = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TrueCheck Setup</title>

<style>
:root{
  --primary:#6366f1;
  --bg:#0b1220;
  --card:#111827;
  --text:#e5e7eb;
  --muted:#9ca3af;
}

*{
  margin:0;
  padding:0;
  box-sizing:border-box;
}

body{
  font-family: system-ui, -apple-system, sans-serif;
  background: linear-gradient(180deg,#0b1220,#020617);
  color:var(--text);
  display:flex;
  justify-content:center;
  align-items:center;
  min-height:100vh;
  padding:15px;
}

/* Card */
.container{
  width:100%;
  max-width:380px;
  background:var(--card);
  padding:25px 20px;
  border-radius:18px;
  box-shadow:0 15px 40px rgba(0,0,0,0.6);
  animation:fadeIn 0.5s ease;
}

/* Title */
h1{
  text-align:center;
  font-size:24px;
  margin-bottom:5px;
}

.sub{
  text-align:center;
  font-size:13px;
  color:var(--muted);
  margin-bottom:25px;
}

/* Inputs */
.field{
  position:relative;
  margin-bottom:18px;
}

input{
  width:100%;
  padding:14px;
  border-radius:12px;
  border:1px solid #1f2937;
  background:#020617;
  color:#fff;
  font-size:14px;
}

input:focus{
  outline:none;
  border-color:var(--primary);
}

/* Labels */
label{
  position:absolute;
  top:-8px;
  left:12px;
  background:var(--card);
  padding:0 6px;
  font-size:11px;
  color:var(--muted);
}

/* Button */
button{
  width:100%;
  padding:14px;
  border:none;
  border-radius:12px;
  background:var(--primary);
  color:#fff;
  font-size:15px;
  font-weight:600;
  cursor:pointer;
  transition:0.2s;
}

button:hover{
  background:#4f46e5;
}

button:active{
  transform:scale(0.97);
}

/* Footer */
.footer{
  text-align:center;
  font-size:11px;
  color:var(--muted);
  margin-top:15px;
}

/* Animation */
@keyframes fadeIn{
  from{opacity:0; transform:translateY(10px);}
  to{opacity:1; transform:translateY(0);}
}

/* Mobile Optimization */
@media(max-width:400px){
  .container{
    padding:20px 15px;
  }
  h1{
    font-size:20px;
  }
}
</style>
</head>

<body>

<div class="container">
  <h1>TrueCheck</h1>
  <div class="sub">Quick Device Setup</div>

  <form action="/save" method="POST">
    
    <div class="field">
      <label>WiFi Name</label>
      <input type="text" name="ssid" required>
    </div>

    <div class="field">
      <label>Password</label>
      <input type="password" name="password" required>
    </div>

    <button type="submit">Connect Device</button>
  </form>

  <div class="footer">ESP8266 Setup Portal</div>
</div>

</body>
</html>
)rawliteral";

// --- CUSTOM ICONS ---
byte checkIcon[8] = { 0x0, 0x1, 0x3, 0x16, 0x1c, 0x8, 0x0, 0x0 };
byte crossIcon[8] = { 0x0, 0x1b, 0xe, 0x4, 0xe, 0x1b, 0x0, 0x0 };
byte clockIcon[8] = { 0x0, 0xe, 0x15, 0x17, 0x11, 0xe, 0x0, 0x0 };
byte heart1[8] = { 0x0, 0xa, 0x1f, 0x1f, 0xe, 0x4, 0x0, 0x0 };
byte heart2[8] = { 0x0, 0x0, 0xa, 0xe, 0x4, 0x0, 0x0, 0x0 };

// --- VARIABLES ---
unsigned long lastScanTime = 0;
const int scanCooldown = 2000;
unsigned long lastLCDInteractionMillis = 0;
const int lcdTimeout = 10000; 
unsigned long lastHeartbeatMillis = 0;
bool heartState = false;

// --- SYSTEM CONFIG ---
struct SystemConfig {
  int earlyAccessWindowMins = 30;
  int postClassFreeAccessHours = 2;
  int operatingStartHour = 7;
  int operatingEndHour = 23;
  int teacherGraceMins = 15;
  int studentFirstSlotWindowMins = 30;
  int studentRegularWindowMins = 5;
  int reVerificationGraceMins = 3;
  int breakWarningMins = 3;
};

SystemConfig sysConfig;
unsigned long serverUnixTime = 0;
unsigned long syncMillis = 0;

// --- HELPER FUNCTIONS ---

String centerText(String text) {
  if (text.length() >= 16) return text.substring(0, 16);
  int spaces = (16 - text.length()) / 2;
  String out = "";
  for (int i = 0; i < spaces; i++) out += " ";
  out += text;
  return out;
}

void updateDisplay(String line1, String line2 = "", int iconType = -1, bool flash = false) {
  if (flash) {
    lcd.noBacklight(); delay(50); lcd.backlight();
  } else {
    lcd.backlight();
  }
  
  lastLCDInteractionMillis = millis();
  lcd.clear();
  
  if (iconType >= 0) {
    lcd.setCursor(0, 0);
    lcd.write(byte(iconType));
    lcd.setCursor(2, 0);
    lcd.print(line1.substring(0, 14)); 
  } else {
    lcd.setCursor(0, 0);
    lcd.print(centerText(line1));
  }

  if (line2.length() > 0) {
    lcd.setCursor(0, 1);
    lcd.print(centerText(line2));
  }
}

bool isOperatingHours() {
  if (syncMillis == 0) return true; // Assume open if not yet synced
  
  unsigned long currentUnixTime = serverUnixTime + (millis() - syncMillis) / 1000;
  
  // IST is UTC + 5:30 (19800 seconds)
  unsigned long istTime = currentUnixTime + 19800;
  int hour = (istTime / 3600) % 24;
  
  return (hour >= sysConfig.operatingStartHour && hour < sysConfig.operatingEndHour);
}

void handleModeDisplay(const char* mode) {
  if (strcmp(mode, "IDLE") == 0) {
    updateDisplay("Ready to Scan", "No Class In Session", 2);
  } else if (strcmp(mode, "BREAK") == 0) {
    updateDisplay("Break Period", "See You Later!", 2);
  } else if (strcmp(mode, "SLOT_ACTIVE") == 0) {
    updateDisplay("Class in Session", "Scan to Enter", 0);
  } else if (strcmp(mode, "CLOSED") == 0) {
    updateDisplay("System Closed", "Come Back Tomorrow", 1);
  } else if (strcmp(mode, "EARLY_ACCESS_FIRST_SLOT") == 0) {
    updateDisplay("Early Access", "Welcome!", 0);
  }
}

void beep(int duration) {
  digitalWrite(BUZZER, HIGH);
  delay(duration);
  digitalWrite(BUZZER, LOW);
}

void saveConfigCallback () {
  Serial.println(F("[Config] Saving..."));
  shouldSaveConfig = true;
}

void saveConfigToFS() {
  Serial.println(F("[FS] Writing config..."));
  DynamicJsonDocument json(1024);
  json["server_ip"] = server_ip;
  json["server_port"] = server_port;
  json["device_id"] = device_id;

  File configFile = LittleFS.open("/config.json", "w");
  if (!configFile) {
    Serial.println(F("[FS] Failed to write"));
  } else {
    serializeJson(json, configFile);
    configFile.close();
    Serial.println(F("[FS] Saved"));
  }
}

void startConfigPortal() {
  Serial.println(F("\n[Sys] Starting Setup..."));
  
  // 1. CRITICAL: Halt all operations
  webSocket.disconnect();
  rfid.PCD_SoftPowerDown(); 
  
  beep(100); beep(100);

  WiFiManagerParameter custom_server_ip("server", "Server IP", server_ip, 40);
  WiFiManagerParameter custom_server_port("port", "Port", server_port, 6);
  WiFiManagerParameter custom_device_id("device", "Device ID", device_id, 32);

  wifiManager.resetSettings(); 
  wifiManager.setSaveConfigCallback(saveConfigCallback);
  wifiManager.setCustomHeadElement(customUI);
  wifiManager.addParameter(&custom_server_ip);
  wifiManager.addParameter(&custom_server_port);
  wifiManager.addParameter(&custom_device_id);
  wifiManager.setConfigPortalTimeout(180); 
  
  if (!wifiManager.startConfigPortal("TrueCheck_Config_Mode")) {
    Serial.println(F("[WiFi] Timeout. Restarting..."));
    delay(1000);
    ESP.restart();
  } else {
    strcpy(server_ip, custom_server_ip.getValue());
    strcpy(server_port, custom_server_port.getValue());
    strcpy(device_id, custom_device_id.getValue());

    if (shouldSaveConfig) saveConfigToFS();
    
    Serial.println(F("[Sys] Rebooting..."));
    beep(500); 
    delay(500);
    ESP.restart();
  }
}

// --- BEER PATTERNS ---
void playPattern(const char* pattern) {
  if (strcmp(pattern, "single") == 0) {
    beep(500);
  } else if (strcmp(pattern, "double") == 0) {
    beep(200); delay(100); beep(200);
  } else if (strcmp(pattern, "triple") == 0) {
    for(int i=0; i<3; i++) { beep(100); delay(100); }
  } else if (strcmp(pattern, "long") == 0) {
    beep(1000);
  } else if (strcmp(pattern, "warning") == 0) {
    for(int i=0; i<4; i++) { beep(80); delay(80); }
  }
}

// --- WS HANDLER ---
void handleServerMessage(char* jsonString) {
  DynamicJsonDocument doc(1024);
  DeserializationError err = deserializeJson(doc, jsonString);
  if (err) {
    Serial.print(F("[WS] Error: ")); Serial.println(err.c_str());
    return;
  }
  
  const char* type = doc["type"];
  if (!type) return;

  if (strcmp(type, "authenticated") == 0) {
    if (doc["success"]) {
      Serial.println(F("[WS] Auth SUCCESS"));
      
      // Sync Configuration
      if (doc.containsKey("config")) {
        JsonObject config = doc["config"];
        sysConfig.earlyAccessWindowMins = config["earlyAccessWindowMins"] | 30;
        sysConfig.postClassFreeAccessHours = config["postClassFreeAccessHours"] | 2;
        sysConfig.operatingStartHour = config["operatingStartHour"] | 7;
        sysConfig.operatingEndHour = config["operatingEndHour"] | 23;
        sysConfig.teacherGraceMins = config["teacherGraceMins"] | 15;
        sysConfig.studentFirstSlotWindowMins = config["studentFirstSlotWindowMins"] | 30;
        sysConfig.studentRegularWindowMins = config["studentRegularWindowMins"] | 5;
        sysConfig.reVerificationGraceMins = config["reVerificationGraceMins"] | 3;
        sysConfig.breakWarningMins = config["breakWarningMins"] | 3;
        Serial.println(F("[Config] Synced from server"));
      }

      if (doc.containsKey("serverTime")) {
        serverUnixTime = doc["serverTime"];
        syncMillis = millis();
        Serial.print(F("[Time] Sync: ")); Serial.println(serverUnixTime);
      }

      const char* mode = doc["mode"] | "IDLE";
      handleModeDisplay(mode);

      playPattern("double"); 
    } else {
      Serial.println(F("[WS] Auth DENIED"));
      playPattern("warning");
      updateDisplay("Sorry, No Entry", "Contact Admin", 1);
    }
  } 
  else if (strcmp(type, "scan_result") == 0) {
    int status = doc["status"] | 0;
    const char* msg = doc["message"] | "";
    const char* pattern = doc["beepPattern"] | "";
    const char* role = doc["role"] | "";
    
    const char* name = doc["user"]["name"] | "";
    
    Serial.print(F("[Scan] ")); Serial.print(status);
    Serial.print(F(" - ")); Serial.print(msg);
    if(strlen(name) > 0) { Serial.print(F(" for ")); Serial.print(name); }
    if(strlen(role) > 0) { Serial.print(F(" (")); Serial.print(role); Serial.print(F(")")); }
    Serial.println();

    int icon = (status == 200) ? 0 : 1;
    
    // If name exists, show Name on Top, Msg on Bottom
    if (strlen(name) > 0) {
      updateDisplay(name, msg, icon);
    } else {
      updateDisplay(msg, role, icon);
    }

    // 1. If explicit pattern provided, use it
    if (strlen(pattern) > 0) {
      playPattern(pattern);
    } 
    // 2. Fallback to status-based logic
    else {
      switch(status) {
        case 200: 
          if (strstr(msg, "Teacher") || strstr(msg, "Override")) playPattern("double");
          else if (strstr(msg, "Late")) { beep(600); delay(100); beep(200); }
          else playPattern("single"); 
          break;
        case 403: playPattern("long"); break;
        case 404: playPattern("warning"); break;
        case 409: playPattern("triple"); break;
        default: beep(200); break;
      }
    }
  }
  else if (strcmp(type, "buzzer_alert") == 0) {
    const char* pattern = doc["pattern"] | "warning";
    playPattern(pattern);
  }
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED: Serial.println(F("[WS] Disconnected")); break;
    case WStype_CONNECTED:
      {
        Serial.println(F("[WS] Connected"));
        DynamicJsonDocument doc(128);
        doc["type"] = "authenticate";
        doc["deviceId"] = device_id;
        String out; serializeJson(doc, out); webSocket.sendTXT(out);
      }
      break;
    case WStype_TEXT:
      handleServerMessage((char*)payload); break;
  }
}

// --- SETUP ---
void setup() {
  WiFi.persistent(false); 
  Serial.begin(115200);
  
  // -----------------------------------------------------------
  // CRITICAL FIX FOR D8 (SS) SOLDERED CONNECTION
  // We force D8 HIGH immediately to deselect RFID and 
  // prevent it from interfering with boot/SPI init.
  // -----------------------------------------------------------
  pinMode(SS_PIN, OUTPUT);
  digitalWrite(SS_PIN, HIGH); 
  // -----------------------------------------------------------

  pinMode(BUZZER, OUTPUT);
  pinMode(CONFIG_BTN, INPUT_PULLUP);
  delay(500); 

  // Initialize I2C and LCD
  Wire.begin(SDA_PIN, SCL_PIN);
  lcd.init();
  lcd.backlight();
  
  // Load custom icons
  lcd.createChar(0, checkIcon);
  lcd.createChar(1, crossIcon);
  lcd.createChar(2, clockIcon);
  lcd.createChar(3, heart1);
  lcd.createChar(4, heart2);

  updateDisplay("TrueCheck", "Welcome!");

  Serial.println(F("\n[Boot] TrueCheck Started"));

  if (LittleFS.begin()) {
    if (LittleFS.exists("/config.json")) {
      File configFile = LittleFS.open("/config.json", "r");
      if (configFile) {
        DynamicJsonDocument json(1024);
        deserializeJson(json, configFile);
        strcpy(server_ip, json["server_ip"] | server_ip);
        strcpy(server_port, json["server_port"] | server_port);
        strcpy(device_id, json["device_id"] | device_id);
        configFile.close();
      }
    }
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(); 
  
  Serial.print(F("[WiFi] Connecting"));
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 15) {
    delay(500); Serial.print("."); retries++;
  }
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    updateDisplay("WiFi Connected", "Welcome!", 0);
    delay(2000);
    updateDisplay("Ready to scan", "Welcome!", 2);
  } else {
    updateDisplay("WiFi Timeout", "Please check", 1);
  }

  // Initialize SPI
  SPI.begin();
  
  // Initialize RFID
  rfid.PCD_Init();
  
  // FIX: Force antenna gain to max to overcome noise
  rfid.PCD_SetAntennaGain(rfid.RxGain_max); 

  // Debug: Check if RFID is responding
  byte v = rfid.PCD_ReadRegister(rfid.VersionReg);
  Serial.print(F("[RFID] Version: 0x")); Serial.println(v, HEX);
  if(v == 0x00 || v == 0xFF) Serial.println(F("WARNING: RFID Communication Error (Check Soldering)"));

  Serial.println(F("[Info] Type 'setup' to configure."));
  
  webSocket.begin(server_ip, atoi(server_port), "/ws");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

// --- LOOP ---
void loop() {
  webSocket.loop();

  // Check Config Button
  if (digitalRead(CONFIG_BTN) == LOW) {
    delay(50); // Debounce
    if (digitalRead(CONFIG_BTN) == LOW) {
      Serial.println(F("[Sys] Config Button Pressed!"));
      startConfigPortal();
    }
  }

  // NON-BLOCKING SERIAL (Fixes the crash)
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      serialBuffer.trim();
      if (serialBuffer.equalsIgnoreCase("setup")) {
        startConfigPortal();
      }
      serialBuffer = "";
    } else {
      serialBuffer += c;
    }
  }

  unsigned long currentMillis = millis();
  if (currentMillis - lastScanTime > scanCooldown) {
    if (rfid.PICC_IsNewCardPresent()) {
        if (rfid.PICC_ReadCardSerial()) {
          String tag = "";
          for (byte i = 0; i < rfid.uid.size; i++) {
            if (i > 0) tag += ":";
            tag += String(rfid.uid.uidByte[i], HEX);
          }
          tag.toUpperCase();

          Serial.print(F("[RFID] ")); Serial.println(tag);
          beep(50);
          updateDisplay("Hello!", "Checking tag...", 2);

          DynamicJsonDocument doc(256);
          doc["type"] = "rfid_scan";
          doc["rfidTag"] = tag;
          doc["deviceId"] = device_id;
          String out;
          serializeJson(doc, out);
          webSocket.sendTXT(out);

          rfid.PICC_HaltA();
          rfid.PCD_StopCrypto1();
          lastScanTime = currentMillis;
        }
    }
  }
  
  // CRITICAL: Yield to WiFi stack to prevent WDT Reset
  yield(); 

  // Automatic Backlight Control & Operating Hours
  static bool wasOffline = false;
  bool currentlyOpen = isOperatingHours();
  
  if (!currentlyOpen) {
    if (!wasOffline) {
      updateDisplay("System Offline", "Opens @ " + String(sysConfig.operatingStartHour) + ":00", 2);
      wasOffline = true;
    }
    if (millis() - lastLCDInteractionMillis > 5000) {
      lcd.noBacklight();
    }
  } else {
    if (wasOffline) {
      updateDisplay("System Online", "Welcome!", 0);
      wasOffline = false;
    }
    if (millis() - lastLCDInteractionMillis > lcdTimeout) {
      lcd.noBacklight();
    }
  }

  // Heartbeat indicator (top right)
  if (currentlyOpen && millis() - lastHeartbeatMillis > 1000) {
    lastHeartbeatMillis = millis();
    heartState = !heartState;
    lcd.setCursor(15, 0);
    lcd.write(heartState ? byte(3) : byte(4));
  }
}
