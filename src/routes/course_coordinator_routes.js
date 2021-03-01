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

router.put("/slot-linking-requests/:reqId/accept", async (req, res) => {
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
  res.send(request);
});

router.put("/slot-linking-requests/:reqId/reject", async (req, res) => {
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

router.get("/slot-linking-requests", async (req, res) => {
  const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
  let slots = await slotModel.find();
  let courses = await courseModel.find({ courseCoordinator: authAccessToken.id });
  let myCourseSlots = slots.filter(slot => courses.map(course => course._id.toString()).includes(slot.course));
  let myCourseSlotsids = myCourseSlots.map(slot => slot._id.toString());
  let allRequests = await slotLinkingModel.find({ type: "slotLinkingRequest", status: "Under review" });
  let myRequests = allRequests.filter(request => myCourseSlotsids.includes(request.slot));
  for (let i = 0; i < myRequests.length; i++) {
    myRequests[i].slot = await slotModel.findOne({ _id: myRequests[i].slot });
  }
  res.send(myRequests);
});

router.route("/get-course-coordinator-courses")
  .get(async (req, res) => {
    let courses = await courseModel.find({ courseCoordinator: req.token.id });
    res.send(courses);
  });

router.route("/add-course-slot")
  .post(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    if(!req.body.day || !req.body.course || !req.body.room || !req.body.slotNumber || !req.body.type){
      res.send("Not all required fields are entered");
      return;
    }
    if (typeof req.body.day !== "string" ||typeof req.body.course !== "string" || typeof req.body.room !== "string" || typeof req.body.type !== "string" || typeof req.body.slotNumber !== "string") {
      res.send("Wrong datatypes entered");
      return;
    }
    let academicMember = await academicMemberModel.findOne({ id: req.token.id });
    const course = await courseModel.findOne({ id: req.body.course });
    if (!course) {
      res.status(404).send("Incorrect course Id");
      return;
    }

    if (!(course.courseCoordinator === academicMember.id)) {
      res.status(403).send("You are not a course coordinator in this course");
      return;
    }

    const room = await roomModel.findOne({ name: req.body.room });
    if (!room) {
      res.status(404).send("Incorrect room name");
      return;
    }

    if (!(room.type === req.body.type)) {
      res.status(422).send("Room type and slot type do not match");
      return;
    }
    let slot = await slotModel.findOne({ day: req.body.day, slotNumber: req.body.slotNumber, room: room._id });
    if (slot) {
      res.status(409).send("This slot is occupied");
      return;
    }
    const newSlot = new slotModel({
      day: req.body.day,
      slotNumber: req.body.slotNumber,
      room: room._id,
      course: course._id,
      type: req.body.type
    });
    try {
      await newSlot.save();
      res.send("Slot added successfully");
    }
    catch (error) {
      res.send(error);
    }
  });

router.route("/update-course-slot/:day/:slotNumber/:room/:course")
  .put(async (req, res) => {
    let academicMember = await academicMemberModel.findOne({ id: req.token.id });
    let oldCourse = await courseModel.findOne({ id: req.params.course });

    if (oldCourse.courseCoordinator !== academicMember.id) {
      res.status(403).send("You are not a course coordinator in this course");
      return;
    }
    let oldRoom = await roomModel.findOne({name:req.params.room});
    let oldSlot = await slotModel.findOne({ day: req.params.day, room: oldRoom._id, slotNumber: req.params.slotNumber, course: req.params.course });

    if (!oldSlot) {
      res.status(404).send("No slot to update");
      return;
    }
    let day = oldSlot.day;
    let slotNumber = oldSlot.slotNumber;
    let room = oldSlot.room;
    let type = oldSlot.type;
    let course = oldSlot.course;

    if (req.body.room) {
      let newRoom = await roomModel.findOne({ name: req.body.room });
      if (!newRoom) {
        res.send("Incorrect room name");
        return;
      }
      if (newRoom.type === "Office") {
        res.status(422).send("Room cannot be an office");
        return;
      }
      if(newRoom.type !==oldSlot.type || (req.body.type && newRoom.type !== req.body.type)){
        res.status(422).send("Room type and slot type do not match");
        return;
      }
     room=newRoom.name;
    }
    if (req.body.day) {
      day=req.body.day;
    }
    if (req.body.slotNumber) {
      slotNumber=req.body.slotNumber;
    }
    if (req.body.course) {
      let newCourse=await courseModel.findOne({id: req.body.course});
      if(! newCourse){
        res.status(404).send("Invalid Course Id");
        return;
      }
      if (newCourse.courseCoordinator !== academicMember.id){
        res.status(403).send("You are not a course coordinator in this course");
        return;
      }
      course=newCourse.id;
    }
    if (req.body.type) {

      if (!req.body.room || (newRoom.type !== req.body.type)){
        res.status(422).send("Room type and slot type do not match");
        return;
      }
      type=req.body.type;
    }

    let updatedSlot = await slotModel.findOne({ day:day, room: room, slotNumber: slotNumber, course:course });
    if (updatedSlot && updatedSlot._id !== oldSlot._id) {
      res.status(409).send("This slot is occupied");
      return;
    }
    oldSlot.day=day;
    oldSlot.course=course;
    oldSlot.room=room;
    oldSlot.type=type;
    oldSlot.slotNumber=slotNumber;
    try {
      await oldSlot.save();
      res.send("Slot updated successfully");
    }
    catch (error) {
      res.send(error);
    }
  });

router.route("/delete-course-slot/:slotId")
  .delete(async (req, res) => {
    let slot = await slotModel.findOne({ _id: req.params.slotId });
    if (!slot) {
      res.status(404).send("Incorrect slot details");
      return;
    }
    await slotModel.findOneAndDelete({ _id: req.params.slotId });
    res.send("Slot deleted successfully ");
  });


module.exports = router;
