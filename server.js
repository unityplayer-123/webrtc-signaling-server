// --- 基本設定 ---
const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
app.use(express.static("public")); // WebGLビルドやindex.htmlを配信

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// --- クライアント管理 ---
let unityClient = null;
let browserClient = null;
let lastOffer = null;

// --- WebSocket接続 ---
wss.on("connection", (ws) => {
  console.log("✅ New WebSocket client connected");

  ws.on("message", (message) => {
    console.log("🛰️ Raw message:", message.toString());

    try {
      const msg = JSON.parse(message);
      console.log("📦 Parsed message:", msg);

      // --- クライアント識別 ---
      if (msg.role === "unity") {
        unityClient = ws;
        console.log("🎮 Unity client registered");
        return;
      }

      if (msg.role === "browser") {
        browserClient = ws;
        console.log("🖥️ Browser client registered");

        // --- UnityのOfferがすでにある場合、即送信 ---
        if (lastOffer && ws.readyState === WebSocket.OPEN) {
          console.log("📤 Sending cached offer to browser");
          ws.send(lastOffer);
        } else {
          console.log("⚠️ No cached offer yet.");
        }
        return;
      }

      // --- 通常メッセージ処理 ---
      switch (msg.type) {
        case "offer":
          console.log("🎥 Offer received from Unity");
          lastOffer = JSON.stringify(msg);

          if (browserClient && browserClient.readyState === WebSocket.OPEN) {
            browserClient.send(lastOffer);
            console.log("📡 Offer forwarded to browser");
          } else {
            console.log("⚠️ No browser client, offer cached.");
          }
          break;

        case "answer":
          console.log("✅ Answer received from Browser");
          if (unityClient && unityClient.readyState === WebSocket.OPEN) {
            unityClient.send(JSON.stringify(msg));
            console.log("📡 Answer forwarded to Unity");
          } else {
            console.log("⚠️ No active Unity client");
          }
          break;

        case "candidate":
          console.log("🧊 ICE Candidate exchange");
          if (ws === unityClient && browserClient?.readyState === WebSocket.OPEN) {
            browserClient.send(JSON.stringify(msg));
          } else if (ws === browserClient && unityClient?.readyState === WebSocket.OPEN) {
            unityClient.send(JSON.stringify(msg));
          }
          break;

        default:
          console.log("⚠️ Unknown message type:", msg.type);
      }
    } catch (err) {
      console.error("❌ Failed to parse message:", err);
    }
  });

  // --- 切断処理 ---
  ws.on("close", () => {
    console.log("❌ Client disconnected");

    if (ws === unityClient) {
      unityClient = null;
      console.log("🧹 Unity client cleared");
    }

    if (ws === browserClient) {
      browserClient = null;
      console.log("🧹 Browser client cleared");
    }
  });
});

// --- サーバ起動 ---
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
});
