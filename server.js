const http = require("http");
const { app, setupWebsockets } = require("./app");
const db = require("./utils/db");
require("dotenv").config();

// Get port from environment variable or use default
const PORT = process.env.PORT || 5000;

// Create HTTP server from Express app
const server = http.createServer(app);

// Set up Socket.IO with the server
const io = setupWebsockets(server);

// Add getActiveRides method implementation
db.getActiveRides = function () {
  return this.rides.filter(
    (ride) => ride.status !== "Finish" && ride.status !== "completed"
  );
};

// Function to update ride statuses periodically
const updateRideStatus = async () => {
  try {
    const rides = await db.getActiveRides();
    for (const ride of rides) {
      // Skip rides that are already completed or cancelled
      if (ride.status === "completed" || ride.status === "cancelled") {
        continue;
      }
      
      let newStatus;
      
      // Check elapsed time since last update to make status transitions more realistic
      const lastUpdateTime = new Date(ride.lastUpdated).getTime();
      const currentTime = Date.now();
      const elapsedMinutes = (currentTime - lastUpdateTime) / (60 * 1000);
      
      // Define minimum times for each status (in minutes)
      const minTimePerStatus = {
        "Driver on the way": process.env.NODE_ENV === 'test' ? 0.1 : 1, // 1 minutes minimum as driver on the way
        "Driver arrived": process.env.NODE_ENV === 'test' ? 0.1 : 0.5,  // 30 seconds minimum as arrived
        "Ride started": process.env.NODE_ENV === 'test' ? 0.1:0.1,      // 1 minute minimum for the ride
        default: process.env.NODE_ENV === 'test' ? 0.1:0.1             // 3 seconds for other statuses
      };
      
      // Get the minimum time required for the current status
      const requiredMinTime = minTimePerStatus[ride.status] || minTimePerStatus.default;
      
      // Only update status if enough time has passed
      if (elapsedMinutes < requiredMinTime) {
        continue; // Skip this ride if not enough time has passed
      }

      switch (ride.status) {
        case "pending":
          newStatus = "in_progress";
          break;
        case "confirmed":
          newStatus = "in_progress";
          break;
        case "en route":
          newStatus = "in_progress";
          break;
        case "Driver on the way":
          newStatus = "Driver arrived";
          break;
        case "Driver arrived":
          newStatus = "Ride started";
          break;
        case "Ride started":
          newStatus = "completed";
          break;
        case "in_progress":
          newStatus = "completed";
          break;
        default:
          continue;
      }

      // Update ride status
      const updatedRide = {
        ...ride,
        status: newStatus,
        lastUpdated: new Date().toISOString()
      };
      
      // Update ETAs based on status
      if (newStatus === "Driver arrived") {
        updatedRide.eta = "Driver has arrived";
      } else if (newStatus === "Ride started") {
        updatedRide.eta = updatedRide.ride_duration;
      } else if (newStatus === "Ride completed" || newStatus === "completed") {
        updatedRide.eta = "Completed";
      }
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
