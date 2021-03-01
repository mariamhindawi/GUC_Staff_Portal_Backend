require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");
const slotModel = require("../models/slot_model");
const courseModel = require("../models/course_model");
const notificationModel = require("../models/notification_model");
const { slotLinkingModel } = require("../models/request_model");

const router = express.Router();

router.use((req, res, next) => {
  if (req.token.role === "Course Coordinator") {
    next();
  }
  else {
    res.status(403).send("Unauthorized access.");
  }
});

router.route("/get-course-coordinator-courses")
  .get(async (req, res) => {
    let courses = await courseModel.find({ courseCoordinator: req.token.id });
    res.send(courses);
  });

router.route("/add-course-slot")
  .post(async (req, res) => {
    if (!req.body.day || !req.body.course || !req.body.room || !req.body.slotNumber || !req.body.type) {
      res.status(400).send("Not all required fields are entered");
      return;
    }
    if (typeof req.body.day !== "string" || typeof req.body.course !== "string" || typeof req.body.room !== "string" || typeof req.body.type !== "string" || typeof req.body.slotNumber !== "string") {
      res.status(400).send("Wrong datatypes entered");
      return;
    }
    const user = await academicMemberModel.findOne({ id: req.token.id });
    const course = await courseModel.findOne({ id: req.body.course });
    const room = await roomModel.findOne({ name: req.body.room });

    if (!course) {
      res.status(404).send("Incorrect course id");
      return;
    }
    if (!room) {
      res.status(404).send("Incorrect room name");
      return;
    }
    if (course.courseCoordinator !== user.id) {
      res.status(403).send("You are not a course coordinator in this course");
      return;
    }
    if (room.type === "Office") {
      res.status(422).send("Room is an office");
      return;
    }
    if (room.type !== req.body.type) {
      res.status(422).send("Room type and slot type do not match");
      return;
    }
    const slot = await slotModel.findOne({ day: req.body.day, slotNumber: req.body.slotNumber, room: room._id });
    if (slot) {
      res.status(409).send("This slot is occupied");
      return;
    }

    const newSlot = new slotModel({
      day: req.body.day,
      slotNumber: req.body.slotNumber,
      room: room._id,
      type: req.body.type,
      course: course._id,
    });
    try {
      await newSlot.save();
      res.send("Slot added successfully");
    }
    catch (error) {
      res.status(500).send(error);
    }
  });

router.route("/update-course-slot/:slotId")
  .put(async (req, res) => {
    const slot = await slotModel.findOne({ _id: req.params.slotId });
    if (!slot) {
      res.status(404).send("Incorrect slot id");
      return;
    }
    const user = await academicMemberModel.findOne({ id: req.token.id });
    const course = await courseModel.findOne({ id: req.body.course });
    const room = await roomModel.findOne({ name: req.body.room });

    if (!course) {
      res.status(404).send("Incorrect course id");
      return;
    }
    if (!room) {
      res.status(404).send("Incorrect room name");
      return;
    }
    if (course.courseCoordinator !== user.id) {
      res.status(403).send("You are not a course coordinator in this course");
      return;
    }
    if (room.type === "Office") {
      res.status(422).send("Room is an office");
      return;
    }
    if (room.type !== req.body.type) {
      res.status(422).send("Room type and slot type do not match");
      return;
    }
    const otherSlot = await slotModel.findOne({ day: req.body.day, slotNumber: req.body.slotNumber, room: room._id });
    if (otherSlot && otherSlot._id.toString() !== slot.id.toString()) {
      res.status(409).send("This slot is occupied");
      return;
    }

    slot.day = req.body.day;
    slot.slotNumber = req.body.slotNumber;
    slot.room = room._id;
    slot.type = req.body.type;
    slot.course = course._id;
    try {
      await slot.save();
      res.send("Slot updated successfully");
    }
    catch (error) {
      res.status(500).send(error);
    }
  });

router.route("/delete-course-slot/:slotId")
  .delete(async (req, res) => {
    const slot = await slotModel.findOneAndDelete({ _id: req.params.slotId });
    if (!slot) {
      res.status(404).send("Incorrect slot id");
      return;
    }
    res.send("Slot deleted successfully ");
  });

router.route("/slot-linking-requests/:reqId/accept")
  .put(async (req, res) => {
    let request = await slotLinkingModel.findOne({ id: req.params.reqId });
    let slot = await slotModel.findOne({ _id: request.slot });
    let course = await courseModel.findOne({ _id: slot.course });
    if (req.token.id !== course.courseCoordinator) {
      res.status(403).send("Invalid credentials");
      return;
    }
    if (request.status === "Accepted" || request.status === "Rejected") {
      res.status(409).send("Already replied to request");
      return;
    }
    if (slot.staffMember !== "UNASSIGNED") {
      request.status = "Rejected";
      request.ccComment = "Slot was assigned to another staff member";
      let notification = new notificationModel({
        user: request.requestedBy,
        message: "Your slot-linking request request has been rejected."
      });
      notification.save();
    }
    else {
      request.status = "Accepted";
      slot.staffMember = request.requestedBy;
      slot.save();
      let notification = new notificationModel({
        user: request.requestedBy,
        message: "Your slot-linking request request has been accepted."
      });
      notification.save();
    }
    request.save();
    res.status(200).send(request);
  });

router.route("/slot-linking-requests/:reqId/reject")
  .put(async (req, res) => {
    if (isNaN(req.params.reqId)) {
      res.status(404).send("Invalid request id");
      return;
    }
    let request = await slotLinkingModel.findOne({ id: req.params.reqId });
    let slot = await slotModel.findOne({ _id: request.slot });
    let course = await courseModel.findOne({ _id: slot.course });
    if (req.token.id !== course.courseCoordinator) {
      res.status(403).send("Invalid credentials");
      return;
    }
    if (request.status === "Accepted" || request.status === "Rejected") {
      res.status(409).send("Already replied to request");
      return;
    }
    request.status = "Rejected";
    request.ccComment = req.body.ccComment;
    try {
      await request.save();
    }
    catch (error) {
      res.status(500).send(error);
    }
    let notification = new notificationModel({
      user: request.requestedBy,
      message: "Your slot-linking request has been rejected."
    });
    notification.save();
    res.send(request);
  });

router.route("/slot-linking-requests")
  .get(async (req, res) => {
    let slots = await slotModel.find();
    let courses = await courseModel.find({ courseCoordinator: req.token.id });
    let myCourseSlots = slots.filter(slot => courses.map(course => course._id.toString()).includes(slot.course));
    let myCourseSlotsids = myCourseSlots.map(slot => slot._id.toString());
    let allRequests = await slotLinkingModel.find({ type: "slotLinkingRequest", status: "Under review" });
    let myRequests = allRequests.filter(request => myCourseSlotsids.includes(request.slot));
    for (let i = 0; i < myRequests.length; i++) {
      myRequests[i].slot = await slotModel.findOne({ _id: myRequests[i].slot });
    }
    res.send(myRequests);
  });

module.exports = router;
