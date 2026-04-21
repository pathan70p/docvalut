const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    let token = req.header('Authorization');

    // Check if token is in header or query parameter (for iframes)
    if (token && token.startsWith('Bearer ')) {
        token = token.replace('Bearer ', '');
    } else if (req.query.token) {
        token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey"); 

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();

  } catch (error) {
    console.error("Auth error:", error.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = auth;