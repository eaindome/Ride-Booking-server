// Set up test environment variables
process.env.JWT_SECRET = "test_secret_key";
process.env.JWT_EXPIRES_IN = "1h";
process.env.BCRYPT_SALT_ROUNDS = "10";
process.env.NODE_ENV = "test";
