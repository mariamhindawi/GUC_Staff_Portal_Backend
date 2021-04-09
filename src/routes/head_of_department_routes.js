const express = require("express");
const jwt = require("jsonwebtoken");
const academicMemberModel = require("../models/academic_member_model");
const departmentModel = require("../models/department_model");
const courseModel = require("../models/course_model");
const roomModel = require("../models/room_model");
const slotModel = require("../models/slot_model");
const notificationModel = require("../models/notification_model");
const { annualLeaveModel, dayOffChangeModel, requestModel, replacementModel, accidentalLeaveModel, compensationLeaveModel, maternityLeaveModel, sickLeaveModel, slotLinkingModel } = require("../models/request_model");

const router = express.Router();

router.use((req, res, next) => {
  if (req.token.role === "Head of Department") {
    next();
  }
  else {
    res.status(403).send("Unauthorized access.");
  }
});

router.route("/get-department-courses-coverage")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    const user = await academicMemberModel.findOne({ id: authAccessToken.id });
    const department = await departmentModel.findById(user.department);
    const courses = await courseModel.find({ department: user.department });
    const coursesCoverage = [];
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      const unassignedSlots = await slotModel.find({ course: courses[i]._id, staffMember: "UNASSIGNED" });
      const totalSlots = await slotModel.find({ course: courses[i]._id });
      const coverage = totalSlots.length === 0 ? 0 : ((totalSlots.length - unassignedSlots.length) / (totalSlots.length)) * 100;
      coursesCoverage.push(Math.round(coverage));
      course.department = department.name;
    }
    res.send({ courses, coursesCoverage });
  });

router.route("/view-staff")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    const user = await academicMemberModel.findOne({ id: authAccessToken.id });
    const output = await academicMemberModel.find({ department: user.department });
    const department = await departmentModel.findOne({ _id: user.department });
    const departments = [];
    const rooms = [];
    for (let i = 0; i < output.length; i++) {
      departments.push(department.name);
      const room = await roomModel.findOne({ _id: output[i].office });
      rooms.push(room.name);
    }
    res.send({ staff: output, departments: departments, rooms: rooms });
  });

router.route("/view-staff/:course")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    const user = await academicMemberModel.findOne({ id: authAccessToken.id });
    const course = await courseModel.findOne({ name: req.params.course });

    if (!course) {
      res.send("Course does not exist");
      return;
    }
    if (course.department !== user.department) {
      res.send("Course is not in your department");
      return;
    }
    const output = [];
    const instructors = course.courseInstructors;
    const tas = course.teachingAssistants;

    for (let i = 0; i < instructors.length; i++) {
      const instructor = await academicMemberModel.findOne({ id: instructors[i] });
      output.push(instructor);
    }
    for (let i = 0; i < tas.length; i++) {
      const ta = await academicMemberModel.findOne({ id: tas[i] });
      output.push(ta);
    }
    const department = await departmentModel.findOne({ _id: user.department });
    const departments = [];
    const rooms = [];

    for (let i = 0; i < output.length; i++) {
      departments.push(department.name);
      const room = await roomModel.findOne({ _id: output[i].office });
      rooms.push(room.name);
    }
    res.send({ staff: output, departments: departments, rooms: rooms });
  });

router.route("/view-staff-dayoff")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    let user = await academicMemberModel.findOne({ id: authAccessToken.id });
    let output = await academicMemberModel.find({ department: user.department }, { id: 1, dayoff: 1 });
    res.send(output);
  });

router.route("/view-staff-dayoff/:id")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);

    let user = await academicMemberModel.findOne({ id: authAccessToken.id });
    let output = await academicMemberModel.findOne({ department: user.department, id: req.params.id }, { id: 1, dayoff: 1 });
    res.send(output);
  });

