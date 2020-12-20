require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");

const campusRoutes = require("./routes/campus_routes");
const authenticationRoutes = require("./routes/authentication_routes");
const generalStaffRoutes = require("./routes/general_staff_routes");
const hrRoutes = require("./routes/hr_routes");
const hodRoutes = require("./routes/hod_routes.js");
const taRoutes = require('./routes/ta_routes')

const app = express();

app.use(express.json());
app.use("/campus",campusRoutes);
app.use(authenticationRoutes);
app.use("/staff", generalStaffRoutes);
app.use("/hr", hrRoutes);
app.use("/hod", hodRoutes);
app.use('/ta',taRoutes);

module.exports.app = app;