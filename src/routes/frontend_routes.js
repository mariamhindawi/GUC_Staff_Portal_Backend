const express = require("express");
const jwt = require("jsonwebtoken");
const departmentModel = require("../models/department_model");
const courseModel = require("../models/course_model");
const academicMemberModel = require("../models/academic_member_model");
const hrMemberModel = require("../models/hr_member_model");
const roomModel = require("../models/room_model");
const facultyModel = require("../models/faculty_model");
const slotModel = require("../models/slot_model");
const attendanceRecordModel = require("../models/attendance_record_model");

const router = express.Router();

router.route("/view-staff-profile/:id")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    let user = await hrMemberModel.findOne({ id: req.params.id });
    if (!user) {
      user = await academicMemberModel.findOne({ id: req.params.id });
    }
    let office = await roomModel.findOne({ _id: user.office });
    let department = await departmentModel.findOne({ _id: user.department });
    let faculty = await facultyModel.findOne({ _id: user.faculty });
    if (department)
      user.department = department.name;
    if (faculty)
      user.faculty = faculty;
    res.send({ user: user, office: office });
  });

router.route("/get-courses-by-academic")
  .get(async (req, res) => {
    const courses = await courseModel.find({ $or: [{ courseInstructors: req.query.id }, { teachingAssistants: req.query.id }] });
    res.send(courses);
  });

router.route("/course-slots/:course")
  .get(async (req, res) => {
    if (!req.params.course) {
      res.send("Not all fields are entered");
      return;
    }
    let course = await courseModel.findOne({ id: req.params.course });

    if (!course) {
      res.status(404).send("Invalid Course Id");
      return;
    }
    let slots = await slotModel.find({ course: course._id });
    for (let i = 0; i < slots.length; i++) {
      let room = await roomModel.findById(slots[i].room);
      slots[i].room = room.name;
      slots[i].course = course.name;
    }
    console.log(slots);
    res.send(slots);
  });

router.route("/user-records")
  .get(async (req, res) => {
    let dateStringParts = req.query.day.split("T")[0].split("-");
    let date = new Date(dateStringParts[0], dateStringParts[1] - 1, dateStringParts[2], 2).addDays(1);
    records = await attendanceRecordModel.find({ user: req.query.user, signInTime: { $lt: date.addDays(1), $gte: date } });
    res.send(records);
  });

Date.prototype.addDays = function (days) {
  var date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
};

module.exports = router;
