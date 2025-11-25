#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Adafruit_NeoPixel.h>

#define BUTTON_PIN 35
#define RGB_BUILTIN 2
#define NUM_PIXELS 1

const char* ssid = "wifi_username";
const char* password = "wifi_password";

//ngrok endpoint
const char* serverURL = "serverurl/api/record";

Adafruit_NeoPixel pixels(NUM_PIXELS, RGB_BUILTIN, NEO_GRB + NEO_KHZ800);
bool isRecording = false;

//led (we thing the led died)
void updateLED() {
  if (isRecording) {
    pixels.setPixelColor(0, pixels.Color(255, 0, 0));   // RED = RECORDING
  } else {
    pixels.setPixelColor(0, pixels.Color(0, 0, 255));   // BLUE = IDLE
  }
  pixels.show();
}

//wifi connection
void sendCommand(bool start) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi disconnected!");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();  // Accept any certificate (for testing)

  HTTPClient http;
  http.begin(client, serverURL);
  http.addHeader("Content-Type", "application/json");

  String payload = "{\"command\":\"";
  payload += (start ? "start_recording" : "stop_recording");
  payload += "\"}";

  Serial.println("Sending payload: " + payload);

  int httpResponseCode = http.POST(payload);

  if (httpResponseCode > 0) {
    Serial.println("Server Response Code: " + String(httpResponseCode));
    String response = http.getString();
    Serial.println("Response Body: " + response);
  } else {
    Serial.println("HTTP POST failed: " + String(httpResponseCode));
  }

  http.end();
}


void setup() {
  Serial.begin(115200);

  pixels.begin();
  pixels.setBrightness(50);
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  //connect wifi with ssid
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(400);
  }
  Serial.println("\nConnected! IP: " + WiFi.localIP().toString());

  updateLED();
}


void loop() {
  static bool lastState = HIGH;
  int reading = digitalRead(BUTTON_PIN);

  //button eddge detection
  if (reading != lastState) {
    lastState = reading;

    if (reading == LOW) { //button presss
      isRecording = true;
      updateLED();
      sendCommand(true);
      Serial.println("EVENT: Button Press → start_recording");
    } else {               //not button press
      isRecording = false;
      updateLED();
      sendCommand(false);
      Serial.println("EVENT: Button Release → stop_recording");
    }
  }

  delay(30);
}
