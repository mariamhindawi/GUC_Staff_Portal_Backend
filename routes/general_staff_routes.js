const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const jwtBlacklistModel = require("../models/jwt_blacklist_model");
const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");

const router = express.Router();

router.route("/view-profile")
.get(async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let user = await hrMemberModel.findOne({id: token.id});
    if (!user) {
        user = await academicMemberModel.findOne({email: req.body.email});
    }
    res.send(user);
});

router.route("/reset-password")
.put(async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let user = await hrMemberModel.findOne({email: req.body.email});
    if (!user) {
        user = await academicMemberModel.findOne({email: req.body.email});
    }

    const passwordCorrect = await bcrypt.compare(req.body.oldPassword, user.password);
    if (!passwordCorrect) {
        res.status(401).send("Wrong password.");
        return;
    }
    
    const salt = await bcrypt.genSalt(10);
    const newPassword = await bcrypt.hash(req.body.newPassword, salt);
    user.password = newPassword;
    
    try {
        await user.save();
        const blacklistedToken = new jwtBlacklistModel({
            token: req.headers.token
        });
        await blacklistedToken.save();        
        res.send("Password changed successfully.");
    }
    catch (error) {
        console.log(error.message);
        res.send(error);
    }
});

module.exports = router;