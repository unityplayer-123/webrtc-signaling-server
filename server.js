const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let unityClient = null;
let browserClient = null;
let lastOffer = null;

wss.on('connection', ws => {
  console.log('✅ Client connected');

  ws.on('message', message => {
    const msg = JSON.parse(message);

    if (msg.type === 'offer') {
      console.log('🎥 Offer from Unity');
      unityClient = ws;
      lastOffer = message;

      if (browserClient && browserClient.readyState === WebSocket.OPEN) {
        browserClient.send(message);
      }
    } else if (msg.type === 'answer') {
      console.log('🖥️ Answer from Browser');
      browserClient = ws;
      if (unityClient && unityClient.readyState === WebSocket.OPEN) {
        unityClient.send(message);
      }
    } else if (msg.type === 'candidate') {
      if (ws === unityClient && browserClient) {
        browserClient.send(message);
      } else if (ws === browserClient && unityClient) {
        unityClient.send(message);
      }
    }
  });

  // 新規ブラウザ接続時にキャッシュした Offer を送信
  if (!browserClient) {
    browserClient = ws;
    if (lastOffer && ws.readyState === WebSocket.OPEN) {
      console.log('📤 Sending cached offer to new browser');
      ws.send(lastOffer);
    }
  }

  ws.on('close', () => console.log('❌ Client disconnected'));
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
