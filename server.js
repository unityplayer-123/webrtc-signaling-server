const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
app.use(express.static('public')); // viewer.html を配信

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let unityClient = null;
let browserClient = null;

wss.on('connection', ws => {
  console.log('✅ Client connected');

  ws.on('message', message => {
    const msg = JSON.parse(message);

    // Unity からの offer
    if (msg.type === 'offer') {
      console.log('🎥 Offer from Unity');
      unityClient = ws;
      // ブラウザに転送
      if (browserClient && browserClient.readyState === WebSocket.OPEN) {
        browserClient.send(message);
      }
    }
    // ブラウザからの answer
    else if (msg.type === 'answer') {
      console.log('🖥️ Answer from Browser');
      browserClient = ws;
      if (unityClient && unityClient.readyState === WebSocket.OPEN) {
        unityClient.send(message);
      }
    }
    // ICE Candidate 共通
    else if (msg.type === 'candidate') {
      if (ws === unityClient && browserClient) {
        browserClient.send(message);
      } else if (ws === browserClient && unityClient) {
        unityClient.send(message);
      }
    }
  });

  ws.on('close', () => console.log('❌ Client disconnected'));
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
