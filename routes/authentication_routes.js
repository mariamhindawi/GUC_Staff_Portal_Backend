const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const jwtBlacklistModel = require("../models/jwt_blacklist_model");
const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const router = express.Router();

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
        role = "HR";
    }
    else {
        role = user.role;
    }

    const token = jwt.sign({id: user.id, role: role}, process.env.TOKEN_SECRET, { expiresIn: "15 minutes" });
    res.header("token", token).send("Logged in successfully.");
});

router.use(async (req, res, next) => {
    let token = req.headers.token;
    if (!token) {
        res.status(401).send("No credentials.");
        return;
    }
    try {
        token = jwt.verify(token, process.env.TOKEN_SECRET);
    }
    catch (error) {
        console.log(error.message);
        res.status(401).send("Invalid token.");
        return;
    }

    let user = await hrMemberModel.findOne({id: token.id});
    if (!user) {
        user = await academicMemberModel.findOne({id: token.id});
    }
    if (!user) {
        res.status(401).send("Invalid credentials.");
        return;
    }

    let blacklistToken = await jwtBlacklistModel.findOne({token: req.headers.token});
    if (blacklistToken) {
        res.status(401).send("Expired token.");
        return;
    }

    next();
});

router.route("/logout")
.post(async (req,res) => {
    const blacklistedToken = new jwtBlacklistModel({
        token: req.headers.token
    });
    try {
        await blacklistedToken.save();
        res.send("Logged out successfully.");
    }
    catch (error) {
        console.log(error.message)
        res.send(error);
    }
});

module.exports = router;