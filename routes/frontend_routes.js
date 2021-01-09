const express = require("express");
const jwt = require("jsonwebtoken");

const departmentModel = require('../models/department_model');
const courseModel = require('../models/course_model');
const academicMemberModel = require('../models/academic_member_model');
const router = express.Router();

// view courses in a department
router.route('/view-depCourses')
.get(async(req,res)=>{
    let dep = await departmentModel.findOne({ name: req.body.department });
    if(!dep){
        res.send("enter a valid department");
        return;
    }
    let courses = await courseModel.find({department: dep._id});
    res.send(courses);

});

// view courses of an academic member
router.route('/view-acCourses')
.get(async(req,res)=>{
    let member = await academicMemberModel.findOne({ id: req.body.id });
    if(!member) {
        res.send("enter a valid id");
        return;
    }
    else {
        if(member.role=="Course Instructor"||member.role=="Head of Department") {
            let courses = await courseModel.find({courseInstructors: member.id});
        }
        else {
            if(member.role=="Teaching Assistant"||member.role=="Course Coordinator") {
                let courses = await courseModel.find({teachingAssistants: member.id});
            }
        }
        if(!courses) {
            res.send("no courses");
            return;
        }
        else {
            res.send(courses);
            return;
        }
    }
})


module.exports = router;