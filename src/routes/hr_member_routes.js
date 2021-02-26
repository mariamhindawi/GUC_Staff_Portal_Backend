const express = require("express");
const bcrypt = require("bcrypt");
const { getMissingDays, getHours } = require("../others/helpers");
const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");
const courseModel = require("../models/course_model");
const departmentModel = require("../models/department_model");
const facultyModel = require("../models/faculty_model");
const attendanceRecordModel = require("../models/attendance_record_model");
const slotModel = require("../models/slot_model");
const notificationModel = require("../models/notification_model");
const { requestModel } = require("../models/request_model");
const authRefreshTokenModel = require("../models/refresh_token_model");

const router = express.Router();

router.use((req, res, next) => {
  if (req.token.role === "HR") {
    next();
  }
  else {
    res.status(403).send("Unauthorized access.");
  }
});

router.route("/get-hr-members")
  .get(async (req, res) => {
    const hrMembers = await hrMemberModel.find();
    for (let i = 0; i < hrMembers.length; i++) {
      const hrMember = hrMembers[i];
      const office = await roomModel.findOne({ _id: hrMember.office });
      hrMember.office = office.name;
    }
    res.send(hrMembers);
  });

router.route("/add-hr-member")
  .post(async (req, res) => {
    if (!req.body.email) {
      res.status(400).send("Email is required");
      return;
    }

    if (!new RegExp(process.env.MAIL_FORMAT).test(req.body.email)) {
      res.status(400).send("Invalid email address");
      return;
    }

    const existingUser = await hrMemberModel.findOne({ email: req.body.email })
      || await academicMemberModel.findOne({ email: req.body.email });

    if (existingUser) {
      res.status(409).send("Email already exists");
      return;
    }

    const office = await roomModel.findOne({ name: req.body.office });
    if (!office) {
      res.status(404).send("Incorrect Office Name");
      return;
    }
    if (office.type !== "Office") {
      res.status(422).send("Room must be an office");
      return;
    }
    if (office.remainingCapacity === 0) {
      res.status(409).send("Office has full capacity");
      return;
    }
    office.remainingCapacity--;

    const salt = await bcrypt.genSalt(10);
    const newPassword = await bcrypt.hash("123456", salt);

    let newUserCount;
    await hrMemberModel.nextCount().then(count => {
      newUserCount = count;
    });

    const newUser = new hrMemberModel({
      id: "hr-" + newUserCount,
      name: req.body.name,
      email: req.body.email,
      password: newPassword,
      gender: req.body.gender,
      office: office._id,
      salary: req.body.salary
    });

    try {
      await newUser.save();
      await office.save();
      res.send("User added successfully");
    }
    catch (error) {
      res.status(500).send(error.messages);
    }
  });

router.route("/update-hr-member/:id")
  .put(async (req, res) => {
    const user = await hrMemberModel.findOne({ id: req.params.id });
    if (!user) {
      res.status(404).send("Incorrect user id");
      return;
    }

    if (req.body.name) {
      user.name = req.body.name;
    }

    if (req.body.email) {
      if (!new RegExp(process.env.MAIL_FORMAT).test(req.body.email)) {
        res.status(400).send("Invalid email address");
        return;
      }
      const existingUser = await hrMemberModel.findOne({ email: req.body.email })
        || await academicMemberModel.findOne({ email: req.body.email });
      if (existingUser && existingUser.id !== user.id) {
        res.status(409).send("Email already exists");
        return;
      }
      user.email = req.body.email;
    }

    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);
      user.password = hashedPassword;
    }

    if (req.body.gender) {
      user.gender = req.body.gender;
    }

    if (req.body.office) {
      var newOffice = await roomModel.findOne({ name: req.body.office });
      if (!newOffice) {
        res.status(404).send("Incorrect office name");
        return;
      }
      if (newOffice.type !== "Office") {
        res.status(422).send("Room must be an office");
        return;
      }
      if (newOffice.remainingCapacity === 0 && newOffice._id.toString() !== user.office) {
        res.status(409).send("Office has full capacity");
        return;
      }
      var oldOffice = await roomModel.findOne({ _id: user.office });
      if (oldOffice._id.toString() !== newOffice._id.toString()) {
        oldOffice.remainingCapacity++;
        newOffice.remainingCapacity--;
        user.office = newOffice._id;
      }
    }

    if (req.body.salary) {
      user.salary = req.body.salary;
    }

    try {
      await user.save();
      if (req.body.office && oldOffice._id.toString() !== newOffice._id.toString()) {
        await newOffice.save();
        await oldOffice.save();
      }
      if (req.body.password) {
        await authRefreshTokenModel.deleteMany({ user: user.id });
      }
      res.send("User updated successfully");
    }
    catch (error) {
      res.status(500).send(error.message);
    }
  });

