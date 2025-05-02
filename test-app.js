require("dotenv").config();
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const authRoutes = require("./routes/auth.routes");
const rideRoutes = require("./routes/ride.routes");
const errorHandler = require("./middleware/error.middleware");

const app = express();

app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/rides", rideRoutes);

app.use(errorHandler);

module.exports = app;