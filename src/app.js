require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

require("./others/periodic_scripts");
const resetRoutes = require("./routes/reset_routes");
const campusRoutes = require("./routes/campus_routes");
const authenticationRoutes = require("./routes/authentication_routes");
const generalStaffRoutes = require("./routes/general_staff_routes");
const hrMemberRoutes = require("./routes/hr_member_routes");
const academicMemberRoutes = require("./routes/academic_member_routes");
const headOfDepartmentRoutes = require("./routes/head_of_department_routes");
const courseInstructorRoutes = require("./routes/course_instructor_routes");
const courseCoordinatorRoutes = require("./routes/course_coordinator_routes");

const app = express();
const corsOptions = {
  origin: "https://staff-portal-guc.netlify.app",
  methods: "GET,PUT,POST,DELETE",
  exposedHeaders: "auth-access-token",
  credentials: true,
  maxAge: 5
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use("/reset", resetRoutes);
app.use("/campus", campusRoutes);
app.use("/staff", authenticationRoutes);
app.use("/staff", generalStaffRoutes);
app.use("/staff/hr", hrMemberRoutes);
app.use("/staff/academic", academicMemberRoutes);
app.use("/staff/hod", headOfDepartmentRoutes);
app.use("/staff/ci", courseInstructorRoutes);
app.use("/staff/cc", courseCoordinatorRoutes);

module.exports.app = app;
