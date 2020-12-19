require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");

const router = express.Router();

router.route("/reset")
.post(async (req,res) => {
    if (!req.body.reset) {
        res.send("Did not reset");
    }

    await hrMemberModel.deleteMany({});
    await hrMemberModel.resetCount();
    await academicMemberModel.deleteMany({});
    await academicMemberModel.resetCount();
    await roomModel.deleteMany({});

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

    res.send("Done");
});

router.route("/login")
.post(async (req,res) => {
    let user = await hrMemberModel.findOne({email: req.body.email});
    if (!user) {
        user = await academicMemberModel.findOne({email: req.body.email});
    }

    if (!user) {
        res.status(401).send("User not found.");
        return;
    }
    
    const passwordCorrect = await bcrypt.compare(req.body.password, user.password);
    if (!passwordCorrect) {
        res.status(401).send("Wrong password.");
        return;
    }
    
    let role;
    if (!user.role) {
        role = "hr";
    }
    else {
        role = user.role;
    }
    const token = jwt.sign({id: user.id, role: role}, process.env.TOKEN_SECRET);
    res.header("token", token).send("Logged in successfully.");
});

router.use(async (req, res, next) => {
    let token = req.headers.token;
    if (!token) {
        res.status(401).send("No credentials.");
        return;
    }
    try {
        const verified = jwt.verify(token, process.env.TOKEN_SECRET);
    }
    catch (error) {
        console.log(error.message);
        res.status(401).send("Invalid token.");
    }

    token = jwt.decode(req.headers.token);
    let user = await hrMemberModel.findOne({id: token.id});
    if (!user) {
        user = await academicMemberModel.findOne({id: token.id});
    }
    if (!user) {
        res.status(401).send("Invalid credentials.");
        return;
    }
    next();
});

module.exports = router;