const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const jwtBlacklistModel = require("../models/jwt_blacklist_model");
const userBlacklistModel = require("../models/user_blacklist_model");

const router = express.Router();

function getAuthAccessToken(user) {
    if (!user.role)
        var role = "HR";
    else
        var role = user.role;

    const authAccessToken = jwt.sign({ id: user.id, name: user.name, email: user.email, role: role },
        process.env.AUTH_ACCESS_TOKEN_SECRET, { expiresIn: "5 minutes" });

    return authAccessToken;
}

function getAuthRefreshToken(user) {
    const authRefreshToken = jwt.sign({ id: user.id },
        process.env.AUTH_REFRESH_TOKEN_SECRET, { expiresIn: "1 hour" });

    return authRefreshToken;
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

        const authAccessToken = getAuthAccessToken(user);
        const authRefreshToken = getAuthRefreshToken(user);

        res.header("auth-access-token", authAccessToken);
        res.cookie("auth-refresh-token", authRefreshToken, {
            // domain: ??, TODO: check if needed
            // path: "/staff/refresh-token", TODO: check path
            // secure: true, TODO: test with https + domains
            sameSite: "strict",
            httpOnly: true,
            maxAge: 100_000_000
        });

        res.send({ firstLogin: !user.loggedIn });
    })

router.route("/staff/refresh-token")
    .post(async (req, res) => {
        try {
            var authRefreshToken = jwt.verify(req.cookies["auth-refresh-token"], process.env.AUTH_REFRESH_TOKEN_SECRET);
        }
        catch (error) {
            console.log(error.message);
            res.status(401).send("Invalid token");
            return;
        }

        let user = await hrMemberModel.findOne({ id: authRefreshToken.id });
        if (!user) {
            user = await academicMemberModel.findOne({ id: authRefreshToken.id });
        }
        if (!user) {
            res.status(401).send("Invalid credentials");
            return;
        }

        const blacklistedRefreshToken = await jwtBlacklistModel.findOne({ token: req.cookies["auth-refresh-token"] });
        const blacklistedUser = await userBlacklistModel.findOne({ user: user.id, blockedAt: { $gt: new Date(1000 * authRefreshToken.iat) } });
        if (blacklistedRefreshToken || blacklistedUser) {
            res.status(401).send("Expired token");
            return;
        }

        const authAccessToken = getAuthAccessToken(user);
        authRefreshToken = getAuthRefreshToken(user);

        res.header("auth-access-token", authAccessToken);
        res.cookie("auth-refresh-token", authRefreshToken, {
            // domain: ??, TODO: check if needed
            // path: "/staff/refresh-token", TODO: check path
            // secure: true, TODO: test with https + domains
            sameSite: "strict",
            httpOnly: true,
            maxAge: 100_000_000
        });

        res.send({ authAccessToken: authAccessToken, authRefreshToken: authRefreshToken });
        // res.send("Authentication tokens refreshed successfully")
    })

router.use(async (req, res, next) => {
    try {
        var authAccessToken = jwt.verify(req.headers["auth-access-token"], process.env.AUTH_ACCESS_TOKEN_SECRET);
    }
    catch (error) {
        console.log(error.message);
        res.status(401).send("Invalid token");
        return;
    }

    let user = await hrMemberModel.findOne({ id: authAccessToken.id });
    if (!user) {
        user = await academicMemberModel.findOne({ id: authAccessToken.id });
    }
    if (!user) {
        res.status(401).send("Invalid credentials");
        return;
    }

    const blacklistedAccessToken = await jwtBlacklistModel.findOne({ token: req.headers["auth-access-token"] });
    const blacklistedUser = await userBlacklistModel.findOne({ user: user.id, blockedAt: { $gt: new Date(1000 * authAccessToken.iat) } });
    if (blacklistedAccessToken || blacklistedUser) {
        res.status(401).send("Expired token");
        return;
    }

    next();
});

router.route("/staff/logout")
    .post(async (req, res) => {
        const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
        const blacklistAccessToken = new jwtBlacklistModel({
            token: req.headers["auth-access-token"],
            expiresAt: new Date(1000 * authAccessToken.exp)
        });
        const authRefreshToken = jwt.decode(req.cookies["auth-refresh-token"]);
        const blacklistRefreshToken = new jwtBlacklistModel({
            token: req.headers["auth-access-token"],
            expiresAt: new Date(1000 * authRefreshToken.exp)
        });

        try {
            await blacklistAccessToken.save();
            await blacklistRefreshToken.save();
        }
        catch (error) {
            console.log(error.message);
        }

        res.send("Logged out successfully");
    });

router.route("/staff/change-password")
    .put(async (req, res) => {
        if (!(req.body.oldPassword && req.body.newPassword)) {
            res.status(400).send("Not all the required fields are entered");
            return;
        }

        if (typeof req.body.oldPassword !== "string" || typeof req.body.newPassword !== "string") {
            res.status(422).send("Wrong data types entered");
            return;
        }

        const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
        if (authAccessToken.role === "HR") {
            var user = await hrMemberModel.findOne({ id: authAccessToken.id });
        }
        else {
            var user = await academicMemberModel.findOne({ id: authAccessToken.id });
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
            console.log(error.message);
            res.status(400).send(error.message);
        }
    })

module.exports = router;