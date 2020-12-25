const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require('fs');
const path = require('path');

const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const { replacementModel, annualLeaveModel, accidentalLeaveModel,
    maternityLeaveModel, dayOffChangeModel,
    slotLinkingModel, compensationLeaveModel, sickLeaveModel, requestModel } = require("../models/request_model");
const notificationModel = require('../models/notification_model');
const slotModel = require('../models/slot_model')
const roomModel = require('../models/room_model')
const courseModel = require('../models/course_model');

const router = express.Router();

router.use((req, res, next) => {
    const token = jwt.decode(req.headers.token);
    if (token.role !== "HR") {
        next();
    }
    else {
        res.status(403).send("Unauthorized access.");
    }
});

router.route("/update-profile")
.put(async (req,res) => {
    if (!(req.body.email || req.body.office)) {
        res.send("No data entered.");
        return
    }

    const token = jwt.decode(req.headers.token);
    let user = await academicMemberModel.findOne({id: token.id});
    
    if (req.body.email) {
        const mailFormat = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (!req.body.email.match(mailFormat)) {
            res.send("Invalid email address.");
            return;
        }
        
        let otherUser = await hrMemberModel.findOne({email: req.body.email});
        if (!otherUser) {
            otherUser = await academicMemberModel.findOne({email: req.body.email});
        }
        if (otherUser) {
            res.send("Email already exists.");
            return;
        }

        user.email = req.body.email;
    }

    if (req.body.office) {
        var oldOffice = await roomModel.findOne({_id: user.office});
        var newOffice = await roomModel.findOne({name: req.body.office});
        if (!newOffice) {
            res.send("Invalid office name.");
            return;
        }
        if (oldOffice._id.toString() !== newOffice._id.toString()) {
            if (newOffice.type !== "Office") {
                res.send("Room is not an office.");
                return;
            }
            if (newOffice.remainingCapacity === 0) {
                res.send("Office has full capacity.");
                return;
            }
            oldOffice.remainingCapacity++;
            newOffice.remainingCapacity--;
            user.office = newOffice._id;
        }
    }

    try {
        await user.save();
        if (req.body.office && oldOffice._id.toString() !== newOffice._id.toString()) {
            await newOffice.save();
            await oldOffice.save();
        }
        else {
            var newOffice = await roomModel.findOne({_id: user.office});
        }
        res.send({user: user, office: newOffice});
    }
    catch (error) {
        console.log(error.message);
        res.send(error);
    }
});

router.post('/send-replacement-request', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let config = JSON.parse(fs.readFileSync(path.join(path.dirname(__dirname), 'config.json')));
    let id = (Number.parseInt(config.requestCounter)) + 1;
    config.requestCounter = id + "";
    let requester = await academicMemberModel.findOne({ id: token.id })
    if (requester.annualLeaveBalance < 1) {
        res.send('Insufficient leave balance')
        return
    }
    if(!req.body.day || !req.body.day.match(/^([0-2][0-9]|(3)[0-1])(\-)(((0)[0-9])|((1)[0-2]))(\-)\d{4}$/)){
        res.send('Please enter the date in a valid format (dd-mm-yyyy)')
        return
    }
    let parts = req.body.day.split('-')
    let date = new Date(parts[0], parts[1] - 1, parts[2])
    if (date < new Date()) {
        res.send('Please enter a future date')
        return
    }
    let dayNo = date.getDay()
    let weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    let day = weekDays[dayNo];
    if(!req.body.slot || isNaN(req.body.slot)){
        res.send('Please enter a valid slot number')
        return
    }
    const slot = await slotModel.findOne({ staffMember: token.id, day: day, slotNumber: req.body.slot })
    if (!slot) {
        res.send('Invalid slot')
        return
    }
    if(typeof req.body.replacementID !=='string'){
        res.send('Please enter a valid replacement ID')
        return
    }
    let replacement = await academicMemberModel.findOne({ id: req.body.replacementID })
    let course = await courseModel.findOne({ _id: slot.course })
    if (requester.department !== replacement.department || !course.courseInstructors.includes(replacement.id) && !course.teachingAssistants.includes(replacement.id)) {
        res.send('Make sure your replacement teaches this course and is in the same department as you')
        return
    }
    if ((requester.role == 'Teaching Assistant' || requester.role === 'Course Coordinator') && (replacement.role === 'Course Instructor' || replacement.role === 'Head of Department')) {
        res.send('You can not send a replacement request to a course instructor')
        return
    }
    const request = new replacementModel({
        id: id,
        requestedBy: token.id,
        day: req.body.day,
        slot: slot._id,
        replacementID: req.body.replacementID,
        replacementReply: 'Waiting for reply'
    })
    try {
        await request.save()
        fs.writeFileSync(path.join(path.dirname(__dirname), 'config.json'), JSON.stringify(config))
        let notification = new notificationModel({
            user: req.body.replacementID,
            message: 'You have received a replacement request'
        })
        await notification.save()
        res.send('Request sent')
    }
    catch (error) {
        res.send(error)
    }
})

