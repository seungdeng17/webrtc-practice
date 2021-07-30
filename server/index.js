const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const express = require("express");
const socket = require("socket.io");
const cors = require('cors');

// set https server
const credentials = {
  key: fs.readFileSync("./cert/localhost.key"),
  cert: fs.readFileSync("./cert/localhost.crt"),
};
const app = express();
const httpServer = https.createServer(app);
const httpsServer = https.createServer(credentials, app);

app.use(cors({
  origin: 'https://192.168.0.4:3000',
  credentials: true,
}));
app.use(express.static("public"));
app.use("/static", express.static(path.join(__dirname, "../client/build", "/static")));
app.use("/asset-manifest.json", express.static(path.join(__dirname, "../client/build", "/asset-manifest.json")));
app.get("/*", (_, res) => {
  res.status(200).sendFile(path.join(__dirname, "../client/build", "/index.html"));
});

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
// httpsServer.listen(443, () => {
//   console.log("HTTPS Server is running at 443!");
// });

// httpsServer.listen(8000, () => {
//   console.log("HTTP Server is running at 8000!");
// });

httpsServer.listen(8000, '192.168.0.4');
httpsServer.on('listening', function() {
    console.log('Express server started on port %s at %s', httpsServer.address().port, httpsServer.address().address);
});
