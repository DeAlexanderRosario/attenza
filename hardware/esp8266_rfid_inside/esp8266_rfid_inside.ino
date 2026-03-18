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
// STRICTLY MATCHING OUTSIDE UNIT
#define SS_PIN   D8  // GPIO 15
#define RST_PIN  D0 
#define BUZZER   D1  // GPIO 5
#define CONFIG_BTN D2 // D7 is used by SPI! D2 is free.

#define SDA_PIN  D3  // GPIO 0
#define SCL_PIN  D4  // GPIO 2

// --- CONFIG ---
char server_ip[40] = "192.168.1.5";
char server_port[6] = "3001";
char device_id[32] = "device_inside_01"; // DEFAULT FOR INSIDE UNIT

bool shouldSaveConfig = false;
String serialBuffer = ""; 

// --- OBJECTS ---
MFRC522 rfid(SS_PIN, RST_PIN); 
WebSocketsClient webSocket;
WiFiManager wifiManager;
LiquidCrystal_I2C lcd(0x27, 16, 2); 

// --- VARIABLES ---
unsigned long lastScanTime = 0;
const int scanCooldown = 2000;
unsigned long lastLCDInteractionMillis = 0;
const int lcdTimeout = 10000; 
unsigned long lastHeartbeatMillis = 0;
bool heartState = false;

// --- CUSTOM ICONS ---
byte checkIcon[8] = { 0x0, 0x1, 0x3, 0x16, 0x1c, 0x8, 0x0, 0x0 };
byte crossIcon[8] = { 0x0, 0x1b, 0xe, 0x4, 0xe, 0x1b, 0x0, 0x0 };
byte clockIcon[8] = { 0x0, 0xe, 0x15, 0x17, 0x11, 0xe, 0x0, 0x0 };
byte heart1[8] = { 0x0, 0xa, 0x1f, 0x1f, 0xe, 0x4, 0x0, 0x0 };
byte heart2[8] = { 0x0, 0x0, 0xa, 0xe, 0x4, 0x0, 0x0, 0x0 };

