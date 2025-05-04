const http = require("http");
const { app, setupWebsockets } = require("./app");
const db = require("./utils/db");
const rideStatus = require("./utils/rideStatus.utils");
require("dotenv").config();

// Get port from environment variable or use default
const PORT = process.env.PORT || 5000;

// Create HTTP server from Express app
const server = http.createServer(app);

// Set up Socket.IO with the server
const io = setupWebsockets(server);

// Add getActiveRides method implementation
db.getActiveRides = function () {
  return this.rides.filter((ride) => rideStatus.isActiveRide(ride));
};

// Function to update ride statuses periodically
const updateRideStatus = async () => {
  try {
    const rides = await db.getActiveRides();
    for (const ride of rides) {
      // Skip rides that are already completed or cancelled
      if (!rideStatus.isActiveRide(ride)) {
        continue;
      }

      // Check if enough time has passed for a status update
      const isTestEnv = process.env.NODE_ENV === "test";
      if (
        !rideStatus.hasEnoughTimePassed(
          ride.lastUpdated,
          ride.status,
          isTestEnv
        )
      ) {
        continue; // Skip this ride if not enough time has passed
      }

      // Get the next status in the progression
      const newStatus = rideStatus.getNextAutomaticStatus(ride.status);

      // If no valid next status, skip this ride
      if (!newStatus) {
        continue;
      }

      // Update ride status
      const updatedRide = {
        ...ride,
        status: newStatus,
        lastUpdated: new Date().toISOString(),
      };

      // Update ETAs based on new status
      updatedRide.eta = rideStatus.getUpdatedETA(updatedRide, newStatus);

      // Emit update to all clients in the ride's room
      io.to(ride.id.toString()).emit("statusUpdate", updatedRide);

      await db.updateRide(updatedRide);

      console.log(`Ride ${ride.id} updated to ${newStatus}`);
    }
  } catch (error) {
    console.error(`Error updating ride status: ${error.message}`);
  }
};

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Set up periodic status updates
  const interval = parseInt(process.env.STATUS_UPDATE_INTERVAL || 1000);
  setInterval(updateRideStatus, interval);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
  });
});
