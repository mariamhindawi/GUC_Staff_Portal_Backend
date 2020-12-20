require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require('fs');
const path = require('path')

const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");
const { annualLeaveModel, accidentalLeaveModel,
    maternityLeaveModel, dayOffChangeModel,
    slotLinkingModel, compensationLeaveModel, sickLeaveModel } = require("../models/request_model")

const router = express.Router();

router.use((req, res, next) => {
    const token = jwt.decode(req.headers.token);
    if (token.role === "TA" || token.role === "Course Coordinator") {
        next();
    }
    else {
        res.status(403).send("Unauthorized access.");
    }
});

router.post('/send-replacement-request', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let config = JSON.parse(fs.readFileSync(path.join(path.dirname(__dirname), 'config.json')));
    let id = (Number.parseInt(config.requestCounter)) + 1;
    config.requestCounter = id;
    const request = new annualLeaveModel({
        id: id,
        requestedBy: token.id,
        day: req.body.day,
        replacementID: req.body.replacementID,
        reason: req.body.reason,
        status: 'Not submitted',
        replacementReply: 'Waiting for reply'
    })
    request.save()
    fs.writeFileSync(path.join(path.dirname(__dirname), 'config.json'), JSON.stringify(config))
    res.send('Request sent')
})

router.get('/replacement-requests', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let myRequests = await annualLeaveModel.find({ requestedBy: token.id, type: "annualLeave" })
    let requested = await annualLeaveModel.find({ replacementID: token.id, type: "annualLeave" })
    res.send({ byMe: myRequests, forMe: requested })
})

router.post('/send-slot-linking-request', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let config = JSON.parse(fs.readFileSync(path.join(path.dirname(__dirname), 'config.json')));
    let id = (Number.parseInt(config.requestCounter)) + 1;
    config.requestCounter = id;
    const request = new slotLinkingModel({
        id: id,
        requestedBy: token.id,
        day: req.body.day,
        slot: req.body.slot
    })
    request.save()
    fs.writeFileSync(path.join(path.dirname(__dirname), 'config.json'), JSON.stringify(config))
    res.send('Request submitted')
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
    request.save()
    fs.writeFileSync(path.join(path.dirname(__dirname), 'config.json'), JSON.stringify(config))
    res.send('Request submitted')
})

router.post('/send-leave-request', async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let config = JSON.parse(fs.readFileSync(path.join(path.dirname(__dirname), 'config.json')));
    let id = (Number.parseInt(config.requestCounter)) + 1;
    config.requestCounter = id;
    let request;
    if (req.body.type === "annualLeave") {
        if (req.body.replacementID) {
            request = await annualLeaveModel.findOne({ id: req.body.id })
            if (request.replacementReply === 'Accepted') {
                request.status = 'Under review'
            }
            else {
                res.send("Your request hasn't been accepted by your colleague")
                return
            }

        }
        else {
            request = new annualLeaveModel({
                id: id,
                requestedBy: token.id,
                day: req.body.day,
                reason: req.body.reason,
                status: 'Under review'
            })
        }
    }
    if (req.body.type === "accidentalLeave") {
        request = new accidentalLeaveModel({
            id: id,
            requestedBy: token.id,
            day: req.body.day,
            reason: req.body.reason
        })
    }
    if (req.body.type === "sickLeave") {
        request = new sickLeaveModel({
            id: id,
            requestedBy: token.id,
            day: req.body.day,
            document: req.body.document,
            reason: req.body.reason
        })
    }
    if (req.body.type === "maternityLeave") {
        request = new maternityLeaveModel({
            id: id,
            requestedBy: token.id,
            day: req.body.day,
            document: req.body.document,
            reason: req.body.reason
        })
    }
    if (req.body.type === "compensationRequest") {
        request = new compensationLeaveModel({
            id: id,
            requestedBy: token.id,
            reason: req.body.reason
        })
    }
    fs.writeFileSync(path.join(path.dirname(__dirname), 'config.json'), JSON.stringify(config))
    request.save()
    res.status(200).send("request submitted")
})

module.exports = router;