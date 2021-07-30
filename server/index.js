const fs = require("fs");
const https = require("https");
const express = require("express");
const socket = require("socket.io");

// set https server
const credentials = {
  key: fs.readFileSync("./cert/localhost.key"),
  cert: fs.readFileSync("./cert/localhost.crt"),
};
const app = express();
const httpsServer = https.createServer(credentials, app);

// socket io
const io = socket(httpsServer);

const users = new Map();

io.on("connection", (socket) => {
  const socketId = socket.id;
  if (!users.has(socketId)) users.set(socketId, socketId);

  socket.emit("setMyId", socket.id);
  io.sockets.emit("users", [...users.values()]);

  // sdp
  socket.on("offer", ({ callee, offer }) =>
    io.to(callee).emit("sendOfferToCallee", { caller: socketId, offer })
  );
  socket.on("answer", ({ caller, answer }) =>
    io.to(caller).emit("sendAnswerToCaller", { answer })
  );

  // ice candidate
  socket.on("new-ice-candidate", async ({ target, candidate }) => {
    if (candidate) {
      io.to(target).emit("sendCandidateToTarget", { candidate });
    }
  });

  socket.on("disconnect", () => users.delete(socketId));
});

// running server
httpsServer.listen(443, () => {
  console.log("HTTPS Server is running at 443!");
});