router.put('/replacement-requests/:id/accept', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    if(isNaN(req.params.id)){
        res.send('Invalid request id')
        return
    }
    let request = await replacementModel.findOne({ id: req.params.id, replacementID: token.id })
    if (request && request.type === 'replacementRequest' && request.replacementReply === 'Waiting for reply' && token.id !== request.requestedBy) {
        request.replacementReply = 'Accepted'
        request.save()
        let notification = new notificationModel({
            user: request.requestedBy,
            message: 'Your replacement request has been accepted.'
        })
        notification.save()
        res.send(request)
    }
    else {
        res.send('Invalid request ID')
    }
})

router.put('/replacement-requests/:id/reject', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    if(isNaN(req.params.id)){
        res.send('Invalid request id')
        return
    }
    let request = await replacementModel.findOne({ id: req.params.id, replacementID: token.id })
    if (request && request.type === 'replacementRequest' && request.replacementReply === 'Waiting for reply' && token.id !== request.requestedBy) {
        request.replacementReply = 'Rejected'
        try {
            request.save()
            let notification = new notificationModel({
                user: request.requestedBy,
                message: 'Your replacement request has been rejected.'
            })
            notification.save()
            res.send(request)
        }
        catch (error) {
            res.send(error)
        }
    }
    else {
        res.send('Invalid request ID')
    }
})

router.get('/replacement-requests', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let myRequests = await replacementModel.find({ requestedBy: token.id, type: "replacementRequest" })
    let requestedFromMe = await replacementModel.find({ replacementID: token.id, type: "replacementRequest", replacementReply: 'Waiting for reply' })
    for (let i = 0; i < myRequests.length; i++) {
        let slot = await slotModel.findOne({ _id: myRequests[i].slot })
        myRequests[i].slot = { slotNumber: slot.slotNumber, day: slot.day, course: await courseModel.findOne({ _id: slot.course }) }
    }
    for (let i = 0; i < requestedFromMe.length; i++) {
        let slot = await slotModel.findOne({ _id: requestedFromMe[i].slot })
        requestedFromMe[i].slot = { slotNumber: slot.slotNumber, day: slot.day, course: await courseModel.findOne({ _id: slot.course }) }
    }
    res.send({ byMe: myRequests, forMe: requestedFromMe })
})

