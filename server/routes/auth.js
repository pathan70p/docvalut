const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Document = require('../models/Document');
const auth = require('../middleware/auth'); 
const router = express.Router();

// ... (register/login/logout functions stay same) ...

router.post('/register', async (req, res) => {
  try {
    const existing = await User.findOne({ email: req.body.email });
    if (existing) return res.status(400).json({ error: 'User already exists' });
    const user = new User(req.body);
    await user.save();
    res.json({ message: 'User registered successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user || !(await user.comparePassword(req.body.password))) return res.status(400).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "secret", { expiresIn: "1d" });
    res.json({ token, user: { id: user._id, username: user.username, role: user.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/users', auth, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });
  res.json(await User.find().select('-password'));
});

// =====================
// 🔥 PUBLIC SHARE LINK (Clean Redirect)
// =====================
router.get('/public/:token', async (req, res) => {
  try {
    const doc = await Document.findOne({ shareToken: req.params.token });
    if (!doc) return res.status(404).send("<h1>Link Invalid</h1>");
    
    // Redirect with clean HTTPS URL
    const finalUrl = doc.path.replace('http://', 'https://');
    res.redirect(finalUrl);
  } catch (err) { res.status(500).send(err.message); }
});

module.exports = router;