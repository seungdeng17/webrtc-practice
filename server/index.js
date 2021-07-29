const fs = require("fs");
const path = require("path");
const https = require("https");
const express = require("express");
const credentials = {
  key: fs.readFileSync("./cert/localhost.key"),
  cert: fs.readFileSync("./cert/localhost.crt"),
};

const app = express();
const httpsServer = https.createServer(credentials, app);

app.use(express.static("public"));
app.use("/static", express.static(path.join(__dirname, "../client/build", "/static")));
app.use("/asset-manifest.json", express.static(path.join(__dirname, "../client/build", "/asset-manifest.json")));
app.get("/*", (_, res) => {
  res.status(200).sendFile(path.join(__dirname, "../client/build", "/index.html"));
});

httpsServer.listen(3001, () => {
  console.log("HTTPS Server is running at 3001!");
});