router.post('/send-slot-linking-request', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let config = JSON.parse(fs.readFileSync(path.join(path.dirname(__dirname), 'config.json')));
    let requester = await academicMemberModel.findOne({ id: token.id })
    let id = (Number.parseInt(config.requestCounter)) + 1;
    config.requestCounter = id + "";
    if(typeof req.body.room !=='string'){
        res.send('Please enter a valid room name')
        return
    }
    if(isNaN(req.body.slot) || typeof req.body.day !=='string'){
        res.send('Please enter a valid day and slot number')
        return
    }
    let room = await roomModel.findOne({ name: req.body.room })
    let slot = await slotModel.findOne({ day: req.body.day, slotNumber: req.body.slot, room: room._id })
    let course = await courseModel.findOne({ _id: slot.course })
    if (!room) {
        res.send("Room doesn't exist")
        return
    }
    if (!course) {
        res.send("Course doesn't exist")
        return
    }
    if (!course.teachingAssistants.includes(token.id) && !course.courseInstructors.includes(token.id)) {
        res.send('You are not assigned to this course')
        return
    }
    if (!slot) {
        res.send("Slot doesn't exist")
        return
    }
    if (slot.staffMember !== 'Unassigned') {
        res.send("Slot isn't free")
        return
    }
    const prev = await slotLinkingModel.findOne({
        requestedBy: token.id,
        slot: slot._id,
        status: 'Under review'
    })
    if (prev) {
        res.send('Request already submitted')
        return
    }
    const request = new slotLinkingModel({
        id: id,
        requestedBy: token.id,
        slot: slot._id
    })
    try {
        await request.save()
        fs.writeFileSync(path.join(path.dirname(__dirname), 'config.json'), JSON.stringify(config))
        res.send('Request submitted')
    }
    catch (error) {
        res.send(error)
    }
})

router.get('/slot-linking-requests', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let myRequests = await slotLinkingModel.find({ requestedBy: token.id, type: "slotLinkingRequest" })
    for (let i = 0; i < myRequests.length; i++) {
        let slot = await slotModel.findOne({ _id: myRequests[i].slot })
        myRequests[i].slot = { slotNumber: slot.slotNumber, day: slot.day, course: await courseModel.findOne({ _id: slot.course }) }
    }
    res.send(myRequests)
})

router.post('/change-day-off-request', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let config = JSON.parse(fs.readFileSync(path.join(path.dirname(__dirname), 'config.json')));
    let id = (Number.parseInt(config.requestCounter)) + 1;
    config.requestCounter = id + "";
    const request = new dayOffChangeModel({
        id: id,
        requestedBy: token.id,
        dayOff: req.body.dayOff,
        reason: req.body.reason
    })
    try {
        await request.save()
        fs.writeFileSync(path.join(path.dirname(__dirname), 'config.json'), JSON.stringify(config))
        res.send('Request submitted')
    }
    catch (error) {
        res.send(error)
    }
})

