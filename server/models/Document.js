const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  originalName: String,
  shareToken: String,
  title: String,
  path: String,
  shareExpiresAt: {
    type: Date,
    default: null // null means permanent
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});


module.exports = mongoose.model('Document', DocumentSchema);