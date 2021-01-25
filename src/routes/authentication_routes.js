const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const jwtBlacklistModel = require("../models/jwt_blacklist_model");
const userBlacklistModel = require("../models/user_blacklist_model");

const router = express.Router();

function getAuthToken(user, type) {
    if (!user.role) {
        var role = "HR";
    }
    else {
        var role = user.role;
    }

    if (type === "access") {
        var secret = process.env.AUTH_ACCESS_TOKEN_SECRET;
        var age = process.env.AUTH_ACCESS_TOKEN_AGE;
    }
    else if (type === "refresh") {
        var secret = process.env.AUTH_REFRESH_TOKEN_SECRET;
        var age = process.env.AUTH_REFRESH_TOKEN_AGE;
    }

    const authAccessToken = jwt.sign({ id: user.id, name: user.name, email: user.email, role: role },
        secret, { expiresIn: `${age} seconds` });
    return authAccessToken;
}


router.route("/staff/login")
    .post(async (req, res) => {
        if (!(req.body.email && req.body.password)) {
            res.status(400).send("Not all the required fields are entered");
            return;
        }

        if (typeof req.body.email !== "string" || typeof req.body.password !== "string") {
            res.status(400).send("Wrong data types entered");
            return;
        }

        if (!new RegExp(process.env.MAIL_FORMAT).test(req.body.email)) {
            res.status(400).send("Invalid email address");
            return;
        }

        let user = await hrMemberModel.findOne({ email: req.body.email });
        if (!user) {
            user = await academicMemberModel.findOne({ email: req.body.email });
        }
        if (!user) {
            res.status(401).send("User not found");
            return;
        }

        const passwordCorrect = await bcrypt.compare(req.body.password, user.password);
        if (!passwordCorrect) {
            res.status(401).send("Wrong password");
            return;
        }

        res.header("auth-access-token", getAuthToken(user, "access"));
        res.cookie("auth-refresh-token", getAuthToken(user, "refresh"), {
            // domain: ??, TODO: check if needed
            // path: "/staff/refresh-token", TODO: check path
            // secure: true, TODO: test with https + domains
            sameSite: "strict",
            httpOnly: true,
            maxAge: 1000 * (parseInt(process.env.AUTH_REFRESH_TOKEN_AGE) + parseInt(process.env.AUTH_ACCESS_TOKEN_AGE))
        });
        res.send({ firstLogin: !user.loggedIn });
    })

router.route("/staff/refresh-token")
    .post(async (req, res) => {
        if (!req.cookies["auth-refresh-token"]) {
            res.status(401).send("No refresh token");
            return;
        }

        try {
            var authRefreshToken = jwt.verify(req.cookies["auth-refresh-token"], process.env.AUTH_REFRESH_TOKEN_SECRET);
        }
        catch (error) {
            res.clearCookie("auth-refresh-token");
            res.status(401).send("Invalid refresh token");
            return;
        }

        const blacklistedRefreshToken = await jwtBlacklistModel.findOne({ token: req.cookies["auth-refresh-token"] });
        const blacklistedUser = await userBlacklistModel.findOne({ user: authRefreshToken.id, blockedAt: { $gt: new Date(1000 * authRefreshToken.iat) } });
        if (blacklistedRefreshToken || blacklistedUser) {
            res.clearCookie("auth-refreshs-token");
            res.status(401).send("Expired refresh token");
            return;
        }

        res.header("auth-access-token", getAuthToken(authRefreshToken, "access"));
        res.send("Access token refreshed successfully");
    })

router.use(async (req, res, next) => {
    try {
        var authAccessToken = jwt.verify(req.headers["auth-access-token"], process.env.AUTH_ACCESS_TOKEN_SECRET);
    }
    catch (error) {
        res.status(401).send("Invalid access token");
        console.log(error.message)
        return;
    }

    const blacklistedAccessToken = await jwtBlacklistModel.findOne({ token: req.headers["auth-access-token"] });
    const blacklistedUser = await userBlacklistModel.findOne({ user: authAccessToken.id, blockedAt: { $gt: new Date(1000 * authAccessToken.iat) } });
    if (blacklistedAccessToken || blacklistedUser) {
        res.status(401).send("Expired access token");
        return;
    }

    req.authAccessToken = authAccessToken;
    next();
});

router.route("/staff/logout")
    .post(async (req, res) => {
        const blacklistAccessToken = new jwtBlacklistModel({
            token: req.headers["auth-access-token"],
            expiresAt: new Date(1000 * req.authAccessToken.exp)
        });
        const authRefreshToken = jwt.decode(req.cookies["auth-refresh-token"]);
        const blacklistRefreshToken = new jwtBlacklistModel({
            token: req.cookies["auth-refresh-token"],
            expiresAt: new Date(1000 * authRefreshToken.exp)
        });

        try {
            await blacklistAccessToken.save();
            await blacklistRefreshToken.save();
        }
        catch (error) {
            res.clearCookie("auth-refresh-token");
            res.status(400).send(error.message);
            return;
        }

        res.clearCookie("auth-refresh-token");
        res.send("Logged out successfully");
    });

router.route("/staff/change-password")
    .put(async (req, res) => {
        if (!(req.body.oldPassword && req.body.newPassword && req.body.confirmedNewPassword)) {
            res.status(400).send("Not all the required fields are entered");
            return;
        }

        if (typeof req.body.oldPassword !== "string" || typeof req.body.newPassword !== "string" 
            || typeof req.body.confirmedNewPassword !== "string") {
            res.status(422).send("Wrong data types entered");
            return;
        }

        if (req.body.newPassword !== req.body.confirmedNewPassword) {
            res.status(422).send("Entered passwords do not match");
            return;
        }

        if (req.authAccessToken.role === "HR") {
            var user = await hrMemberModel.findOne({ id: req.authAccessToken.id });
        }
        else {
            var user = await academicMemberModel.findOne({ id: req.authAccessToken.id });
        }

        const passwordCorrect = await bcrypt.compare(req.body.oldPassword, user.password);
        if (!passwordCorrect) {
            res.status(401).send("Wrong password");
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
            let blacklistEntry = await userBlacklistModel.findOne({ user: user.id });
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
            res.send("Password changed succesfully");
        }
        catch (error) {
            res.status(400).send(error.message);
        }
    })

module.exports = router;