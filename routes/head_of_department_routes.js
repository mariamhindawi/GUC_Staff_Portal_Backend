const express = require("express");
const jwt = require("jsonwebtoken");

const academicMemberModel = require("../models/academic_member_model");
const departmentModel = require("../models/department_model");
const courseModel = require("../models/course_model")
const { annualLeaveModel, dayOffChangeModel, requestModel } = require("../models/request_model");
const notificationModel = require('../models/notification_model')
const slotModel = require('../models/slot_model')

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
        let output = await academicMemberModel.find({ department: user.department })
        res.send(output);
    });

router.route("/view-all-staff-per-course")
    .get(async (req, res) => {
        const token = jwt.decode(req.headers.token);
        let user = await academicMemberModel.findOne({ id: token.id });
        if(!req.body.course){
            res.send('Not all fields are entered.');
            return;
        }
        if (typeof req.body.course !== 'string') {
            res.send('Wrong data types entered.');
            return;
        }
        let course = await courseModel.findOne({ department: user.department, name: req.body.course });
        if(!course){
            res.send('No suuch course in your department.');
            return;
        }
        let output = [];
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
        res.send(output);
    });

router.route("/view-all-staff-dayoff")
    .get(async (req, res) => {
        const token = jwt.decode(req.headers.token);
        let user = await academicMemberModel.findOne({ id: token.id });
        let output = await academicMemberModel.find({ department: user.department }, {id: 1,  dayoff: 1 });
        res.send(output);
    });

router.route("/view-one-staff-dayoff")
    .get(async (req, res) => {
        const token = jwt.decode(req.headers.token);
        if(!req.body.id){
            res.send("Not all fields are entered.");
            return;
        }
        if (typeof req.body.id !== 'string') {
            res.send('Wrong data types entered.')
            return;
        }
        let user = await academicMemberModel.findOne({ id: token.id });
        let output = await academicMemberModel.findOne({ department: user.department, id: req.body.id }, { id: 1,  dayoff: 1 });
        res.send(output);
    });

router.route("/assign-course-instructor")
    .post(async (req, res) => {
        const token = jwt.decode(req.headers.token);
        if(!req.body.course || !req.body.id){
            res.send("Not all fields are entered.");
            return;
        }
        if (typeof req.body.id !== 'string'|| typeof req.body.course !== 'string' ) {
            res.send('Wrong data types entered.');
            return;
        }
        let user = await academicMemberModel.findOne({ id: token.id });
        let instructor = await academicMemberModel.findOne({ id: req.body.id });
        let course = await courseModel.findOne({ name: req.body.course });
        if( !instructor || instructor.role === "Course Instructor" || instructor.role === "Head of Department"){
            res.send('No such instructor exists.');
            return;
        }
        if (course) {
            if (user.department === course.department) {
                if (user.department === instructor.department) {
                    try {
                        await courseModel.findOneAndUpdate({ name: req.body.course }, { "$push": { courseInstructors: instructor } })
                        res.send("Instructor assigned to course");
                    }
                    catch (error) {
                        res.send("Cannot assign instructor");
                    }
                }
                else {
                    res.send("Cannot assign instructor that is not in your department");
                }
            }
            else {
                res.send("Cannot assign instructor to a course not in your department");
            }
        }
        else {
            res.send("Course does not exist");
        }
    
        
           
    });

router.route("/delete-course-instructor")
    .delete(async (req, res) => {
        const token = jwt.decode(req.headers.token);
        if(!req.body.id || !req.body.course){
            res.send("Not all fields are entered.");
            return;
        }
        if (typeof req.body.id !== 'string' || typeof req.body.course !== 'string') {
            res.send('Wrong data types entered.');
            return;
        }
        let user = await academicMemberModel.findOne({ id: token.id });
        let instructor = await academicMemberModel.findOne({ id: req.body.id });
        let course = await courseModel.findOne({ name: req.body.course })
        if (instructor) {
            if (course) {
                if (user.department === course.department) {
                    if (user.department === instructor.department) {
                        try {
                            await courseModel.findOneAndUpdate({ name: req.body.course }, { "$pull": { courseInstructors: instructor } })
                            res.send("Instructor deleted from course");
                        }
                        catch (error) {
                            res.send("Cannot delete instructor");
                        }
                    }
                    else {
                        res.send("Cannot delete instructor that is not in your department");
                    }
                }
                else {
                    res.send("Cannot delete instructor from a course not in your department");
                }
            }
            else {
                res.send("Course does not exist");
            }
        }
        else {
            res.send("Instructor does not exist");
        }
    });

