const express = require("express");
const jwt = require("jsonwebtoken");
const { getMissingDays, getHours, calculateSalary } = require("../others/helpers");
const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");
const attendanceRecordModel = require("../models/attendance_record_model");
const departmentModel = require("../models/department_model");

const router = express.Router();

router.route("/view-profile")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    const user = await hrMemberModel.findOne({ id: authAccessToken.id }).lean()
      || await academicMemberModel.findOne({ id: authAccessToken.id }).lean();
    const office = await roomModel.findOne({ _id: user.office });
    user.office = office.name;
    if (user.role) {
      if (user.department !== "UNASSIGNED") {
        const department = await departmentModel.findOne({ _id: user.department });
        user.department = department.name;
      }
    }
    else {
      user.role = "HR";
    }
    res.send(user);
  });

router.route("/update-profile")
  .put(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    const user = await academicMemberModel.findOne({ id: authAccessToken.id })
      || await hrMemberModel.findOne({ id: authAccessToken.id });

    if (req.body.email) {
      if (!new RegExp(process.env.MAIL_FORMAT).test(req.body.email)) {
        res.status(400).send("Invalid email address");
        return;
      }
      const otherUser = await hrMemberModel.findOne({ email: req.body.email })
        || await academicMemberModel.findOne({ email: req.body.email });
      if (otherUser && otherUser.id !== user.id) {
        res.status(409).send("Email already exists");
        return;
      }
      user.email = req.body.email;
    }

    if (req.body.office) {
      var oldOffice = await roomModel.findOne({ _id: user.office });
      var newOffice = await roomModel.findOne({ name: req.body.office });
      if (!newOffice) {
        res.status(404).send("Incorrect Office Name");
        return;
      }
      if (oldOffice._id.toString() !== newOffice._id.toString()) {
        if (newOffice.type !== "Office") {
          res.status(422).send("Room must be an office");
          return;
        }
        if (newOffice.remainingCapacity === 0) {
          res.status(409).send("Office has full capacity");
          return;
        }
        oldOffice.remainingCapacity++;
        newOffice.remainingCapacity--;
        user.office = newOffice._id;
      }
    }

    if (req.body.linkedin) {
      const otherUser = await academicMemberModel.findOne({ linkedin: req.body.linkedin });
      if (otherUser && otherUser.id !== user.id) {
        res.status(409).send("Linkedin account is associated with another account");
        return;
      }
      user.linkedin = req.body.linkedin;
    }

    if (req.body.github) {
      const otherUser = await academicMemberModel.findOne({ github: req.body.github });
      if (otherUser && otherUser.id !== user.id) {
        res.status(409).send("Github account is associated with another account");
        return;
      }
      user.github = req.body.github;
    }

    if (req.body.facebook) {
      const otherUser = await academicMemberModel.findOne({ facebook: req.body.facebook });
      if (otherUser && otherUser.id !== user.id) {
        res.status(409).send("Facebook account is associated with another account");
        return;
      }
      user.facebook = req.body.facebook;
    }

    try {
      await user.save();
      if (req.body.office && oldOffice._id.toString() !== newOffice._id.toString()) {
        await newOffice.save();
        await oldOffice.save();
      }
      res.send("Profile updated successfully.");
    }
    catch (error) {
      res.status(500).send(error);
    }
  });

router.route("/view-attendance-records")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    const month = req.query.month - 1;
    const year = req.query.year;
    const userAttendanceRecords = await attendanceRecordModel.find({
      $or: [
        { user: authAccessToken.id, signInTime: { $gte: new Date(year, month, 11), $lt: new Date(year, month + 1, 11) } },
        { user: authAccessToken.id, signOutTime: { $gte: new Date(year, month, 11), $lt: new Date(year, month + 1, 11) } }
      ]
    });
    res.send(userAttendanceRecords);
  });

router.route("/view-missing-days")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    const month = req.query.month - 1;
    const year = req.query.year;
    const user = await hrMemberModel.findOne({ id: authAccessToken.id })
      || await academicMemberModel.findOne({ id: authAccessToken.id });
    const userAttendanceRecords = await attendanceRecordModel.find({
      user: user.id,
      signInTime: { $gte: new Date(year, month, 11), $lt: new Date(year, month + 1, 11) },
      signOutTime: { $ne: null },
    });
    const missingDays = await getMissingDays(month, year, user, userAttendanceRecords);
    res.send(missingDays);
  });

router.route("/view-hours")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    const month = req.query.month - 1;
    const year = req.query.year;
    const user = await hrMemberModel.findOne({ id: authAccessToken.id })
      || await academicMemberModel.findOne({ id: authAccessToken.id });
    const userAttendanceRecords = await attendanceRecordModel.find({ user: authAccessToken.id, signInTime: { $ne: null, $gte: new Date(year, month, 11), $lt: new Date(year, month + 1, 11) }, signOutTime: { $ne: null } });
    const hours = await getHours(month, year, user, userAttendanceRecords);
    res.send(hours);
  });

router.route("/view-salary")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    const month = req.query.month - 1;
    const year = req.query.year;
    const user = await academicMemberModel.findOne({ id: authAccessToken.id })
      || await hrMemberModel.findOne({ id: authAccessToken.id });
    const baseSalary = user.salary;
    const userAttendanceRecords = await attendanceRecordModel.find({
      user: authAccessToken.id,
      signInTime: { $ne: null, $gte: new Date(year, month, 11), $lt: new Date(year, month + 1, 11) },
      signOutTime: { $ne: null },
    });
    const missingDays = await getMissingDays(month, year, user, userAttendanceRecords);
    const { missingHours } = await getHours(month, year, user, userAttendanceRecords);
    const calculatedSalary = calculateSalary(baseSalary, missingDays.length, missingHours)
    res.send({ baseSalary, calculatedSalary });
  });

module.exports = router;
