const express = require("express");
const jwt = require("jsonwebtoken");

const { convertDay } = require("../others/helpers");
const academicMemberModel = require("../models/academic_member_model");
const departmentModel = require("../models/department_model");
const roomModel = require("../models/room_model");
const courseModel = require("../models/course_model");
const slotModel = require("../models/slot_model");
const notificationModel = require("../models/notification_model");
const { replacementModel, annualLeaveModel, accidentalLeaveModel,
  maternityLeaveModel, dayOffChangeModel,
  slotLinkingModel, compensationLeaveModel, sickLeaveModel, requestModel } = require("../models/request_model");

const router = express.Router();

router.use((req, res, next) => {
  if (req.token.role !== "HR") {
    next();
  }
  else {
    res.status(403).send("Unauthorized access.");
  }
});

router.route("/get-notifications")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    const notifications = await notificationModel.find({ user: authAccessToken.id }).sort({ createdAt: "desc" });
    res.send(notifications);
  });

router.route("/mark-notifications-seen")
  .put(async (req, res) => {
    const seenNotifications = req.body.seenNotifications;
    for (let i = 0; i < seenNotifications.length; i++) {
      const notification = await notificationModel.findOne({ _id: seenNotifications[i]._id });
      notification.seen = true;
      await notification.save();
    }
    res.send("Notifications updated successully");
  });

router.route("/get-department-courses")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    const user = await academicMemberModel.findOne({ id: authAccessToken.id });
    const department = await departmentModel.findById(user.department);
    const courses = await courseModel.find({ department: department._id });
    for (let i = 0; i < courses.length; i++) {
      courses[i].department = department.name;
    }
    res.send(courses);
  });

router.route("/get-my-courses")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    const user = await academicMemberModel.findOne({ id: authAccessToken.id });
    const department = await departmentModel.findById(user.department);
    const courses = await courseModel.find({ $or: [{ courseInstructors: user.id }, { teachingAssistants: user.id }] });
    for (let i = 0; i < courses.length; i++) {
      courses[i].department = department ? department.name : "UNASSIGNED";
    }
    res.send(courses);
  });

router.route("/get-department-staff")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    const user = await academicMemberModel.findOne({ id: authAccessToken.id });
    const department = await departmentModel.findById(user.department);
    const courseInstructors = await academicMemberModel.find({
      department: department._id,
      role: { $in: ["Course Instructor", "Head of Department"] },
    });
    const teachingAssistants = await academicMemberModel.find({
      department: department._id,
      role: { $in: ["Teaching Assistant", "Course Coordinator"] },
    });
    for (let i = 0; i < courseInstructors.length; i++) {
      const courseInstructor = courseInstructors[i];
      const office = await roomModel.findOne({ _id: courseInstructor.office });
      courseInstructor.office = office.name;
      courseInstructor.department = department.name;
    }
    for (let i = 0; i < teachingAssistants.length; i++) {
      const teachingAssistant = teachingAssistants[i];
      const office = await roomModel.findOne({ _id: teachingAssistant.office });
      teachingAssistant.office = office.name;
      teachingAssistant.department = department.name;
    }
    res.send({ courseInstructors, teachingAssistants });
  });

router.route("/get-staff/:course")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    if (!req.params.course) {
      res.status(400).send("Not all required fields are entered");
      return;
    }
    const user = await academicMemberModel.findOne({ id: authAccessToken.id });
    const course = await courseModel.findOne({ id: req.params.course });
    if (!course) {
      res.status(404).send("Incorrect course name");
      return;
    }
    if (user.department === "UNASSIGNED" && !course.courseInstructors.includes(authAccessToken.id)) {
      res.status(403).send("You are not assigned to this course");
      return;
    }
    if (course.department.toString() !== user.department.toString()) {
      res.status(403).send("Course is in different department");
      return;
    }
    if (user.department === "UNASSIGNED" && !course.courseInstructors.includes(authAccessToken.id)) {
      res.status(403).send("You are not assigned to this course");
      return;
    }

    const department = await departmentModel.findById(user.department);
    const courseInstructors = course.courseInstructors;
    const teachingAssistants = course.teachingAssistants;

    for (let i = 0; i < courseInstructors.length; i++) {
      const courseInstructor = await academicMemberModel.findOne({ id: courseInstructors[i] });
      const office = await roomModel.findOne({ _id: courseInstructor.office });
      courseInstructor.office = office.name;
      courseInstructor.department = department ? department.name : "UNASSIGNED";
      courseInstructors[i] = courseInstructor;
    }
    for (let i = 0; i < teachingAssistants.length; i++) {
      const teachingAssistant = await academicMemberModel.findOne({ id: teachingAssistants[i] });
      const office = await roomModel.findOne({ _id: teachingAssistant.office });
      teachingAssistant.office = office.name;
      teachingAssistant.department = department ? department.name : "UNASSIGNED";
      teachingAssistants[i] = teachingAssistant;
    }

    res.send({ courseInstructors, teachingAssistants });
  });

