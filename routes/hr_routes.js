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

    const office = await roomModel.findOne({name: req.body.office});
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
    
    const office = await roomModel.findOne({name: req.body.office});
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
    // TODO: 
    // TODO: faculty, department

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

router.route("/update-hr-member")
.put(async (req,res) => {
    const user = await hrMemberModel.findOne({id: req.body.id});
    if (!user) {
        res.send("Invalid hr member id.");
        return;
    }

    if (req.body.name) {
        user.name = req.body.name;
    }
    if (req.body.email) {
        const ac = await academicMemberModel.findOne({email: req.body.email});
        if (ac) {
            res.send("Email already exists");
            return;
        }
        user.email = req.body.email;
    }
    if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);
        user.password = hashedPassword;
    }
    if (req.body.gender) {
        user.gender = req.body.gender;
    }
    if (req.body.salary) {
        user.salary = req.body.salary;
    }
    if (req.body.office && req.body.office !== user.office) {
        var office = await roomModel.findOne({name: req.body.office});
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

        var oldOffice = await roomModel.findOne({name: user.office});
        oldOffice.remainingCapacity++;
        office.remainingCapacity--;
        user.office = req.body.office;
    }

    try {
        await user.save();
        if (req.body.office && oldOffice) {
            await office.save();
            await oldOffice.save();
        }
        res.send(user);
    }
    catch (error) {
        console.log(error.message);
        res.send(error);
    }
});

router.route("/update-academic-member")
.put(async (req,res) => {
    const user = await academicMemberModel.findOne({id: req.body.id});
    if (!user) {
        res.send("Invalid academic member id.");
        return;
    }

    if (req.body.name) {
        user.name = req.body.name;
    }
    if (req.body.email) {
        const hr = await hrMemberModel.findOne({email: req.body.email});
        if (hr) {
            res.send("Email already exists");
            return;
        }
        user.email = req.body.email;
    }
    if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);
        user.password = hashedPassword;
    }
    if (req.body.gender) {
        user.gender = req.body.gender;
    }
    if (req.body.role) {
        user.role = req.body.role;
    }
    if (req.body.salary) {
        user.salary = req.body.salary;
    }
    if (req.body.dayOff) {
        user.dayOff = req.body.dayOff;
    }
    if (req.body.office && req.body.office !== user.office) {
        var office = await roomModel.findOne({name: req.body.office});
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

        var oldOffice = await roomModel.findOne({name: user.office});
        oldOffice.remainingCapacity++;
        office.remainingCapacity--;
        user.office = req.body.office;
    }
    if (req.body.faculty) {
        // TODO
    }
    if (req.body.department) {
        // TODO
    }
    
    try {
        await user.save();
        if (req.body.office && oldOffice) {
            await office.save();
            await oldOffice.save();
        }
        res.send(user);
    }
    catch (error) {
        console.log(error.message);
        res.send(error);
    }
});

router.route("/delete-hr-member")
.delete(async (req, res) => {
    const user = await hrMemberModel.findOneAndDelete({id: req.body.id});
    if (!user) {
        res.send("Invalid user id");
        return;
    }
    
    const office = await roomModel.findOne({name: user.office});
    office.remainingCapacity++;
    await office.save();

    res.send(user);
});

router.route("/delete-academic-member")
.delete(async (req,res) => {
    const user = await academicMemberModel.findOneAndDelete({id: req.body.id});
    if (!user) {
        res.send("Invalid user id.");
        return;
    }
    
    const office = await roomModel.findOne({name: user.office});
    office.remainingCapacity++;
    await office.save();

    // TODO: update courses
    // TODO: update attendance records, requests, slots

    res.send(user);
});

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