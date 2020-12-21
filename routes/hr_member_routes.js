const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");
const courseModel = require("../models/course_model");
const departmentModel = require("../models/department_model");
const facultyModel = require("../models/faculty_model");
const attendanceRecordModel = require("../models/attendance_record_model");
const slotModel = require("../models/slot_model");
const notificationModel = require("../models/notification_model");

const router = express.Router();

router.use((req, res, next) => {
    const token = jwt.decode(req.headers.token);
    if (token.role === "HR") {
        next();
    }
    else {
        res.status(403).send("Unauthorized access.");
    }
});

router.route("/add-hr-member")
.post(async (req, res) => {
    const mailFormat = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!req.body.email.match(mailFormat)) {
        res.send("Invalid email address.");
        return;
    }

    let user = await hrMemberModel.findOne({email: req.body.email});
    if (!user) {
        user = await academicMemberModel.findOne({email: req.body.email});
    }
    if (user) {
        res.send("Email already exists.");
        return;
    }

    const office = await roomModel.findOne({name: req.body.office});
    if (!office) {
        res.send("Invalid Office Name.");
        return;
    }
    if (office.type !== "Office") {
        res.send("Room is not an Office.");
        return;
    }
    if (office.remainingCapacity === 0) {
        res.send("Office has full capacity.");
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
        res.send(newUser);
    }
    catch (error) {
        console.log(error.message)
        res.send(error);
    }
});

router.route("/add-academic-member")
.post(async (req, res) => {
    const mailFormat = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!req.body.email.match(mailFormat)) {
        res.send("Invalid email address.");
        return;
    }

    let user = await hrMemberModel.findOne({email: req.body.email});
    if (!user) {
        user = await academicMemberModel.findOne({email: req.body.email});
    }
    if (user) {
        res.send("Email already exists.");
        return;
    }

    if (req.body.role === "Course Coordinator") {
        res.status(403).send("You cannot assign an academic member to be a course coordinator");
        return;
    }

    if (req.body.department) {
        var department  = await departmentModel.findOne({name: req.body.department});
        if (!department) {
            res.send("Invalid department name.");
            return;
        }
    }

    const office = await roomModel.findOne({name: req.body.office});
    if (!office) {
        res.send("Invalid office name.");
        return;
    }
    if (office.type !== "Office") {
        res.send("Room is not an office.");
        return;
    }
    if (office.remainingCapacity === 0) {
        res.send("Office has full capacity.");
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
        department: department? department._id: "UNASSIGNED",
        office: office._id,
        salary: req.body.salary,
        dayOff: req.body.dayOff
    });

    try {
        await newUser.save();
        await office.save();
        res.send(newUser);
    }
    catch (error) {
        console.log(error.message);
        res.send(error);
    }
})

router.route("/update-hr-member")
.put(async (req, res) => {
    const user = await hrMemberModel.findOne({id: req.body.id});
    if (!user) {
        res.send("Invalid hr member id.");
        return;
    }
    
    if (req.body.name) {
        user.name = req.body.name;
    }
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
    if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);
        user.password = hashedPassword;
    }
    if (req.body.gender) {
        user.gender = req.body.gender;
    }
    if (req.body.office) {
        var newOffice = await roomModel.findOne({name: req.body.office});
        if (!newOffice) {
            res.send("Invalid office name.");
            return;
        }
        if (newOffice.type !== "Office") {
            res.send("Room is not an office.");
            return;
        }
        if (newOffice.remainingCapacity === 0) {
            res.send("Office has full capacity.");
            return;
        }
        var oldOffice = await roomModel.findOne({_id: user.office});
        if (oldOffice !== newOffice) {
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
        if (req.body.office && oldOffice !== newOffice) {
            await newOffice.save();
            await oldOffice.save();
        }
        res.send(user);
    }
    catch (error) {
        console.log(error.message);
        res.send(error);
    }
});

