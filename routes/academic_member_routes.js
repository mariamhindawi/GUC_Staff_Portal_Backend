const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require('fs');
const path = require('path');

const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");
const { annualLeaveModel, accidentalLeaveModel,
    maternityLeaveModel, dayOffChangeModel,
    slotLinkingModel, compensationLeaveModel, sickLeaveModel } = require("../models/request_model");
const notificationModel = require('../models/notification_model');
const slotModel = require('../models/slot_model')

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
        if (oldOffice._id !== newOffice._id) {
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
        if (req.body.office && oldOffice._id !== newOffice._id) {
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

router.get('/schedule', async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let schedule = await slotModel.find({staffMember:token.id})
    //TODO: add replacement requests slots
    await annualLeaveModel.find({replacementID:token.id})
    res.send()
});

router.post('/send-replacement-request', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let config = JSON.parse(fs.readFileSync(path.join(path.dirname(__dirname), 'config.json')));
    let id = (Number.parseInt(config.requestCounter)) + 1;
    config.requestCounter = id + "";
    let requester = await academicMemberModel.findOne({ id: token.id })
    console.log(requester)
    if (requester.annualLeaveBalance < 1) {
        res.send('Insufficient leave balance')
        return
    }
    const request = new annualLeaveModel({
        id: id,
        requestedBy: token.id,
        day: req.body.day,
        slot:req.body.slot,
        replacementID: req.body.replacementID,
        reason: req.body.reason,
        status: 'Not submitted',
        replacementReply: 'Waiting for reply'
    })
    try {
        request.save()
        fs.writeFileSync(path.join(path.dirname(__dirname), 'config.json'), JSON.stringify(config))
        let notification = new notificationModel({
            user:req.body.replacementID,
            message: 'You have received a replacement request'
        })
        notification.save()
        res.send('Request sent')
    }
    catch (error) {
        res.send(error)
    }
})

router.get('/replacement-requests', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let myRequests = await annualLeaveModel.find({ requestedBy: token.id, type: "annualLeave" })
    let requested = await annualLeaveModel.find({ replacementID: token.id, type: "annualLeave", replacementReply: 'Waiting for reply' })
    res.send({ byMe: myRequests, forMe: requested })
})

router.post('/replacement-requests/:id/accept', async (req, res) => {
    let request = await annualLeaveModel.findOne({ id: req.params.id })
    if (request.type === 'annualLeave' && request.replacementReply==='Waiting for reply') {
        request.replacementReply = 'Accepted'
        request.status = 'Under review'
        request.save()
        let notification = new notificationModel({
            user:request.requestedBy,
            message: 'Your replacement request has been accepted. You can now send it to your HOD'
        })
        notification.save()
        res.send(request)
    }
    else {
        res.send('Invalid request ID')
    }
})

router.post('/replacement-requests/:id/reject', async (req, res) => {
    let request = await annualLeaveModel.findOne({ id: req.params.id })
    if (request.type === 'annualLeave' && request.replacementReply==='Waiting for reply') {
        request.replacementReply = 'Rejected'
        try {
            request.save()
            let notification = new notificationModel({
                user:request.requestedBy,
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

router.post('/send-slot-linking-request', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let config = JSON.parse(fs.readFileSync(path.join(path.dirname(__dirname), 'config.json')));
    let id = (Number.parseInt(config.requestCounter)) + 1;
    config.requestCounter = id +"";
    const prev = await slotLinkingModel.findOne({
        requestedBy: token.id,
        day: req.body.day,
        slot: req.body.slot,
        course: req.body.course,
        room:req.body.room})
    if(prev){
        res.send('Request already submitted')
        return
    }
    const request = new slotLinkingModel({
        id: id,
        requestedBy: token.id,
        day: req.body.day,
        slot: req.body.slot,
        course: req.body.course,
        room:req.body.room
    })
    try {
        request.save()
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
    res.send(myRequests)
})

router.post('/change-day-off-request', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let config = JSON.parse(fs.readFileSync(path.join(path.dirname(__dirname), 'config.json')));
    let id = (Number.parseInt(config.requestCounter)) + 1;
    config.requestCounter = id;
    const request = new dayOffChangeModel({
        id: id,
        requestedBy: token.id,
        dayOff: req.body.dayOff,
        reason: req.body.reason
    })
    try {
        request.save()
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
    if (req.body.type === "annualLeave") {
        if (req.body.id) {
            request = await annualLeaveModel.findOne({ requestedBy:token.id,id: req.body.id })
            if (request.replacementReply === 'Accepted') {
                request.status = 'Under review'
            }
            else {
                res.send("Your request hasn't been accepted by your colleague")
                return
            }

        }
        else {
            if (requester.annualLeaveBalance >= 1)
                request = new annualLeaveModel({
                    id: id,
                    requestedBy: token.id,
                    day: req.body.day,
                    slot:req.body.slot,
                    reason: req.body.reason,
                    status: 'Under review'
                })
            else {
                res.send('Insufficient leave balance')
                return
            }
        }
    }
    if (req.body.type === "accidentalLeave") {
        console.log(requester)
        if (requester.annualLeaveBalance > 1 && requester.accidentalLeaveBalance > 1)
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
    if (req.body.type === "sickLeave") {
        let parts = req.body.day.split('/')
        let myDate = new Date(parts[2], parts[1] - 1, Number.parseInt(parts[0]) + 3, 2);
        if (myDate > new Date().setHours(0))
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
    if (req.body.type === "maternityLeave") {
        let requester = await academicMemberModel.findOne({ id: token.id })
        if (req.body.duration > 90) {
            res.send("Maximum leave duration is 90 days")
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
    if (req.body.type === "compensationRequest") {
        request = new compensationLeaveModel({
            id: id,
            day: req.body.day,
            requestedBy: token.id,
            reason: req.body.reason
        })
    }
    config.requestCounter = id+"";
    fs.writeFileSync(path.join(path.dirname(__dirname), 'config.json'), JSON.stringify(config))
    try {
        request.save()
        res.status(200).send("Request submitted for review to the HOD")
    }
    catch (error) {
        res.send(error)
    }
})

router.get('/all-requests/:filter', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let requests;
    if (req.params.filter === 'All')
        requests = await annualLeaveModel.find({ requestedBy: token.id })
    if (req.params.filter === 'Accepted')
        requests = await annualLeaveModel.find({ requestedBy: token.id, status: 'Accepted' })
    if (req.params.filter === 'Rejected')
        requests = await annualLeaveModel.find({ requestedBy: token.id, status: 'Rejected' })
    if (req.params.filter === 'Pending')
        requests = await annualLeaveModel.find({ $or: [{ requestedBy: token.id, status: 'Under review' }, { requestedBy: token.id, status: 'Not submitted' }] })

    res.send(requests);
})

router.get('/cancel-request/:id', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let request = await annualLeaveModel.findOne({ requestedBy: token.id, id: req.params.id })
    let parts = request.day.split('/')
    let myDate = new Date(parts[2], parts[1] - 1, Number.parseInt(parts[0]), 2);
    if (myDate < new Date() || request.status !== 'Accepted' || request.status !== 'Rejected') {
        await annualLeaveModel.deleteOne({ requestedBy: token.id, id: req.params.id })
    }
    else {
        res.send('Cannot cancel request')
        return
    }
    res.send('Your request has been cancelled successfully')
})

module.exports = router;