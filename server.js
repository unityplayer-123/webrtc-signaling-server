// server.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: process.env.PORT || 3000 });

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    // 受け取ったメッセージを他のクライアントにブロードキャスト
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
});