router.route("/update-academic-member")
.put(async (req,res) => {
    const user = await academicMemberModel.findOne({id: req.body.id});
    if (!user) {
        res.send("Invalid academic member id.");
        return;
    }

    if (req.body.name) {
        user.name = req.body.name;
    }
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
    if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);
        user.password = hashedPassword;
    }
    if (req.body.gender) {
        user.gender = req.body.gender;
    }
    if (req.body.role) {
        if (req.body.role === "Course Coordinator") {
            res.status(403).send("You cannot assign an academic member to be a course coordinator");
            return;
        }
        user.role = req.body.role;
    }
    if (req.body.department) {
        const department  = await departmentModel.findOne({name: req.body.department});
        if (!department) {
            res.send("Invalid department name.");
            return;
        }
        user.department = department._id;
    }
    if (req.body.office) {
        var newOffice = await roomModel.findOne({name: req.body.office});
        if (!newOffice) {
            res.send("Invalid office name.");
            return;
        }
        if (newOffice.type !== "Office") {
            res.send("Room is not an office.");
            return;
        }
        if (newOffice.remainingCapacity === 0) {
            res.send("Office has full capacity.");
            return;
        }
        var oldOffice = await roomModel.findOne({_id: user.office});
        if (oldOffice !== newOffice) {
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
        if (req.body.office && oldOffice !== newOffice) {
            await newOffice.save();
            await oldOffice.save();
        }
        res.send(user);
    }
    catch (error) {
        console.log(error.message);
        res.send(error);
    }
});

router.route("/delete-hr-member")
.delete(async (req, res) => {
    const user = await hrMemberModel.findOneAndDelete({id: req.body.id});
    if (!user) {
        res.send("Invalid user id.");
        return;
    }
    
    const office = await roomModel.findOne({_id: user.office});
    office.remainingCapacity++;
    await office.save();

    res.send(user);
});

router.route("/delete-academic-member")
.delete(async (req,res) => {
    const user = await academicMemberModel.findOne({id: req.body.id});
    if (!user) {
        res.send("Invalid user id.");
        return;
    }
    
    // TODO: check that academic member doesn't have assigned slots
    const slots = await slotModel.find({staffMember: user.id});
    if (slots.length !== 0) {
        res.send("Cannot delete academic member. Must reassign his slots first.");
        return;
    }

    // delete academic member
    await academicMemberModel.findOneAndDelete({id: req.body.id});

    // TODO: update office
    const office = await roomModel.findOne({_id: user.office});
    office.remainingCapacity++;
    await office.save();

    // TODO: update courses
    if (user.role === "Teaching Assistant" || user.role === "Course Coordinator") {
        let courses = await courseModel.find({teachingAssistants: user.id});
        for (let i = 0; i < courses.length; i++) {
            let course = courses[i];
            let userIndex = course.teachingAssistants.indexOf(user.id);
            course.teachingAssistants.splice(userIndex, 1);
            await course.save();
        }
    }
    else {
        let courses = await courseModel.find({courseInstructors: user.id});
        for (let i = 0; i < courses.length; i++) {
            let course = courses[i];
            let userIndex = course.courseInstructors.indexOf(user.id);
            course.courseInstructors.splice(userIndex, 1);
            await course.save();
        }
    }

    // TODO: update department and courses if HOD or CC
    if (user.role === "Course Coordinator") {
        let courses = await courseModel.find({courseCoordinator: user.id});
        for (let i = 0; i < courses.length; i++) {
            let course = courses[i];
            course.courseCoordinator = "UNASSIGNED";
            await course.save();
        }
    }
    else if (user.role === "Head of Department") {
        let department = await departmentModel.findOne({headOfDepartment: user.id});
        department.headOfDepartment = "UNASSIGNED";
        await department.save();
    }
    
    // TODO: delete entries in attendance record collection
    await attendanceRecordModel.deleteMany({user: user.id});

    // TODO: delete entries in notification collection
    await notificationModel.deleteMany({user: user.id});

    // TODO: delete entries in requests collection


    res.send(user);
});

router.route("/add-room")
.post(async (req,res) => {
    const newRoom = new roomModel({
        name: req.body.name,
        capacity: req.body.capacity,
        remainingCapacity: req.body.capacity,
        type: req.body.type
    });

    try {
       await newRoom.save();
       res.send(newRoom);   
    }
    catch (error) {
        console.log(error.message);
        res.send(error);
    }
});

