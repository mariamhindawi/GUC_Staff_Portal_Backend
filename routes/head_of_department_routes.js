const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const academicMemberModel = require("../models/academic_member_model");
const courseModel = require("../models/course_model")
const departmentModel = require("../models/department_model")

const { annualLeaveModel,accidentalLeaveModel,
    compensationLeaveModel,sickLeaveModel,
    dayOffChangeModel,maternityLeaveModel,slotLinkingModel } = require("../models/request_model");
const notificationModel = require('../models/notification_model')

const router = express.Router();


router.use((req, res, next) => {
    const token = jwt.decode(req.headers.token);
    if (token.role === "Head of Department") {
        next();
    }
    else {
        res.status(403).send("Unauthorized access.");
    }
});

router.route("/view-all-staff")
    .get(async (req, res) => {
        const token = jwt.decode(req.headers.token);
        let user = await academicMemberModel.findOne({ id: token.id });
        let output = await academicMemberModel.find({ department: user.department }, { name: 1, _id: 0, email: 1, role: 1, faculty: 1, department: 1, office: 1, salary: 1 })
        try {
            res.send(output)
        }
        catch (error) {
            res.send("error")
        }
    });

router.route("/view-all-staff-per-course")
    .post(async (req, res) => {
        const token = jwt.decode(req.headers.token);
        let user = await academicMemberModel.findOne({ id: token.id });
        let course = await courseModel.findOne({ department: user.department, name: req.body.course })
        let output = []
        let instructors = await course.courseInstructors;
        let tas = await course.teachingAssistants;
        for (let i = 0; i < instructors.length; i++) {
            let user = await academicMemberModel.findOne({ id: instructors[i] });
            output.push(user)
        }
        for (let i = 0; i < tas.length; i++) {
            let user = await academicMemberModel.findOne({ id: tas[i] });
            output.push(user)
        }
        try {
            res.send(output)
        }
        catch (error) {
            res.send("error")
        }
    });

router.route("/view-all-staff-dayoff")
    .get(async (req, res) => {
        const token = jwt.decode(req.headers.token);
        let user = await academicMemberModel.findOne({ id: token.id });
        let output = await academicMemberModel.find({ department: user.department }, { dayoff: 1, _id: 0 })
        res.send(output)
    });

router.route("/view-one-staff-dayoff")
    .post(async (req, res) => {
        const token = jwt.decode(req.headers.token);
        let user = await academicMemberModel.findOne({ id: token.id });
        let output = await academicMemberModel.findOne({ department: user.department, id: req.body.id }, { dayoff: 1, _id: 0 })
        try {
            res.send(output)
        }
        catch (error) {
            res.send("error")
        }
    });

router.route("/assign-course-instructor")
    .post(async (req, res) => {
        const token = jwt.decode(req.headers.token);
        let user = await academicMemberModel.findOne({ id: token.id });
        let instructor = await academicMemberModel.findOne({ id: req.body.id });
        let course = await courseModel.findOne({ name: req.body.course })
        if(instructor){
        if(course){
        let departmentCourse=await departmentModel.findOne({_id:course.department})
        let departmentUser=await departmentModel.findOne({_id:user.department})
        let departmentInstructor=await departmentModel.findOne({_id:instructor.department})
        if(departmentUser.name===departmentCourse.name){
            if(departmentUser.name===departmentInstructor.name){
                try {
            let inst = req.body.id
            let course = await courseModel.findOneAndUpdate({ name: req.body.course }, { "$push": { courseInstructors: inst } })
                res.send("Instructor assigned to course")
            }
            catch (error) {
                res.send("Cannot assign instructor")
            }
            }
            else{
                res.send("Cannot assign instructor that is not in your department")
            }
            
        }
        else{
            res.send("Cannot assign instructor to a course not in your department")
        }
    }
    else{
        res.send("Course does not exist")
    }
        }
        else{
            res.send("Instructor does not exist")
        }
    })

router.route("/delete-course-instructor")
    .post(async (req, res) => {
        const token = jwt.decode(req.headers.token);
        let user = await academicMemberModel.findOne({ id: token.id });
        let instructor = await academicMemberModel.findOne({ id: req.body.id });
        let course = await courseModel.findOne({ name: req.body.course })
        if(instructor){
        if(course){
        let departmentCourse=await departmentModel.findOne({_id:course.department})
        let departmentUser=await departmentModel.findOne({_id:user.department})
        let departmentInstructor=await departmentModel.findOne({_id:instructor.department})
        if(departmentUser.name===departmentCourse.name){
            if(departmentUser.name===departmentInstructor.name){
                try {
            let inst = req.body.id
            let course = await courseModel.findOneAndUpdate({ name: req.body.course }, { "$pull": { courseInstructors: inst } })                
            res.send("Instructor deleted from course")
            }
            catch (error) {
                res.send("Cannot delete instructor")
            }
            }
            else{
                res.send("Cannot delete instructor that is not in your department")
            }
            
        }
        else{
            res.send("Cannot delete instructor from a course not in your department")
        }
    }
    else{
        res.send("Course does not exist")
    }
        }
        else{
            res.send("Instructor does not exist")
        }

    })