router.route("/delete-hr-member/:id")
  .delete(async (req, res) => {
    try {
      const user = await hrMemberModel.findOneAndDelete({ id: req.params.id });
      if (!user) {
        res.status(404).send("Incorrect user id");
        return;
      }

      const office = await roomModel.findOne({ _id: user.office });
      office.remainingCapacity++;
      await office.save();

      await attendanceRecordModel.deleteMany({ user: user.id });
      await authRefreshTokenModel.deleteMany({ user: user.id });

      res.send("User deleted successfully");
    }
    catch (error) {
      res.status(500).send(error.message);
    }
  });

router.route("/get-academic-members")
  .get(async (req, res) => {
    const academics = await academicMemberModel.find();
    for (let i = 0; i < academics.length; i++) {
      const academic = academics[i];
      const office = await roomModel.findOne({ _id: academic.office });
      academic.office = office.name;
      if (academic.department !== "UNASSIGNED") {
        const department = await departmentModel.findOne({ _id: academic.department });
        academic.department = department.name;
      }
    }
    res.send(academics);
  });

router.route("/add-academic-member")
  .post(async (req, res) => {
    if (!req.body.email) {
      res.status(400).send("Email is required");
      return;
    }

    if (!new RegExp(process.env.MAIL_FORMAT).test(req.body.email)) {
      res.status(400).send("Invalid email address");
      return;
    }

    const existingUser = await hrMemberModel.findOne({ email: req.body.email })
      || await academicMemberModel.findOne({ email: req.body.email });

    if (existingUser) {
      res.status(409).send("Email already exists");
      return;
    }

    if (req.body.department) {
      var department = await departmentModel.findOne({ name: req.body.department });
      if (!department) {
        res.status(404).send("Incorrect department name");
        return;
      }
    }

    if (req.body.role === "Course Coordinator") {
      res.status(403).send("Cannot assign an academic member to be a course coordinator");
      return;
    }
    else if (req.body.role === "Head of Department") {
      if (!department) {
        res.status(422).send("Cannot assign an academic member to be a head of department without specifying the department");
        return;
      }
      if (department.headOfDepartment !== "UNASSIGNED") {
        res.status(409).send("Department already has a head");
        return;
      }
    }

    const office = await roomModel.findOne({ name: req.body.office });
    if (!office) {
      res.status(404).send("Incorrect office name");
      return;
    }
    if (office.type !== "Office") {
      res.status(422).send("Room must be an office");
      return;
    }
    if (office.remainingCapacity === 0) {
      res.status(409).send("Office has full capacity");
      return;
    }
    office.remainingCapacity--;

    const salt = await bcrypt.genSalt(10);
    const newPassword = await bcrypt.hash("123456", salt);

    let newUserCount;
    await academicMemberModel.nextCount().then(count => {
      newUserCount = count;
    });

    const newUser = new academicMemberModel({
      id: "ac-" + newUserCount,
      name: req.body.name,
      email: req.body.email,
      password: newPassword,
      gender: req.body.gender,
      role: req.body.role,
      department: department ? department._id : "UNASSIGNED",
      office: office._id,
      salary: req.body.salary,
      dayOff: req.body.dayOff
    });

    try {
      await newUser.save();
      await office.save();
      if (req.body.role === "Head of Department") {
        department.headOfDepartment = newUser.id;
        await department.save();
      }
      res.send("User added successfully");
    }
    catch (error) {
      res.status(500).send(error.message);
    }
  });