router.route("/update-course-instructor")
    .put(async (req, res) => {
        const token = jwt.decode(req.headers.token);
        if(!req.body.idUpdate || !req.body.idDelete || !req.body.course){
            res.send("Not all fields are entered");
            return;
        }
        if (typeof req.body.idUpdate !== 'string' || typeof req.body.idDelete !== 'string'||typeof req.body.course !== 'string') {
            res.send('Wrong data types entered.');
            return;
        }
        
        let user = await academicMemberModel.findOne({ id: token.id });
        let instructorupdate = await academicMemberModel.findOne({ id: req.body.idUpdate });
        let instructordelete = await academicMemberModel.findOne({ id: req.body.idDelete });
        let course = await courseModel.findOne({ name: req.body.course })
        if (instructorupdate.role === "Course Instructor" || instructor.role === "Head of Department") {
            if (instructorupdate && instructordelete) {
                if (course) {
                    if (user.department === course.department) {
                        if (user.department === instructorupdate.department && user.department === instructordelete.department) {
                            try {  
                                await courseModel.findOneAndUpdate({ name: req.body.course }, { "$pull": { courseInstructors: instructordelete } })
                                await courseModel.findOneAndUpdate({ name: req.body.course }, { "$push": { courseInstructors: instructorupdate } })
                                res.send("Instructor updated");
                            }
                            catch (error) {
                                res.send("Cannot update instructor");
                            }
                        }
                        else {
                            res.send("Cannot update instructor that is not in your department");
                        }

                    }
                    else {
                        res.send("Cannot update instructor in a course not in your department");
                    }
                }
                else {
                    res.send("Course does not exist");
                }
            }
            else {
                res.send("Instructor does not exist");
            }
        }
        else {
            res.send("Cannot assign TA to be a course instructor");
        }

    });

router.put('/staff-requests/:reqId/accept', async (req, res) => {
    if (isNaN(req.params.reqId)) {
        res.status(403).send('Invalid request id')
        return
    }
    let request = await requestModel.findOne({ id: req.params.reqId })
    let requester = await academicMemberModel.findOne({ id: request.requestedBy })
    if (request.status !== 'Under review') {
        res.status(403).send('Already responded')
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
            let notification = new notificationModel({
                user: request.requestedBy,
                message: `Your request(${req.params.reqId}) has been rejected.`
            })
            notification.save()
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
            let notification = new notificationModel({
                user: request.requestedBy,
                message: `Your request(${req.params.reqId}) has been rejected.`
            })
            notification.save()
        }
    }
    if (request.type === 'sickLeave' || request.type === 'maternityLeave' || request.type === 'compensationRequest') {
        request = await requestModel.findOneAndUpdate({ id: req.params.reqId }, { status: "Accepted" }, { new: true })
    }
    if (request.type === 'dayOffChangeRequest') {
        request = await dayOffChangeModel.findOne({ id: req.params.reqId })
        let day = request.dayOff
        requester.dayOff = day
        request.status = 'Accepted'
        request.save()
        requester.save()
    }
    let notification = new notificationModel({
        user: request.requestedBy,
        message: `Your request(${req.params.reqId}) has been accepted`
    })
    notification.save()
    res.send(request)
})

router.put('/staff-requests/:reqId/reject', async (req, res) => {
    if (isNaN(req.params.reqId)) {
        res.status(403).send('Invalid request id')
        return
    }
    let request = await annualLeaveModel.findOne({ id: req.params.reqId })
    if (request.status !== 'Under review') {
        res.status(403).send('Already responded')
        return
    }
    request.HODComment = req.body.HODComment
    request.status = 'Rejected'
    try {
        await request.save()
    }
    catch (error) {
        res.status(403).send(error)
    }
    let notification = new notificationModel({
        user: request.requestedBy,
        message: `Your request(${req.params.reqId}) has been rejected by the hod.`
    })
    notification.save()
    res.send(request)
})


router.get('/staff-requests', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let hod = await academicMemberModel.findOne({ id: token.id });
    let requests = await requestModel.find({ $and: [{ $nor: [{ type: 'slotLinkingRequest' }] }, { status: 'Under review' }] })
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

//view the coverage of each course in his/her department
router.route('/view-coverage').get(async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let hod = await academicMemberModel.findOne({ id: token.id });
    let dep = await departmentModel.findOne({ headOfDepartment: hod.id });
    let courses = await courseModel.find({ department: dep._id });
    let coverages = [];
    for (let i = 0; i < courses.length; i++) {
        let unassignedSlots = await slotModel.find({ course: courses[i]._id, staffMember: "UNASSIGNED" });
        let totalSlots = await slotModel.find({ course: courses[i]._id });
        if (totalSlots.length==0) {
            coverages.push("0%");
        }
        else {
            let coverage = ((totalSlots.length - unassignedSlots.length) / (totalSlots.length)) * 100;
            coverages.push(Math.round(coverage)+"%");
        }
        
    }
    res.send({courses: courses, coverages: coverages});

})

//view teaching assignments
router.route('/view-teaching-assignments')
    .get(async (req, res) => {
        const token = jwt.decode(req.headers.token);
        let hod = await academicMemberModel.findOne({ id: token.id });
        let dep = await departmentModel.findOne({ headOfDepartment: hod.id });
        let course = await courseModel.findOne({ id: req.body.course, department: dep._id });
        if (!course) {
            res.send("No such course");
            return;
        }
        let slots = await slotModel.find({ course: course._id });
        res.send(slots); // all info of slots
    })




module.exports = router;