router.post('/send-leave-request', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let requester = await academicMemberModel.findOne({ id: token.id })
    let config = JSON.parse(fs.readFileSync(path.join(path.dirname(__dirname), 'config.json')));
    let id = (Number.parseInt(config.requestCounter)) + 1;
    let request;
    if(!req.body.day || !req.body.day.match(/^([0-2][0-9]|(3)[0-1])(\-)(((0)[0-9])|((1)[0-2]))(\-)\d{4}$/)){
        res.send('Please enter the date in a valid format (dd-mm-yyyy)')
        return
    }
    let parts = req.body.day.split('-')
    let date = new Date(parts[0], parts[1] - 1, parts[2])
    if(typeof req.body.type !=='string'){
        res.send('Invalid leave type')
        return
    }
    const prev = await annualLeaveModel.findOne({ day: { $lt: date.addDays(1), $gte: date }, requestedBy: token.id, type: req.body.type })
    if (prev) {
        res.send('Request already exists')
        return
    }
    if (req.body.type === "annualLeave") {
        if (date < new Date()) {
            res.send('Please enter a future date')
            return
        }
        if (requester.annualLeaveBalance < 1) {
            res.send('Insufficient leave balance')
            return
        }
        let dayNo = date.getDay()
        let weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        let day = weekDays[dayNo];
        let slots = await slotModel.find({ staffMember: token.id, day: day })
        let slotIDs = slots.map(slot => slot._id.toString())
        let replacementRequests = await replacementModel.find({ requestedBy: token.id, day: { $gte: date, $lt: date.addDays(1) }, replacementReply: 'Accepted' })
        let replacements = []
        for (let i = 0; i < slots.length; i++) {
            replacements.push(null)
        }
        for (let i = 0; i < replacementRequests.length; i++) {
            let index = slotIDs.indexOf(replacementRequests[i].slot)
            replacements[index] = replacementRequests[i].replacementID
        }
        request = new annualLeaveModel({
            id: id,
            requestedBy: token.id,
            day: req.body.day,
            slots: slots,
            replacementIDs: replacements,
            reason: req.body.reason
        })
    }
    else if (req.body.type === "accidentalLeave") {
        if (date > new Date()) {
            res.send('Please enter a valid date')
            return
        }
        if (requester.annualLeaveBalance >= 1 && requester.accidentalLeaveBalance >= 1)
            request = new accidentalLeaveModel({
                id: id,
                requestedBy: token.id,
                day: req.body.day,
                reason: req.body.reason
            })
        else {
            res.send('Insufficient leave/accidental leave balance')
            return
        }
    }
    else if (req.body.type === "sickLeave") {
        if (date > new Date()) {
            res.send('Please enter a valid date')
            return
        }
        let parts = req.body.day.split('-')
        let myDate = new Date(parts[0], parts[1] - 1, parts[2], 23);
        if (myDate.addDays(3) >= new Date())
            request = new sickLeaveModel({
                id: id,
                requestedBy: token.id,
                day: req.body.day,
                document: req.body.document,
                reason: req.body.reason
            })
        else {
            res.send('Deadline for submitting this request has passed')
            return
        }
    }
    else if (req.body.type === "maternityLeave") {
        let requester = await academicMemberModel.findOne({ id: token.id })
        if (isNaN(req.body.duration) || req.body.duration > 90) {
            res.send("Please enter a valid leave duration. Maximum duration is 90 days.")
            return
        }
        if (requester.gender === 'Female')
            request = new maternityLeaveModel({
                id: id,
                requestedBy: token.id,
                day: req.body.day,
                duration: req.body.duration,
                document: req.body.document,
                reason: req.body.reason
            })
        else {
            res.send("You can't apply for a maternity leave")
            return
        }
    }
    else if (req.body.type === "compensationRequest") {
        if (date > new Date()) {
            res.send('Please enter a valid date')
            return
        }
        request = new compensationLeaveModel({
            id: id,
            day: req.body.day,
            requestedBy: token.id,
            reason: req.body.reason
        })
    }
    else{
        res.send('Invalid leave request type')
        return
    }
    try {
        await request.save()
        config.requestCounter = id + "";
        fs.writeFileSync(path.join(path.dirname(__dirname), 'config.json'), JSON.stringify(config))
        res.status(200).send("Request submitted for review to the HOD")
    }
    catch (error) {
        res.send(error)
    }
})

router.get('/all-requests/:filter', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let requests = [];
    if (req.params.filter === 'All')
        requests = await requestModel.find({ requestedBy: token.id })
    if (req.params.filter === 'Accepted')
        requests = await requestModel.find({ requestedBy: token.id, status: 'Accepted' })
    if (req.params.filter === 'Rejected')
        requests = await requestModel.find({ requestedBy: token.id, status: 'Rejected' })
    if (req.params.filter === 'Pending') {
        requests = await requestModel.find({ requestedBy: token.id, status: 'Under review' })

    }

    res.send(requests);
})

router.delete('/cancel-request/:id', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    if(isNaN(req.params.id)){
        res.send('Invalid request ID')
        return
    }
    let request = await requestModel.findOne({ requestedBy: token.id, id: req.params.id })
    if(!request){
        res.send("Request doesn't exist")
        return
    }
    if (request.status === 'Under review') {
        await requestModel.deleteOne({ requestedBy: token.id, id: req.params.id })
        res.send('Your request has been cancelled successfully')
    }
    else if(request.type!=='dayOffChangeRequest' && request.type!=='slotLinkingRequest' && request.day > new Date()){
        if(request.type==='annualLeave' ){
            let requester = await academicMemberModel.findOne({id:token.id})
            requester.annualLeaveBalance+=1
            requester.save()
        }
        if(request.type ==='accidentalLeave'){
            let requester = await academicMemberModel.findOne({id:token.id})
            requester.annualLeaveBalance+=1
            requester.accidentalLeaveBalance+=1
            requester.save()
        }
        await requestModel.deleteOne({ requestedBy: token.id, id: req.params.id })
        res.send('Your request has been cancelled successfully')
    }
    else {
        res.send('Cannot cancel request')
    }
})

Date.prototype.addDays = function (days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

module.exports = router;