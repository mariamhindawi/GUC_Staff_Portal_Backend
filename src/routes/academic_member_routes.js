const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");
const courseModel = require("../models/course_model");
const slotModel = require("../models/slot_model");
const notificationModel = require("../models/notification_model");
const { replacementModel, annualLeaveModel, accidentalLeaveModel,
  maternityLeaveModel, dayOffChangeModel,
  slotLinkingModel, compensationLeaveModel, sickLeaveModel, requestModel } = require("../models/request_model");

const router = express.Router();

router.use((req, res, next) => {
  const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
  if (authAccessToken.role !== "HR") {
    next();
  }
  else {
    res.status(403).send("Unauthorized access.");
  }
});

router.post("/send-replacement-request", async (req, res) => {
  const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
  let config = JSON.parse(fs.readFileSync(path.join(path.dirname(__dirname), "config.json")));
  let id = (Number.parseInt(config.requestCounter)) + 1;
  config.requestCounter = id + "";
  let requester = await academicMemberModel.findOne({ id: authAccessToken.id });
  if (requester.annualLeaveBalance < 1) {
    res.status(403).send("Insufficient leave balance");
    return;
  }
  if (!req.body.day || !(/^\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])$/).test(req.body.day)) {
    res.status(403).send("Please enter the date in a valid format (yyyy-mm-dd)");
    return;
  }
  let parts = req.body.day.split("-");
  let date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (date < new Date()) {
    res.status(403).send("Please enter a future date");
    return;
  }
  let dayNo = date.getDay();
  let weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  let day = weekDays[dayNo];
  if (!req.body.slot || isNaN(req.body.slot)) {
    res.status(403).send("Please enter a valid slot number");
    return;
  }
  const slot = await slotModel.findOne({ staffMember: authAccessToken.id, day: day, slotNumber: req.body.slot });
  if (!slot) {
    res.status(403).send("Invalid slot");
    return;
  }
  if (typeof req.body.replacementID !== "string") {
    res.status(403).send("Please enter a valid replacement ID");
    return;
  }
  let replacement = await academicMemberModel.findOne({ id: req.body.replacementID });
  let course = await courseModel.findOne({ _id: slot.course });
  if (requester.department !== replacement.department || !course.courseInstructors.includes(replacement.id) && !course.teachingAssistants.includes(replacement.id)) {
    res.status(403).send("Make sure your replacement teaches this course and is in the same department as you");
    return;
  }
  if ((requester.role == "Teaching Assistant" || requester.role === "Course Coordinator") && (replacement.role === "Course Instructor" || replacement.role === "Head of Department")) {
    res.status(403).send("You cannot send a replacement request to a course instructor");
    return;
  }
  const request = new replacementModel({
    id: id,
    requestedBy: authAccessToken.id,
    day: req.body.day,
    slot: slot._id,
    replacementID: req.body.replacementID,
    replacementReply: "Waiting for reply"
  });
  try {
    await request.save();
    fs.writeFileSync(path.join(path.dirname(__dirname), "config.json"), JSON.stringify(config));
    let notification = new notificationModel({
      user: req.body.replacementID,
      message: "You have received a replacement request"
    });
    await notification.save();
    res.send("Request sent");
  }
  catch (error) {
    res.status(403).send(error);
  }
});

router.put("/replacement-requests/:id/accept", async (req, res) => {
  const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
  if (isNaN(req.params.id)) {
    res.status(403).send("Invalid request id");
    return;
  }
  let request = await replacementModel.findOne({ id: req.params.id, replacementID: authAccessToken.id });
  if (request && request.type === "replacementRequest" && request.replacementReply === "Waiting for reply" && authAccessToken.id !== request.requestedBy) {
    request.replacementReply = "Accepted";
    request.save();
    let notification = new notificationModel({
      user: request.requestedBy,
      message: "Your replacement request has been accepted."
    });
    notification.save();
    res.send(request);
  }
  else {
    res.status(403).send("Invalid request ID");
  }
});

