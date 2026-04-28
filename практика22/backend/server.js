const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
const SERVER_ID = process.env.SERVER_ID || "unknown";

app.get("/", (req, res) => {
  res.json({
    message: "Response from backend server",
    serverId: SERVER_ID,
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", serverId: SERVER_ID });
});

app.listen(PORT, () => {
  console.log(`Server ${SERVER_ID} started on port ${PORT}`);
});