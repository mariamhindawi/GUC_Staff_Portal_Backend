require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");

const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");
const slotModel = require("../models/slot_model");
const courseModel = require("../models/course_model");
const { slotLinkingModel } = require("../models/request_model");
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
});

router.put('/slot-linking-requests/:reqId/accept', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    if(isNaN(req.params.id)){
        res.send('Invalid request id')
        return
    }
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
});

router.put('/slot-linking-requests/:reqId/reject', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    if(isNaN(req.params.id)){
        res.send('Invalid request id')
        return
    }
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
    try{
        await request.save()
    }
    catch(error){
        res.send(error)
    }
    let notification = new notificationModel({
        user: request.requestedBy,
        message: 'Your slot-linking request has been rejected.'
    })
    notification.save()
    res.send(request)
});

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
        return;
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
});

router.route('/update-course-slot')
.put( async(req, res) => {
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
        if (updatedRoom.type==="Office") {
            res.send("This room is an Office");
            return;
        }
    }
    if (!room) {
        res.send("There is no room with this name");
        return; 
    }
    
    let slot = await slotModel.findOne({day: req.body.day,room: room._id, slotNumber: req.body.slotNumber});
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
        res.send(slot);
    }
    catch(error) {
        res.send(error);
    }
})

router.route('/delete-course-slot')
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