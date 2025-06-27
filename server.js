const http = require('http');
const WebSocket = require('ws');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('WebSocket signaling server is running');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



