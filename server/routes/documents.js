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

    console.log("✅ File received by Multer, saving to DB...");

    let expiryDate = null;
    const expiryType = req.body.expiry;
    
    if (expiryType && expiryType !== 'permanent') {
      expiryDate = new Date();
      if (expiryType === '1h') expiryDate.setHours(expiryDate.getHours() + 1);
      if (expiryType === '1d') expiryDate.setDate(expiryDate.getDate() + 1);
      if (expiryType === '7d') expiryDate.setDate(expiryDate.getDate() + 7);
    }

    const newDoc = new Document({
      userId: req.user._id,
      originalName: req.file.originalname,
      title: req.body.title || req.file.originalname,
      path: req.file.path, 
      shareToken: crypto.randomBytes(16).toString("hex"),
      shareExpiresAt: expiryDate,
      createdAt: new Date()
    });

    await newDoc.save();
    console.log("✅ Document saved to DB successfully");

    res.json({
      ...newDoc._doc,
      fileUrl: `/api/documents/file/${newDoc._id}`
    });

  } catch (error) {
    console.error("❌ Database Save Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  let documents;
  if (req.user.role === "admin") {
    documents = await Document.find();
  } else {
    documents = await Document.find({ userId: req.user._id });
  }

  const updatedDocs = documents.map(doc => ({
    ...doc._doc,
    fileUrl: `/api/documents/file/${doc._id}`
  }));

  res.json(updatedDocs);
});

// 🔥 Protected File View (Redirect to Cloudinary)
router.get('/file/:id', auth, async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (req.user.role !== "admin") query.userId = req.user._id;

    const doc = await Document.findOne(query);
    if (!doc) return res.status(404).json({ error: "File not found" });

    res.redirect(doc.path);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔥 Edit Document Title
router.put('/:id', auth, async (req, res) => {
  try {
    const { title } = req.body;
    let query = { _id: req.params.id };
    if (req.user.role !== "admin") query.userId = req.user._id;

    const updatedDoc = await Document.findOneAndUpdate(
      query,
      { title },
      { new: true }
    );

    if (!updatedDoc) return res.status(404).json({ error: 'Document not found' });
    res.json(updatedDoc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔥 Delete Document (Cloudinary + DB)
router.delete('/:id', auth, async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (req.user.role !== "admin") query.userId = req.user._id;

    const document = await Document.findOne(query);
    if (!document) return res.status(404).json({ error: 'Not found' });

    // Extract Public ID from Cloudinary URL to delete it
    // URL format: .../upload/v12345/folder/public_id.ext
    try {
      const urlParts = document.path.split('/');
      const fileNameWithExt = urlParts[urlParts.length - 1];
      const publicIdWithoutExt = fileNameWithExt.split('.')[0];
      const folderName = urlParts[urlParts.length - 2];
      const fullPublicId = `${folderName}/${publicIdWithoutExt}`;

      await cloudinary.uploader.destroy(fullPublicId);
    } catch (cloudErr) {
      console.error("Cloudinary delete failed:", cloudErr.message);
      // We continue to delete from DB even if cloud delete fails
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;