router.put("/replacement-requests/:id/reject", async (req, res) => {
  const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
  if (isNaN(req.params.id)) {
    res.status(403).send("Invalid request id");
    return;
  }
  let request = await replacementModel.findOne({ id: req.params.id, replacementID: authAccessToken.id });
  if (request && request.type === "replacementRequest" && request.replacementReply === "Waiting for reply" && authAccessToken.id !== request.requestedBy) {
    request.replacementReply = "Rejected";
    try {
      request.save();
      let notification = new notificationModel({
        user: request.requestedBy,
        message: "Your replacement request has been rejected."
      });
      notification.save();
      res.send(request);
    }
    catch (error) {
      res.status(403).send(error);
    }
  }
  else {
    res.status(403).send("Invalid request ID");
  }
});

router.get("/replacement-requests", async (req, res) => {
  const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
  let myRequests = await replacementModel.find({ requestedBy: authAccessToken.id, type: "replacementRequest" });
  let requestedFromMe = await replacementModel.find({ replacementID: authAccessToken.id, type: "replacementRequest", replacementReply: "Waiting for reply" });
  for (let i = 0; i < myRequests.length; i++) {
    let slot = await slotModel.findOne({ _id: myRequests[i].slot });
    myRequests[i].slot = { slotNumber: slot.slotNumber, day: slot.day, course: await courseModel.findOne({ _id: slot.course }) };
  }
  for (let i = 0; i < requestedFromMe.length; i++) {
    let slot = await slotModel.findOne({ _id: requestedFromMe[i].slot });
    requestedFromMe[i].slot = { slotNumber: slot.slotNumber, day: slot.day, course: await courseModel.findOne({ _id: slot.course }) };
  }
  res.send({ byMe: myRequests, forMe: requestedFromMe });
});

router.post("/send-slot-linking-request", async (req, res) => {
  const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
  let config = JSON.parse(fs.readFileSync(path.join(path.dirname(__dirname), "config.json")));
  let requester = await academicMemberModel.findOne({ id: authAccessToken.id });
  let id = (Number.parseInt(config.requestCounter)) + 1;
  config.requestCounter = id + "";
  if (typeof req.body.room !== "string") {
    res.status(403).send("Please enter a valid room name");
    return;
  }
  if (isNaN(req.body.slot) || typeof req.body.day !== "string") {
    res.status(403).send("Please enter a valid day and slot number");
    return;
  }
  let room = await roomModel.findOne({ name: req.body.room });
  let slot = await slotModel.findOne({ day: req.body.day, slotNumber: req.body.slot, room: room._id });
  let course = await courseModel.findOne({ _id: slot.course });
  if (!room) {
    res.status(403).send("Room does not exist");
    return;
  }
  if (!course) {
    res.status(403).send("Course does not exist");
    return;
  }
  if (!course.teachingAssistants.includes(authAccessToken.id) && !course.courseInstructors.includes(authAccessToken.id)) {
    res.status(403).send("You are not assigned to this course");
    return;
  }
  if (!slot) {
    res.status(403).send("Slot does not exist");
    return;
  }
  if (slot.staffMember !== "UNASSIGNED") {
    res.status(403).send("Slot is not free");
    return;
  }
  const prev = await slotLinkingModel.findOne({
    requestedBy: authAccessToken.id,
    slot: slot._id,
    status: "Under review"
  });
  if (prev) {
    res.status(403).send("Request already submitted");
    return;
  }
  const request = new slotLinkingModel({
    id: id,
    requestedBy: authAccessToken.id,
    slot: slot._id
  });
  try {
    await request.save();
    fs.writeFileSync(path.join(path.dirname(__dirname), "config.json"), JSON.stringify(config));
    res.send("Request submitted");
  }
  catch (error) {
    res.status(403).send(error);
  }
});

router.get("/slot-linking-requests", async (req, res) => {
  const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
  let myRequests = await slotLinkingModel.find({ requestedBy: authAccessToken.id, type: "slotLinkingRequest" });
  for (let i = 0; i < myRequests.length; i++) {
    let slot = await slotModel.findOne({ _id: myRequests[i].slot });
    myRequests[i].slot = { slotNumber: slot.slotNumber, day: slot.day, course: await courseModel.findOne({ _id: slot.course }) };
  }
  res.send(myRequests);
});