router.route("/send-replacement-request")
  .post(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    let requester = await academicMemberModel.findOne({ id: authAccessToken.id });
    if (requester.annualLeaveBalance < 1) {
      res.status(409).send("Insufficient leave balance");
      return;
    }
    if (!req.body.day) {
      res.status(404).send("Invalid date");
      return;
    }

    if (req.body.day < new Date()) {
      res.status(422).send("Please enter a future date");
      return;
    }
    let dayNo = new Date(req.body.day).getDay();
    let weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let day = weekDays[dayNo];
    if (!req.body.slot) {
      res.status(404).send("Invalid slot number");
      return;
    }
    const slot = await slotModel.findOne({ staffMember: authAccessToken.id, day: day, slotNumber: req.body.slot });
    if (!slot) {
      res.status(404).send("Invalid slot");
      return;
    }
    let replacement = await academicMemberModel.findOne({ id: req.body.replacementID });
    if (typeof req.body.replacementID !== "string" || req.body.replacementID ==="" || !replacement) {
      res.status(404).send("Invalid replacement ID");
      return;
    }
    let course = await courseModel.findOne({ _id: slot.course });
    if (requester.department !== replacement.department || !course.courseInstructors.includes(replacement.id) && !course.teachingAssistants.includes(replacement.id)) {
      res.status(422).send("Replacement does not teach this course");
      return;
    }
    if ((requester.role == "Teaching Assistant" || requester.role === "Course Coordinator") && (replacement.role === "Course Instructor" || replacement.role === "Head of Department")) {
      res.status(422).send("Replacement cannot be a course instructor");
      return;
    }
    const request = new replacementModel({
      requestedBy: authAccessToken.id,
      day: req.body.day,
      slot: slot._id,
      replacementID: req.body.replacementID,
      replacementReply: "Waiting for reply"
    });
    try {
      await request.save();
      const notification = new notificationModel({
        user: req.body.replacementID,
        message: "You have received a replacement request"
      });
      await notification.save();
      res.send("Request sent successfully");
    }
    catch (error) {
      res.status(500).send(error);
    }
  });

router.route("/replacement-requests/:id/accept")
  .put(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
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
      res.status(404).send("Invalid request ID");
    }
  });

router.route("/replacement-requests/:id/reject")
  .put(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    if (isNaN(req.params.id)) {
      res.status(404).send("Invalid request id");
      return;
    }
    let request = await replacementModel.findOne({ id: req.params.id, replacementID: authAccessToken.id });
    if (request && request.type === "replacementRequest" && request.replacementReply === "Waiting for reply" && req.authAccessToken.id !== request.requestedBy) {
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
        res.status(500).send(error);
      }
    }
    else {
      res.status(404).send("Invalid request ID");
    }
  });

