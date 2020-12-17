require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");

const loggingRoutes = require("./routes/logging_routes");
const generalStaffRoutes = require("./routes/general_staff_routes");
const hrRoutes = require("./routes/hr_routes");

const app = express();

app.use(express.json());
app.use(loggingRoutes);
app.use("/staff", generalStaffRoutes);
app.use("/hr", hrRoutes);

module.exports.app = app;