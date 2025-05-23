/**
 * Authentication Middleware
 *
 * This middleware verifies the JWT token from the request headers
 * and attaches the authenticated user to the request object.
 */

// Import dependencies
const jwt = require("jsonwebtoken");
const db = require("../utils/db");

/**
 * Authentication middleware function
 *
 * @param {Object} req - Express request object
 * @param {Object} req.headers - Request headers
 * @param {string} req.headers.authorization - Authorization header (Bearer token)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
module.exports =  async (req, res, next) => {
  // Extract token from Authorization header (Bearer format)
  const token = req.headers.authorization?.split(" ")[1];

  // If token is missing, return 401 Unauthorized
  if (!token) return res.status(401).json({ message: "Unauthorized - No token" });

  try {
    console.log("JWT Secret:", process.env.JWT_SECRET || "not set");

    // Verify and decode the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "test_secret");

    // Find the user by ID from the decoded token
    const users = await db.users;
    console.log("User database has", users.length, "users");
    console.log("Looking for user with ID:", decoded.id);

    req.user = users.find((user) => user.id === decoded.id);
    console.log("Found user:", req.user ? "Yes" : "No");

    // If user not found in database, return 401 Unauthorized
    if (!req.user)
      return res.status(401).json({
        message: "Unauthorized - User not found",
      });

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
    }
    
    // Handle token verification errors (expired, invalid signature, etc.)
    return res.status(401).json({
      message: "Unauthorized - " + error.message,
    });
  }
};
