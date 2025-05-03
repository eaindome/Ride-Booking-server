const request = require("supertest");
const app = require("../test-app");
const db = require("../utils/db");

describe("Ride Controller", () => {
  let token;
  let testRideId;

  beforeEach(async () => {
    // Clear users and rides
    db.users = [];
    db.rides = [];

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

    // Save ride ID for other tests
    testRideId = res.body.id;
  });

  it("POST /api/rides should fail with invalid destination", async () => {
    const res = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${token}`)
      .send({ destination: "12" });

    expect(res.status).toBe(400);
    // Check for the enhanced error message format
    expect(res.body.message).toContain(
      "Invalid field"
    );

    // Check if there's at least one error about destination length
    const destinationError = res.body.errors.find(
      (error) =>
        error.field === "destination" &&
        error.message.includes("at least 3 characters")
    );
    expect(destinationError).toBeDefined();
  });

  it("GET /api/rides/status should return current ride status without updating if not enough time passed", async () => {
    // Create a ride first
    const rideRes = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${token}`)
      .send({ destination: "123 Main St" });

    const rideId = rideRes.body.id;

    // Set a very recent lastUpdated time to ensure status doesn't change
    db.updateRide({
      ...rideRes.body,
      lastUpdated: new Date().toISOString(),
    });

    // Check the status immediately
    const res = await request(app)
      .get("/api/rides/status")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Driver on the way"); // Should remain the same
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
    // Create a ride first
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

  it("GET /api/rides/places should reject request with missing query", async () => {
    const res = await request(app)
      .get("/api/rides/places")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Please enter a search term");
  });

  it("PUT /api/rides/:id/status should update ride status", async () => {
    // Create a ride first
    const rideRes = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${token}`)
      .send({ destination: "123 Main St" });

    const rideId = rideRes.body.id;

    // Manually update the status to the correct prerequisite status
    // Note: Driver on the way -> Driver arrived is valid transition
    const res = await request(app)
      .put(`/api/rides/${rideId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "Driver arrived" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Driver arrived");
    expect(res.body.eta).toBe("Driver has arrived");
  });

  it("PUT /api/rides/:id/status should fail with invalid status transition", async () => {
    // Create a ride first
    const rideRes = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${token}`)
      .send({ destination: "123 Main St" });

    const rideId = rideRes.body.id;

    // Try to update with an invalid status transition (from Driver on the way to Ride completed)
    const res = await request(app)
      .put(`/api/rides/${rideId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "Ride completed" });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Cannot update");
    // Should include valid statuses in the response
    expect(res.body.validStatuses).toBeDefined();
  });

  it("DELETE /api/rides/:id should cancel a ride", async () => {
    // Create a ride first
    const rideRes = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${token}`)
      .send({ destination: "123 Main St" });

    const rideId = rideRes.body.id;

    // Cancel the ride
    const res = await request(app)
      .delete(`/api/rides/${rideId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Ride cancelled successfully");

    // Verify the ride is actually cancelled
    const cancelledRide = db.findRideById(rideId);
    expect(cancelledRide.status).toBe("cancelled");
  });
});
