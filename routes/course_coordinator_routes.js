require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");
const requestModel=require('../models/request_model');
const courseModel = require("../models/course_model");
const { annualLeaveModel, accidentalLeaveModel,
    maternityLeaveModel, dayOffChangeModel,
    slotLinkingModel, compensationLeaveModel, sickLeaveModel } = require("../models/request_model");
const { response } = require("express");

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

router.post('/slot-linking-requests/:reqId/accept',async(req,res)=>{
    let request = await annualLeaveModel.findOne({id:req.params.reqId})
    request.status='Accepted'
    request.save()
    let notification = new notificationModel({
        user:request.requestedBy,
        message: 'Your slot-linking request request has been accepted.'
    })
    notification.save()
    //TODO: execute appropriate logic and add to notifications

})

router.post('/slot-linking-requests/:reqId/reject',async(req,res)=>{
    let request = await annualLeaveModel.findOne({id:req.params.reqId})
    request.status='Rejected'
    request.ccComment = req.body.ccComment
    request.save()
    let notification = new notificationModel({
        user:request.requestedBy,
        message: 'Your slot-linking request request has been rejected.'
    })
    notification.save()
    response.send(request)
})

router.get('/slot-linking-requests',async(req,res)=>{
    const token = jwt.decode(req.headers.token)
    let course = await courseModel.findOne({courseCoordinator:token.id})
    let requests = await requestModel.find({type:'slot-linking', course:course.id})
    res.send(requests)
})

module.exports = router;