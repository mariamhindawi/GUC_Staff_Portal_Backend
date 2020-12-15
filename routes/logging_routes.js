require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const hrModel = require("../models/hr_model");
const instructorModel = require("../models/instructor_model");
const taModel = require("../models/ta_model");

const router = express.Router();

router.route("/login")
.post(async (req,res) => {
    let user = await hrModel.findOne({email: req.body.email});
    // user |= await instructorModel.findOne({email: req.body.email});
    // user |= await taModel.findOne({email: req.body.email});
    if (user) {
        const passwordCorrect = await bcrypt.compare(req.body.password, user.password);
        if (passwordCorrect) {
            let role;
            if (!user.role) {
                role = "hr";
            }
            else {
                role = user.role;
            }
            const token = jwt.sign({id: user.id, role: role}, process.env.TOKEN_SECRET);
            res.header("token", token).send("Logged in successfully.");
        }
        else {
            res.status(401).send("Wrong password.");
        }
    }
    else {
        res.status(401).send("User not found.");
    }
});

router.use((req, res, next) => {
    const token = req.headers.token;
    if(token) {
        try {
            const verified = jwt.verify(token, process.env.TOKEN_SECRET);
            next();
        }
        catch(error) {
            console.log(error.message);
            res.status(401).send("Invalid credentials.");
        }
    }
    else {
        res.status(401).send("No credentials.");
    }
});

module.exports = router;