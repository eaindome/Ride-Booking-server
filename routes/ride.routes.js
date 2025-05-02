const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const { 
    createRide, getRideStatus, searchPlaces, getRideHistory,
    createRideSchema, searchPlacesSchema
} = require('../controllers/ride.controller');
const validate = require("../middleware/validate.middleware");

router.post('/', auth, validate(createRideSchema), createRide);
router.get('/status', auth, getRideStatus);
router.get('/history', auth, getRideHistory);
router.get("/places", auth, validate(searchPlacesSchema, "query"), searchPlaces);

module.exports = router;