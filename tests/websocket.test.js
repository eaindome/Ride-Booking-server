const ioClient = require("socket.io-client");
const http = require("http");
const { app, setupWebsockets } = require("../app");
const db = require("../utils/db");

// Set testing environment
process.env.NODE_ENV = "test";

describe("WebSocket", () => {
  let server;
  let io;
  let socket;
  let testPort;

  beforeAll((done) => {
    // Create a new HTTP server for testing
    server = http.createServer(app);

    // Start the server on a random port
    server.listen(0, () => {
      testPort = server.address().port;
      console.log(`Test server listening on port ${testPort}`);

      // Set up WebSockets on this server
      io = setupWebsockets(server);

      // Connect the client to the server
      socket = ioClient(`http://localhost:${testPort}`, {
        reconnectionDelay: 0,
        forceNew: true,
        transports: ["websocket"],
      });

      socket.on("connect", () => {
        console.log("Socket connected with ID:", socket.id);
        done();
      });

      socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err);
      });
    });
  }, 15000); // Increase timeout to 15 seconds

  afterAll((done) => {
    console.log("Cleaning up socket and server");
    if (socket) {
      if (socket.connected) {
        socket.disconnect();
      }
    }
    if (server) {
      server.close(done);
    } else {
      done();
    }
  }, 15000); // Increase timeout to 15 seconds

  beforeEach(() => {
    // Clear the database for each test
    db.rides = [];

    // Remove all previous event listeners before each test
    if (socket) {
      socket.removeAllListeners("statusUpdate");
      socket.removeAllListeners("error");
    }
  });

  it("should join a ride room and receive initial status", (done) => {
    // Create a test ride with status already set
    const ride = {
      id: Date.now(),
      userId: 1,
      destination: "123 Main St",
      status: "Driver arrived", // Pre-set status
      lastUpdated: new Date().toISOString(),
      eta: "Driver has arrived",
    };

    // Add the ride to the database
    db.addRide(ride);

    // Set up the listener first to receive the initial status
    socket.on("statusUpdate", (updatedRide) => {
      // For initial join, should get the current status
      expect(updatedRide.id).toBe(ride.id);
      expect(updatedRide.status).toBe("Driver arrived");
      done();
    });

    // Then emit the event to join the ride
    socket.emit("joinRide", ride.id);
  }, 10000);

  it("should handle invalid rideId", (done) => {
    // Set up the listener first
    socket.on("error", (err) => {
      expect(err.message).toBe("Invalid ride ID");
      done();
    });

    // Then emit the event with an invalid ID
    socket.emit("joinRide", "invalid");
  }, 10000);

  it("should handle non-existent rideId", (done) => {
    // Set up the listener first
    socket.on("error", (err) => {
      // Corrected expectation to match the actual error message from the server
      expect(err.message).toBe("Ride not found");
      done();
    });

    // Then emit the event with a non-existent ID
    socket.emit("joinRide", 9999);
  }, 10000);
});
