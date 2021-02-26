const express = require("express");
const jwt = require("jsonwebtoken");
const departmentModel = require("../models/department_model");
const courseModel = require("../models/course_model");
const academicMemberModel = require("../models/academic_member_model");
const hrMemberModel = require("../models/hr_member_model");
const roomModel = require("../models/room_model");
const facultyModel = require("../models/faculty_model");
const notification_model = require("../models/notification_model");
const slot_model = require("../models/slot_model");
const attendance_record_model = require("../models/attendance_record_model");

const router = express.Router();

router.route("/get-academic-department")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    const academicMember = await academicMemberModel.findOne({ id: authAccessToken.id });
    const department = await departmentModel.findById(academicMember.department);
    res.send(department);
  });

router.route("/get-courses-by-department")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    const academicMember = await academicMemberModel.findOne({ id: authAccessToken.id });
    const department = await departmentModel.findById(academicMember.department);
    let courses = await courseModel.find({ department: department._id });
    let departments = [];
    for (let i = 0; i < courses.length; i++) {
      departments.push(department.name);
    }
    res.send({ courses: courses, departments: departments });
  });

router.route("/get-courses-by-academic")
  .get(async (req, res) => {
    const courses = await courseModel.find({ $or: [{ courseInstructors: req.query.id }, { teachingAssistants: req.query.id }] });
    res.send(courses);
  });

router.route("/get-ci-courses")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    let academicMember = await academicMemberModel.findOne({ id: authAccessToken.id });
    let courses = await courseModel.find({ courseInstructors: academicMember.id });
    for(let i=0;i<courses.length;i++){
      let department = await departmentModel.findOne({_id: courses[i].department});
      courses[i].department=department.name;

    }
    res.send(courses);
  });

router.route("/get-my-courses")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    const courses = await courseModel.find({ $or: [{ courseInstructors: authAccessToken.id }, { teachingAssistants: authAccessToken.id }] });
    for (let i = 0; i < courses.length; i++) {
      let department = await departmentModel.findOne({ _id: courses[i].department });
      courses[i].department = department.name;
    }
    res.send(courses);
  });

router.get("/academic/notifications", async (req, res) => {
  const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
  let notifications = await notification_model.find({ user: authAccessToken.id }).sort({ createdAt: -1 });
  res.send(notifications);
});

router.put("/academic/mark-notifications-seen", async (req, res) => {
  const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
  let seenNotifications = req.body.seenNotifications;
  for (let i = 0; i < seenNotifications.length; i++) {
    let noti = await notification_model.findOne({ _id: seenNotifications[i]._id });
    noti.seen = true;
    noti.save();
  }
  res.send("Done");
});

router.get("/course-slots", async (req, res) => {
  let course = await courseModel.findOne({ id: req.query.id });
  let slots = await slot_model.find({ course: course._id });
  for (let i = 0; i < slots.length; i++) {
    let room = await roomModel.findById(slots[i].room);
    slots[i].room = room.name;
    let course = await courseModel.findById(slots[i].course);
    slots[i].course = course.name;
  }
  res.send(slots);
});

router.get("/user-records", async (req, res) => {
  let dateStringParts = req.query.day.split("T")[0].split("-");
  let date = new Date(dateStringParts[0], dateStringParts[1] - 1, dateStringParts[2], 2).addDays(1);
  records = await attendance_record_model.find({ user: req.query.user, signInTime: { $lt: date.addDays(1), $gte: date } });
  res.send(records);
});

Date.prototype.addDays = function (days) {
  var date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
};

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

module.exports = router;
