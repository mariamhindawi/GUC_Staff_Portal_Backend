require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const academicMemberModel = require("../models/academic_member_model");
const departmentModel = require("../models/department_model");
const roomModel = require("../models/room_model");
const courseModel = require("../models/course_model");
const slotModel = require("../models/slot_model");

const router = express.Router();

router.use((req, res, next) => {
  const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
  if (authAccessToken.role === "Course Instructor" || authAccessToken.role === "Head of Department") {
    next();
  }
  else {
    res.status(403).send("Unauthorized access.");
  }
});

router.route("/get-my-courses-coverage")
  .get(async (req, res) => {
    const user = await academicMemberModel.findOne({ id: req.token.id });
    const department = await departmentModel.findById(user.department);
    const courses = await courseModel.find({ courseInstructors: user.id });
    const coursesCoverage = [];
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      const unassignedSlots = await slotModel.find({ course: course._id, staffMember: "UNASSIGNED" });
      const totalSlots = await slotModel.find({ course: course._id });
      const coverage = totalSlots.length === 0 ? 0 : ((totalSlots.length - unassignedSlots.length) / (totalSlots.length)) * 100;
      coursesCoverage.push(Math.round(coverage));
      course.department = department ? department.name : "UNASSIGNED";
    }
    res.send({ courses, coursesCoverage });
  });

router.route("/assign-course-coordinator/:id/:course")
  .post(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);

    let user = await academicMemberModel.findOne({ id: authAccessToken.id });
    let course = await courseModel.findOne({ id: req.params.course });
    let academic = await academicMemberModel.findOne({ id: req.params.id });

    if (!course) {
      res.status(404).send("Incorrect course Id");
      return;
    }
    if (!course.courseInstructors.includes(user.id)) {
      res.status(403).send("You are not assigned to this course");
      return;
    }
    if (course.courseCoordinator !== "UNASSIGNED") {
      res.status(422).send("There is a course coordinator assigned to this course");
      return;
    }
    if (!academic) {
      res.status(404).send("Incorrect academic Id");
      return;
    }
    if (!course.teachingAssistants.includes(academic.id) && !course.courseInstructors.includes(academic.id)) {
      res.status(422).send("Academic is not assigned to this course");
      return;
    }
    if (course.courseInstructors.includes(academic.id)) {
      res.status(422).send("Academic is not a teaching assistant in this course");
      return;
    }

    course.courseCoordinator = academic.id;
    academic.role = "Course Coordinator";

    try {
      await course.save();
      await academic.save();
      res.send("Course coordinator assigned to course successfully");
    }
    catch (error) {
      console.log(error.message);
      res.status(400).send(error.messages);
    }
  });

router.route("/unassign-course-coordinator/:id/:course")
  .put(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);

    let user = await academicMemberModel.findOne({ id: authAccessToken.id });
    let course = await courseModel.findOne({ id: req.params.course });
    let academic = await academicMemberModel.findOne({ id: req.params.id });

    if (!course) {
      res.status(404).send("Incorrect course Id");
      return;
    }
    if (!course.courseInstructors.includes(user.id)) {
      res.status(403).send("You are not assigned to this course");
      return;
    }
    if (!academic) {
      res.status(404).send("Incorrect Academic Id");
      return;
    }
    if (!course.teachingAssistants.includes(academic.id) && !course.courseInstructors.includes(academic.id)) {
      res.status(422).send("Academic is not assigned to this course");
      return;
    }
    if (!course.teachingAssistants.includes(academic.id)) {
      res.status(422).send("Academic is not a teaching assistant in this course");
      return;
    }
    if (course.courseCoordinator !== academic.id) {
      res.status(422).send("This teaching assistant is not a course coordinator for this course");
      return;
    }

    course.courseCoordinator = "UNASSIGNED";
    let allCourses = await courseModel.find({ courseCoordinator: academic.id });
    if (allCourses.length === 0) {
      academic.role = "Teaching Assistant";
    }

    try {
      await course.save();
      await academic.save();
      res.send("Course coordinator unassigned from course successfully");
    }
    catch (error) {
      console.log(error.message);
      res.status(400).send(error.messages);
    }
  });

router.route("/assign-teaching-assistant/:id/:course")
  .post(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    let user = await academicMemberModel.findOne({ id: authAccessToken.id });
    let course = await courseModel.findOne({ id: req.params.course });
    let ta = await academicMemberModel.findOne({ id: req.params.id });

    if (!ta || (ta.role === "Course Instructor" || ta.role === "Head of Department")) {
      res.status(404).send("Incorrect Teaching assistant Id");
      return;
    }
    if (!course) {
      res.status(404).send("Incorrect course Id");
      return;
    }
    if (!course.courseInstructors.includes(user.id)) {
      res.status(403).send("You are not assigned to this course.");
      return;
    }
    if (ta.department !== user.department) {
      res.status(403).send("Cannot add a teaching assistant that is not in your department.");
      return;
    }
    course.teachingAssistants.push(ta.id);
    try {
      await course.save();
      res.send("TA assigned to course successfully");
    }
    catch (error) {
      console.log(error.message);
      res.status(400).send(error.messages);
    }
  });

