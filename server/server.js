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
const mongoURI = process.env.MONGO_URI;

if (!mongoURI || mongoURI.includes("<password>")) {
  console.error("❌ ERROR: MONGO_URI is missing or still contains '<password>' placeholder!");
}

mongoose.connect(mongoURI)
  .then(() => console.log("MongoDB connected successfully ✅"))
  .catch(err => {
    console.error("MongoDB connection error ❌:");
    console.error("Message:", err.message);
    if (err.message.includes("authentication failed")) {
      console.error("👉 Solution: Your Username or Password in Render Environment Variables is wrong.");
    }
  });

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