router.post("/change-day-off-request", async (req, res) => {
  const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
  let config = JSON.parse(fs.readFileSync(path.join(path.dirname(__dirname), "config.json")));
  let id = (Number.parseInt(config.requestCounter)) + 1;
  config.requestCounter = id + "";
  const request = new dayOffChangeModel({
    id: id,
    requestedBy: authAccessToken.id,
    dayOff: req.body.dayOff,
    reason: req.body.reason
  });
  try {
    await request.save();
    fs.writeFileSync(path.join(path.dirname(__dirname), "config.json"), JSON.stringify(config));
    res.send("Request submitted");
  }
  catch (error) {
    res.status(403).send(error);
  }
});

router.post("/send-leave-request", async (req, res) => {
  const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
  let requester = await academicMemberModel.findOne({ id: authAccessToken.id });
  let config = JSON.parse(fs.readFileSync(path.join(path.dirname(__dirname), "config.json")));
  let id = (Number.parseInt(config.requestCounter)) + 1;
  let request;
  if (!req.body.day || !(/^\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])$/).test(req.body.day)) {
    res.status(403).send("Please enter the date in a valid format (yyyy-mm-dd)");
    return;
  }
  let parts = req.body.day.split("-");
  let date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (typeof req.body.type !== "string") {
    res.status(403).send("Invalid leave type");
    return;
  }
  const prev = await annualLeaveModel.findOne({ day: { $lt: date.addDays(1), $gte: date }, requestedBy: authAccessToken.id, type: req.body.type });
  if (prev) {
    res.status(403).send("Request already exists");
    return;
  }
  if (req.body.type === "annualLeave") {
    if (date < new Date()) {
      res.status(403).send("Please enter a future date");
      return;
    }
    if (requester.annualLeaveBalance < 1) {
      res.status(403).send("Insufficient leave balance");
      return;
    }
    let dayNo = date.getDay();
    let weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let day = weekDays[dayNo];
    let slots = await slotModel.find({ staffMember: authAccessToken.id, day: day });
    let slotIDs = slots.map(slot => slot._id.toString());
    let replacementRequests = await replacementModel.find({ requestedBy: authAccessToken.id, day: { $gte: date, $lt: date.addDays(1) }, replacementReply: "Accepted" });
    let replacements = [];
    for (let i = 0; i < slots.length; i++) {
      replacements.push(null);
    }
    for (let i = 0; i < replacementRequests.length; i++) {
      let index = slotIDs.indexOf(replacementRequests[i].slot);
      replacements[index] = replacementRequests[i].replacementID;
    }
    request = new annualLeaveModel({
      id: id,
      requestedBy: authAccessToken.id,
      day: req.body.day,
      slots: slots,
      replacementIDs: replacements,
      reason: req.body.reason
    });
  }
  else if (req.body.type === "accidentalLeave") {
    if (date > new Date()) {
      res.status(403).send("Please enter a valid date");
      return;
    }
    if (requester.annualLeaveBalance >= 1 && requester.accidentalLeaveBalance >= 1)
      request = new accidentalLeaveModel({
        id: id,
        requestedBy: authAccessToken.id,
        day: req.body.day,
        reason: req.body.reason
      });
    else {
      res.status(403).send("Insufficient leave/accidental leave balance");
      return;
    }
  }
  else if (req.body.type === "sickLeave") {
    if (date > new Date()) {
      res.status(403).send("Please enter a valid date");
      return;
    }
    let parts = req.body.day.split("-");
    let myDate = new Date(parts[0], parts[1] - 1, parts[2]);
    if (myDate.addDays(3) >= new Date())
      request = new sickLeaveModel({
        id: id,
        requestedBy: authAccessToken.id,
        day: req.body.day,
        document: req.body.document,
        reason: req.body.reason
      });
    else {
      res.status(403).send("Deadline for submitting this request has passed");
      return;
    }
  }
  else if (req.body.type === "maternityLeave") {
    let requester = await academicMemberModel.findOne({ id: authAccessToken.id });
    if (isNaN(req.body.duration) || req.body.duration > 90) {
      res.status(403).send("Please enter a valid leave duration. Maximum duration is 90 days.");
      return;
    }
    if (requester.gender === "Female")
      request = new maternityLeaveModel({
        id: id,
        requestedBy: authAccessToken.id,
        day: req.body.day,
        duration: req.body.duration,
        document: req.body.document,
        reason: req.body.reason
      });
    else {
      res.status(403).send("You cannot apply for a maternity leave");
      return;
    }
  }
  else if (req.body.type === "compensationRequest") {
    if (date > new Date()) {
      res.status(403).send("Please enter a valid date");
      return;
    }
    request = new compensationLeaveModel({
      id: id,
      day: req.body.day,
      requestedBy: authAccessToken.id,
      reason: req.body.reason
    });
  }
  else {
    res.status(403).send("Invalid leave request type");
    return;
  }
  try {
    await request.save();
    config.requestCounter = id + "";
    fs.writeFileSync(path.join(path.dirname(__dirname), "config.json"), JSON.stringify(config));
    res.status(200).send("Request submitted for review to the HOD");
  }
  catch (error) {
    res.status(403).send(error);
  }
});

