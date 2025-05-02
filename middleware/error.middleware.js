/**
 * Global Error Handling Middleware
 *
 * This middleware captures unhandled errors in the Express application
 * and returns a standardized error response to the client.
 * In production, the actual error message is hidden for security reasons.
 */

/**
 * Error handling middleware function
 *
 * @param {Error} err - The error object caught by Express
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response with error details
 */
module.exports = (err, req, res, next) => {
  // Log the full error stack trace to the console for debugging
  console.error(err.stack);

  // Send a standardized error response
  res.status(500).json({
    message: "Something went wrong",
    // Only include the actual error message in non-production environments
    error: process.env.NODE_ENV === "production" ? null : err.message,
  });
};
