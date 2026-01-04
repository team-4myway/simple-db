const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  let token = req.headers['authorization'];

  // 1. Check Authorization header
  if (token && token.startsWith('Bearer ')) {
      token = token.split(' ')[1];
  } 
  // 2. Check Query Parameter (for images)
  else if (req.query.token) {
      token = req.query.token;
  }
  // 3. No token found
  else {
      return res.status(403).send('A token is required for authentication');
  }

  try {
    const decoded = jwt.verify(token, process.env.TOKEN_KEY || 'secret_key');
    req.user = decoded;
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).send('Invalid Token');
  }
  return next();
};

module.exports = verifyToken;