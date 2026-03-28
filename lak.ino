#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "SPIFFS.h"
#include "driver/i2s.h"
#include <Preferences.h>
#include <WebServer.h>

// ===== PINS =====
#define I2S_WS 25
#define I2S_SD 33
#define I2S_SCK 26
#define BUTTON_PIN 14
#define LED_PIN 2

// ===== AUDIO =====
#define SAMPLE_RATE 16000

// ===== FILTER =====
#define NOISE_THRESHOLD 600
#define GAIN_FACTOR 2.0
#define SMOOTH_WINDOW 3

WebServer server(80);
Preferences preferences;

String wifi_ssid = "";
String wifi_pass = "";
String api_key = "";

bool isRecording = false;

// ================= FILTER =================
int16_t applyFilter(int16_t sample) {
  static int32_t dcOffset = 0;
  static int16_t history[SMOOTH_WINDOW] = {0};
  static int index = 0;

  dcOffset = (dcOffset * 0.99) + (sample * 0.01);
  sample -= dcOffset;

  if (abs(sample) < NOISE_THRESHOLD) sample = 0;

  sample *= GAIN_FACTOR;

  if (sample > 32767) sample = 32767;
  if (sample < -32768) sample = -32768;

  history[index] = sample;
  index = (index + 1) % SMOOTH_WINDOW;

  int32_t sum = 0;
  for (int i = 0; i < SMOOTH_WINDOW; i++) sum += history[i];

  return sum / SMOOTH_WINDOW;
}

// ================= I2S =================
void setupI2S() {
  i2s_config_t config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_I2S,
    .intr_alloc_flags = 0,
    .dma_buf_count = 8,
    .dma_buf_len = 512,
    .use_apll = false
  };

  i2s_pin_config_t pins = {
    .bck_io_num = I2S_SCK,
    .ws_io_num = I2S_WS,
    .data_out_num = -1,
    .data_in_num = I2S_SD
  };

  i2s_driver_install(I2S_NUM_0, &config, 0, NULL);
  i2s_set_pin(I2S_NUM_0, &pins);
}

// ================= STORAGE =================
void saveNote(String text) {
  File f = SPIFFS.open("/notes.txt", FILE_APPEND);
  f.println(String(millis()) + "|" + text);
  f.close();
}

String loadNotes() {
  File f = SPIFFS.open("/notes.txt", FILE_READ);
  if (!f || f.size() == 0) return "";

  String html = "";

  while (f.available()) {
    String line = f.readStringUntil('\n');
    int i = line.indexOf('|');
    if (i == -1) continue;

    String t = line.substring(0, i);
    String txt = line.substring(i + 1);

    html += "<div class='sticky-note'>"
            "<div class='pin'></div>"
            "<div class='note-time'>" + t + "</div>"
            "<div class='note-text'>" + txt + "</div>"
            "<a href='/delete?ts=" + t + "' class='delete-btn'>Delete</a>"
            "</div>";
  }
  return html;
}

void deleteNote(String ts) {
  File f = SPIFFS.open("/notes.txt");
  File tmp = SPIFFS.open("/tmp.txt", FILE_WRITE);

  while (f.available()) {
    String line = f.readStringUntil('\n');
    if (!line.startsWith(ts)) tmp.println(line);
  }

  f.close();
  tmp.close();

  SPIFFS.remove("/notes.txt");
  SPIFFS.rename("/tmp.txt", "/notes.txt");
}