router.get("/all-requests/:filter", async (req, res) => {
  const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
  let requests = [];
  if (req.params.filter === "All")
    requests = await requestModel.find({ requestedBy: authAccessToken.id });
  if (req.params.filter === "Accepted")
    requests = await requestModel.find({ requestedBy: authAccessToken.id, status: "Accepted" });
  if (req.params.filter === "Rejected")
    requests = await requestModel.find({ requestedBy: authAccessToken.id, status: "Rejected" });
  if (req.params.filter === "Pending") {
    requests = await requestModel.find({ requestedBy: authAccessToken.id, status: "Under review" });

  }

  res.send(requests);
});

router.delete("/cancel-request/:id", async (req, res) => {
  const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
  if (isNaN(req.params.id)) {
    res.status(403).send("Invalid request ID");
    return;
  }
  let request = await annualLeaveModel.findOne({ requestedBy: authAccessToken.id, id: req.params.id });
  if (!request) {
    res.status(403).send("Request does not exist");
    return;
  }
  if (request.status === "Under review") {
    await requestModel.deleteOne({ requestedBy: authAccessToken.id, id: req.params.id });
    res.send("Your request has been cancelled successfully");
  }
  else if (request.type !== "dayOffChangeRequest" && request.type !== "slotLinkingRequest" && request.day > new Date()) {
    if (request.type === "annualLeave") {
      let requester = await academicMemberModel.findOne({ id: authAccessToken.id });
      requester.annualLeaveBalance += 1;
      requester.save();
      await replacementModel.deleteMany({ requestedBy: authAccessToken.id, type: "replacementRequest", day: { $lt: request.day.addDays(1), $gte: request.day } });
    }
    if (request.type === "accidentalLeave") {
      let requester = await academicMemberModel.findOne({ id: authAccessToken.id });
      requester.annualLeaveBalance += 1;
      requester.accidentalLeaveBalance += 1;
      requester.save();
    }
    await requestModel.deleteOne({ requestedBy: authAccessToken.id, id: req.params.id });
    res.send("Your request has been cancelled successfully");
  }
  else {
    res.status(403).send("Cannot cancel request");
  }
});

router.get("/schedule", async (req, res) => {
  const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
  let schedule = await slotModel.find({ staffMember: authAccessToken.id });
  let date = new Date();
  let replacementRequests = await annualLeaveModel.find({ type: "annualLeave", replacementIDs: authAccessToken.id, status: "Accepted", day: { $lt: date.addDays(7), $gte: date } });
  for (let i = 0; i < replacementRequests.length; i++) {
    for (let j = 0; j < replacementRequests[i].replacementIDs.length; j++) {
      if (replacementRequests[i].replacementIDs[j] === authAccessToken.id) {
        schedule.push(replacementRequests[i].slots[j]);
      }
    }
  }
  for (let i = 0; i < schedule.length; i++) {
    let room = await roomModel.findById(schedule[i].room);
    schedule[i].room = room.name;
    let course = await courseModel.findById(schedule[i].course);
    schedule[i].course = course.name;
  }
  res.send(schedule);
});

Date.prototype.addDays = function (days) {
  var date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
};

module.exports = router;
