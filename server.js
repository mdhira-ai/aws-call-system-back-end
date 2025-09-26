const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { prisma } = require("./script");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  //   data has username, isonline
  socket.on("register", async (data) => {
    const user = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isOnline: true,
          mysocketid: socket.id,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          username: data.username,
          isOnline: true,
          mysocketid: socket.id,
        },
      });
    }
    console.log("User registered/updated:", data.username);

    // send all data
    io.emit( "online-users",await prisma.user.findMany({ where: { isOnline: true } }));
  });

  //   user a ------> user b
  socket.on("call-user", async ({ from, to }) => {
    const user = await prisma.user.findUnique({ where: { username: to } });
    if (user) {
      io.to(user.mysocketid).emit("incoming-call", { from });
    }
  });

  // user b ------> user a
  socket.on("call-response", async ({ from, to, accepted }) => {
    const user = await prisma.user.findUnique({ where: { username: to } });
    if (user) {
      io.to(user.mysocketid).emit("call-response", { from, accepted });
    }
  });

  socket.on("disconnect", async() => {
    console.log("Client disconnected:", socket.id);
    const user = await prisma.user.findFirst({ where: { mysocketid: socket.id } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isOnline: false, mysocketid: null },
      });
    }
    io.emit("online-users", await prisma.user.findMany({ where: { isOnline: true } }));
    
  });
});

server.listen(3000, () => {
  console.log("Socket.IO server running on port 3000");
});
