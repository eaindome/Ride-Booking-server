const express = require('express');
const router = express.Router();
const { login, register, signupSchema, loginSchema } = require('../controllers/auth.controller');
const validate = require("../middleware/validate.middleware");

router.post('/login', validate(loginSchema), login);
router.post('/signup', validate(signupSchema), register);

module.exports = router;