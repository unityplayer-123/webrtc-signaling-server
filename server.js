// --- 基本設定 ---
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
app.use(express.static('public')); // WebGLビルドを置く場合もここで配信可能

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// --- クライアント管理 ---
let unityClient = null;
let browserClient = null;
let lastOffer = null;

// --- 接続イベント ---
wss.on('connection', ws => {
  console.log('✅ New WebSocket client connected');

  ws.on('message', message => {
    console.log("🛰️ Raw message from client:", message.toString()); // ★ 追加（生データ確認）

    try {
      const msg = JSON.parse(message); // JSONパース
      console.log("✅ Parsed JSON:", msg);

      // --- クライアント識別 ---
      if (msg.role === 'unity') {
        unityClient = ws;
        console.log('🎮 Unity client registered');
        return;
      } else if (msg.role === 'browser') {
        browserClient = ws;
        console.log('🖥️ Browser client registered');

        // --- キャッシュ済みOfferがあれば即送信 ---
        if (lastOffer && ws.readyState === WebSocket.OPEN) {
          console.log('📤 Sending cached offer to browser');
          ws.send(lastOffer);
        } else {
          console.log('⚠️ No cached offer available yet.');
        }
        return;
      }

      // --- 通常メッセージの種類別処理 ---
      if (msg.type === 'offer') {
        console.log('🎥 Offer received from Unity');
        console.log('📦 Offer JSON preview:', msg);

        // --- Offerキャッシュ（文字列として保存）---
        lastOffer = JSON.stringify(msg); // ★ 修正ポイント

        // --- ブラウザへ転送 ---
        if (browserClient && browserClient.readyState === WebSocket.OPEN) {
          browserClient.send(lastOffer);
          console.log('📡 Offer forwarded to browser');
        } else {
          console.log('⚠️ No active browser client, offer cached for later.');
        }

      } else if (msg.type === 'answer') {
        console.log('✅ Answer received from Browser');
        if (unityClient && unityClient.readyState === WebSocket.OPEN) {
          unityClient.send(JSON.stringify(msg)); // ★ 明示的にJSON文字列で送信
          console.log('📡 Answer forwarded to Unity');
        }

      } else if (msg.type === 'candidate') {
        console.log('🧊 ICE Candidate exchange');
        if (ws === unityClient && browserClient) {
          browserClient.send(JSON.stringify(msg));
        } else if (ws === browserClient && unityClient) {
          unityClient.send(JSON.stringify(msg));
        }

      } else {
        console.log('⚠️ Unknown message type:', msg.type);
      }

    } catch (err) {
      console.error('❌ Failed to parse message:', err);
    }
  });

  // --- 切断イベント ---
  ws.on('close', () => {
    console.log('❌ Client disconnected');
    if (ws === unityClient) {
      console.log('🧹 Unity client cleared');
      unityClient = null;
    }
    if (ws === browserClient) {
      console.log('🧹 Browser client cleared');
      browserClient = null;
    }
  });
});

// --- サーバー起動 ---
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`🚀 Signaling server running on port ${PORT}`));

