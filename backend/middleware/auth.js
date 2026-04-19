// Verifies JWT from cookie, checks session cache, and attaches decoded user info to the request.
const { verifyToken } = require('../utils/jwt');
const { getSession, setSession } = require('../utils/sessionCache');

// Middleware to verify JWT cookie and validate active session in cache
const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: 'No session token provided' });
    }

    // Step 1: Verify JWT signature and expiry
    const decodedToken = verifyToken(token);

    // Step 2: Check the token exists in the session cache
    const cachedToken = getSession(decodedToken.userId);
    if (!cachedToken) {
      // Cache was wiped (server restart / scale-out). Re-seed it from the valid JWT.
      setSession(decodedToken.userId, token);
    } else if (cachedToken !== token) {
      // A newer login superseded this token (explicit logout on another device).
      return res.status(401).json({ message: 'Session superseded by a newer login' });
    }

    // Attach user info to request
    req.user = decodedToken;
    next();

  } catch (error) {
    console.error("Authentication Middleware Error:", error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = authenticate;
