
const express = require("express");
const bodyParser = require("body-parser");
const record = require("node-record-lpcm16");
const fs = require("fs");
const { exec } = require("child_process");
const util = require("util");
const execAsync = util.promisify(exec);
require("dotenv").config();

//deepgram api key
const { createClient } = require("@deepgram/sdk");
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

//gemini api key
const { GoogleGenAI } = require("@google/genai");
const gemini = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

//cartesa api key
const { CartesiaClient } = require("@cartesia/cartesia-js");
const cartesia = new CartesiaClient({ apiKey: process.env.CARTESIA_API_KEY });

//AHHHHHHHHHHH
const app = express();
app.use(bodyParser.json());

let recordingProcess = null;
const AUDIO_FILE = "audio.wav";

//function for api call
function startRecording() {
  if (recordingProcess) return;

  console.log("🎤 Starting microphone recording...");
  recordingProcess = record.record({
    sampleRate: 44100,
    channels: 1,
    audioType: "wav"
  });

  recordingProcess.stream().pipe(fs.createWriteStream(AUDIO_FILE));
  console.log("Recording started.");
}

//function for api call
function stopRecording() {
  if (!recordingProcess) return;

  console.log("Stopping microphone...");
  recordingProcess.stop();
  recordingProcess = null;
}

//helper for testing
async function playAudio(file) {
  try { await execAsync(`afplay "${file}"`); } 
  catch (err) { console.error("Playback error:", err); }
}

//writes the wav file for cartesia (abandoned)
function writeWavFile(filePath, pcmData, sampleRate) {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * 2 * 1;

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmData.length, 40);

  fs.writeFileSync(filePath, Buffer.concat([header, pcmData]));
}

//audio pipeline

async function processAudio(filePath) {
  try {
    console.log("🎧 Sending audio to Deepgram...");
    const audioBuffer = fs.readFileSync(filePath);

//deepgram for the speech to text

    const { result } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
      model: "nova-2",
      smart_format: true,
      language: "en"
    });

    // console.log(result);

    const transcription = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
    console.log("📝 You said:", transcription);

   //gemini for the brain 

   const PROMPT = 'In a brief sentence or two help me with my question:'
   const query = PROMPT + transcription

  //   const available = await gemini.models.list();
  // console.log(available);
    const response = await gemini.models.generateContent({
  model: "gemini-flash-lite-latest",      // or another Gemini model name
  contents: query        // your text prompt
});

    const reply = response.text;
console.log("🤖 Gemini:", reply);


 //cartesia for the text to speech
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const Speaker = require("speaker");

const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY;

// Play PCM buffer directly using Speaker
function playPCM(pcmBuffer, sampleRate = 44100) {
  const speaker = new Speaker({
    channels: 1,         // mono
    bitDepth: 16,        // pcm_s16le
    sampleRate: sampleRate
  });

  speaker.write(pcmBuffer);
  speaker.end();
}

//gen and play from cartesia
async function playCartesiaTTS(text) {
  const response = await fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: {
      "Cartesia-Version": "2025-04-16",
      "X-API-Key": CARTESIA_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      transcript: text,
      model_id: "sonic-3",
      voice: {
        mode: "id",
        id: "694f9389-aac1-45b6-b726-9d9369183238"
      },
      output_format: {
        container: "raw",       // raw PCM so we can play directly
        encoding: "pcm_s16le",
        sample_rate: 44100
      }
    })
  });

  if (!response.ok) throw new Error(`Cartesia TTS failed: ${response.statusText}`);

  const arrayBuffer = await response.arrayBuffer();
  const pcmBuffer = Buffer.from(arrayBuffer);

  playPCM(pcmBuffer, 44100);
}


(async () => {
  await playCartesiaTTS(reply);
})();



  } catch (err) {
    console.error("❌ Pipeline error:", err);
  }
}

//api endpoint for the esp32 to connect to 
app.post("/api/record", (req, res) => {
  const { command } = req.body;

  if (command === "start_recording") {
    startRecording();
    return res.json({ status: "recording_started" });
  }

  if (command === "stop_recording") {
    stopRecording();
    res.json({ status: "recording_stopped" });
    processAudio(AUDIO_FILE).catch(console.error);
    return;
  }

  return res.status(400).json({ error: "Invalid command" });
});

//app server port
app.listen(8888, () =>
  console.log("🚀 Server running on port 8888")
);
