const express = require("express");
const {
  createRide,
  getRideStatus,
  getRideHistory,
  searchPlaces,
  updateRideStatus,
  cancelRide,
  createRideSchema,
  searchPlacesSchema,
  updateRideStatusSchema,
} = require("../controllers/ride.controller");
const validate = require("../middleware/validate.middleware");
const auth = require("../middleware/auth.middleware");

const router = express.Router();

// Create new ride
router.post("/", auth, validate(createRideSchema), createRide);

// Get and update ride status
router.get("/status", auth, getRideStatus);

// Cancel ride
router.delete("/:id", auth, cancelRide);

// Update ride status manually
router.put("/:id/status", auth, validate(updateRideStatusSchema), updateRideStatus);

// Get ride history (with optional filtering)
router.get("/history", auth, getRideHistory);

// Search for places
router.get(
  "/places",
  auth,
  searchPlaces
);

module.exports = router;
