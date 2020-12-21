const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const attendanceRecordModel = require("../models/attendance_record_model");

const router = express.Router();

function compareDates(date1, date2) {
    return date1.getDate() === date2.getDate()
    && date1.getMonth() === date2.getMonth()
    && date1.getFullYear() === date2.getFullYear();
}

router.route("/sign-in")
.post(async (req,res) => {
    let user = await hrMemberModel.findOne({id: req.body.staffId});
    if (!user) {
        user = await academicMemberModel.findOne({id: req.body.staffId});
    }
    if (!user) {
        res.send("Invalid user id.");
        return;
    }

    const date = new Date();
    const newAttendanceRecord = new attendanceRecordModel({
        staffId: req.body.staffId,
        signInTime: date,
        signOutTime: null
    });

    try {
        await newAttendanceRecord.save();
        res.send(newAttendanceRecord);
    }
    catch (error) {
        console.log(error.message)
        res.send(error);
    }
});

router.route("/sign-out")
.post(async (req,res) => {
    let user = await hrMemberModel.findOne({id: req.body.staffId});
    if (!user) {
        user = await academicMemberModel.findOne({id: req.body.staffId});
    }
    if (!user) {
        res.send("Invalid user id.");
        return;
    }
    
    let signOutTime = new Date();
    let attendanceRecords = await attendanceRecordModel.find({staffId: req.body.staffId}).sort({signInTime: 1});
    let attendanceRecord = attendanceRecords.pop();
    let signInTime = attendanceRecords.length === 0 ? null : new Date(attendanceRecord.signInTime);

    if (attendanceRecords.length === 0 || attendanceRecord.signOutTime !== null 
            || !compareDates(signOutTime, signInTime)) {
        let newAttendanceRecord = new attendanceRecordModel({
            staffId: req.body.staffId,
            signInTime: null,
            signOutTime: signOutTime
        });

        try {
            await newAttendanceRecord.save();
            res.send(newAttendanceRecord);
        }
        catch (error) {
            console.log(error.message)
            res.send(error);
        }
        return;
    }
    

   attendanceRecord.signOutTime = signOutTime;
    try {
        await attendanceRecord.save();
        res.send(attendanceRecord);
    }
    catch (error) {
        console.log(error.message)
        res.send(error);
    }
});

module.exports = router;