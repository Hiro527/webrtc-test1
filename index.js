const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();

const httpServer = http.Server(app);
const io = new Server(httpServer);

const PORT = 3000;

io.on('connection', (socket) => {
    console.log(`New connection: ${socket.id}`);

    socket.on('signaling', (data) => {
        console.log(`Signaling from ${socket.id}, Type: ${data.type}`);
        socket.broadcast.emit('signaling', data);
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

app.use(express.static(path.join(__dirname, '/web')));

httpServer.listen(PORT, () => {
    console.log(`Server listening on localhost:3000`);
});