// --- UI STYLE ---
const char* customUI = R"rawliteral(
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
:root{--p:#10b981;--bg:#051811;--card:rgba(255,255,255,0.03)}
html,body{margin:0;padding:20px;background:radial-gradient(circle at 50% 0%,#103328 0%,var(--bg) 100%);font-family:'Segoe UI',Roboto,sans-serif;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;box-sizing:border-box}
.wrap{width:100%;max-width:400px;padding:2.5rem 1.5rem;background:var(--card);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.1);border-radius:2rem;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);text-align:center;box-sizing:border-box}
h1{font-size:2rem;margin:0 0 0.5rem;background:linear-gradient(135deg,#fff 0%,#10b981 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-1px}
h3{font-weight:400;font-size:0.9rem;opacity:0.6;margin-bottom:2rem;letter-spacing:1px;text-transform:uppercase}
input{width:100%;padding:0.9rem 1.2rem;margin-bottom:1.2rem;border-radius:1rem;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.2);color:#fff;font-size:1rem;box-sizing:border-box;transition:0.3s}
input:focus{outline:none;border-color:var(--p);box-shadow:0 0 0 4px rgba(16,185,129,0.2)}
button{width:100%;padding:1rem;border:none;border-radius:1rem;background:var(--p);color:#fff;font-weight:600;font-size:1rem;cursor:pointer;transition:0.3s;box-shadow:0 10px 15px -3px rgba(16,185,129,0.3)}
button:hover{transform:translateY(-2px);box-shadow:0 20px 25px -5px rgba(16,185,129,0.4);filter:brightness(1.1)}
::placeholder{color:rgba(255,255,255,0.3)}
@media(max-width:480px){.wrap{padding:2rem 1rem}.wrap h1{font-size:1.75rem}}
</style>
<script>
document.addEventListener("DOMContentLoaded",()=>{
  const form=document.querySelector("form"); if(!form) return;
  const wrap=document.createElement("div"); wrap.className="wrap";
  const title=document.createElement("h1"); title.innerText="TrueCheck";
  const sub=document.createElement("h3"); sub.innerText="Inside Unit Setup";
  document.body.appendChild(wrap);
  wrap.appendChild(title); wrap.appendChild(sub); wrap.appendChild(form);
});
</script>
)rawliteral";

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
  
  updateDisplay("Setup Mode", "Check Phone/PC", 2);

  webSocket.disconnect();
  rfid.PCD_SoftPowerDown(); 
  beep(100); beep(100);

  WiFiManagerParameter custom_server_ip("server", "Server IP", server_ip, 40);
  WiFiManagerParameter custom_server_port("port", "Port", server_port, 6);
  WiFiManagerParameter custom_device_id("device", "Device ID", device_id, 32);

  wifiManager.setSaveConfigCallback(saveConfigCallback);
  wifiManager.setCustomHeadElement(customUI);
  wifiManager.addParameter(&custom_server_ip);
  wifiManager.addParameter(&custom_server_port);
  wifiManager.addParameter(&custom_device_id);
  wifiManager.setConfigPortalTimeout(180); 
  
  if (!wifiManager.startConfigPortal("TrueCheck_Inside_Setup")) {
    Serial.println(F("[WiFi] Timeout. Restarting..."));
    updateDisplay("Setup Timeout", "Rebooting...", 1);
    delay(1000);
    ESP.restart();
  } else {
    strcpy(server_ip, custom_server_ip.getValue());
    strcpy(server_port, custom_server_port.getValue());
    strcpy(device_id, custom_device_id.getValue());
    if (shouldSaveConfig) saveConfigToFS();
    Serial.println(F("[Sys] Rebooting..."));
    updateDisplay("Setup Done", "Rebooting...", 0);
    beep(500); delay(500);
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
  } else if (strcmp(pattern, "break_warning") == 0) {
    for(int i=0; i<5; i++) { beep(200); delay(150); }
  }
}

// --- WS HANDLER ---
void handleServerMessage(char* jsonString) {
  DynamicJsonDocument doc(1024);
  DeserializationError err = deserializeJson(doc, jsonString);
  if (err) {
    Serial.print(F("[WS] Parse Error: ")); Serial.println(err.c_str());
    return;
  }
  
  const char* type = doc["type"];
  if (!type) return;

  if (strcmp(type, "authenticated") == 0) {
    if (doc["success"]) {
      Serial.println(F("[WS] Inside Auth SUCCESS"));
      updateDisplay("Inside Unit", "Authenticated", 0);
      playPattern("double"); 
    } else {
      Serial.println(F("[WS] Inside Auth DENIED"));
      updateDisplay("Auth Failed", "Contact Admin", 1);
      playPattern("warning");
    }
  } 
  else if (strcmp(type, "scan_result") == 0) {
    int status = doc["status"] | 0;
    const char* msg = doc["message"] | "";
    const char* pattern = doc["beepPattern"] | "";
    const char* name = doc["user"]["name"] | "";
    
    Serial.print(F("[Scan] ")); Serial.print(status);
    Serial.print(F(" - ")); Serial.println(msg);

    int icon = (status == 200) ? 0 : 1;
    
    // If name exists, show Name on Top, Msg on Bottom
    if (strlen(name) > 0) {
      updateDisplay(name, msg, icon);
    } else {
      updateDisplay(msg, "Inside Unit", icon);
    }

    // 1. If explicit pattern provided, use it
    if (strlen(pattern) > 0) {
      playPattern(pattern);
    } 
    // 2. Fallback to status-based logic
    else {
      switch(status) {
        case 200: 
          if (strstr(msg, "Re-verified")) playPattern("double");
          else if (strstr(msg, "Emergency") || strstr(msg, "Going Out")) playPattern("long");
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

void setup() {
  WiFi.persistent(false); 
  Serial.begin(115200);
  
  pinMode(SS_PIN, OUTPUT);
  digitalWrite(SS_PIN, HIGH); 

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

  updateDisplay("TrueCheck", "Inside Unit");

  Serial.println(F("\n[Boot] TrueCheck Inside Unit Started"));

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
    updateDisplay("WiFi Connected", "Inside Unit", 0);
    delay(2000);
    updateDisplay("Ready to scan", "Inside Unit", 2);
  } else {
    updateDisplay("WiFi Timeout", "Check Router", 1);
  }

  SPI.begin();
  rfid.PCD_Init();
  rfid.PCD_SetAntennaGain(rfid.RxGain_max); 

  byte v = rfid.PCD_ReadRegister(rfid.VersionReg);
  Serial.print(F("[RFID] Version: 0x")); Serial.println(v, HEX);
  if(v == 0x00 || v == 0xFF) Serial.println(F("WARNING: RFID Error Inside Unit"));

  Serial.println(F("[Info] Type 'setup' for Inside Unit config."));
  
  webSocket.begin(server_ip, atoi(server_port), "/ws");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

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

  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      serialBuffer.trim();
      if (serialBuffer.equalsIgnoreCase("setup")) startConfigPortal();
      serialBuffer = "";
    } else {
      serialBuffer += c;
    }
  }

  unsigned long currentMillis = millis();
  if (currentMillis - lastScanTime > scanCooldown) {
    if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
      String tag = "";
      for (byte i = 0; i < rfid.uid.size; i++) {
        if (i > 0) tag += ":";
        tag += String(rfid.uid.uidByte[i], HEX);
      }
      tag.toUpperCase();

      Serial.print(F("[Scan] ")); Serial.println(tag);
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
  yield(); 

  // Automatic Backlight Control
  if (millis() - lastLCDInteractionMillis > lcdTimeout) {
    lcd.noBacklight();
  } else {
    lcd.backlight();
  }

  // Heartbeat indicator (top right)
  if (millis() - lastHeartbeatMillis > 1000) {
    lastHeartbeatMillis = millis();
    heartState = !heartState;
    lcd.setCursor(15, 0);
    lcd.write(heartState ? byte(3) : byte(4));
  }
}