router.route("/update-room")
.put(async (req,res) => {
    let room = await roomModel.findOne({name: req.body.name});
    if (!room) {
        res.send("No room with such name.");
        return;
    }

    if (req.body.newName) {
        room.name = req.body.newName;
    }
    let personsAssigned = room.capacity - room.remainingCapacity;
    if (req.body.capacity) {
        if (personsAssigned > req.body.capacity) {
            res.send("Cannot update capacity. Reassign people in office first.");
            return;
        }
        room.capacity = req.body.capacity;
        room.remainingCapacity = req.body.capacity - personsAssigned;
    }
    if (req.body.type) {
        if (room.type === "Office" && req.body.type !== "Office" && personsAssigned > 0) {
            res.send("Cannot update type. Reassign people in office first.");
            return;
        }
        
        const slot = await slotModel.findOne({room: room._id});
        if (slot && room.type !== req.body.type) {
            res.send("Cannot update type. Reassign slots first.");
            return;
        }

        room.type = req.body.type;
    }
    
    try {
        await room.save();
        res.send(room);
    }
    catch (error) {
        console.log(error.message);
        res.send(error);
    }
});

router.route("/delete-room")
.delete(async(req,res) => {
    let room = await roomModel.findOne({name: req.body.name});
    if (!room) {
        res.send("No room to delete.");
        return;
    }

    const slot = await slotModel.findOne({room: room._id});
    if (slot) {
        res.send("Cannot delete room. Reassign slots first.");
        return;
    }

    if (room.type === "Office" && room.capacity !== room.remainingCapacity) {
        res.send("Cannot delete room. Reassign people in it first.");
        return;
    }
    
    await roomModel.findOneAndDelete({name: req.body.name});

    res.send(room);
});

router.route("/add-course")
.post(async (req,res) => {
    if (req.body.department) {
        var department = await departmentModel.findOne({name: req.body.department});
        if (!department) {
            res.send("Invalid department name.");
            return;
        }
    }
    
    const newCourse = new courseModel({
        id: req.body.id,
        name: req.body.name,
        department: department? department._id: "UNASSIGNED",
        totalSlotsNumber: req.body.totalSlotsNumber
    });

    try {
       await newCourse.save();
       res.send(newCourse);   
    }
    catch (error) {
        console.log(error.message);
        res.send(error);
    }
});

router.route("/update-course")
.put(async (req,res) => {
    let course = await courseModel.findOne({id: req.body.id});
    if (!course) {
        res.send("No course with such ID.");
        return;
    }

    if (req.body.newId) {
        course.id = req.body.newId;
    }
    if (req.body.name) {
        course.name = req.body.name;
    }
    if (req.body.department) {
        const department = await departmentModel.findOne({name: req.body.department});
        if (!department) {
            res.send("Invalid department name.");
            return;
        }
        course.department = department._id;
    }
    if (req.body.totalSlotsNumber) {
        course.totalSlotsNumber = req.body.totalSlotsNumber;
    }

    try {
        await course.save();
        res.send(course);
    }
    catch (error) {
        console.log(error.message);
        res.send(error);
    }
});

router.route("/delete-course")
.delete(async(req,res) => {
    let course = await courseModel.findOneAndDelete({id: req.body.id});
    if (!course) {
        res.send("No course to delete.");
        return;
    }
    
    let otherCourse = await courseModel.findOne({courseCoordinator: course.courseCoordinator});
    if (!otherCourse) {
        let courseCoordinator = await academicMemberModel.findOne({id: course.courseCoordinator});
        courseCoordinator.role = "Teaching Assistant";
        await courseCoordinator.save();
    }

    await slotModel.deleteMany({course: course._id});

    // TODO: delete requests

    res.send(course);
});