router.route("/update-academic-member/:id")
  .put(async (req, res) => {
    const user = await academicMemberModel.findOne({ id: req.params.id });
    if (!user) {
      res.status(404).send("Incorrect user id");
      return;
    }

    if (req.body.name) {
      user.name = req.body.name;
    }

    if (req.body.email) {
      if (!new RegExp(process.env.MAIL_FORMAT).test(req.body.email)) {
        res.status(400).send("Invalid email address");
        return;
      }
      const existingUser = await hrMemberModel.findOne({ email: req.body.email })
        || await academicMemberModel.findOne({ email: req.body.email });
      if (existingUser && existingUser.id !== user.id) {
        res.status(409).send("Email already exists");
        return;
      }
      user.email = req.body.email;
    }

    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);
      user.password = hashedPassword;
    }

    if (req.body.gender) {
      user.gender = req.body.gender;
    }

    if (req.body.department) {
      var department = await departmentModel.findOne({ name: req.body.department });
      if (!department) {
        res.status(404).send("Incorrect department name");
        return;
      }
      var oldDepartment = await departmentModel.findOne({ _id: user.department });
      if (!req.body.role && user.role === "Head of Department") {
        if (department.headOfDepartment !== "UNASSIGNED" && department.headOfDepartment !== user.id) {
          res.status(409).send("Department already has a head");
          return;
        }
        oldDepartment.headOfDepartment = "UNASSIGNED";
        department.headOfDepartment = user.id;
      }
      if (req.body.role === "Head of Department") {
        if (department.headOfDepartment !== "UNASSIGNED" && department.headOfDepartment !== user.id) {
          res.status(409).send("Department already has a head");
          return;
        }
        if (user.role === "Head of Department") {
          oldDepartment.headOfDepartment = "UNASSIGNED";
        }
        department.headOfDepartment = user.id;
      }
      user.department = department._id;
    }

    if (req.body.role) {
      if (req.body.role === "Course Coordinator" && user.role !== "Course Coordinator") {
        res.status(403).send("You cannot assign an academic member to be a course coordinator");
        return;
      }
      if (req.body.role === "Head of Department" && !req.body.department) {
        var department = await departmentModel.findOne({ _id: user.department });
        if (department.headOfDepartment !== "UNASSIGNED" && department.headOfDepartment !== user.id) {
          res.status(409).send("Department already has a head");
          return;
        }
        department.headOfDepartment = user.id;
      }
      if (req.body.role !== "Head of Department" && user.role === "Head of Department") {
        if (req.body.department) {
          oldDepartment.headOfDepartment = "UNASSIGNED";
        }
        else {
          department = await departmentModel.findOne({ _id: user.department });
          department.headOfDepartment = "UNASSIGNED";
        }
      }
      user.role = req.body.role;
    }

    if (req.body.office) {
      var newOffice = await roomModel.findOne({ name: req.body.office });
      if (!newOffice) {
        res.status(404).send("Incorrect office name");
        return;
      }
      if (newOffice.type !== "Office") {
        res.status(422).send("Room must be an office");
        return;
      }
      if (newOffice.remainingCapacity === 0 && newOffice._id.toString() !== user.office) {
        res.status(409).send("Office has full capacity");
        return;
      }
      var oldOffice = await roomModel.findOne({ _id: user.office });
      if (oldOffice._id.toString() !== newOffice._id.toString()) {
        oldOffice.remainingCapacity++;
        newOffice.remainingCapacity--;
        user.office = newOffice._id;
      }
    }

    if (req.body.salary) {
      user.salary = req.body.salary;
    }

    if (req.body.dayOff) {
      user.dayOff = req.body.dayOff;
    }

    try {
      await user.save();
      if (req.body.office && oldOffice._id.toString() !== newOffice._id.toString()) {
        await newOffice.save();
        await oldOffice.save();
      }
      if (department) {
        await department.save();
      }
      if (oldDepartment) {
        await oldDepartment.save();
      }
      if (req.body.password) {
        await authRefreshTokenModel.deleteMany({ user: user.id });
      }
      res.send("User updated successfully");
    }
    catch (error) {
      res.status(500).send(error.message);
    }
  });

