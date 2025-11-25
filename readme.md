
# Smart Astronaut Helmet – IEEE Quarterly Project 2025

**Contributors:** Nandita, Johnny, Donovan

Code modified a lot from this: https://github.com/lout33/ai_assistant_esp32
Also used chatgpt for code scaffolding all the tedious/boring stuff. it sucks tho.

A smart astronaut helmet prototype that allows voice communication. On pressing a button, the helmet activates an audio pipeline to talk and respond intelligently.



## Hardware Components

* **ESP32-WROOM-32** microcontroller
* **NeoPixel LED** (RGB LED)
* **Push Button**
* **Breadboard**
* **Jumper Wires**
* **Resistors** (for button and LED circuit)



## Software Components

* **Gemini, Deepgram, Cartesia** – Audio processing and response pipeline
* **Express.js** – Backend server
* Other Node.js dependencies listed in `package.json`


## Build Instructions

1. **Flash ESP32**

   * Open `code.ino` in Arduino IDE or VS Code.
   * Replace placeholders with your network and server configuration:

     ```cpp
     const char* ssid = "YOUR_WIFI_SSID";
     const char* password = "YOUR_WIFI_PASSWORD";
     const char* serverURL = "YOUR_SERVER_URL";
     ```
   * Upload the code to the ESP32.

2. **Run Express Server**

   ```bash
   npm install
   node server.js
   ```

3. **Start ngrok (optional for public testing)**

   ```bash
   ngrok http 8888
   ```

   * Update the ESP32 `serverURL` with the ngrok HTTPS endpoint if using.

---

## Usage

1. Press the button on the helmet to start recording.
2. LED will turn on (but ours doesnt work because it died)
3. Audio input is processed and the server responds via the pipeline.



## Notes

* Ensure the ESP32 has a stable Wi-Fi connection to a hotspot.
