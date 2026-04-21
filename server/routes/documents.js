const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
const auth = require('../middleware/auth');
const Document = require('../models/Document');
const router = express.Router();

// 🔥 Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'docvault_uploads',
    resource_type: 'auto',
    type: 'upload', // 👈 Force public upload
    access_mode: 'public', // 👈 Ensure public access
    allowed_formats: ['jpg', 'png', 'pdf', 'doc', 'docx', 'txt']
  }
});

const upload = multer({ storage });
const crypto = require("crypto");

router.post('/upload', auth, (req, res, next) => {
  upload.single('document')(req, res, (err) => {
    if (err) {
      console.error("❌ Multer/Cloudinary Error:", err.message);
      return res.status(500).json({ error: "Upload failed: " + err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const newDoc = new Document({
      userId: req.user._id,
      originalName: req.file.originalname,
      title: req.body.title || req.file.originalname,
      path: req.file.path, 
      shareToken: crypto.randomBytes(16).toString("hex"),
      shareExpiresAt: null,
      createdAt: new Date()
    });

    await newDoc.save();
    res.json({ ...newDoc._doc, fileUrl: `/api/documents/file/${newDoc._id}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    let documents = await Document.find(req.user.role === "admin" ? {} : { userId: req.user._id });
    const updatedDocs = documents.map(doc => ({
      ...doc._doc,
      fileUrl: `/api/documents/file/${doc._id}`
    }));
    res.json(updatedDocs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔥 Protected File View (Smart Redirect)
router.get('/file/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "File not found" });

    // Link ko HTTPS mein badalna aur clean karna
    let finalUrl = doc.path.replace('http://', 'https://');
    
    console.log("🚀 Redirecting to:", finalUrl);
    res.redirect(finalUrl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔥 Edit/Delete logic (keep existing)
router.put('/:id', auth, async (req, res) => {
  try {
    const updatedDoc = await Document.findByIdAndUpdate(req.params.id, { title: req.body.title }, { new: true });
    res.json(updatedDoc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;