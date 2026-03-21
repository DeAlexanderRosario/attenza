#include <FS.h> 
#include <LittleFS.h>
#include <ESP8266WiFi.h>
#include <DNSServer.h>
#include <ESP8266WebServer.h>
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
#define BUZZER   D2 
#define CONFIG_BTN D1

#define SDA_PIN  D3  // GPIO 0
#define SCL_PIN  D4  // GPIO 2

// --- CONFIG ---
char server_ip[40] = "192.168.1.5";
char server_port[6] = "3001";
char device_id[32] = "device_inside_01"; // DEFAULT FOR INSIDE UNIT

String serialBuffer = ""; 

// --- OBJECTS ---
MFRC522 rfid(SS_PIN, RST_PIN); 
WebSocketsClient webSocket;
DNSServer dnsServer;
ESP8266WebServer server(80);
LiquidCrystal_I2C lcd(0x27, 16, 2); 

// --- VARIABLES ---
unsigned long lastScanTime = 0;
const int scanCooldown = 2000;
unsigned long lastLCDInteractionMillis = 0;
const int lcdTimeout = 10000; 
unsigned long lastHeartbeatMillis = 0;
bool heartState = false;
String lastScannedTag = "";

// --- CUSTOM ICONS ---
byte checkIcon[8] = { 0x0, 0x1, 0x3, 0x16, 0x1c, 0x8, 0x0, 0x0 };
byte crossIcon[8] = { 0x0, 0x1b, 0xe, 0x4, 0xe, 0x1b, 0x0, 0x0 };
byte clockIcon[8] = { 0x0, 0xe, 0x15, 0x17, 0x11, 0xe, 0x0, 0x0 };
byte heart1[8] = { 0x0, 0xa, 0x1f, 0x1f, 0xe, 0x4, 0x0, 0x0 };
byte heart2[8] = { 0x0, 0x0, 0xa, 0xe, 0x4, 0x0, 0x0, 0x0 };