router.route("/replacement-requests")
  .get(async (req, res) => {
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

router.route("/send-slot-linking-request")
  .post(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    if (typeof req.body.room !== "string") {
      res.status(404).send("Invalid room name");
      return;
    }
    if (!req.body.day || !req.body.slot) {
      res.status(404).send("Invalid day and slot number");
      return;
    }
    let room = await roomModel.findOne({ name: req.body.room });
    let slot = await slotModel.findOne({ day: req.body.day, slotNumber: req.body.slot, room: room._id });
    let course = await courseModel.findOne({ _id: slot.course });
    if (!room) {
      res.status(404).send("Room does not exist");
      return;
    }
    if (!course) {
      res.status(404).send("Course does not exist");
      return;
    }
    if (!course.teachingAssistants.includes(authAccessToken.id) && !course.courseInstructors.includes(authAccessToken.id)) {
      res.status(422).send("You are not assigned to this course");
      return;
    }
    if (!slot) {
      res.status(404).send("Slot does not exist");
      return;
    }
    if (slot.staffMember !== "UNASSIGNED") {
      res.status(409).send("Slot is not free");
      return;
    }
    const prev = await slotLinkingModel.findOne({
      requestedBy: authAccessToken.id,
      slot: slot._id,
      status: "Pending"
    });
    if (prev) {
      res.status(409).send("Request already submitted");
      return;
    }
    const request = new slotLinkingModel({
      requestedBy: authAccessToken.id,
      slot: slot._id
    });
    try {
      await request.save();
      res.send("Request submitted");
    }
    catch (error) {
      res.status(500).send(error);
    }
  });

router.route("/slot-linking-requests")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    let myRequests = await slotLinkingModel.find({ requestedBy: authAccessToken.id, type: "slotLinkingRequest" });
    for (let i = 0; i < myRequests.length; i++) {
      let slot = await slotModel.findOne({ _id: myRequests[i].slot });
      myRequests[i].slot = { slotNumber: slot.slotNumber, day: slot.day, course: await courseModel.findOne({ _id: slot.course }) };
    }
    res.send(myRequests);
  });

router.route("/change-day-off-request")
  .post(async (req, res) => {
    console.log(req.body);
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    const request = new dayOffChangeModel({
      requestedBy: authAccessToken.id,
      dayOff: req.body.dayOff,
      reason: req.body.reason
    });
    try {
      await request.save();
      res.send("Request submitted");
    }
    catch (error) {
      res.status(500).send(error);
    }
  });

router.route("/all-requests/:filter")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    let requests = [];
    if (req.params.filter === "All")
      requests = await requestModel.find({ requestedBy: authAccessToken.id });
    if (req.params.filter === "Accepted")
      requests = await requestModel.find({ requestedBy: authAccessToken.id, status: "Accepted" });
    if (req.params.filter === "Rejected")
      requests = await requestModel.find({ requestedBy: authAccessToken.id, status: "Rejected" });
    if (req.params.filter === "Pending") {
      requests = await requestModel.find({ requestedBy: authAccessToken.id, status: "Pending" });

    }

    res.send(requests);
  });

