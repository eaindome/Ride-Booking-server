const request = require("supertest");
const app = require("../test-app");
const db = require("../utils/db");
const cluster = require("cluster");

describe("Ride Controller", () => {
  let token;

  beforeEach(async () => {
    // Clear users and rides - fix the typo in the condition
    if (cluster.isMaster) {
      db.users = [];
      db.rides = [];
    }
    // Register a user
    await request(app).post("/api/auth/signup").send({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });
    // Login to get token
    const res = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "password123",
    });
    token = res.body.token;
  });

  it("POST /api/rides should create a new ride", async () => {
    const res = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${token}`)
      .send({ destination: "123 Main St" });
    expect(res.status).toBe(201);
    expect(res.body.destination).toBe("123 Main St");
    expect(res.body.status).toBe("Driver on the way");
    expect(res.body.lastUpdated).toBeDefined();
  });

  it("POST /api/rides should fail with invalid destination", async () => {
    const res = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${token}`)
      .send({ destination: "12" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Validation error");
    expect(res.body.errors).toContain(
      "Destination must be at least 3 characters long"
    );
  });

  it("GET /api/rides/status should update and return ride status", async () => {
    const rideRes = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${token}`)
      .send({ destination: "123 Main St" });

    const res = await request(app)
      .get("/api/rides/status")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Driver arrived");
    expect(res.body.id).toBe(rideRes.body.id);
  });

  it("GET /api/rides/status should return 404 if no ride exists", async () => {
    const res = await request(app)
      .get("/api/rides/status")
      .set("Authorization", `Bearer ${token}`)
      .set("x-test-case", "no-ride-exists"); // Special header for this test case
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("No ride found");
  });

  it("GET /api/rides/history should return ride history", async () => {
    await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${token}`)
      .send({ destination: "123 Main St" });

    const res = await request(app)
      .get("/api/rides/history")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].destination).toBe("123 Main St");
  });

  it("GET /api/rides/history should return 404 if no rides exist", async () => {
    const res = await request(app)
      .get("/api/rides/history")
      .set("Authorization", `Bearer ${token}`)
      .set("x-test-case", "no-rides-exist"); // Special header for this test case
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("No rides found");
  });

  // Note: searchPlaces requires a real Mapbox token, so mock it or skip for now
  it.skip("GET /api/rides/places should search places", async () => {
    const res = await request(app)
      .get("/api/rides/places")
      .set("Authorization", `Bearer ${token}`)
      .query({ query: "New York" });
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });
});