router.route("/assign-course-instructor")
  .post(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    if (!req.body.courseId || !req.body.academicId) {
      res.status(400).send("Not all required fields are entered");
      return;
    }
    if (typeof req.body.academicId !== "string" || typeof req.body.courseId !== "string") {
      res.status(400).send("Wrong data types entered");
      return;
    }
    const user = await academicMemberModel.findOne({ id: authAccessToken.id });
    const courseInstructor = await academicMemberModel.findOne({ id: req.body.academicId });
    const course = await courseModel.findOne({ id: req.body.courseId });

    if (!courseInstructor) {
      res.status(404).send("Incorrect course instructor id");
      return;
    }
    if (!course) {
      res.status(404).send("Incorrect course Id");
      return;
    }
    if (course.department !== user.department) {
      res.status(422).send("Course is in a different department");
      return;
    }
    if (courseInstructor.department !== user.department) {
      res.status(422).send("Course instructor is in a different department");
      return;
    }
    if (courseInstructor.role === "Teaching Assistant" || courseInstructor.role === "Course Coordinator") {
      res.status(422).send("Academic is not a course instructor");
      return;
    }
    if (course.courseInstructors.includes(courseInstructor.id)) {
      res.status(409).send("Course instructor is already assigned to this course");
      return;
    }

    course.courseInstructors.push(courseInstructor.id);
    try {
      await course.save();
      res.send("Instructor assigned to course successfully");
    }
    catch (error) {
      res.status(500).send(error.message);
    }
  });

router.route("/unassign-course-instructor/:academicId/:courseId")
  .put(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    const user = await academicMemberModel.findOne({ id: authAccessToken.id });
    const course = await courseModel.findOne({ id: req.params.courseId });
    const courseInstructor = await academicMemberModel.findOne({ id: req.params.academicId });

    if (!courseInstructor) {
      res.status(404).send("Incorrect course instructor id");
      return;
    }
    if (!course) {
      res.status(404).send("Incorrect course id");
      return;
    }
    if (course.department !== user.department) {
      res.status(422).send("Course is in a different department");
      return;
    }
    if (courseInstructor.department !== user.department) {
      res.status(422).send("Course instructor is in a different department");
      return;
    }
    if (courseInstructor.role === "Teaching Assistant" || courseInstructor.role === "Course Coordinator") {
      res.status(422).send("Academic is not a course instructor");
      return;
    }
    if (!course.courseInstructors.includes(courseInstructor.id)) {
      res.status(422).send("Course instructor is not assiged to this course");
      return;
    }
    const slots = await slotModel.find({ course: course._id, staffMember: courseInstructor.id });
    if (slots.length !== 0) {
      res.status(409).send("Cannot unassign course instructor. Reassign slots first");
      return;
    }

    const index = course.courseInstructors.indexOf(courseInstructor.id);
    course.courseInstructors.splice(index, 1);
    try {
      await course.save();
      res.send("Course instructor unassigned from course successfully");
    }
    catch (error) {
      res.status(500).send(error.messages);
    }
  });

router.route("/update-course-instructor/:idDelete/:course")
  .put(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    if (!req.body.idUpdate) {
      res.send("Not all required fields are entered");
      return;
    }
    if (typeof req.body.idUpdate !== "string") {
      res.send("Wrong data types entered");
      return;
    }

    let user = await academicMemberModel.findOne({ id: authAccessToken.id });
    let instructorupdate = await academicMemberModel.findOne({ id: req.body.idUpdate });
    let instructordelete = await academicMemberModel.findOne({ id: req.params.idDelete });
    let course = await courseModel.findOne({ name: req.params.course });

    if (!instructordelete || !instructorupdate) {
      res.send("Instructor does not exist.");
      return;
    }
    if (instructordelete.department !== user.department || instructorupdate.department !== user.department) {
      res.send("Cannot update an instructor that is not in your department.");
      return;
    }
    if (!course) {
      res.send("Course does not exist.");
      return;
    }
    if (course.department !== user.department) {
      res.send("Course does not exist in your department.");
      return;
    }
    if (!course.courseInstructors.includes(instructordelete)) {
      res.send("Instructor is not assigned to this course.");
      return;
    }

    const indx = course.courseInstructors.findIndex(v => v === instructordelete);
    course.courseInstructors.slice(indx, indx + 1);
    course.courseInstructors.push(instructorupdate);

    try {
      await course.save();
      res.send("Instructor updated successfully");
    }
    catch (error) {
      console.log(error.message);
      res.status(400).send(error.messages);
    }

  });

