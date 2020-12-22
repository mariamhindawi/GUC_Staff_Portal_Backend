require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");
const slotModel = require("../models/slot_model");
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

router.route('/add-course-slot')
.post ( async(req,res) => {
    const token = jwt.decode(req.headers.token);
    let academicMember = await academicMemberModel.findOne({id: token.id});
    let course = await courseModel.findOne({id: req.body.course});
    if(!(course.courseCoordinator === academicMember.id)) {
        res.send("Invalid creditentials");
        return;
    }
    let room = await roomModel.findOne({name: req.body.room});
    if (!room) {
        res.send("Not a valid room");
        return;
    }
    if (!(room.type===req.body.type)) {
        res.send("room type and slot type do not match");
        return;
    }
    let slot = await slotModel.findOne({day: req.body.day,slotNumber: req.body.slotNumber,room: room._id});
    if (slot) {
        res.send("This slot is occupied");
    }
    const newSlot = new slotModel({
        day: req.body.day,
        slotNumber: req.body.slotNumber,
        room: room._id,
        course: course._id,
        type: req.body.type
    })
    try {
        await newSlot.save();
        res.send(newSlot);
    }
    catch(error) {
        res.send(error);
    }

    
})

router.route('/update-course-slot')
.put( async(req,res) => {
    const token = jwt.decode(req.headers.token);
    let academicMember = await academicMemberModel.findOne({id: token.id});
    let course = await courseModel.findOne({id: req.body.course});
    if(!(course.courseCoordinator === academicMember.id)) {
        res.send("Invalid creditentials");
        return;
    }
    let room = await roomModel.findOne({name: req.body.room});
    if (req.body.updatedRoom) {
        let updatedRoom = await roomModel.findOne({name: req.body.updatedRoom});
        if(!updatedRoom) {
            res.send("The updated Room's name is incorrect");
            return;
        }
    }
    if (!room) {
        res.send("There is no room with this name");
        return; 
    }
    
    let slot = await slotModel.findOne({day: req.body.day,room: room._id,slotNumber: req.body.slotNumber});
    console.log(slot);
    if (!slot) {
        res.send("No slot to update");
        return;
    }
    if (req.body.updatedDay) {
        if (req.body.updatedRoom) {
            if (req.body.updatedSlotNumber) {
                let updatedRoom = await roomModel.findOne({name: req.body.updatedRoom});
                let updatedSlot = await slotModel.findOne({day: req.body.updatedDay, room: updatedRoom._id, slotNumber: req.body.updatedSlotNumber});
                if (updatedSlot) {
                    res.send("This slot is occupied. Try another slot");
                    return;
                }
            }
        }
    }
    if (req.body.updatedDay) { 
        slot.day = req.body.updatedDay;
    }
    if (req.body.updatedRoom) {
        let updatedRoom = await roomModel.findOne({name: req.body.updatedRoom});
        slot.room = updatedRoom._id;
    }
    if (req.body.updatedSlotNumber) {
        slot.slotNumber = req.body.updatedSlotNumber;
    }
    if (req.body.updatedType) {
        slot.type = req.body.updatedType;
    }
    try {
        await slot.save();
    }
    catch(error) {
        res.body.send(error);
    }
})

router.route('delete-course-slot')
.delete( async(req,res) => {
    const token = jwt.decode(req.headers.token);
    let academicMember = await academicMemberModel.findOne({id: token.id});
    let course = await courseModel.findOne({id: req.body.id});
    if(!(course.courseCoordinator === academicMember.id)) {
        res.send("Invalid creditentials");
        return;
    }
    let room = await roomModel.findOne({name: req.body.room});
    let slot = await slotModel.findOne({day: req.body.day,room: room._id,slotNumber: req.body.slotNumber});
    if (!slot) {
        res.send("No slot to delete");
        return;
    }
    await slotModel.findOneAndDelete({day: req.body.day,room: room._id,slotNumber: req.body.slotNumber});
    res.send("Deleted Slot: "+ slot);
})


module.exports = router;