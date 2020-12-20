require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");
const requestModel=require('../models/request_model');
const courseModel = require("../models/course_model");

const router = express.Router();

router.use((req, res, next) => {
    const token = jwt.decode(req.headers.token);
    if (token.role === "Course Coordinator") {
        next();
    }
    else {
        res.status(403).send("Unauthorized access.");
    }
})

router.get('/slot-linking-requests',async(req,res)=>{
    const token = jwt.decode(req.headers.token)
    let requests = await requestModel.find({type:'slot-linking'})
    let courses = await courseModel.find()
    requests.filter(async(request)=>{
        return courses.filter(async (course)=>{
            return course.instructors.contains(request.requestedBy) && course.instructors.contains(token.id)
        })!=null
    })
})

module.exports = router;