// --- UI STYLE ---
const char* customUI = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Inside Unit Setup</title>
<style>
:root{--primary:#10b981;--bg:#022c22;--card:#064e3b;--text:#ecfdf5;--muted:#6ee7b7;--border:#047857;}
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--text);display:flex;justify-content:center;align-items:center;min-height:100vh;padding:15px;}
.card{width:100%;max-width:400px;background:var(--card);padding:24px;border-radius:20px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);}
h1{text-align:center;font-size:24px;margin-bottom:6px;}
p.sub{text-align:center;font-size:14px;color:var(--muted);margin-bottom:20px;}
.scan-btn{width:100%;padding:12px;background:rgba(16,185,129,0.1);color:var(--primary);border:1px solid var(--primary);border-radius:12px;font-weight:600;margin-bottom:15px;cursor:pointer;transition:0.2s;}
.scan-btn:hover{background:rgba(16,185,129,0.2);}
.wifi-list{max-height:180px;overflow-y:auto;border:1px solid var(--border);border-radius:12px;margin-bottom:20px;background:#022c22;}
.wifi-item{display:flex;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;}
.wifi-item:last-child{border-bottom:none;}
.wifi-item:hover,.wifi-item.active{background:rgba(16,185,129,0.15);}
.wifi-name{font-weight:500;}
.wifi-rssi{color:var(--muted);font-size:12px;}
label{display:block;font-size:12px;color:var(--muted);margin-bottom:6px;margin-left:4px;}
input{width:100%;padding:14px;background:var(--bg);border:1px solid var(--border);border-radius:12px;color:var(--text);font-size:15px;margin-bottom:16px;}
input:focus{outline:none;border-color:var(--primary);}
.row{display:flex;gap:12px;}
.col{flex:1;}
.col-2{flex:2;}
button.primary{width:100%;padding:16px;background:var(--primary);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;transition:0.2s;}
button.primary:hover{background:#059669;}
button.primary:disabled{opacity:0.5;cursor:not-allowed;}
.msg{text-align:center;margin-top:15px;font-size:14px;}
.success{color:#34d399;}
.error{color:#fb7185;}
::-webkit-scrollbar{width:6px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px;}
</style>
</head>
<body>
<div class="card">
<h1>Inside Unit Setup</h1>
<p class="sub">Connect to local WiFi</p>
<button class="scan-btn" id="scanBtn" onclick="scan()">Scan Networks</button>
<div class="wifi-list" id="wifi-list">
<div style="padding:15px;text-align:center;color:#6ee7b7;font-size:13px;">Click Scan to view networks</div>
</div>
<form id="cfg">
<label>WiFi SSID</label>
<input type="text" id="ssid" required placeholder="Select or type SSID">
<label>Password</label>
<input type="password" id="pass" placeholder="Leave blank if open">
<div class="row">
<div class="col-2">
<label>Server IP</label>
<input type="text" id="ip" value="">
</div>
<div class="col">
<label>Port</label>
<input type="text" id="port" value="">
</div>
</div>
<label>Device ID</label>
<input type="text" id="dev" value="">
<button type="submit" class="primary" id="saveBtn">Connect Target</button>
</form>
<div id="msg" class="msg"></div>
</div>
<script>
fetch('/config').then(r=>r.json()).then(d=>{
document.getElementById('ip').value=d.ip||'192.168.1.5';
document.getElementById('port').value=d.port||'3001';
document.getElementById('dev').value=d.dev||'device_inside_01';
}).catch(e=>console.log(e));
async function scan(){
let btn=document.getElementById('scanBtn');
let list=document.getElementById('wifi-list');
btn.innerText='Scanning...';
btn.disabled=true;
try{
let r=await fetch('/scan');
let n=await r.json();
btn.innerText='Scan Networks';
btn.disabled=false;
list.innerHTML='';
if(n.length==0) list.innerHTML='<div style="padding:15px;text-align:center;color:#6ee7b7">No networks found</div>';
n.forEach(w=>{
let d=document.createElement('div');
d.className='wifi-item';
d.innerHTML=`<span class="wifi-name">${w.ssid}</span><span class="wifi-rssi">${w.rssi} dBm</span>`;
d.onclick=()=>{
document.querySelectorAll('.wifi-item').forEach(e=>e.classList.remove('active'));
d.classList.add('active');
document.getElementById('ssid').value=w.ssid;
document.getElementById('pass').focus();
};
list.appendChild(d);
});
}catch(e){
btn.innerText='Scan Failed. Retry?';
btn.disabled=false;
}
}
document.getElementById('cfg').onsubmit=async(e)=>{
e.preventDefault();
let b=document.getElementById('saveBtn');
let m=document.getElementById('msg');
b.disabled=true; b.innerText='Connecting...'; m.className='msg'; m.innerText='';
let p={ssid:document.getElementById('ssid').value,pass:document.getElementById('pass').value,ip:document.getElementById('ip').value,port:document.getElementById('port').value,dev:document.getElementById('dev').value};
try{
let r=await fetch('/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
let d=await r.json();
if(d.status=='success'){m.className='msg success';m.innerText='Connected! Rebooting...';b.innerText='Success';}
else{m.className='msg error';m.innerText='Failed: '+d.reason;b.disabled=false;b.innerText='Try Again';}
}catch(err){m.className='msg error';m.innerText='Error connecting.';b.disabled=false;b.innerText='Try Again';}
};
scan();
</script>
</body>
</html>
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
  
  webSocket.disconnect();
  rfid.PCD_SoftPowerDown(); 
  beep(100); beep(100);

  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP("TrueCheck_Inside_Setup");
  updateDisplay("Setup IP:", WiFi.softAPIP().toString(), 2);
  
  dnsServer.setErrorReplyCode(DNSReplyCode::NoError);
  dnsServer.start(53, "*", WiFi.softAPIP());

  server.on("/", HTTP_GET, [](){
    server.send(200, "text/html", customUI);
  });
  
  server.on("/config", HTTP_GET, [](){
    String json = "{\"ip\":\"" + String(server_ip) + "\",\"port\":\"" + String(server_port) + "\",\"dev\":\"" + String(device_id) + "\"}";
    server.send(200, "application/json", json);
  });
  
  server.on("/scan", HTTP_GET, [](){
    int n = WiFi.scanNetworks();
    String json = "[";
    for(int i = 0; i < n; ++i) {
      if(i) json += ",";
      json += "{\"ssid\":\"" + WiFi.SSID(i) + "\",\"rssi\":" + String(WiFi.RSSI(i)) + "}";
    }
    json += "]";
    server.send(200, "application/json", json);
  });
  
  server.on("/connect", HTTP_POST, [](){
    if(!server.hasArg("plain")) {
      server.send(400, "application/json", "{\"status\":\"error\", \"reason\":\"No payload\"}");
      return;
    }
    DynamicJsonDocument doc(512);
    DeserializationError err = deserializeJson(doc, server.arg("plain"));
    if (err) {
      server.send(400, "application/json", "{\"status\":\"error\", \"reason\":\"Invalid JSON\"}");
      return;
    }
    
    String ssid = doc["ssid"].as<String>();
    String pass = doc["pass"].as<String>();
    strcpy(server_ip, doc["ip"] | server_ip);
    strcpy(server_port, doc["port"] | server_port);
    strcpy(device_id, doc["dev"] | device_id);

    saveConfigToFS();

    // Respond to the client BEFORE attempting connection to avoid hanging the browser
    server.send(200, "application/json", "{\"status\":\"success\"}");
    
    updateDisplay("Setup Done", "Rebooting...", 0);
    beep(500); delay(500);

    WiFi.disconnect();
    WiFi.persistent(true);
    WiFi.begin(ssid.c_str(), pass.c_str());
    
    // Give the WiFi chip 500ms to save credentials to flash, then reboot
    delay(500);
    ESP.restart();
  });

  server.onNotFound([](){
    server.sendHeader("Location", String("http://") + WiFi.softAPIP().toString(), true);
    server.send(302, "text/plain", "");
  });

  server.begin();

  unsigned long startWait = millis();
  while(millis() - startWait < 180000) { // 3 mins timeout
    dnsServer.processNextRequest();
    server.handleClient();
    yield();
  }
  
  Serial.println(F("[Sys] Config portal timeout. Rebooting..."));
  updateDisplay("Setup Timeout", "Rebooting...", 1);
  delay(1000);
  ESP.restart();
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
    if (status == 404) {
      updateDisplay("Unknown Card", lastScannedTag, 1);
    } else if (strlen(name) > 0) {
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
  WiFi.persistent(true); 
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
      lastScannedTag = tag;

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
