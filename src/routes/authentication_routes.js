const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const authRefreshTokenModel = require("../models/refresh_token_model");

const router = express.Router();

function getAuthAccessToken(user) {
    if (!user.role) {
        var role = "HR";
    }
    else {
        var role = user.role;
    }

    const authAccessToken = jwt.sign({
        id: user.id,
        name: user.name,
        email: user.email,
        role: role
    }, process.env.AUTH_ACCESS_TOKEN_SECRET, { expiresIn: `${process.env.AUTH_ACCESS_TOKEN_AGE} seconds` });

    return authAccessToken;
}

function getAuthRefreshToken(user, expiryDate) {
    if (!user.role) {
        var role = "HR";
    }
    else {
        var role = user.role;
    }

    const authRefreshToken = jwt.sign({
        exp: expiryDate.getTime() / 1000,
        id: user.id,
        name: user.name,
        email: user.email,
        role: role
    }, process.env.AUTH_REFRESH_TOKEN_SECRET);

    return authRefreshToken;
}


router.route("/login")
    .post(async (req, res) => {
        try {
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
    
            const user = await hrMemberModel.findOne({ email: req.body.email })
                || await academicMemberModel.findOne({ email: req.body.email });
            if (!user) {
                res.status(401).send("User not found");
                return;
            }
    
            const passwordCorrect = await bcrypt.compare(req.body.password, user.password);
            if (!passwordCorrect) {
                res.status(401).send("Wrong password");
                return;
            }
    
            const refreshTokenAge = 1000 * parseInt(process.env.AUTH_REFRESH_TOKEN_AGE);
            const refreshTokenExpiryDate = new Date(Date.now() + refreshTokenAge);
            const authRefreshToken = new authRefreshTokenModel({
                user: user.id,
                token: getAuthRefreshToken(user, refreshTokenExpiryDate),
                expiresAt: refreshTokenExpiryDate
            });
            await authRefreshToken.save();
    
            res.header("auth-access-token", getAuthAccessToken(user));
            res.cookie("auth-refresh-token", authRefreshToken.token, {
                // secure: true, TODO: test with https + domains
                sameSite: "strict",
                httpOnly: true,
                expires: new Date(refreshTokenExpiryDate.getTime() + 2 * 1000 * parseInt(process.env.AUTH_ACCESS_TOKEN_AGE))
            });
            res.send({ firstLogin: !user.loggedIn });
        }
        catch (error) {
            res.status(400).send(error.message);
        }
    });

router.route("/refresh-token")
    .post(async (req, res) => {
        if (!req.cookies["auth-refresh-token"]) {
            res.status(401).send("No refresh token");
            return;
        }

        try {
            const decodedAuthRefreshToken = jwt.decode(req.cookies["auth-refresh-token"]);

            const authRefreshToken = await authRefreshTokenModel.findOne({
                user: decodedAuthRefreshToken.id,
                token: req.cookies["auth-refresh-token"],
                expiresAt: { $gt: new Date() }
            });

            if (!authRefreshToken) {
                throw new Error("Refresh token does not exist");
            }

            authRefreshToken.token = getAuthRefreshToken(decodedAuthRefreshToken, authRefreshToken.expiresAt);
            await authRefreshToken.save();

            res.header("auth-access-token", getAuthAccessToken(decodedAuthRefreshToken));
            res.cookie("auth-refresh-token", authRefreshToken.token, {
                // secure: true, TODO: test with https + domains
                sameSite: "strict",
                httpOnly: true,
                expires: new Date(authRefreshToken.expiresAt.getTime() + 2 * 1000 * parseInt(process.env.AUTH_ACCESS_TOKEN_AGE))
            });
            res.send("Access token refreshed successfully");
        }
        catch (error) {
            res.clearCookie("auth-refresh-token");
            res.status(401).send("Invalid refresh token");
        }
    });

router.use(async (req, res, next) => {
    try {
        const authAccessToken = jwt.verify(req.headers["auth-access-token"], process.env.AUTH_ACCESS_TOKEN_SECRET);
        req.token = authAccessToken;
        next();
    }
    catch (error) {
        res.status(401).send("Invalid access token");
    }
});

router.route("/logout")
    .post(async (req, res) => {
        try {
            if (req.body.forceLogout) {
                await authRefreshTokenModel.deleteMany({ user: req.token.id });
            }
            else {
                await authRefreshTokenModel.deleteOne({ token: req.cookies["auth-refresh-token"] });
            }

            res.clearCookie("auth-refresh-token");
            res.send("Logged out successfully");
        }
        catch (error) {
            res.clearCookie("auth-refresh-token");
            res.status(400).send(error.message);
        }
    });

router.route("/change-password")
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

        if (req.token.role === "HR") {
            var user = await hrMemberModel.findOne({ id: req.token.id });
        }
        else {
            var user = await academicMemberModel.findOne({ id: req.token.id });
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
    });

module.exports = router;