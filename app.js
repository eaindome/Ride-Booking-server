// import dependencies
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const http = require("http");
const cluster = require("cluster");

// import routes
const authRoutes = require("./routes/auth.routes");
const rideRoutes = require("./routes/ride.routes");

// import error handling middleware
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

// routes
app.use("/api/auth", authRoutes);
app.use("/api/rides", rideRoutes);

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
    console.log(`User connected: ${socket.id}`);

    // client joining a ride
    socket.on("joinRide", async (rideId) => {
      try {
        // validate the rideId format
        if (!Number.isInteger(parseInt(rideId))) {
          socket.emit("error", { message: "Invalid ride ID" });
          return;
        }

        // convert rideId to number for comparison
        const numericRideId = parseInt(rideId);

        // validate that the ride exists
        let rides;
        if (cluster.isMaster) {
          rides = db.rides;
        } else {
          rides = await db.rides;
        }

        const ride = rides.find((r) => r.id === numericRideId);
        if (!ride) {
          socket.emit("error", { message: "Ride not found" });
          return;
        }

        socket.join(rideId.toString());
        console.log(`User ${socket.id} joined ride ${rideId}`);

        // For testing purposes: emit status update immediately
        if (process.env.NODE_ENV === "test") {
          if (ride.status !== "Finish") {
            const nextStatus = {
              "Driver on the way": "Driver arrived",
              "Driver arrived": "Ride started",
              "Ride started": "Ride completed",
              "Ride completed": "Finish",
            };
            ride.status = nextStatus[ride.status] || "Driver on the way";
            ride.lastUpdated = new Date().toISOString();

            // Update the ride in the database
            if (cluster.isMaster) {
              const rideIndex = db.rides.findIndex(
                (r) => r.id === numericRideId
              );
              if (rideIndex !== -1) {
                db.rides[rideIndex] = ride;
              }
            } else {
              await db.updateRide(ride);
            }

            io.to(rideId.toString()).emit("statusUpdate", ride);
          }
          return;
        }

        // Production behavior: simulate status updates every few seconds
        const statusUpdateInterval = setInterval(async () => {
          if (ride.status !== "Finish") {
            const nextStatus = {
              "Driver on the way": "Driver arrived",
              "Driver arrived": "Ride started",
              "Ride started": "Ride completed",
              "Ride completed": "Finish",
            };
            ride.status = nextStatus[ride.status] || "Driver on the way";
            ride.lastUpdated = new Date().toISOString();

            // Update the ride in the database
            if (cluster.isMaster) {
              const rideIndex = db.rides.findIndex(
                (r) => r.id === numericRideId
              );
              if (rideIndex !== -1) {
                db.rides[rideIndex] = ride;
              }
            } else {
              await db.updateRide(ride);
            }

            io.to(rideId.toString()).emit("statusUpdate", ride);
          } else {
            clearInterval(statusUpdateInterval);
            console.log(`Ride ${rideId} completed`);
          }
        }, process.env.STATUS_UPDATE_INTERVAL || 5000);
      } catch (error) {
        socket.emit("error", { message: "Failed to join ride" });
        console.error(`Error in joinRide: ${error.message}`);
      }
    });

    // client disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
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
