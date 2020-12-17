require("dotenv").config();
const hrModel = require("../models/hr_model");
const instructorModel = require("../models/instructor_model");
const taModel = require("../models/ta_model");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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
    let user = await hrModel.findOne({email: req.body.email});
    if (!user) {
        user = await instructorModel.findOne({email: req.body.email});
    }
    if (!user) {
        user = await taModel.findOne({email: req.body.email});
    }
    if (!user) {
        const salt = await bcrypt.genSalt(10);
        const newPassword = await bcrypt.hash("123456", salt);
        const newUser = new hrModel({
            id: "hr-1",
            name: req.body.name,
            email: req.body.email,
            password: newPassword,
            gender: req.body.gender,
            office: req.body.office,
            salary: req.body.salary
        })
        try {
            await newUser.save();
            res.send(newUser);
        }
        catch(error) {
            console.log(error.message)
            res.send(error);
        }
    }
    else {
        res.send("Email already exists");
    }
})

module.exports = router;