const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let unityClient = null;
let browserClient = null;

let lastOffer = null;

// ✅ candidate キャッシュ（相手が不在でも捨てない）
let cachedCandidatesFromUnity = [];
let cachedCandidatesFromBrowser = [];

function safeSend(ws, objOrStr) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(typeof objOrStr === "string" ? objOrStr : JSON.stringify(objOrStr));
}

wss.on("connection", (ws) => {
  console.log("✅ New WebSocket client connected");

  ws.on("message", (message) => {
    const raw = message.toString();
    console.log("🛰️ Raw message:", raw);

    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (err) {
      console.error("❌ Failed to parse message:", err);
      return;
    }

    console.log("📦 Parsed message:", msg);

    // --- Role registration ---
    if (msg.role === "unity") {
      unityClient = ws;
      console.log("🎮 Unity client registered");

      // Unityが再接続してきたら古いcandidateは掃除
      cachedCandidatesFromBrowser = [];
      return;
    }

    if (msg.role === "browser") {
      browserClient = ws;
      console.log("🖥️ Browser client registered");

      // Offerがあれば即送信
      if (lastOffer) {
        console.log("📤 Sending cached offer to browser");
        safeSend(browserClient, lastOffer);
      } else {
        console.log("⚠️ No cached offer yet.");
      }

      // ✅ Unity->Browser のcandidateをまとめて送る
      if (cachedCandidatesFromUnity.length > 0) {
        console.log(`📤 Flush Unity candidates -> Browser: ${cachedCandidatesFromUnity.length}`);
        for (const c of cachedCandidatesFromUnity) safeSend(browserClient, c);
        cachedCandidatesFromUnity = [];
      }

      return;
    }

    // --- Normal message ---
    switch (msg.type) {
      case "offer": {
        console.log("🎥 Offer received from Unity");
        lastOffer = JSON.stringify(msg);

        if (browserClient && browserClient.readyState === WebSocket.OPEN) {
          safeSend(browserClient, lastOffer);
          console.log("📡 Offer forwarded to browser");
        } else {
          console.log("⚠️ No browser client, offer cached.");
        }
        break;
      }

      case "answer": {
        console.log("✅ Answer received from Browser");
        if (unityClient && unityClient.readyState === WebSocket.OPEN) {
          safeSend(unityClient, msg);
          console.log("📡 Answer forwarded to Unity");

          // ✅ Browser->Unity のcandidateをまとめて送る
          if (cachedCandidatesFromBrowser.length > 0) {
            console.log(`📤 Flush Browser candidates -> Unity: ${cachedCandidatesFromBrowser.length}`);
            for (const c of cachedCandidatesFromBrowser) safeSend(unityClient, c);
            cachedCandidatesFromBrowser = [];
          }
        } else {
          console.log("⚠️ No active Unity client");
        }
        break;
      }

      case "candidate": {
        // console.log("🧊 ICE Candidate exchange");
        const packet = JSON.stringify(msg);

        if (ws === unityClient) {
          if (browserClient && browserClient.readyState === WebSocket.OPEN) {
            safeSend(browserClient, packet);
          } else {
            // ✅ browser不在ならキャッシュ
            cachedCandidatesFromUnity.push(packet);
            console.log("🕒 Candidate cached (Unity->Browser)");
          }
        } else if (ws === browserClient) {
          if (unityClient && unityClient.readyState === WebSocket.OPEN) {
            safeSend(unityClient, packet);
          } else {
            // ✅ unity不在ならキャッシュ
            cachedCandidatesFromBrowser.push(packet);
            console.log("🕒 Candidate cached (Browser->Unity)");
          }
        }
        break;
      }

      default:
        console.log("⚠️ Unknown message type:", msg.type);
    }
  });

  ws.on("close", () => {
    console.log("❌ Client disconnected");

    if (ws === unityClient) {
      unityClient = null;
      console.log("🧹 Unity client cleared");
      // Unityが切れたら offer/candidates は残してもいいが、実験中は掃除推奨
      // lastOffer = null;
      cachedCandidatesFromUnity = [];
    }

    if (ws === browserClient) {
      browserClient = null;
      console.log("🧹 Browser client cleared");
      cachedCandidatesFromBrowser = [];
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
});
