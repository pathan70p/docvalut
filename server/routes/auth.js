const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const https = require('https');
const http = require('http');

const User = require('../models/User');
const Document = require('../models/Document');
const auth = require('../middleware/auth'); // 🔥 for protected routes

const router = express.Router();


// =====================
// 🔥 REGISTER
// =====================
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // check existing user
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // create user
    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    res.json({ message: 'User registered successfully' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// =====================
// 🔥 LOGIN
// =====================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid password" });
    }

    // 🔥 LOGIN TRACK
    user.loginHistory.push({
      loginTime: new Date()
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role || "user" },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role || "user"
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/logout', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // 🔥 LAST LOGIN ENTRY
    const last = user.loginHistory[user.loginHistory.length - 1];

    if (last && !last.logoutTime) {
      last.logoutTime = new Date();
    }

    await user.save();

    res.json({ message: "Logout saved" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================
// 🔥 GET ALL USERS (ADMIN ONLY)
// =====================
router.get('/users', auth, async (req, res) => {
  try {
    // admin check
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const users = await User.find().select('-password');

    res.json(users);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const crypto = require('crypto');

// =====================
// 🔥 PUBLIC FILE VIEW (SHARE LINK)
// =====================
router.get('/public/:token', async (req, res) => {
  try {
    console.log("📢 Public link accessed with token:", req.params.token);
    
    // Try to find by token
    let doc = await Document.findOne({ shareToken: req.params.token });

    if (!doc) {
      console.error("❌ Invalid token:", req.params.token);
      return res.status(404).send("<h1>Link Invalid ❌</h1><p>File not found or link is invalid.</p>");
    }

    // 🔥 Check Expiration
    if (doc.shareExpiresAt && new Date() > doc.shareExpiresAt) {
      console.warn("⚠️ Link expired for doc:", doc.title);
      return res.status(410).send("<h1>Link Expired ❌</h1><p>This share link is no longer valid.</p>");
    }

    if (!doc.path) {
        return res.status(404).send("File path missing");
    }

    // Proxy the file instead of redirecting
    const client = doc.path.startsWith('https') ? https : http;

    console.log("🚀 Proxying public file from:", doc.path);

    client.get(doc.path, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
    }, (cloudRes) => {
      if (cloudRes.statusCode !== 200) {
        console.error(`❌ Cloudinary source error: ${cloudRes.statusCode}`);
        return res.status(cloudRes.statusCode).send("File could not be retrieved from source.");
      }

      // Copy headers
      res.setHeader('Content-Type', cloudRes.headers['content-type'] || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalName || 'file')}"`);
      
      // Pipe data to browser
      cloudRes.pipe(res);
    }).on('error', (err) => {
      console.error("❌ Proxy Error:", err.message);
      res.status(500).send("Failed to stream file: " + err.message);
    });

  } catch (err) {
    console.error("❌ Public redirect error:", err.message);
    res.status(500).send(err.message);
  }
});


module.exports = router;