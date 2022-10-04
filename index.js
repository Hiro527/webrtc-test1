const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const app = express();

const serverOptions = {
    key: fs.readFileSync('./cert/localhost-key.pem'),
    cert: fs.readFileSync('./cert/localhost.pem'),
};

const server = https.createServer(serverOptions, app);
const io = new Server(server);

const PORT = 3000;

io.on('connection', (socket) => {
    console.log(`[INFO] New connection: ${socket.id}`);

    socket.on('signaling', (data) => {
        console.log(`[INFO] Signaling from ${socket.id}, Type: ${data.type}`);
        socket.broadcast.emit('signaling', data);
    });

    socket.on('disconnect', () => {
        console.log(`[INFO] Client disconnected: ${socket.id}`);
    });
});

app.use(express.static(path.join(__dirname, '/web')));

server.listen(PORT, () => {
    console.log(`[INFO] Server listening on localhost:3000`);
});