router.route("/delete-academic-member/:id")
  .delete(async (req, res) => {
    try {
      const user = await academicMemberModel.findOne({ id: req.params.id });
      if (!user) {
        res.status(404).send("Incorrect user id");
        return;
      }

      const slots = await slotModel.find({ staffMember: user.id });
      if (slots.length !== 0) {
        res.status(409).send("Cannot delete user. Reassign their slots first");
        return;
      }

      await academicMemberModel.deleteOne({ id: user.id });

      const office = await roomModel.findOne({ _id: user.office });
      office.remainingCapacity++;
      await office.save();

      if (user.role === "Teaching Assistant" || user.role === "Course Coordinator") {
        const courses = await courseModel.find({ teachingAssistants: user.id });
        for (let i = 0; i < courses.length; i++) {
          const course = courses[i];
          const userIndex = course.teachingAssistants.indexOf(user.id);
          course.teachingAssistants.splice(userIndex, 1);
          await course.save();
        }
      }
      else {
        const courses = await courseModel.find({ courseInstructors: user.id });
        for (let i = 0; i < courses.length; i++) {
          const course = courses[i];
          const userIndex = course.courseInstructors.indexOf(user.id);
          course.courseInstructors.splice(userIndex, 1);
          await course.save();
        }
      }

      if (user.role === "Course Coordinator") {
        const courses = await courseModel.find({ courseCoordinator: user.id });
        for (let i = 0; i < courses.length; i++) {
          const course = courses[i];
          course.courseCoordinator = "UNASSIGNED";
          await course.save();
        }
      }
      else if (user.role === "Head of Department") {
        let department = await departmentModel.findOne({ headOfDepartment: user.id });
        department.headOfDepartment = "UNASSIGNED";
        await department.save();
      }

      await authRefreshTokenModel.deleteMany({ user: user.id });
      await attendanceRecordModel.deleteMany({ user: user.id });
      await notificationModel.deleteMany({ user: user.id });
      await requestModel.deleteMany({ requestedBy: user.id });

      res.send("User deleted successfully");
    }
    catch (error) {
      res.status(500).send(error.message);
    }
  });

router.route("/get-rooms")
  .get(async (req, res) => {
    const rooms = await roomModel.find();
    res.send(rooms);
  });

router.route("/add-room")
  .post(async (req, res) => {
    const newRoom = new roomModel({
      name: req.body.name,
      capacity: req.body.capacity,
      remainingCapacity: req.body.capacity,
      type: req.body.type
    });

    try {
      await newRoom.save();
      res.send("Room added successfully");
    }
    catch (error) {
      res.status(500).send(error.message);
    }
  });

router.route("/update-room/:room")
  .put(async (req, res) => {
    const room = await roomModel.findOne({ name: req.params.room });
    if (!room) {
      res.status(404).send("Incorrect room name");
      return;
    }

    if (req.body.name) {
      room.name = req.body.name;
    }

    const personsAssigned = room.capacity - room.remainingCapacity;
    if (req.body.capacity) {
      if (personsAssigned > req.body.capacity) {
        res.status(409).send("Cannot update capacity, Reassign people in office first");
        return;
      }
      room.capacity = req.body.capacity;
      room.remainingCapacity = req.body.capacity - personsAssigned;
    }

    if (req.body.type) {
      if (room.type === "Office" && req.body.type !== "Office" && personsAssigned > 0) {
        res.status(409).send("Cannot update type. Reassign people in office first");
        return;
      }

      const slot = await slotModel.findOne({ room: room._id });
      if (slot && room.type !== req.body.type) {
        res.status(409).send("Cannot update type. Reassign slots first");
        return;
      }

      room.type = req.body.type;
    }

    try {
      await room.save();
      res.send("Room updated successfully");
    }
    catch (error) {
      res.status(500).send(error.message);
    }
  });

