const express = require("express");
const bcrypt = require("bcrypt");

const jwtBlacklistModel = require("../models/jwt_blacklist_model");
const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");
const departmentModel = require("../models/department_model");
const facultyModel = require("../models/faculty_model");
const courseModel = require("../models/course_model");
const attendanceRecordModel = require("../models/attendance_record_model");

const router = express.Router();

router.route("")
.post(async (req,res) => {
    if (!req.body.reset) {
        res.send("Did not reset.");
    }

    await jwtBlacklistModel.deleteMany({});
    await hrMemberModel.deleteMany({});
    await hrMemberModel.resetCount();
    await academicMemberModel.deleteMany({});
    await academicMemberModel.resetCount();
    await roomModel.deleteMany({});
    await departmentModel.deleteMany({});
    await facultyModel.deleteMany({});
    await courseModel.deleteMany({});
    await attendanceRecordModel.deleteMany({});

    const newRoom = new roomModel({
        name: "C7.201",
        capacity: 10,
        remainingCapacity: 9,
        type: "Office"
    });

    const salt = await bcrypt.genSalt(10);
    const newPassword = await bcrypt.hash("123456", salt);

    let newUserCount;
    await hrMemberModel.nextCount().then(count => {
        newUserCount = count;
    });

    const newUser = new hrMemberModel({
        id: "hr-" + newUserCount,
        name: "Marwan",
        email: "mm@gmail.com",
        password: newPassword,
        gender: "Male",
        office: "C7.201",
        salary: 7000,
        dayOff: "Saturday"
    })

    await newRoom.save();
    await newUser.save();

    res.send("Done.");
});

module.exports = router;