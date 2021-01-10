const express = require("express");
const jwt = require("jsonwebtoken");
const departmentModel = require("../models/department_model");
const courseModel = require("../models/course_model");
const academicMemberModel = require("../models/academic_member_model");

const router = express.Router();


router.route("/get-academic-department")
.get(async (req, res) => {
    const token = jwt.decode(req.headers.token);
    const academicMember = await academicMemberModel.findOne({id: token.id});
    const department = await departmentModel.findById(academicMember.department);
    res.send(department);
});

router.route("/get-courses-by-department")
.get(async (req, res) => {
    let courses = await courseModel.find({department: req.query.department});
    res.send(courses);
});

router.route("/get-courses-by-academic")
.get(async (req, res) => {
    const courses = await courseModel.find({$or: [{courseInstructors: req.query.id}, {teachingAssistants: req.query.id}]});
    res.send(courses);
});

module.exports = router;