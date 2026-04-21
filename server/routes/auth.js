const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const axios = require('axios');

const User = require('../models/User');
const Document = require('../models/Document');
const auth = require('../middleware/auth'); 

const router = express.Router();


// =====================
// 🔥 REGISTER
// =====================
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = new User({ username, email, password });
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

    user.loginHistory.push({ loginTime: new Date() });
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
    
    let doc = await Document.findOne({ shareToken: req.params.token });

    if (!doc) {
      return res.status(404).send("<h1>Link Invalid ❌</h1><p>File not found or link is invalid.</p>");
    }

    if (doc.shareExpiresAt && new Date() > doc.shareExpiresAt) {
      return res.status(410).send("<h1>Link Expired ❌</h1><p>This share link is no longer valid.</p>");
    }

    console.log("🚀 Proxying public file via Axios from:", doc.path);

    const response = await axios({
        method: 'get',
        url: doc.path,
        responseType: 'stream',
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalName || 'file')}"`);
    
    response.data.pipe(res);

  } catch (err) {
    console.error("❌ Public Axios Proxy Error:", err.message);
    res.status(500).send("<h1>Error ❌</h1><p>Failed to retrieve file: " + err.message + "</p>");
  }
});


module.exports = router;