router.route("/cancel-request/:id")
  .delete(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    let request = await annualLeaveModel.findOne({ requestedBy: authAccessToken.id, id: req.params.id });
    if (!request) {
      res.status(404).send("Request does not exist");
      return;
    }
    if (request.status === "Pending") {
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

router.route("/send-leave-request")
  .post(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    let requester = await academicMemberModel.findOne({ id: authAccessToken.id });
    let request;
    if (!req.body.day || !(/^\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])$/).test(req.body.day)) {
      res.status(422).send("Please enter the date in a valid format (yyyy-mm-dd)");
      return;
    }
    let parts = req.body.day.split("-");
    let date = new Date(parts[0], parts[1] - 1, parts[2]);
    if (typeof req.body.type !== "string") {
      res.status(404).send("Invalid leave type");
      return;
    }
    const prev = await annualLeaveModel.findOne({ day: { $lt: date.addDays(1), $gte: date }, requestedBy: authAccessToken.id, type: req.body.type });
    if (prev) {
      res.status(409).send("Request already exists");
      return;
    }
    if (req.body.type === "annualLeave") {
      if (date < new Date()) {
        res.status(422).send("Please enter a future date");
        return;
      }
      if (requester.annualLeaveBalance < 1) {
        res.status(422).send("Insufficient leave balance");
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
        requestedBy: authAccessToken.id,
        day: req.body.day,
        slots: slots,
        replacementIDs: replacements,
        reason: req.body.reason
      });
    }
    else if (req.body.type === "accidentalLeave") {
      if (date > new Date()) {
        res.status(400).send("Please enter a valid date");
        return;
      }
      if (requester.annualLeaveBalance >= 1 && requester.accidentalLeaveBalance >= 1)
        request = new accidentalLeaveModel({
          requestedBy: authAccessToken.id,
          day: req.body.day,
          reason: req.body.reason
        });
      else {
        res.status(422).send("Insufficient leave/accidental leave balance");
        return;
      }
    }
    else if (req.body.type === "sickLeave") {
      console.log(req.body);
      if (date > new Date()) {
        res.status(404).send("Please enter a valid date");
        return;
      }
      let parts = req.body.day.split("-");
      let myDate = new Date(parts[0], parts[1] - 1, parts[2]);
      if (myDate.addDays(3) >= new Date())
        request = new sickLeaveModel({
          requestedBy: authAccessToken.id,
          day: req.body.day,
          document: req.body.document,
          reason: req.body.reason
        });
      else {
        res.status(409).send("Deadline for submitting this request has passed");
        return;
      }
    }
    else if (req.body.type === "maternityLeave") {
      let requester = await academicMemberModel.findOne({ id: authAccessToken.id });
      if (isNaN(req.body.duration) || req.body.duration > 90) {
        res.status(422).send("Please enter a valid leave duration. Maximum duration is 90 days.");
        return;
      }
      if (requester.gender === "Female")
        request = new maternityLeaveModel({
          requestedBy: authAccessToken.id,
          day: req.body.day,
          duration: req.body.duration,
          document: req.body.document,
          reason: req.body.reason
        });
      else {
        res.status(422).send("You cannot apply for a maternity leave");
        return;
      }
    }
    else if (req.body.type === "compensationRequest") {
      if (date > new Date()) {
        res.status(422).send("Please enter a valid date");
        return;
      }
      if (!req.body.compensationDate) {
        res.status(404).send("Please enter a compensation date");
        return;
      }
      if(!req.body.reason){
        res.status(400).send("Not all fields are entered");
        return;
      }
      let dayOff = convertDay(requester.dayOff);
      if ((new Date(req.body.compensationDate)).getDay() !== dayOff) {
        res.status(422).send("Compensation date must be on your day off");
        return;
      }
      if ((new Date(date).getDate()>=11 && !((new Date(req.body.compensationDate).getDate()>=11 && new Date(req.body.compensationDate).getMonth()===new Date(date).getMonth())
      ||(new Date(req.body.compensationDate).getDate()<11 && new Date(req.body.compensationDate).getMonth()=== new Date(date).getMonth()+1)))
      || (new Date(date).getDate()<11 && !((new Date(req.body.compensationDate).getDate()<11 && new Date(req.body.compensationDate).getMonth()===new Date(date).getMonth())
      || (new Date(req.body.compensationDate)>=11 && new Date(req.body.compensationDate).getMonth() === new Date(date).getMonth()-1)))){
        res.status(422).send("Date and compensation date should be in the same month");
        return;
      }
      if(new Date(date).getDay()===5 || new Date(req.body.compensationDate).getDay()===5) {
        res.status(422).send("Date cannot be on a Friday");
        return;
      }
      request = new compensationLeaveModel({
        day: req.body.day,
        compensationDay: req.body.compensationDate,
        requestedBy: authAccessToken.id,
        reason: req.body.reason
      });
    }
    else {
      res.status(404).send("Invalid leave request type");
      return;
    }
    try {
      await request.save();
      res.status(200).send("Request submitted for review to the HOD");
    }
    catch (error) {
      res.status(500).send(error);
      console.log(error);
    }
  });

router.route("/schedule")
  .get(async (req, res) => {
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

router.route("/get-slots/:course")
  .get(async (req, res) => {

    if (!req.params.course) {
      res.send("Not all required fields are entered");
      return;
    }
    let course = await courseModel.findOne({ id: req.params.course });

    if (!course) {
      res.status(404).send("Invalid Course Id");
      return;
    }
    let slots = await slotModel.find({ course: course._id });
    for (let i = 0; i < slots.length; i++) {
      let room = await roomModel.findById(slots[i].room);
      slots[i].room = room.name;
      slots[i].course = course.id;
    }
    res.send(slots);
  });

router.route("/get-academic-department")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    const academicMember = await academicMemberModel.findOne({ id: authAccessToken.id });
    const department = await departmentModel.findById(academicMember.department);
    res.send(department);
  });

  router.route("/course-slots/:course")
  .get(async (req, res) => {
    if (!req.params.course) {
      res.send("Not all required fields are entered");
      return;
    }
    let course = await courseModel.findOne({ id: req.params.course });

    if (!course) {
      res.status(404).send("Invalid Course Id");
      return;
    }
    let slots = await slotModel.find({ course: course._id });
    for (let i = 0; i < slots.length; i++) {
      let room = await roomModel.findById(slots[i].room);
      slots[i].room = room.name;
      slots[i].course = course.name;
    }
    res.send(slots);
  });

Date.prototype.addDays = function (days) {
  var date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
};

module.exports = router;
