require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");

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

router.route("/update-room")
.post(async (req,res) => {
    let room = await roomModel.findOne({name: req.body.name});
    if(!room) {
        res.send("No office with such name");
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

module.exports = router;