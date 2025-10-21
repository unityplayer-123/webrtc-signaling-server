const fs = require('fs');
const https = require('https');
const express = require('express');
const WebSocket = require('ws');

// SSL証明書のパス
const serverOptions = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt')
};

const app = express();

// publicフォルダ内のviewer.htmlを配信
app.use(express.static('public'));

const server = https.createServer(serverOptions, app);

// WebSocketサーバー
const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
    console.log('✅ Client connected');

    ws.on('message', message => {
        console.log('📩 Message received:', message.toString());

        // 他のクライアントにブロードキャスト
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on('close', () => {
        console.log('❌ Client disconnected');
    });
});

const PORT = process.env.PORT || 443;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));



