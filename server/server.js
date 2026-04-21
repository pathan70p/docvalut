require("dotenv").config(); // env variables load

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, "../client")));

// =====================
// 🔥 MongoDB Connection
// =====================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch(err => console.error("MongoDB error ❌:", err));

// =====================
// 🔥 Routes
// =====================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/login.html"));
});

// (Optional routes – अगर exist हों तो)
try {
  app.use("/api/auth", require("./routes/auth"));
  app.use("/api/documents", require("./routes/documents"));
} catch (err) {
  console.log("Routes not found, skipping...");
}

// =====================
// 🔥 Server Start
// =====================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});