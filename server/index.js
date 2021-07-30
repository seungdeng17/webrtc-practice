const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const express = require("express");
const socket = require("socket.io");

const credentials = {
  key: fs.readFileSync("./cert/localhost.key"),
  cert: fs.readFileSync("./cert/localhost.crt"),
};

const app = express();
const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

app.use((req, res, next) => {
  if (!req.secure) {
    res.redirect(`https://localhost:443${req.url}`);
  } else {
    next();
  }
});

// app.use(express.static("public"));
// app.use("/static", express.static(path.join(__dirname, "../client/build", "/static")));
// app.use("/asset-manifest.json", express.static(path.join(__dirname, "../client/build", "/asset-manifest.json")));
// app.get("/*", (_, res) => {
//   res.status(200).sendFile(path.join(__dirname, "../client/build", "/index.html"));
// });

httpServer.listen(80, () => {
  console.log("HTTP Server is running at 80!");
});
httpsServer.listen(443, () => {
  console.log("HTTPS Server is running at 443!");
});

const io = socket(httpsServer);

const users = {};

io.on("connection", (socket) => {
  if (!users[socket.id]) {
    users[socket.id] = socket.id;
  }
  socket.emit("yourID", socket.id);
  io.sockets.emit("allUsers", users);
  socket.on("disconnect", () => {
    delete users[socket.id];
  });

  socket.on("callUser", (data) => {
    io.to(data.userToCall).emit("hey", {
      signal: data.signalData,
      from: data.from,
    });
  });

  socket.on("acceptCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal);
  });
});
