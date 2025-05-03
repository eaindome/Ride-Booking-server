const request = require("supertest");
const app = require("../test-app");
const db = require("../utils/db");

describe("Auth Controller", () => {
  beforeEach(() => {
    // Clear users array before each test
    db.users = [];
  });

  it("POST /api/auth/signup should register a new user", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe("User registered successfully");
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("test@example.com");
  });

  it("POST /api/auth/signup should fail with invalid input", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      name: "A",
      email: "invalid",
      password: "123",
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Invalid request data");

    // Check for specific field errors in the enhanced format
    const nameError = res.body.errors.find((e) => e.field === "name");
    const emailError = res.body.errors.find((e) => e.field === "email");
    const passwordError = res.body.errors.find((e) => e.field === "password");

    expect(nameError).toBeDefined();
    expect(emailError).toBeDefined();
    expect(passwordError).toBeDefined();

    expect(nameError.message).toContain("at least 2 characters");
    expect(emailError.message).toContain("Invalid email format");
    expect(passwordError.message).toContain("at least 6 characters");
  });

  it("POST /api/auth/signup should fail if email exists", async () => {
    await request(app).post("/api/auth/signup").send({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });

    const res = await request(app).post("/api/auth/signup").send({
      name: "Test User 2",
      email: "test@example.com",
      password: "password456",
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Email already exists");
  });

  it("POST /api/auth/login should authenticate a user", async () => {
    await request(app).post("/api/auth/signup").send({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "password123",
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Login successful");
    expect(res.body.token).toBeDefined();
  });

  it("POST /api/auth/login should fail with invalid credentials", async () => {
    await request(app).post("/api/auth/signup").send({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "wrongpassword",
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("POST /api/auth/login should fail with missing email", async () => {
    const res = await request(app).post("/api/auth/login").send({
      password: "password123",
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Invalid request data");

    // Check for email required error
    const emailError = res.body.errors.find((e) => e.field === "email");
    expect(emailError).toBeDefined();
    expect(emailError.message).toContain("Email is required");
  });
});
