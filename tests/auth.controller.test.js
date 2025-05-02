const request = require("supertest");
const app = require("../test-app");
const db = require("../utils/db");

describe("Auth Controller", () => {
  beforeEach(async () => {
    // Clear users in master process
    if (process.isMaster) {
      db.users = [];
    } else {
      await db.users; // Ensure db is ready
    }
  });

  it("POST /api/auth/signup should register a new user", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({
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
    const res = await request(app)
      .post("/api/auth/signup")
      .send({
        name: "A",
        email: "invalid",
        password: "123",
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Validation error");
    expect(res.body.errors).toContain("Name must be at least 2 characters long");
    expect(res.body.errors).toContain("Invalid email format");
    expect(res.body.errors).toContain("Password must be at least 6 characters long");
  });

  it("POST /api/auth/signup should fail if email exists", async () => {
    await request(app)
      .post("/api/auth/signup")
      .send({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });

    const res = await request(app)
      .post("/api/auth/signup")
      .send({
        name: "Test User 2",
        email: "test@example.com",
        password: "password456",
      });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Email already exists");
  });

  it("POST /api/auth/login should authenticate a user", async () => {
    await request(app)
      .post("/api/auth/signup")
      .send({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "test@example.com",
        password: "password123",
      });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Login successful");
    expect(res.body.token).toBeDefined();
  });

  it("POST /api/auth/login should fail with invalid credentials", async () => {
    await request(app)
      .post("/api/auth/signup")
      .send({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "test@example.com",
        password: "wrongpassword",
      });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("POST /api/auth/login should fail with missing email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        password: "password123",
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Validation error");
    expect(res.body.errors).toContain("Email is required");
  });
});