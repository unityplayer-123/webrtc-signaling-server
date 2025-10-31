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
  console.log('✅ New WebSocket client connected');

  ws.on('message', message => {
    try {
      const msg = JSON.parse(message);

      // --- クライアント識別メッセージ ---
      if (msg.role === 'unity') {
        unityClient = ws;
        console.log('🎮 Unity client registered');
        return;
      } else if (msg.role === 'browser') {
        browserClient = ws;
        console.log('🖥️ Browser client registered');
        // キャッシュ済み offer があれば即送信
        if (lastOffer && ws.readyState === WebSocket.OPEN) {
          console.log('📤 Sending cached offer to browser');
          ws.send(lastOffer);
        }
        return;
      }

      // --- 通常メッセージ ---
      if (msg.type === 'offer') {
        console.log('🎥 Offer received from Unity');
        lastOffer = message;
        if (browserClient && browserClient.readyState === WebSocket.OPEN) {
          browserClient.send(message);
        }
      } else if (msg.type === 'answer') {
        console.log('✅ Answer received from Browser');
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

    } catch (err) {
      console.error('❌ Failed to parse message:', err);
    }
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
    if (ws === unityClient) unityClient = null;
    if (ws === browserClient) browserClient = null;
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`🚀 Signaling server running on port ${PORT}`));
