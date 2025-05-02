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
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json({
        message: "Validation error",
        errors: errorMessages,
      });
    }
    next();
  };
};