router.route("/delete-room/:room")
  .delete(async (req, res) => {
    const room = await roomModel.findOne({ name: req.params.room });
    if (!room) {
      res.status(404).send("Incorrect room name");
      return;
    }

    const slot = await slotModel.findOne({ room: room._id });
    if (slot) {
      res.status(409).send("Cannot delete room. Reassign slots first");
      return;
    }

    if (room.type === "Office" && room.capacity !== room.remainingCapacity) {
      res.status(409).send("Cannot delete room. Reassign people in it first");
      return;
    }

    await roomModel.findOneAndDelete({ name: req.params.room });
    res.send("Room deleted successfully");
  });

router.route("/get-faculties")
  .get(async (req, res) => {
    const faculties = await facultyModel.find();
    res.send(faculties);
  });

router.route("/add-faculty")
  .post(async (req, res) => {
    const newFaculty = new facultyModel({
      name: req.body.name,
    });

    try {
      await newFaculty.save();
      res.send("Faculty added successfully");
    }
    catch (error) {
      res.status(500).send(error.message);
    }
  });

router.route("/update-faculty/:faculty")
  .put(async (req, res) => {
    const faculty = await facultyModel.findOne({ name: req.params.faculty });
    if (!faculty) {
      res.status(404).send("Incorrect faculty name");
      return;
    }

    faculty.name = req.body.name;
    try {
      await faculty.save();
      res.send("Faculty updated successfully");
    }
    catch (error) {
      res.status(500).send(error.message);
    }
  });

router.route("/delete-faculty/:faculty")
  .delete(async (req, res) => {
    const faculty = await facultyModel.findOneAndDelete({ name: req.params.faculty });
    if (!faculty) {
      res.status(404).send("Incorrect faculty name");
      return;
    }

    const departments = await departmentModel.find({ faculty: faculty._id });
    for (let i = 0; i < departments.length; i++) {
      const department = departments[i];
      department.faculty = "UNASSIGNED";
      department.save();
    }

    res.send("Faculty deleted successfully");
  });

router.route("/get-departments")
  .get(async (req, res) => {
    const departments = await departmentModel.find();
    for (let i = 0; i < departments.length; i++) {
      const department = departments[i];
      if (department.faculty !== "UNASSIGNED") {
        const faculty = await facultyModel.findById(department.faculty);
        department.faculty = faculty.name;
      }
    }
    res.send(departments);
  });

router.route("/add-department")
  .post(async (req, res) => {
    if (req.body.faculty) {
      var faculty = await facultyModel.findOne({ name: req.body.faculty });
      if (!faculty) {
        res.status(404).send("Incorrect faculty name");
        return;
      }
    }

    if (req.body.headOfDepartment) {
      var headOfDepartment = await academicMemberModel.findOne({ id: req.body.headOfDepartment });
      if (!headOfDepartment) {
        res.status(404).send("Incorrect academic member id");
        return;
      }
      if (headOfDepartment.role === "Head of Department") {
        res.status(409).send("Academic member is already the head of another department");
        return;
      }
      if (headOfDepartment.role !== "Course Instructor") {
        res.status(409).send("Academic member is not an instructor");
        return;
      }
      if (headOfDepartment.department !== "UNASSIGNED") {
        res.status(409).send("Academic member is in another department");
        return;
      }
    }

    const newDepartment = new departmentModel({
      name: req.body.name,
      faculty: faculty ? faculty._id : "UNASSIGNED",
      headOfDepartment: headOfDepartment ? headOfDepartment.id : "UNASSIGNED"
    });

    try {
      await newDepartment.save();
      if (headOfDepartment) {
        newDepartment = await departmentModel.findOne({ name: req.body.name });
        headOfDepartment.role = "Head of Department";
        headOfDepartment.department = newDepartment._id;
        await headOfDepartment.save();
      }
      res.send("Department added successfully");
    }
    catch (error) {
      res.status(500).send(error.message);
    }
  });

