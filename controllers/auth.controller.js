// import dependencies
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Joi = require("joi");

// import the in-memory database
const db = require("../utils/db");

// validation schemas for signup and login
const signupSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    "string.min": "Name must be at least 2 characters long",
    "string.max": "Name cannot exceed 50 characters",
    "any.required": "Name is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Invalid email format",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "any.required": "Password is required",
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Invalid email format",
    "any.required": "Email is required",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

/**
 * Register a new user in the system
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing user details
 * @param {string} req.body.name - The user's name
 * @param {string} req.body.email - The user's email address
 * @param {string} req.body.password - The user's password (will be hashed)
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with user data and authentication token
 */
exports.register = async (req, res) => {
  console.log(`Registering user...`);
  // Extract user details from request body
  const { name, email, password } = req.body;

  // validation is handled by middleware

  try {
    // Get all users from the database
    const users = db.users;

    console.log(`Checking for existing user...`);
    const existingUser = users.find((user) => user.email === email);
    if (existingUser) {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    console.log(`Hashing password...`);
    // Hash the password for security
    const hashedPassword = bcrypt.hashSync(
      password,
      parseInt(process.env.BCRYPT_SALT_ROUNDS || 10)
    );

    console.log(`Creating new user...`);
    // Create new user object
    const newUser = {
      id: Date.now(),
      name,
      email,
      password: hashedPassword,
    };

    // Add user to database - simplified
    db.addUser(newUser);

    // Generate JWT token for authentication
    const token = jwt.sign(
      { id: newUser.id },
      process.env.JWT_SECRET || "test_secret",
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1h",
      }
    );

    // Return success response with token and user data (excluding password)
    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      message: "Failed to register user",
      error: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

/**
 * Authenticate an existing user
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing login credentials
 * @param {string} req.body.email - The user's email address
 * @param {string} req.body.password - The user's password
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with user data and authentication token
 */
exports.login = async (req, res) => {
  // Extract login credentials from request body
  const { email, password } = req.body;

  // validation is handled by middleware

  try {
    // Get all users directly from the database
    const users = db.users;

    console.log("Total users in database:", users.length);
    console.log(
      "All emails in database:",
      users.map((u) => u.email)
    );

    let user = users.find((user) => user.email === email);

    // If not found, try case-insensitive match
    if (!user) {
      console.log("No exact match, trying case-insensitive match");
      user = users.find(
        (user) => user.email.toLowerCase() === email.toLowerCase()
      );
    }

    console.log("User found:", user ? "Yes" : "No");

    if (!user) {
      // Generic error message for security (doesn't reveal if email exists)
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Verify password using bcrypt
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate JWT token for authenticated session
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || "test_secret",
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1h",
      }
    );

    // Return success response with token and user data (excluding password)
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Failed to login",
      error: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

// export validation schemas for use in routes
exports.signupSchema = signupSchema;
exports.loginSchema = loginSchema;
