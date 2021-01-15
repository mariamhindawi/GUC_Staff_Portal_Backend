const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const jwtBlacklistModel = require("../models/jwt_blacklist_model");
const userBlacklistModel = require("../models/user_blacklist_model");

const router = express.Router();

router.route("/staff/login")
.post(async (req, res) => {
    if (!(req.body.email && req.body.password)) {
        res.send("Not all the required fields are entered.");
        return;
    }

    if (typeof req.body.email !== "string" || typeof req.body.password !== "string") {
        res.send("Wrong data types entered.");
        return;
    }

    if (!new RegExp(process.env.MAIL_FORMAT).test(req.body.email)) {
        res.send("Invalid email address.");
        return;
    }

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
    
    if (!user.role) {
        var role = "HR";
    }
    else {
        var role = user.role;
    }
    const token = jwt.sign({id: user.id, role: role}, process.env.TOKEN_SECRET, { });

    if (!user.loggedIn) {
        res.header("token", token).send(user);
        
    }
    else {
        res.header("token", token).send(user);
    }
})
.get(async (req, res) => {
    res.send("Please enter email and password.");
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


    const blacklistToken = await jwtBlacklistModel.findOne({token: req.headers.token});
    const blacklistUser = await userBlacklistModel.findOne({user: user.id, blockedAt: {$gt: new Date(1000 * token.iat)}});
    if (blacklistToken || blacklistUser) {
        res.status(401).send("Expired token.");
        return;
    }

    next();
});

router.route("/staff/logout")
.post(async (req, res) => {
    const token = jwt.decode(req.headers.token);
    const blacklistedToken = new jwtBlacklistModel({
        token: req.headers.token,
        expiresAt: new Date(1000 * token.exp)
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

router.route("/staff/change-password")
.put(async (req, res) => {
    if (!(req.body.oldPassword && req.body.newPassword)) {
        res.send("Not all the required fields are entered.");
        return;
    }

    if (typeof req.body.oldPassword !== "string" || typeof req.body.newPassword !== "string") {
        res.send("Wrong data types entered.");
        return;
    }

    const token = jwt.decode(req.headers.token);
    if (token.role === "HR") {
        var user = await hrMemberModel.findOne({id: token.id});
    }
    else {
        var user = await academicMemberModel.findOne({id: token.id});
    }

    const passwordCorrect = await bcrypt.compare(req.body.oldPassword, user.password);
    if (!passwordCorrect) {
        res.status(401).send("Wrong password.");
        return;
    }
    
    const salt = await bcrypt.genSalt(10);
    const newPassword = await bcrypt.hash(req.body.newPassword, salt);
    user.password = newPassword;
    
    if (!user.loggedIn) {
        user.loggedIn = true;
    }

    try {
        await user.save();
        let blacklistEntry = await userBlacklistModel.findOne({user: user.id});
        if (blacklistEntry) {
            blacklistEntry.blockedAt = new Date();
        }
        else {
            blacklistEntry = new userBlacklistModel({
                user: user.id,
                blockedAt: new Date()
            });
        }
        await blacklistEntry.save();
        res.redirect("login");
    }
    catch (error) {
        console.log(error.message);
        res.send(error);
    }
})
.get(async (req, res) => {
    res.send("Please renter old password and enter new password.");
});

module.exports = router;