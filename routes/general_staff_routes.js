const express = require("express");
const jwt = require("jsonwebtoken");

const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");

const router = express.Router();

router.route("/view-profile")
.get(async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let user = await hrMemberModel.findOne({id: token.id});
    if (!user) {
        user = await academicMemberModel.findOne({id: token.id});
    }
    let office = await roomModel.findOne({_id: user.office});
    res.send({user: user, office: office});
});

module.exports = router;