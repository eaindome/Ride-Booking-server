/**
 * Validation Middleware
 *
 * Validates request data (body, query, etc.) against a Joi schema
 * and passes control to the next middleware if valid, or returns a 400 error if invalid.
 */

/**
 * Validation middleware function
 *
 * @param {Object} schema - Joi schema to validate against
 * @param {string} [source='body'] - Request source to validate ('body' or 'query')
 * @returns {Function} Express middleware function
 */
const Joi = require("joi");

module.exports = (schema, source = "body") => {
  return (req, res, next) => {
    const { error } = schema.validate(req[source], { abortEarly: false });
    if (error) {
      // Extract error details for better feedback
      const errorMessages = error.details.map((detail) => detail.message);

      // Create a more descriptive main message based on the error source
      let mainMessage = "";

      switch (source) {
        case "body":
          mainMessage = "Invalid field";
          break;
        case "query":
          mainMessage = "Invalid query parameters";
          break;
        case "params":
          mainMessage = "Invalid URL parameters";
          break;
        default:
          mainMessage = "Validation failed";
      }

      // Add context about what endpoint is being called
      const endpoint = req.originalUrl;
      const method = req.method;

      // Format details more nicely
      const formattedErrors = error.details.map((detail) => {
        return {
          field: detail.context.key || "unknown",
          message: detail.message.replace(/['"]/g, ""),
          // Include the provided value (safely) for additional context
          providedValue:
            detail.context.value !== undefined
              ? typeof detail.context.value === "object"
                ? "[Complex Object]"
                : String(detail.context.value)
              : "undefined",
        };
      });

      return res.status(400).json({
        message: `${mainMessage}`,
        errors: formattedErrors,
        simpleErrors: errorMessages, // Keep simple format for backward compatibility
      });
    }
    next();
  };
};
