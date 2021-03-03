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
  if (req.token.role === "Course Instructor" || req.token.role === "Head of Department") {
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

router.route("/assign-teaching-assistant")
  .post(async (req, res) => {
    if (!req.body.courseId || !req.body.academicId) {
      res.status(400).send("Not all required fields are entered");
      return;
    }
    if (typeof req.body.academicId !== "string" || typeof req.body.courseId !== "string") {
      res.status(400).send("Wrong data types entered");
      return;
    }
    const user = await academicMemberModel.findOne({ id: req.token.id });
    const teachingAssistant = await academicMemberModel.findOne({ id: req.body.academicId });
    const course = await courseModel.findOne({ id: req.body.courseId });

    if (!teachingAssistant) {
      res.status(404).send("Incorrect TA id");
      return;
    }
    if (!course) {
      res.status(404).send("Incorrect course Id");
      return;
    }
    if (!course.courseInstructors.includes(user.id)) {
      res.status(403).send("You are not assigned to this course");
      return;
    }
    if (teachingAssistant.department !== user.department) {
      res.status(422).send("Academic is in a different department");
      return;
    }
    if (teachingAssistant.role === "Course Instructor" || teachingAssistant.role === "Head of Department") {
      res.status(422).send("Academic is not a TA");
      return;
    }
    if (course.teachingAssistants.includes(teachingAssistant.id)) {
      res.status(409).send("TA is already assigned to this course");
      return;
    }

    course.teachingAssistants.push(teachingAssistant.id);
    try {
      await course.save();
      res.send("TA assigned to course successfully");
    }
    catch (error) {
      res.status(500).send(error.messages);
    }
  });

router.route("/unassign-teaching-assistant/:academicId/:courseId")
  .put(async (req, res) => {
    const user = await academicMemberModel.findOne({ id: req.token.id });
    const teachingAssistant = await academicMemberModel.findOne({ id: req.params.academicId });
    const course = await courseModel.findOne({ id: req.params.courseId });

    if (!teachingAssistant) {
      res.status(404).send("Incorrect teaching assistant Id");
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
    if (teachingAssistant.department !== user.department) {
      res.status(422).send("Academic is in a different department");
      return;
    }
    if (teachingAssistant.role === "Course Instructor" || teachingAssistant.role === "Head of Department") {
      res.status(422).send("Academic is not a TA");
      return;
    }
    if (!course.teachingAssistants.includes(teachingAssistant.id)) {
      res.status(422).send("TA is not assiged to this course");
      return;
    }
    const slots = await slotModel.find({ course: course._id, staffMember: teachingAssistant.id });
    if (slots.length !== 0) {
      res.status(409).send("Cannot unassign TA. Reassign slots first");
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
      if (coordinatorCourses.length === 1) {
        await teachingAssistant.save();
      }
      res.send("TA unassigned from course successfully");
    }
    catch (error) {
      res.status(500).send(error.messages);
    }
  });

router.route("/assign-course-coordinator")
  .post(async (req, res) => {
    if (!req.body.courseId || !req.body.academicId) {
      res.status(400).send("Not all required fields are entered");
      return;
    }
    if (typeof req.body.academicId !== "string" || typeof req.body.courseId !== "string") {
      res.status(400).send("Wrong data types entered");
      return;
    }
    const user = await academicMemberModel.findOne({ id: req.token.id });
    const teachingAssistant = await academicMemberModel.findOne({ id: req.body.academicId });
    const course = await courseModel.findOne({ id: req.body.courseId });

    if (!teachingAssistant) {
      res.status(404).send("Incorrect TA id");
      return;
    }
    if (!course) {
      res.status(404).send("Incorrect course id");
      return;
    }
    if (!course.courseInstructors.includes(user.id)) {
      res.status(403).send("You are not assigned to this course");
      return;
    }
    if (teachingAssistant.department !== user.department) {
      res.status(422).send("Academic is in a different department");
      return;
    }
    if (!course.teachingAssistants.includes(teachingAssistant.id)) {
      res.status(422).send("TA is not assigned to this course");
      return;
    }
    if (teachingAssistant.role === "Course Instructor" || teachingAssistant.role === "Head of Department") {
      res.status(422).send("Academic is not a TA");
      return;
    }
    if (course.courseCoordinator !== "UNASSIGNED") {
      res.status(409).send("Course is already assigned a course coordinator");
      return;
    }

    course.courseCoordinator = teachingAssistant.id;
    teachingAssistant.role = "Course Coordinator";
    try {
      await course.save();
      await teachingAssistant.save();
      res.send("Course coordinator assigned to course successfully");
    }
    catch (error) {
      res.status(500).send(error.messages);
    }
  });

router.route("/unassign-course-coordinator/:academicId/:courseId")
  .put(async (req, res) => {
    const user = await academicMemberModel.findOne({ id: req.token.id });
    const teachingAssistant = await academicMemberModel.findOne({ id: req.params.academicId });
    const course = await courseModel.findOne({ id: req.params.courseId });

    if (!teachingAssistant) {
      res.status(404).send("Incorrect Academic Id");
      return;
    }
    if (!course) {
      res.status(404).send("Incorrect course Id");
      return;
    }
    if (!course.courseInstructors.includes(user.id)) {
      res.status(403).send("You are not assigned to this course");
      return;
    }
    if (teachingAssistant.department !== user.department) {
      res.status(422).send("Academic is in a different department");
      return;
    }
    if (teachingAssistant.role === "Course Instructor" || teachingAssistant.role === "Head of Department") {
      res.status(422).send("Academic is not a TA");
      return;
    }
    if (!course.teachingAssistants.includes(teachingAssistant.id)) {
      res.status(422).send("TA is not assigned to this course");
      return;
    }
    if (course.courseCoordinator !== teachingAssistant.id) {
      res.status(422).send("TA is not a course coordinator for this course");
      return;
    }

    course.courseCoordinator = "UNASSIGNED";
    const coordinatorCourses = await courseModel.find({ courseCoordinator: teachingAssistant.id });
    if (coordinatorCourses.length === 1) {
      teachingAssistant.role = "Teaching Assistant";
    }
    try {
      await course.save();
      if (coordinatorCourses.length === 1) {
        await teachingAssistant.save();
      }
      res.send("Course coordinator unassigned from course successfully");
    }
    catch (error) {
      res.status(500).send(error.messages);
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
    let academicMember = await academicMemberModel.findOne({ id: req.body.id });
    let room = await roomModel.findOne({ name: req.body.room });
    if (!academicMember) {
      res.status(404).send("Incorrect academic id");
      return;
    }
    if (academicMember.role !== "Teaching Assistant" && academicMember.role !== "Course Coordinator" && room.type !== "Lecture") {
      res.status(403).send("Cannot assign course instructor to a tutorial or lab");
      return;
    }
    if (academicMember.role !== "Head of Department" && academicMember.role !== "Course Instructor" && room.type === "Lecture") {
      res.status(403).send("Cannot assign teaching assistant to a lecture");
      return;
    }
    let slot = await slotModel.findOne({ day: req.body.day, slotNumber: req.body.slotNumber + "", room: room._id });
    if (!slot) {
      res.status(404).send("Invalid slot");
      return;
    }
    if (!(slot.staffMember === "UNASSIGNED")) {
      res.status(499).send("Slot is already assigned");
      return;
    }
    let otherSlot = await slotModel.findOne({ day: req.body.day, slotNumber: req.body.slotNumber, staffMember: academicMember.id });
    if (otherSlot) {
      res.send("Academic is assigned to another slot in the same time");
      return;
    }
    slot.staffMember = academicMember.id;
    try {
      await slot.save();
      res.send("Slot assigned successfully");
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
    let room = await roomModel.findOne({ name: req.body.room });
    let slot = await slotModel.findOne({ day: req.body.day, slotNumber: req.body.slotNumber, room: room._id });
    if (!slot) {
      res.status(400).send("Incorrect slot details");
      return;
    }
    slot.staffMember = "UNASSIGNED";
    try {
      await slot.save();
      res.send("Unassigned successfully");

    }
    catch (error) {
      res.send(error);
    }
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

module.exports = router;