router.route("/update-department/:department")
  .put(async (req, res) => {
    const department = await departmentModel.findOne({ name: req.params.department });
    if (!department) {
      res.status(404).send("Incorrect department name");
      return;
    }

    if (req.body.name) {
      department.name = req.body.name;
    }
    if (req.body.faculty) {
      if (req.body.faculty === "UNASSIGNED") {
        department.faculty = "UNASSIGNED";
      }
      else {
        const faculty = await facultyModel.findOne({ name: req.body.faculty });
        if (!faculty) {
          res.status(404).send("Incorrect faculty name");
          return;
        }
        department.faculty = faculty._id;

      }
    }
    if (req.body.headOfDepartment) {
      var newHeadOfDepartment = await academicMemberModel.findOne({ id: req.body.headOfDepartment });
      if (!newHeadOfDepartment) {
        res.status(404).send("Incorrect academic member id");
        return;
      }
      if (newHeadOfDepartment.role === "Head of Department") {
        if (!(newHeadOfDepartment.department === departmentModel._id)) {
          res.status(409).send("Academic member is already the head of another department");
          return;
        }
      }
      if (newHeadOfDepartment.role !== "Course Instructor") {
        res.status(409).send("Academic member is not an instructor");
        return;
      }
      if (newHeadOfDepartment.department !== department._id.toString() && newHeadOfDepartment.department !== "UNASSIGNED") {
        res.status(409).send("Academic member is in another department");
        return;
      }
      var oldHeadOfDepartment = await academicMemberModel.findOne({ id: department.headOfDepartment });
      if (oldHeadOfDepartment) {
        oldHeadOfDepartment.role = "Course Instructor";
      }
      newHeadOfDepartment.role = "Head of Department";
      newHeadOfDepartment.department = department._id;
      department.headOfDepartment = newHeadOfDepartment.id;
    }

    try {
      await department.save();
      if (newHeadOfDepartment) {
        await newHeadOfDepartment.save();

      }
      if (oldHeadOfDepartment) {
        await oldHeadOfDepartment.save();
      }
      res.send("Department updated successfully");
    }
    catch (error) {
      res.status(500).send(error.message);
    }
  });

router.route("/delete-department/:department")
  .delete(async (req, res) => {
    const department = await departmentModel.findOneAndDelete({ name: req.params.department });
    if (!department) {
      res.status(404).send("Incorrect department name");
      return;
    }

    const courses = await courseModel.find({ department: department._id });
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      course.department = "UNASSIGNED";
      await course.save();
    }

    const academicMembers = await academicMemberModel.find({ department: department._id });
    for (let i = 0; i < academicMembers.length; i++) {
      const academicMember = academicMembers[i];
      academicMember.department = "UNASSIGNED";
      await academicMember.save();
    }

    if (department.headOfDepartment !== "UNASSIGNED") {
      const headOfDepartment = await academicMemberModel.findOne({ id: department.headOfDepartment });
      headOfDepartment.role = "Course Instructor";
      await headOfDepartment.save();
    }

    res.send("Department deleted successfully");
  });

router.route("/get-courses")
  .get(async (req, res) => {
    const courses = await courseModel.find();
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      if (course.department !== "UNASSIGNED") {
        const department = await departmentModel.findOne({ _id: course.department });
        course.department = department.name;
      }
    }
    res.send(courses);
  });

