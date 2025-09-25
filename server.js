const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

let onlineUsers = {};

io.on('connection', socket => {
  console.log("New client connected:", socket.id);

  socket.on("register", username => {
    onlineUsers[username] = socket.id;
    io.emit("online-users", Object.keys(onlineUsers));
  });

  socket.on("call-user", ({ from, to }) => {
    if (onlineUsers[to]) {
      io.to(onlineUsers[to]).emit("incoming-call", { from });
    }
  });

  socket.on("call-response", ({ from, to, accepted }) => {
    if (onlineUsers[to]) {
      io.to(onlineUsers[to]).emit("call-response", { from, accepted });
    }
  });

  socket.on("disconnect", () => {
    for (let user in onlineUsers) {
      if (onlineUsers[user] === socket.id) {
        delete onlineUsers[user];
        break;
      }
    }
    io.emit("online-users", Object.keys(onlineUsers));
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Socket.IO server running on port 3000");
});