router.route("/unassign-teaching-assistant/:id/:course")
  .delete(async (req, res) => {
    const course = await courseModel.findOne({ id: req.params.course });
    const teachingAssistant = await academicMemberModel.findOne({ id: req.params.id });
    if (!teachingAssistant) {
      res.status(404).send("Incorrect teaching assistant Id");
      return;
    }
    if (teachingAssistant.role === "Course Instructor" || teachingAssistant.role === "Head of Department") {
      res.status(422).send("User is not a teaching assistant");
      return;
    }
    if (!course) {
      res.status(404).send("Incorrect course Id");
      return;
    }
    if (!course.courseInstructors.includes(req.token.id)) {
      res.status(403).send("You are not assigned to this course");
      return;
    }
    if (!course.teachingAssistants.includes(teachingAssistant.id)) {
      res.status(422).send("Teaching assistant is not assiged to this course");
      return;
    }

    if (course.courseCoordinator === teachingAssistant.id) {
      course.courseCoordinator = "UNASSIGNED";
    }
    const coordinatorCourses = await courseModel.find({ courseCoordinator: teachingAssistant.id });
    if (coordinatorCourses.length === 1) {
      teachingAssistant.role = "Teaching Assistant";
    }
    const index = course.teachingAssistants.indexOf(teachingAssistant.id);
    course.teachingAssistants.splice(index, 1);

    try {
      await course.save();
      res.send("Teaching assistant unassigned from course successfully");
    }
    catch (error) {
      res.status(400).send(error.messages);
    }
  });

router.route("/view-teaching-assignments")
  .get(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    let courseInstructor = await academicMemberModel.findOne({ id: authAccessToken.id });
    let course = await courseModel.findOne({ id: req.body.course, courseInstructors: courseInstructor.id });
    if (!course) {
      res.send("No such course");
      return;
    }
    let slots = await slotModel.find({ course: course._id });
    res.body.send(slots); // all info of slots
  });

router.route("/assign-academic-member-to-slot")
  .put(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    let academicMember = await academicMemberModel.findOne({ id: req.body.id });
    if (!academicMember) {
      res.send("No TA with such id");
      return;
    }
    if (!(academicMember.role === "Teaching Assistant" || academicMember.role === "Course Coordinator")) {
      res.send("academic member is not a TA");
      return;
    }
    let room = await roomModel.findOne({ name: req.body.room });
    let slot = await slotModel.findOne({ day: req.body.day, slotNumber: req.body.slotNumber, room: room._id });
    if (!slot) {
      res.body.send("No such slot");
      return;
    }
    if (!(slot.staffMember === "UNASSIGNED")) {
      res.send("Slot already assigned.. try updating it");
      return;
    }
    let otherSlot = await slotModel.findOne({ day: req.body.day, slotNumber: req.body.slotNumber, staffMember: academicMember.id });
    console.log(otherSlot);
    if (otherSlot) {
      res.send("This TA is assigned to another slot in the same time");
      return;
    }
    slot.staffMember = academicMember.id;
    try {
      await slot.save();
      res.send(slot);
    }
    catch (error) {
      res.body.send(error);
    }
  });

router.route("/update-academic-member-to-slot")
  .put(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    let academicMember = await academicMemberModel.findOne({ id: req.body.id });
    if (!academicMember) {
      res.send("No TA with such id");
      return;
    }
    if (!(academicMember.role === "Teaching Assistant" || academicMember.role === "Course Coordinator")) {
      res.send("academic member is not a TA");
      return;
    }
    let room = await roomModel.findOne({ name: req.body.room });
    let course = await courseModel.findOne({ id: req.body.course });
    let slot = await slotModel.findOne({ day: req.body.day, slotNumber: req.body.slotNumber, room: room._id, course: course._id, type: req.body.type });
    if (!slot) {
      res.body.send("No such slot");
      return;
    }
    slot.staffMember = academicMember.id;
    try {
      await slot.save();
      res.send("Assigned to slot");
    }
    catch (error) {
      res.send(error);
    }
  });

router.route("/delete-academic-member-from-slot")
  .delete(async (req, res) => {
    const authAccessToken = jwt.decode(req.headers["auth-access-token"]);
    let room = await roomModel.findOne({ name: req.body.room });
    let slot = await slotModel.findOne({ day: req.body.day, slotNumber: req.body.slotNumber, room: room._id });
    if (!slot) {
      res.send("No such slot");
      return;
    }
    console.log(slot);
    slot.staffMember = "UNASSIGNED";
    try {
      await slot.save();
      res.send("Deleted successfully");

    }
    catch (error) {
      res.send(error);
    }
  });

module.exports = router;