router.route("/add-course")
  .post(async (req, res) => {
    if (req.body.department) {
      var department = await departmentModel.findOne({ name: req.body.department });
      if (!department) {
        res.status(404).send("Incorrect department name");
        return;
      }
    }

    const newCourse = new courseModel({
      id: req.body.id,
      name: req.body.name,
      department: department ? department._id : "UNASSIGNED",
    });

    try {
      await newCourse.save();
      res.send("Course added successfully");
    }
    catch (error) {
      res.status(500).send(error.message);
    }
  });

router.route("/update-course/:id")
  .put(async (req, res) => {
    const course = await courseModel.findOne({ id: req.params.id });
    if (!course) {
      res.status(404).send("Incorrect course id");
      return;
    }

    if (req.body.id) {
      course.id = req.body.id;
    }
    if (req.body.name) {
      course.name = req.body.name;
    }
    if (req.body.department) {
      const department = await departmentModel.findOne({ name: req.body.department });
      if (!department) {
        res.status(404).send("Incorrect department name");
        return;
      }
      course.department = department._id;
    }


    try {
      await course.save();
      res.send("Course updated successfully");
    }
    catch (error) {
      res.status(500).send(error.message);
    }
  });

router.route("/delete-course/:id")
  .delete(async (req, res) => {
    const course = await courseModel.findOneAndDelete({ id: req.params.id });
    if (!course) {
      res.status(404).send("Incorrect course id");
      return;
    }

    const otherCourse = await courseModel.findOne({ courseCoordinator: course.courseCoordinator });
    if (!otherCourse) {
      const courseCoordinator = await academicMemberModel.findOne({ id: course.courseCoordinator });
      courseCoordinator.role = "Teaching Assistant";
      await courseCoordinator.save();
    }

    await slotModel.deleteMany({ course: course._id });
    // TODO: delete requests

    res.send("Course deleted successfully");
  });

router.route("/view-staff-attendance-records")
  .get(async (req, res) => {
    const month = req.query.month - 1;
    const year = req.query.year;
    const user = await hrMemberModel.findOne({ id: req.query.id })
     || await academicMemberModel.findOne({ id: req.query.id });
    if (!user) {
      res.status(404).send("Incorrect user id");
      return;
    }

    const userAttendanceRecords = await attendanceRecordModel.find({
      $or: [
        { user: user.id, signInTime: { $gte: new Date(year, month, 11), $lt: new Date(year, month + 1, 11) } },
        { user: user.id, signOutTime: { $gte: new Date(year, month, 11), $lt: new Date(year, month + 1, 11) } }
      ]
    });
    res.send(userAttendanceRecords);
  });

router.route("/view-staff-missing-days")
  .get(async (req, res) => {
    const month = req.query.month - 1;
    const year = req.query.year;
    const hrMembers = await hrMemberModel.find({});
    const academicMembers = await academicMemberModel.find({});
    const membersWithMissingDays = [];

    for (let i = 0; i < hrMembers.length; i++) {
      const user = hrMembers[i];
      const userAttendanceRecords = await attendanceRecordModel.find({
        user: user.id,
        signInTime: { $gte: new Date(year, month, 11), $lt: new Date(year, month + 1, 11) },
        signOutTime: { $ne: null },
      });
      const missingDays = await getMissingDays(month, year, user, userAttendanceRecords);
      if (missingDays.length > 0) {
        membersWithMissingDays.push({ id: user.id, missingDays });
      }
    }

    for (let i = 0; i < academicMembers.length; i++) {
      const user = academicMembers[i];
      const userAttendanceRecords = await attendanceRecordModel.find({
        user: user.id,
        signInTime: { $gte: new Date(year, month, 11), $lt: new Date(year, month + 1, 11) },
        signOutTime: { $ne: null },
      });
      const missingDays = await getMissingDays(month, year, user, userAttendanceRecords);
      if (missingDays.length > 0) {
        membersWithMissingDays.push({ id: user.id, missingDays });
      }
    }

    res.send(membersWithMissingDays);
  });

