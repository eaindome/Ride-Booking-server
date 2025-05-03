// import dependencies
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");
const http = require("http");

// import routes
const authRoutes = require("./routes/auth.routes");
const rideRoutes = require("./routes/ride.routes");

// import middleware
const authMiddleware = require("./middleware/auth.middleware");
const errorHandler = require("./middleware/error.middleware");

// import db
const db = require("./utils/db");

// initialize Express app
const app = express();

// create the HTTP server
const server = http.createServer(app);

// middleware
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// routes
app.use("/api/auth", authRoutes);
app.use("/api/rides", authMiddleware, rideRoutes);

// error handling middleware
app.use(errorHandler);

// Set NODE_ENV for testing if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}

// Socket.IO configuration
const setupWebsockets = (server) => {
  const { Server } = require("socket.io");

  // initialize the socket.io
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  // websocket connection for ride status updates
  io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // client joining a ride
    socket.on("joinRide", (rideId) => {
      try {
        // Validate rideId
        if (!rideId || isNaN(parseInt(rideId))) {
          socket.emit("error", { message: "Invalid ride ID" });
          return;
        }

        // Convert to number if it's a numeric string
        const numericRideId = typeof rideId === 'string' ? parseInt(rideId) : rideId;

        // Check if ride exists
        const ride = db.rides.find(r => r.id === numericRideId);
        if (!ride) {
          socket.emit("error", { message: "Ride not found" });
          return;
        }

        socket.join(rideId.toString());
        console.log(`Client ${socket.id} joined ride ${rideId}`);
        
        // Send initial status update
        socket.emit("statusUpdate", ride);
      } catch (error) {
        console.error(`Error joining ride: ${error.message}`);
        socket.emit("error", { message: "Failed to join ride" });
      }
    });

    // client disconnection
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};



// Don't set up WebSockets in test-app.js, only in app.js and for tests
if (require.main === module || process.env.NODE_ENV === "test") {
  app.io = setupWebsockets(server);
}

// Export both the app and server for different use cases
module.exports = { app, server, setupWebsockets };