// ================= STREAMING =================
void streamAndTranscribe() {
  if (api_key.length() == 0) {
    Serial.println("No API Key configured. Cannot transcribe.");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure(); // Skip SSL validation for ease of use
  
  Serial.println("Connecting to Deepgram for Streaming...");
  if (!client.connect("api.deepgram.com", 443)) {
    Serial.println("Connection failed!");
    return;
  }
  
  Serial.println("Connected! Sending Chunked Headers...");
  
  // Send HTTP Headers for Chunked Transfer Encoding
  client.print(String("POST /v1/listen?punctuate=true HTTP/1.1\r\n") +
               "Host: api.deepgram.com\r\n" +
               "Authorization: Token " + api_key + "\r\n" +
               "Content-Type: audio/raw;encoding=signed-integer;sample_rate=16000\r\n" +
               "Transfer-Encoding: chunked\r\n\r\n");

  digitalWrite(LED_PIN, HIGH);
  isRecording = true;
  
  int16_t buffer[512]; // Small chunk buffer
  size_t bytesRead;
  
  // As long as the button is held, read audio and stream immediately
  while (digitalRead(BUTTON_PIN) == LOW) {
    i2s_read(I2S_NUM_0, buffer, sizeof(buffer), &bytesRead, portMAX_DELAY);
    
    if (bytesRead > 0) {
      // Apply noise filter inline
      for(int i = 0; i < bytesRead/2; i++) {
        buffer[i] = applyFilter(buffer[i]);
      }
      
      // Send Chunk Size (in HEX digits)
      client.print(String(bytesRead, HEX) + "\r\n");
      // Send Chunk Data
      client.write((uint8_t*)buffer, bytesRead);
      // End Chunk with CRLF
      client.print("\r\n");
    }
  }

  isRecording = false;
  digitalWrite(LED_PIN, LOW);
  
  Serial.println("Button released. Ending stream...");
  
  // Send 0-length chunk to indicate end of HTTP body
  client.print("0\r\n\r\n");
  
  // Read Response
  Serial.println("Waiting for transcription result...");
  
  long timeout = millis();
  while (!client.available() && millis() - timeout < 10000) {
    delay(10);
  }

  if (!client.available()) {
    Serial.println("Timeout waiting for Deepgram response.");
    client.stop();
    return;
  }

  // Skip HTTP response headers
  while(client.connected()) {
    String line = client.readStringUntil('\n');
    if (line == "\r" || line == "") {
      break;
    }
  }

  // Read JSON payload
  String payload = client.readString();
  client.stop();

  DynamicJsonDocument doc(8192);
  DeserializationError error = deserializeJson(doc, payload);
  
  if (error) {
    Serial.print("JSON Parse failed: ");
    Serial.println(error.c_str());
    Serial.println("Payload: " + payload);
    return;
  }

  String transcript = doc["results"]["channels"][0]["alternatives"][0]["transcript"] | "";
  
  if (transcript.isEmpty()) {
    Serial.println("Transcription was blank. Probably silence.");
    return;
  }

  Serial.println("Transcript: " + transcript);
  saveNote(transcript);
}

// ================= UI =================
const char settings_html[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Settings</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; padding: 20px; background: #4a2f1d; display: flex; justify-content: center;align-items: center; min-height: 100vh; margin: 0; }
        .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 100%; max-width: 400px; }
        h2 { margin-top: 0; color: #333; }
        label { font-weight: 600; display: block; margin-top: 15px; color: #555; font-size: 0.9rem; }
        input[type="text"], input[type="password"] { width: 100%; padding: 10px; margin-top: 5px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-family: 'Inter', sans-serif; }
        input[type="submit"] { background: #3b82f6; color: white; border: none; padding: 12px 15px; border-radius: 4px; font-weight: bold; cursor: pointer; width: 100%; margin-top: 25px; transition: background 0.2s; }
        input[type="submit"]:hover { background: #2563eb; }
        .back { display: block; margin-top: 20px; text-align: center; text-decoration: none; color: #666; font-size: 0.9rem; }
        .back:hover { color: #333; }
    </style>
</head>
<body>
    <div class="card">
        <h2>⚙️ System Settings</h2>
        <form action="/save" method="POST">
            <label>WiFi SSID</label>
            <input type="text" name="ssid" value="%SSID%" required>
            
            <label>WiFi Password</label>
            <input type="password" name="pass" value="%PASS%">
            
            <label>Deepgram API Key</label>
            <input type="password" name="api" value="%API%" placeholder="Type a new key to overwrite...">
            
            <input type="submit" value="Save & Restart">
        </form>
        <a href="/" class="back">← Back to Board</a>
    </div>
</body>
</html>
)rawliteral";

const char index_html[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Smart Notice Board</title>
    <!-- We load a handwriting font for notes, and a clean sans-serif for UI elements -->
    <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <style>
        :root {
            /* Physical Material Colors */
            --cork: #d2a679;
            --cork-dark: #b88658;
            --frame: #4a2f1d;
            --plate: #f4f4f5;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            background-color: var(--frame); /* Outer wooden wall/frame color */
            padding: 2vw;
            min-height: 100vh;
            font-family: 'Inter', sans-serif;
            display: flex;
            justify-content: center;
        }

        /* The Physical Notice Board */
        .board {
            background-color: var(--cork);
            /* Cork texture illusion using radial gradients */
            background-image: 
                radial-gradient(var(--cork-dark) 15%, transparent 16%), 
                radial-gradient(var(--cork-dark) 15%, transparent 16%);
            background-size: 24px 24px;
            background-position: 0 0, 12px 12px;
            
            border: 18px solid var(--frame); /* Wooden Frame */
            border-radius: 8px;
            box-shadow: 
                inset 0 0 40px rgba(0,0,0,0.6), /* Inner shadow of the frame */
                0 10px 25px rgba(0,0,0,0.5);    /* Drop shadow against the wall */
            width: 100%;
            max-width: 1200px;
            padding: 2rem;
            position: relative;
        }

        /* Top Metal Plate */
        .board-header {
            background: var(--plate);
            border: 1px solid #d4d4d8;
            padding: 0.75rem 1.75rem;
            border-radius: 4px;
            box-shadow: 1px 2px 5px rgba(0,0,0,0.2);
            position: relative;
            display: inline-flex;
            align-items: center;
            gap: 1.5rem;
            margin-bottom: 3rem;
            left: 50%;
            transform: translateX(-50%);
        }
        
        /* Screws on the metallic plate */
        .board-header::before, .board-header::after {
            content: ''; position: absolute; width: 10px; height: 10px; 
            background: #a1a1aa; border-radius: 50%; top: 50%; transform: translateY(-50%);
            box-shadow: inset 1px 1px 2px rgba(0,0,0,0.4), 1px 1px 1px rgba(255,255,255,0.8);
        }
        .board-header::before { left: 10px; }
        .board-header::after { right: 10px; }

        h1 { font-size: 1.25rem; font-weight: 600; color: #27272a; margin: 0; }
        
        .settings-btn {
            background: #e4e4e7;
            text-decoration: none;
            padding: 6px;
            border-radius: 4px;
            font-size: 1.1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 2px rgba(0,0,0,0.2);
            transition: background 0.1s;
        }
        .settings-btn:hover { background: #d4d4d8; }

        .clear-btn {
            background: #ef4444;
            color: white;
            padding: 0.4rem 0.8rem;
            border-radius: 4px;
            text-decoration: none;
            font-size: 0.85rem;
            font-weight: 600;
            box-shadow: 0 2px 4px rgba(239, 68, 68, 0.4);
            transition: transform 0.1s;
        }
        .clear-btn:active { transform: translateY(2px); box-shadow: none; }

        .notes-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 2rem;
            justify-content: center;
        }

        /* Sticky Notes */
        .sticky-note {
            background: #fdfd96; /* Default classic yellow */
            width: 250px;
            min-height: 250px;
            padding: 1.5rem;
            position: relative;
            box-shadow: 2px 4px 8px rgba(0,0,0,0.2), 0 0 1px rgba(0,0,0,0.1) inset;
            display: flex;
            flex-direction: column;
            transform: rotate(-2deg);
            transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s;
            cursor: pointer;
        }
        
        /* Paper slightly curling effect using pseudo-element shadow */
        .sticky-note::after {
            content: "";
            position: absolute;
            z-index: -1;
            bottom: 15px;
            right: 5px;
            width: 50%;
            height: 20%;
            box-shadow: 0 15px 10px rgba(0,0,0,0.3);
            transform: rotate(3deg);
        }

        /* Multi-colored notes alternating randomly based on position */
        .sticky-note:nth-child(2n) { background: #ffb7b2; transform: rotate(3deg); } /* Pinkish */
        .sticky-note:nth-child(3n) { background: #a2e1d4; transform: rotate(-1deg); } /* Mint */
        .sticky-note:nth-child(4n) { background: #E2D1F9; transform: rotate(1deg); } /* Lavender */
        .sticky-note:nth-child(5n) { background: #b5e48c; transform: rotate(-3deg); } /* Green */

        /* Affordance: Paper lifts up when interacting */
        .sticky-note:hover { 
            transform: scale(1.05) rotate(0deg); 
            box-shadow: 5px 10px 15px rgba(0,0,0,0.25); 
            z-index: 10; 
        }

        /* Hand-written text styling */
        .note-text {
            font-family: 'Caveat', cursive;
            font-size: 1.85rem;
            color: #1c1917;
            flex-grow: 1;
            line-height: 1.2;
        }

        .note-time {
            font-size: 0.75rem;
            color: rgba(0,0,0,0.4);
            margin-bottom: 0.5rem;
            font-family: 'Inter', sans-serif;
            border-bottom: 1px solid rgba(0,0,0,0.1); 
            padding-bottom: 0.5rem;
        }

        /* Thumbtack Pin */
        .pin {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #ef4444; /* Red pin */
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            box-shadow: inset -2px -2px 4px rgba(0,0,0,0.3), 2px 4px 5px rgba(0,0,0,0.4);
        }
        .pin::before { /* Pin highlight reflection */
            content: ''; position: absolute; width: 4px; height: 4px; 
            background: rgba(255,255,255,0.7); border-radius: 50%; top: 2px; left: 3px;
        }
        
        /* Alternate pin colors */
        .sticky-note:nth-child(2n) .pin { background: #3b82f6; } /* Blue Pin */
        .sticky-note:nth-child(3n) .pin { background: #eab308; } /* Yellow Pin */

        .delete-btn {
            align-self: flex-end;
            color: #ef4444;
            text-decoration: none;
            font-family: 'Inter', sans-serif;
            font-size: 0.8rem;
            font-weight: 600;
            opacity: 0;
            transition: opacity 0.2s;
            margin-top: 10px;
            background: rgba(255,255,255,0.5);
            padding: 4px 8px;
            border-radius: 4px;
        }
        .sticky-note:hover .delete-btn { opacity: 1; }
        
        /* Mobile touch affordance: Always show delete btn slightly on touch devices */
        @media (hover: none) { .delete-btn { opacity: 0.7; } }

        .empty-state {
            width: 100%;
            text-align: center;
            font-family: 'Caveat', cursive;
            font-size: 2rem;
            color: rgba(0,0,0,0.5);
            margin-top: 5rem;
        }
    </style>
</head>
<body>
    <div class="board">
        <div class="board-header">
            <a href="/settings" class="settings-btn" title="Settings">⚙️</a>
            <h1>📋 Notice Board</h1>
            <!-- Hick's Law: We use a native JS confirm to inject a necessary cognitive pause before a destructive action -->
            <a href="/clear" class="clear-btn" onclick="return confirm('Pull down all notes?')">Clear Board</a>
        </div>
        
        <div class="notes-grid" id="notes-grid">
            %NOTES%
        </div>
    </div>
    <script>
        // Clean URL to prevent accidental re-firing of deletes on refresh
        if (window.location.pathname !== '/') { window.history.replaceState({}, '', '/'); }
        
        if (!document.querySelector('.sticky-note')) {
            document.getElementById('notes-grid').innerHTML = '<div class="empty-state">The board is empty.<br>Hold the microphone button to pin a new thought!</div>';
        }
    </script>
</body>
</html>
)rawliteral";

// ================= SETUP =================
void setup() {
  Serial.begin(115200);

  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);

  // Load configuration from NVS
  preferences.begin("config", false);
  wifi_ssid = preferences.getString("ssid", "");
  wifi_pass = preferences.getString("pass", "");
  api_key = preferences.getString("api", "88b9c8a6ecd3b5b3247e9f3ac9bfc91a79885dcc");

  // Initialize WiFi
  if (wifi_ssid.isEmpty()) {
    Serial.println("\nNo WiFi credentials found.");
    Serial.println("Starting AP Mode: 'SmartBoard_Setup'");
    WiFi.softAP("SmartBoard_Setup");
  } else {
    Serial.println("\nConnecting to WiFi: " + wifi_ssid);
    WiFi.begin(wifi_ssid.c_str(), wifi_pass.c_str());
    
    // Wait up to 15 seconds to connect
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
      delay(500);
      Serial.print(".");
      attempts++;
    }
    
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("\nFailed to connect.");
      Serial.println("Falling back to AP Mode: 'SmartBoard_Setup'");
      WiFi.softAP("SmartBoard_Setup");
    } else {
      Serial.println("\nConnected to WiFi!");
      Serial.print("IP Address: ");
      Serial.println(WiFi.localIP());
    }
  }

  SPIFFS.begin(true);
  setupI2S();

  // Setup Web Server Routes
  server.on("/", HTTP_GET, []() {
    String html = String(index_html);
    html.replace("%NOTES%", loadNotes());
    server.send(200, "text/html", html);
  });

  server.on("/clear", HTTP_GET, []() {
    SPIFFS.remove("/notes.txt");
    server.sendHeader("Location", "/");
    server.send(303);
  });

  server.on("/delete", HTTP_GET, []() {
    if (server.hasArg("ts")) deleteNote(server.arg("ts"));
    server.sendHeader("Location", "/");
    server.send(303);
  });

  server.on("/settings", HTTP_GET, []() {
    String html = String(settings_html);
    html.replace("%SSID%", wifi_ssid);
    html.replace("%PASS%", wifi_pass);
    html.replace("%API%", api_key); 
    server.send(200, "text/html", html);
  });

  server.on("/save", HTTP_POST, []() {
    if (server.hasArg("ssid")) preferences.putString("ssid", server.arg("ssid"));
    if (server.hasArg("pass")) preferences.putString("pass", server.arg("pass"));
    
    if (server.hasArg("api") && server.arg("api").length() > 0) {
        preferences.putString("api", server.arg("api"));
    }
    
    server.send(200, "text/html", "<h2 style='font-family:sans-serif; text-align:center; margin-top:50px;'>Settings Saved! Restarting...</h2><script>setTimeout(()=>window.location='/', 5000);</script>");
    
    delay(1000);
    ESP.restart();
  });

  server.begin();
  Serial.println("Web Server Started.");
}

// ================= LOOP =================

void loop() {
  bool btn = digitalRead(BUTTON_PIN);

  // If button is pressed (LOW) and we aren't already recording
  if (btn == LOW && !isRecording) {
    streamAndTranscribe();
    delay(500); // 500ms debounce buffer just in case
  }

  // Handle any incoming web requests
  server.handleClient();
}