router.route("/add-department")
.post(async (req,res) => {
    if (req.body.faculty) {
        var faculty = await facultyModel.findOne({name: req.body.faculty});
        if (!faculty) {
            res.send("Cannot add department. No faculty with such name.");
            return;
        }
    }

    if (req.body.headOfDepartment) {
        var headOfDepartment = await academicMemberModel.findOne({id: req.body.headOfDepartment});
        if (!headOfDepartment) {
            res.send("No academic member with such id to be head of this department.");
            return;
        }
        if (headOfDepartment.role === "Head of Department") {
            res.send("Cannot add this instructor as a head of department as he is already a head of another department.");
            return;
        }
        headOfDepartment.role = "Head of Department";
    }

    const newdepartment = new departmentModel({
        name: req.body.name,
        faculty: faculty? faculty._id: "UNASSIGNED",
        headOfDepartment: headOfDepartment? headOfDepartment.id: "UNASSIGNED"
    });
    
    try {
        await newdepartment.save();
        if (headOfDepartment) {
            await headOfDepartment.save();
        }
        res.send(newdepartment);
    }
    catch (error) {
        console.log(error.message);
        res.send("error");
    }
});

router.route("/update-department")
.put(async (req,res) => {
    let department = await departmentModel.findOne({name: req.body.name});
    if (!department) {
        res.send("No department with such name.");
        return;
    }

    if (req.body.newName) {
        department.name = req.body.newName;
    }
    if (req.body.faculty) {
        const faculty = await facultyModel.findOne({name: req.body.faculty});
        if (!faculty) {
            res.send("Invalid faculty name.");
            return;
        }
        department.faculty = faculty._id;
    }
    if (req.body.headOfDepartment && req.body.headOfDepartment !== department.headOfDepartment) {
        var newHeadOfDepartment = await academicMemberModel.findOne({id: req.body.headOfDepartment});
        if (!newHeadOfDepartment) {
            res.send("No academic member with such id to be head of this department.");
            return;
        }
        var oldHeadOfDepartment = await academicMemberModel.findOne({id: department.headOfDepartment});
        newHeadOfDepartment.role = "Head of Department";
        oldHeadOfDepartment.role = "Course Instructor";
        department.headOfDepartment = req.body.headOfDepartment;
    }
    
    try {
        await department.save();
        if (newHeadOfDepartment) {
            await newHeadOfDepartment.save();
            await oldHeadOfDepartment.save();
        }
        res.send(department);
    }
    catch (error) {
        console.log(error.message);
        res.send(error);
    }

});

router.route("/delete-department")
.delete(async(req,res) => {
    let department = await departmentModel.findOneAndDelete({name: req.body.name});
    if (!department) {
        res.send("No department to delete.");
        return;
    }

    let courses = await courseModel.find({department: department._id});
    for (i = 0; i < courses.length; i++) {
        let course =  courses[i];
        course.department = "UNASSIGNED";
        await course.save();
    }

    let academicMembers = await academicMemberModel.find({department: department._id});
    for (i = 0; i < academicMembers.length; i++) {
        let academicMember =  academicMembers[i];
        academicMember.department = "UNASSIGNED";
        await academicMember.save();
    }

    let headOfDepartment = academicMemberModel.findOne({id: department.headOfDepartment});
    headOfDepartment.role = "Course Instructor";
    await headOfDepartment.save();

    res.send(department);
});

router.route("/add-faculty")
.post(async (req,res) => {
    const newFaculty = new facultyModel({
        name: req.body.name,
    });

    try {
       await newFaculty.save();
       res.send(newFaculty);
    }
    catch (error) {
        console.log(error.message);
        res.send(error);
    }
});

router.route("/update-faculty")
.put(async (req,res) => {
    let faculty = await facultyModel.findOne({name: req.body.name});
    if (!faculty) {
        res.send("No faculty with such name.");
        return;
    }

    if (req.body.newName) {
        faculty.name = req.body.newName;
    }

    try {
        await faculty.save();
        res.send(faculty);
    }
    catch (error) {
        console.log(error.message);
        res.send(error);
    }
});

router.route("/delete-faculty")
.delete(async(req,res) => {
    let faculty = await facultyModel.findOneAndDelete({name: req.body.name});
    if (!faculty) {
        res.send("No faculty to delete");
        return;
    }

    let departments = await departmentModel.find({faculty: faculty._id});
    for (i = 0; i < departments.length; i++) {
        let department =  departments[i];
        department.faculty = "UNASSIGNED";
        department.save();
    }

    res.send(faculty);
});

module.exports = router;