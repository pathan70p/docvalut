const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
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
    allowed_formats: ['jpg', 'png', 'pdf', 'doc', 'docx', 'txt']
  }
});

const upload = multer({ storage });
const crypto = require("crypto");

router.post('/upload', auth, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const newDoc = new Document({
      userId: req.user._id,
      originalName: req.file.originalname,
      title: req.body.title || req.file.originalname,
      path: req.file.path, 
      shareToken: crypto.randomBytes(16).toString("hex"),
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
    let query = req.user.role === "admin" ? {} : { userId: req.user._id };
    const documents = await Document.find(query);
    
    const updatedDocs = documents.map(doc => ({
      ...doc._doc,
      fileUrl: `/api/documents/file/${doc._id}`,
      directUrl: doc.path // 👈 Asli Cloudinary URL bhejna
    }));

    res.json(updatedDocs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// File view route (keep for security/logic)
router.get('/file/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.redirect(doc.path);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const updated = await Document.findByIdAndUpdate(req.params.id, { title: req.body.title }, { new: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;