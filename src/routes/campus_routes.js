const express = require("express");
const { datesEqual } = require("../others/helpers");
const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const attendanceRecordModel = require("../models/attendance_record_model");

const router = express.Router();

router.route("/sign-in")
  .post(async (req, res) => {
    const user = await hrMemberModel.findOne({ id: req.body.user })
      || await academicMemberModel.findOne({ id: req.body.user });;
    if (!user) {
      res.status(422).send("Incorrect user id");
      return;
    }

    const signInTime = new Date();
    const newAttendanceRecord = new attendanceRecordModel({
      user: req.body.user,
      signInTime: signInTime,
      signOutTime: null
    });

    try {
      await newAttendanceRecord.save();
      res.send(newAttendanceRecord);
    }
    catch (error) {
      console.log(error.message);
      res.status(400).send(error);
    }
  });

router.route("/sign-out")
  .post(async (req, res) => {
    const user = await hrMemberModel.findOne({ id: req.body.user })
      || await academicMemberModel.findOne({ id: req.body.user });;
    if (!user) {
      res.status(422).send("Incorrect user id");
      return;
    }

    const signOutTime = new Date();
    const lastAttendanceRecord = (await attendanceRecordModel.find({ user: req.body.user }).sort({ signInTime: "desc" }).limit(1))[0];
    if (!lastAttendanceRecord || lastAttendanceRecord.signOutTime !== null
      || !datesEqual(lastAttendanceRecord.signInTime, signOutTime)) {
      const newAttendanceRecord = new attendanceRecordModel({
        user: req.body.user,
        signInTime: null,
        signOutTime: signOutTime
      });

      try {
        await newAttendanceRecord.save();
        res.send(newAttendanceRecord);
        return;
      }
      catch (error) {
        console.log(error.message);
        res.status(400).send(error);
        return;
      }
    }

    lastAttendanceRecord.signOutTime = signOutTime;
    try {
      await lastAttendanceRecord.save();
      res.send(lastAttendanceRecord);
    }
    catch (error) {
      console.log(error.message);
      res.status(400).send(error);
    }
  });

module.exports = router;
