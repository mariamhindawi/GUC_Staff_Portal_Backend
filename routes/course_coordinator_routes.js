require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");
const requestModel = require('../models/request_model');
const courseModel = require("../models/course_model");
const { annualLeaveModel, accidentalLeaveModel,
    maternityLeaveModel, dayOffChangeModel,
    slotLinkingModel, compensationLeaveModel, sickLeaveModel } = require("../models/request_model");
const { response } = require("express");
const slotModel = require('../models/slot_model')
const notificationModel=require('../models/notification_model')

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

router.put('/slot-linking-requests/:reqId/accept', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let request = await slotLinkingModel.findOne({ id: req.params.reqId })
    let slot = await slotModel.findOne({ _id: request.slot })
    let course = await courseModel.findOne({ _id: slot.course })
    if (token.id !== course.courseCoordinator) {
        res.send('Invalid credentials')
        return
    }
    if (request.status === 'Accepted' || request.status === 'Rejected') {
        res.send('Already replied to request')
        return
    }
    if (slot.staffMember !== 'Unassigned') {
        request.status = 'Rejected'
        request.ccComment = 'Slot was assigned to another staff member'
        let notification = new notificationModel({
            user: request.requestedBy,
            message: 'Your slot-linking request request has been rejected.'
        })
        notification.save()
    }
    else {
        request.status = 'Accepted'
        slot.staffMember = request.requestedBy
        slot.save()
        let notification = new notificationModel({
            user: request.requestedBy,
            message: 'Your slot-linking request request has been accepted.'
        })
        notification.save()
    }
    request.save()
    res.send(request)
})

router.put('/slot-linking-requests/:reqId/reject', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let request = await slotLinkingModel.findOne({ id: req.params.reqId })
    let slot = await slotModel.findOne({ _id: request.slot })
    let course = await courseModel.findOne({ _id: slot.course })
    if (token.id !== course.courseCoordinator) {
        res.send('Invalid credentials')
        return
    }
    if (request.status === 'Accepted' || request.status === 'Rejected') {
        res.send('Already replied to request')
        return
    }
    request.status = 'Rejected'
    request.ccComment = req.body.ccComment
    request.save()
    let notification = new notificationModel({
        user: request.requestedBy,
        message: 'Your slot-linking request request has been rejected.'
    })
    notification.save()
    res.send(request)
})

router.get('/slot-linking-requests', async (req, res) => {
    const token = jwt.decode(req.headers.token)
    let slots = await slotModel.find()
    let courses = await courseModel.find({ courseCoordinator: token.id })
    let myCourseSlots = slots.filter(slot => courses.map(course => course._id.toString()).includes(slot.course))
    let myCourseSlotsids = myCourseSlots.map(slot=>slot._id.toString())
    let allRequests = await slotLinkingModel.find({ type: 'slotLinkingRequest', status:'Under review' })
    let myRequests = allRequests.filter(request=>myCourseSlotsids.includes(request.slot))
    for(let i=0;i<myRequests.length;i++){
        myRequests[i].slot= await slotModel.findOne({_id:myRequests[i].slot})
    }
    res.send(myRequests)
})

module.exports = router;