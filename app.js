const express = require("express");

const resetRoutes = require("./routes/reset_routes");
const campusRoutes = require("./routes/campus_routes");
const authenticationRoutes = require("./routes/authentication_routes");
const generalStaffRoutes = require("./routes/general_staff_routes");
const hrMemberRoutes = require("./routes/hr_member_routes");
const academicMemberRoutes = require("./routes/academic_member_routes");
const hodRoutes = require("./routes/hod_routes.js");
const ciRoutes = require("./routes/ci_routes.js");

const app = express();

app.use(express.json());
app.use("/reset",resetRoutes);
app.use("/campus",campusRoutes);
app.use(authenticationRoutes);
app.use("/staff", generalStaffRoutes);
app.use("/hr", hrMemberRoutes);
app.use("/academic", academicMemberRoutes);
app.use("/hod", hodRoutes);
app.use("/ci", ciRoutes);

module.exports.app = app;