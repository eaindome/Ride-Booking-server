/**
 * Simple in-memory database for development
 */

// In-memory database
const db = {
  users: [],
  rides: [],
  // Add default drivers distributed across continents
  drivers: [
    // North America
    {
      id: 1,
      name: "John Smith",
      rating: 4.8,
      active: true,
      location: {
        coordinates: [-74.006, 40.7128], // New York
        address: "Manhattan, New York",
      },
      vehicle: {
        model: "Toyota Camry",
        color: "Black",
        plate: "NYC-1234",
      },
    },
    // Europe
    {
      id: 2,
      name: "Marie Dubois",
      rating: 4.9,
      active: true,
      location: {
        coordinates: [2.3522, 48.8566], // Paris
        address: "Central Paris",
      },
      vehicle: {
        model: "Renault Clio",
        color: "Silver",
        plate: "FR-7890",
      },
    },
    // Asia
    {
      id: 3,
      name: "Hiroshi Tanaka",
      rating: 4.7,
      active: true,
      location: {
        coordinates: [139.6917, 35.6895], // Tokyo
        address: "Shibuya, Tokyo",
      },
      vehicle: {
        model: "Honda Civic",
        color: "White",
        plate: "TK-5678",
      },
    },
    // Africa
    {
      id: 4,
      name: "Aisha Mensah",
      rating: 4.6,
      active: true,
      location: {
        coordinates: [-0.187, 5.6037], // Accra
        address: "Central Accra",
      },
      vehicle: {
        model: "Hyundai Sonata",
        color: "Blue",
        plate: "GH-3456",
      },
    },
    // Australia/Oceania
    {
      id: 5,
      name: "James Wilson",
      rating: 4.9,
      active: true,
      location: {
        coordinates: [151.2093, -33.8688], // Sydney
        address: "Sydney CBD",
      },
      vehicle: {
        model: "Ford Falcon",
        color: "Red",
        plate: "AU-2345",
      },
    },
  ],
};

// Helper function to calculate distance between two coordinates using Haversine formula
const calculateDistance = (coords1, coords2) => {
    try {
        // Validate coordinates
        if (!Array.isArray(coords1) || coords1.length !== 2 || 
            !Array.isArray(coords2) || coords2.length !== 2) {
            console.error("Invalid coordinates:", {coords1, coords2});
            // Return a default distance to prevent errors
            return 5; // Default to 5km if coordinates are invalid
        }
        const [lon1, lat1] = coords1;
        const [lon2, lat2] = coords2;

        // Check if coordinates are valid numbers
        if (isNaN(lon1) || isNaN(lat1) || isNaN(lon2) || isNaN(lat2)) {
            console.error("Non-numeric coordinates:", {coords1, coords2});
            return 5; // Default to 5km if coordinates are not numeric
        }

        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) *
            Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in km

        return distance;
    } catch (error) {
        console.error("Error calculating distance:", error);
        return 5; // Default distance on error
    }
};

// Helper function to convert degrees to radians
const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

// Calculate ETA based on distance
const calculateETA = (distance) => {
  // Assuming average speed of 30 km/h in city traffic
  const hours = distance / 30;
  const minutes = Math.round(hours * 60);

  if (minutes < 1) return "Less than a minute";
  if (minutes === 1) return "1 minute";
  if (minutes < 60) return `${minutes} minutes`;

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  return `${h} hour${h > 1 ? "s" : ""} ${
    m > 0 ? `${m} minute${m > 1 ? "s" : ""}` : ""
  }`;
};

// Simple API for database operations
module.exports = {
  // Users
  get users() {
    return db.users;
  },
  addUser(user) {
    db.users.push(user);
    return user;
  },

  // Rides
  get rides() {
    return db.rides;
  },
  addRide(ride) {
    // Ensure ride has all required fields
    const newRide = {
      ...ride,
      date: ride.date || new Date().toISOString(),
      cost: ride.cost || Math.floor(Math.random() * 30) + 10, // Random cost between 10-40
      distance: ride.distance || Math.floor(Math.random() * 10) + 1, // Random distance between 1-10
      pickup_location: ride.pickup_location || "Current Location",
      dropoff_location: ride.dropoff_location || ride.destination,
      status: ride.status || "Driver on the way",
    };

    db.rides.push(newRide);
    return newRide;
  },
  updateRide(updatedRide) {
    const index = db.rides.findIndex((ride) => ride.id === updatedRide.id);
    if (index === -1) {
      throw new Error("Ride not found");
    }
    db.rides[index] = { ...db.rides[index], ...updatedRide };
    return db.rides[index];
  },
  findRideById(rideId) {
    return db.rides.find((ride) => ride.id === parseInt(rideId));
  },
  getActiveRides() {
    return db.rides.filter(
      (ride) => ride.status !== "completed" && ride.status !== "cancelled"
    );
  },

  // New methods for enhanced ride history
  getCompletedRides() {
    return db.rides.filter((ride) => ride.status === "completed");
  },
  getInProgressRides() {
    return db.rides.filter(
      (ride) =>
        ride.status === "in_progress" ||
        ride.status === "Driver on the way" ||
        ride.status === "Driver arrived" ||
        ride.status === "Ride started"
    );
  },
  getCancelledRides() {
    return db.rides.filter((ride) => ride.status === "cancelled");
  },

  // Drivers
  get drivers() {
    return db.drivers;
  },
  getActiveDrivers() {
    return db.drivers.filter((driver) => driver.active);
  },

  // Geographic utilities
  calculateDistance,
  calculateETA,

  // Find the nearest driver to given coordinates
  findNearestDriver(coordinates) {
    const activeDrivers = this.getActiveDrivers();

    if (activeDrivers.length === 0) {
      return null;
    }

    let nearestDriver = null;
    let shortestDistance = Infinity;

    for (const driver of activeDrivers) {
      const distance = calculateDistance(
        coordinates,
        driver.location.coordinates
      );

      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestDriver = {
          ...driver,
          distance: parseFloat(distance.toFixed(2)),
        };
      }
    }

    return nearestDriver;
  },
};
