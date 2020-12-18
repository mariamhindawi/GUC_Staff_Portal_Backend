require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");
const courseModel = require("../models/course_model");
const router = express.Router();

router.use((req, res, next) => {
    const token = jwt.decode(req.headers.token);
    if (token.role === "hr") {
        next();
    }
    else {
        res.status(403).send("Unauthorized access.");
    }
});



router.route("/add-hr-member")
.post(async (req,res) => {
    let user = await hrMemberModel.findOne({email: req.body.email});
    if (!user) {
        user = await academicMemberModel.findOne({email: req.body.email});
    }
    
    if (user) {
        res.send("Email already exists");
        return;
    }

    let office = await roomModel.findOne({name: req.body.office});
    if (!office) {
        res.send("Invalid Office Name");
        return;
    }
    if (office.type !== "Office") {
        res.send("Room is not an Office");
        return;
    }
    if (office.remainingCapacity === 0) {
        res.send("Office has full capacity");
        return;
    }
    office.remainingCapacity--;

    const salt = await bcrypt.genSalt(10);
    const newPassword = await bcrypt.hash("123456", salt);
    
    let newUserCount;
    await hrMemberModel.nextCount().then(count => {
        newUserCount = count;
    });

    const newUser = new hrMemberModel({
        id: "hr-" + newUserCount,
        name: req.body.name,
        email: req.body.email,
        password: newPassword,
        gender: req.body.gender,
        office: req.body.office,
        salary: req.body.salary,
        dayOff: req.body.dayOff
    })
    try {
        await newUser.save();
        await office.save();
        res.send(newUser);
    }
    catch (error) {
        console.log(error.message)
        res.send(error);
    }
})

router.route("/add-academic-member")
.post(async (req,res) => {
    let user = await hrMemberModel.findOne({email: req.body.email});
    if (!user) {
        user = await academicMemberModel.findOne({email: req.body.email});
    }

    if (user) {
        res.send("Email already exists");
        return;
    }
    
    let office = await roomModel.findOne({name: req.body.office});
    if (!office) {
        res.send("Invalid Office Name");
        return;
    }
    if (office.type !== "Office") {
        res.send("Room is not an Office");
        return;
    }
    if (office.remainingCapacity === 0) {
        res.send("Office has full capacity");
        return;
    }
    office.remainingCapacity--;

    const salt = await bcrypt.genSalt(10);
    const newPassword = await bcrypt.hash("123456", salt);
    
    let newUserCount;
    await academicMemberModel.nextCount().then(count => {
        newUserCount = count;
    });

    const newUser = new academicMemberModel({
        id: "ac-" + newUserCount,
        name: req.body.name,
        email: req.body.email,
        password: newPassword,
        gender: req.body.gender,
        role: req.body.role,
        office: req.body.office,
        salary: req.body.salary
    })
    try {
        await newUser.save();
        await office.save();
        res.send(newUser);
    }
    catch (error) {
        console.log(error.message);
        res.send(error);
    }
})

router.route("/add-room")
.post(async (req,res) => {
    const newRoom = new roomModel({
        name: req.body.name,
        capacity: req.body.capacity,
        remainingCapacity: req.body.capacity,
        type: req.body.type
    })
    try {
       await newRoom.save();
       res.send(newRoom);   
    }
    catch (error) {
        console.log(error.message);
        res.send(error);
    }
})
router.route("/update-room")
.post(async (req,res) => {
    let room = await roomModel.findOne({name: req.body.name});
    let room1 = await roomModel.findOne({name: req.body.name1});
    if(!room) {
        res.send("No office with such name");
        return;
    }
    if (room1) {
        res.send("Name Used.. Change it");
        return;
    }
    let persons = room.capacity-room.remainingCapacity;
    if (persons>req.body.capacity) {
        res.send("Cannot update capacity");
        return;
    }
    if (req.body.name1) {
        room.name = req.body.name1;
    }
    if (req.body.capacity) {
        room.capacity = req.body.capacity;
    } 
    if (req.body.type) {
        room.type = req.body.type;
    }
    room.remainingCapacity = req.body.capacity - persons;
    try {
        await room.save();
        res.send("Updated room: "+room);
    }
    catch(error) {
        res.send(error);
    }

})
router.route("/delete-room")
.post (async(req,res) => {
    let room = await roomModel.findOne({name: req.body.name})
    if (!room) {
        res.send("No room to delete");
        return;
    }
    try {
        await roomModel.findOneAndDelete({name: req.body.name});
        res.send("Deleted room: "+room);
    }
    catch(error)
    {
        res.send(error);
    }
}) 


router.route("/add-course")
.post(async (req,res) => {
    const newCourse = new courseModel({
        id: req.body.id,
        name: req.body.name,
        department: req.body.department,
        instructors: req.body.instructors,
        TAs: req.body.tas,
        totalSlotsNumber: req.body.slots,
        courseCoordinator: req.body.coordinator

    })
    try {
       await newCourse.save();
       res.send("Course Added: "+newCourse);   
    }
    catch (error) {
        console.log(error.message);
        res.send(error);
    }
})

router.route("/update-course")
.post(async (req,res) => {
    let course = await courseModel.findOne({id: req.body.id});
    let course1 = await courseModel.findOne({id: req.body.id1});
    if (!course) {
        res.send("No course with such ID");
        return;
    }
    if (course1) {
        res.send("ID Used.. Change it");
        return;
    }
    if (req.body.id1) {
        course.id = req.body.id1;
    }
    if (req.body.name) {
        course.name = req.body.name;
    }
    if (req.body.department) {
        course.department = req.body.department;
    }
    if (req.body.instructors) {
        course.instructors = req.body.instructors;
    }
    if (req.body.tas) {
        course.TAs = req.body.tas;
    }
    if (req.body.slots) {
        course.totalSlotsNumber = req.body.slots;
    }
    if (req.body.coordinator) {
        course.courseCoordinator = req.body.coordinator;
    }
    try {
        await course.save();
        res.send("Updated Course: "+course);
    }
    catch(error)
    {
        res.send(error);
    }
})

router.route("/delete-course")
.post (async(req,res) => {
    let deletedCourse = await courseModel.findOne({id: req.body.id})
    if (!deletedCourse) {
        res.send("No course to delete");
        return;
    }
    try {
        await courseModel.findOneAndDelete({id: req.body.id});
        res.send("Deleted course: "+deletedCourse);
    }
    catch(error)
    {
        res.send(error);
    }
}) 



module.exports = router;