router.route("/staff-requests/:reqId/accept")
  .put(async (req, res) => {
    if (isNaN(req.params.reqId)) {
      res.status(404).send("Invalid request id");
      return;
    }
    let request = await requestModel.findOne({ id: req.params.reqId });
    let requester = await academicMemberModel.findOne({ id: request.requestedBy });
    if (request.status !== "Pending") {
      res.status(409).send("Already responded");
      return;
    }
    if (request.type === "annualLeave") {
      if (requester.annualLeaveBalance >= 1) {
        requester.annualLeaveBalance -= 1;
        requester.save();
        request = await annualLeaveModel.findOneAndUpdate({ id: req.params.reqId }, { status: "Accepted" }, { new: true });
      }
      else {
        request = await annualLeaveModel.findOneAndUpdate({ id: req.params.reqId }, { status: "Rejected", HODComment: "Request has been rejected due to insufficient leave balance" }, { new: true });
        let notification = new notificationModel({
          user: request.requestedBy,
          message: `Your request(${req.params.reqId}) has been rejected.`
        });
        notification.save();
      }
    }
    if (request.type === "accidentalLeave") {
      if (requester.annualLeaveBalance >= 1 && requester.accidentalLeaveBalance >= 1) {
        requester.annualLeaveBalance -= 1;
        requester.accidentalLeaveBalance -= 1;
        requester.save();
        request = await annualLeaveModel.findOneAndUpdate({ id: req.params.reqId }, { status: "Accepted" }, { new: true });
      }
      else {
        request = await annualLeaveModel.findOneAndUpdate({ id: req.params.reqId }, { status: "Rejected", HODComment: "Request has been rejected due to insufficient leave/accidental leave balance" }, { new: true });
        let notification = new notificationModel({
          user: request.requestedBy,
          message: `Your request(${req.params.reqId}) has been rejected.`
        });
        notification.save();
      }
    }
    if (request.type === "sickLeave" || request.type === "maternityLeave" || request.type === "compensationRequest") {
      request = await requestModel.findOneAndUpdate({ id: req.params.reqId }, { status: "Accepted" }, { new: true });
    }
    if (request.type === "dayOffChangeRequest") {
      request = await dayOffChangeModel.findOne({ id: req.params.reqId });
      let day = request.dayOff;
      requester.dayOff = day;
      request.status = "Accepted";
      request.save();
      requester.save();
    }
    let notification = new notificationModel({
      user: request.requestedBy,
      message: `Your request(${req.params.reqId}) has been accepted`
    });
    notification.save();
    res.send(request);
  });

router.route("/staff-requests/:reqId/reject")
  .put(async (req, res) => {
    let request = await annualLeaveModel.findOne({ id: req.params.reqId });
    if (request.type === 'replacementRequest')
      request = await replacementModel.findOne({ id: req.params.reqId });
    if (request.type === 'accidentalLeave')
      request = await accidentalLeaveModel.findOne({ id: req.params.reqId });
    if (request.type === 'sickLeave')
      request = await sickLeaveModel.findOne({ id: req.params.reqId });
    if (request.type === 'maternityLeave')
      request = await maternityLeaveModel.findOne({ id: req.params.reqId });
    if (request.type === 'compensationRequest')
      request = await compensationLeaveModel.findOne({ id: req.params.reqId });
    if (request.type === 'dayOffChangeRequest') {
      request = await dayOffChangeModel.findOne({ id: req.params.reqId });
    }
    if (request.type === 'slotLinkingRequest')
      request = await slotLinkingModel.findOne({ id: req.params.reqId });
    if (request.status !== "Pending") {
      res.status(409).send("Already responded");
      return;
    }
    request.HODComment = req.body.HODComment;
    request.status = "Rejected";
    try {
      await request.save();
    }
    catch (error) {
      res.status(500).send(error);
      return;
    }
    let notification = new notificationModel({
      user: request.requestedBy,
      message: `Your request(${req.params.reqId}) has been rejected by the hod.`
    });
    notification.save();
    res.send(request);
  });

router.route("/staff-requests")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    let hod = await academicMemberModel.findOne({ id: authAccessToken.id });
    let requests = await requestModel.find({ $and: [{ $nor: [{ type: "slotLinkingRequest" }] }, { status: "Pending" }] });
    for (let i = 0; i < requests.length; i++) {
      let request = requests[i];
      let staffMember = await academicMemberModel.findOne({ id: request.requestedBy });
      if (staffMember.department !== hod.department) {
        requests.splice(i);
        i--;
      }
    }
    res.send(requests);
  });

router.route("/view-teaching-assignments")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    let hod = await academicMemberModel.findOne({ id: authAccessToken.id });
    let dep = await departmentModel.findOne({ headOfDepartment: hod.id });
    let course = await courseModel.findOne({ id: req.body.course, department: dep._id });
    if (!course) {
      res.send("No such course");
      return;
    }
    let slots = await slotModel.find({ course: course._id });
    res.send(slots); // all info of slots
  });

module.exports = router;
