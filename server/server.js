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

if (!mongoURI) {
  console.error("❌ ERROR: MONGO_URI is completely empty in Render settings!");
} else {
  // Mask password for safety in logs
  const maskedURI = mongoURI.replace(/:([^:@]+)@/, ":****@");
  console.log("Attempting to connect to:", maskedURI);
}

mongoose.connect(mongoURI)
  .then(() => console.log("MongoDB connected successfully ✅"))
  .catch(err => {
    console.error("MongoDB connection error ❌:");
    console.error("Error Name:", err.name);
    console.error("Error Message:", err.message);
    
    if (err.message.includes("hostname, domain name, and tld")) {
      console.error("👉 Solution: Your link is broken. Make sure it has '@cluster0...' part correctly.");
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