router.route("/update-course-instructor")
    .post(async (req, res) => {
        const token = jwt.decode(req.headers.token);
        let user = await academicMemberModel.findOne({ id: token.id });
        let instructorupdate = await academicMemberModel.findOne({ id: req.body.idUpdate });
        let instructordelete = await academicMemberModel.findOne({ id: req.body.idDelete });
        let course = await courseModel.findOne({ name: req.body.course })
        if(instructorupdate && instructordelete){
        if(course){
        let departmentCourse=await departmentModel.findOne({_id:course.department})
        let departmentUser=await departmentModel.findOne({_id:user.department})
        let departmentInstructorup=await departmentModel.findOne({_id:instructorupdate.department})
        let departmentInstructordelete=await departmentModel.findOne({_id:instructordelete.department})
        if(departmentUser.name===departmentCourse.name){
            if(departmentUser.name===departmentInstructorup.name && departmentUser.name===departmentInstructordelete.name ){
                try {
            let inst = req.body.idDelete
            let instupdate = req.body.idUpdate
            console.log(req.body.idDelete)
            console.log(req.body.idUpdate)
            let course = await courseModel.findOneAndUpdate({ name: req.body.course }, { "$pull": { courseInstructors: inst } })
            let courseupdated = await courseModel.findOneAndUpdate({ name: req.body.course }, { "$push": { courseInstructors: instupdate } })                
            res.send("Instructor updated")
            }
            catch (error) {
                res.send("Cannot update instructor")
            }
            }
            else{
                res.send("Cannot update instructor that is not in your department")
            }
            
        }
        else{
            res.send("Cannot update instructor in a course not in your department")
        }
    }
    else{
        res.send("Course does not exist")
    }
        }
        else{
            res.send("Instructor does not exist")
        }


    })

router.post('/staff-requests/:reqId/accept', async (req, res) => {
    let request = await annualLeaveModel.findOne({ id: req.params.reqId })
    let requester = await academicMemberModel.findOne({ id: request.requestedBy })
    if(request.status!=='Under review'){
        res.send('Already responded')
        return
    }
    if (request.type === 'annualLeave') {
        if (requester.annualLeaveBalance >= 1) {
            requester.annualLeaveBalance -= 1;
            requester.save()
            request = await annualLeaveModel.findOneAndUpdate({ id: req.params.reqId }, { status: "Accepted" }, { new: true })
        }
        else {
            request = await annualLeaveModel.findOneAndUpdate({ id: req.params.reqId }, { status: "Rejected", HODComment: "Request has been rejected due to insufficient leave balance" }, { new: true })
        }
    }
    if (request.type === 'accidentalLeave') {
        if (requester.annualLeaveBalance >= 1 && requester.accidentalLeaveBalance >= 1) {
            requester.annualLeaveBalance -= 1
            requester.accidentalLeaveBalance -= 1
            requester.save()
            request = await annualLeaveModel.findOneAndUpdate({ id: req.params.reqId }, { status: "Accepted" }, { new: true })
        }
        else {
            request = await annualLeaveModel.findOneAndUpdate({ id: req.params.reqId }, { status: "Rejected", HODComment: "Request has been rejected due to insufficient leave/accidental leave balance" }, { new: true })
        }
    }
    if (request.type === 'sickLeave'|| request.type === 'maternityLeave'|| request.type === 'compensationRequest') {
        request = await annualLeaveModel.findOneAndUpdate({ id: req.params.reqId }, { status: "Accepted" }, { new: true })
    }
    if (request.type === 'dayOffChangeRequest') {
        request = await dayOffChangeModel.findOne({ id: req.params.reqId })
        let day=request.dayOff
        requester.dayOff = day
        request.status='Accepted'
        request.save()
        requester.save()
    }
    let notification = new notificationModel({
        user:request.requestedBy,
        message: request.type=== 'dayOffChangeRequest'?'Your day off has been changed.':'Your leave request has been accepted.'
    })
    notification.save()
    res.send(request)
})

router.post('/staff-requests/:reqId/reject', async (req, res) => {
    let request = await annualLeaveModel.findOne({ id: req.params.reqId })
    if(request.status !== 'Under review'){
        res.send('Already rejected')
        return
    }
    request.status='Rejected'
    request.save()
    let notification = new notificationModel({
        user:request.requestedBy,
        message: 'Your leave request has been rejected.'
    })
    notification.save()
    res.send(request)
})


router.get('/staff-requests', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let hod = await academicMemberModel.findOne({ id: token.id });
    let requests = await annualLeaveModel.find({ $and: [{ $nor: [{ type: 'slotLinkingRequest' }] }, { status: 'Under review' }] })
    for (let i = 0; i < requests.length; i++) {
        let request = requests[i]
        let staffMember = await academicMemberModel.findOne({ id: request.requestedBy })
        if (staffMember.department !== hod.department) {
            requests.splice(i)
            i--
        }
    }
    res.send(requests)
});

module.exports = router;