router.route("/view-staff-missing-hours")
  .get(async (req, res) => {
    const month = req.query.month - 1;
    const year = req.query.year;
    const hrMembers = await hrMemberModel.find({});
    const academicMembers = await academicMemberModel.find({});
    const membersWithMissingHours = [];

    for (let i = 0; i < hrMembers.length; i++) {
      const user = hrMembers[i];
      const userAttendanceRecords = await attendanceRecordModel.find({
        user: user.id,
        signInTime: { $gte: new Date(year, month, 11), $lt: new Date(year, month + 1, 11) },
        signOutTime: { $ne: null },
      });
      const { missingHours } = await getHours(month, year, user, userAttendanceRecords);
      if (missingHours > 0) {
        membersWithMissingHours.push({ id: user.id, missingHours });
      }
    }

    for (let i = 0; i < academicMembers.length; i++) {
      const user = academicMembers[i];
      const userAttendanceRecords = await attendanceRecordModel.find({
        user: user.id,
        signInTime: { $gte: new Date(year, month, 11), $lt: new Date(year, month + 1, 11) },
        signOutTime: { $ne: null },
      });
      const { missingHours } = await getHours(month, year, user, userAttendanceRecords);
      if (missingHours > 0) {
        membersWithMissingHours.push({ id: user.id, missingHours });
      }
    }

    res.send(membersWithMissingHours);
  });

router.route("/add-missing-attendance-record")
  .post(async (req, res) => {
    if (!req.body.id || !req.body.missingRecordType) {
      res.send("Not all fields are entered");
      return;
    }

    if (req.body.id === req.token.id) {
      res.send("Cannot add missing record for yourself");
      return;
    }

    const user = await hrMemberModel.findOne({ id: req.body.id })
      || await academicMemberModel.findOne({ id: req.body.id });
    if (!user) {
      res.send("Invalid user id");
      return;
    }

    const missingRecordType = req.body.missingRecordType;
    const userRecord = {};

    if (missingRecordType === "signIn") {
      userRecord = await attendanceRecordModel.findOne({user: user.id, _id: req.body.record});

      if (!userRecord) {
        res.send("Could not find specified sign out time.");
        return;
      }
      else {
        const signInTime = new Date(req.body.signInTime);
        userRecord.signInTime = signInTime;
        if (signInTime > userRecord.signOutTime) {
          res.status(403).send("Sign in time cannot be after the sign out time");
          return;
        }
        try {
          await userRecord.save();
          res.send(userRecord);
        }
        catch (error) {
          console.log(error.message);
          res.status(403).send(error);
        }
      }
    }
    else if (missingRecordType === "signOut") {

      userRecord = await attendanceRecordModel.findOne({
        user: user.id, _id: req.body.record
      });

      if (!userRecord) {
        res.send("Could not find specified sign in time.");
        return;
      }
      else {
        const signOutTime = new Date(req.body.signOutTime);
        if (signOutTime < userRecord.signInTime) {
          res.status(403).send("Sign out time cannot be before the sign in time");
          return;
        }
        userRecord.signOutTime = signOutTime;
        try {
          await userRecord.save();
          res.send(userRecord);
        }
        catch (error) {
          console.log(error.message);
          res.send(error);
        }
      }
    }
    else if (missingRecordType === "fullDay") {
      const signInTime = new Date(req.body.signInTime);
      const signOutTime = new Date(req.body.signOutTime);
      if (signInTime > signOutTime) {
        res.status(403).send("Sign out time cannot be before the sign in time");
        return;
      }
      userRecord = new attendanceRecordModel({
        user: user.id,
        signInTime: req.body.signInTime,
        signOutTime: req.body.signOutTime

      });
      try {
        await userRecord.save();
        res.send("Added successfully");
      }
      catch (error) {
        console.log(error.message);
        res.status(403).send(error);
      }
    }
  });

module.exports = router;
