const express = require("express");
const cors = require("cors");

const resetRoutes = require("./routes/reset_routes");
const campusRoutes = require("./routes/campus_routes");
const authenticationRoutes = require("./routes/authentication_routes");
const generalStaffRoutes = require("./routes/general_staff_routes");
const hrMemberRoutes = require("./routes/hr_member_routes");
const academicMemberRoutes = require("./routes/academic_member_routes");
const headOfDepartmentRoutes = require("./routes/head_of_department_routes");
const courseInstructorRoutes = require("./routes/course_instructor_routes");
const courseCoordinatorRoutes = require('./routes/course_coordinator_routes')

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_BASE_URL,
    exposedHeaders: "token"
}));
app.use(express.json());
app.use("/reset",resetRoutes);
app.use("/campus",campusRoutes);
app.use(authenticationRoutes);
app.use("/staff", generalStaffRoutes);
app.use("/hr", hrMemberRoutes);
app.use("/academic", academicMemberRoutes);
app.use("/hod", headOfDepartmentRoutes);
app.use("/ci", courseInstructorRoutes);
app.use('/cc',courseCoordinatorRoutes)

module.exports.app = app;