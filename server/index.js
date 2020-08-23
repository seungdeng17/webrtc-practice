const express = require('express');
const http = require('http');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const users = {};

io.on('connection', socket => {
    if (!users[socket.id]) {
        users[socket.id] = socket.id;
    }
    socket.emit('youID', socket.id);
    io.sockets.emit('allUsers', users);
    socket.on('disconnect', () => {
        delete users[socket.id];
    });

    socket.on('callUser', (data) => {
        io.to(data.userToCall).emit('hey', { signal: data.signalData, from: data.from });
    });

    socket.on('acceptCall', (data) => {
        io.to(data.to).emit('callAccepted', data.signal);
    })

});

server.listen(5000, () => console.log("Server started"));