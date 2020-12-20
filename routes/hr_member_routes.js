const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");
const courseModel = require("../models/course_model");
const departmentModel = require("../models/department_model");
const facultyModel = require("../models/faculty_model");

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
.post(async (req,res) => {
    let user = await hrMemberModel.findOne({email: req.body.email});
    if (!user) {
        user = await academicMemberModel.findOne({email: req.body.email});
    }
    if (user) {
        res.send("Email already exists");
        return;
    }

    const office = await roomModel.findOne({name: req.body.office});
    if (!office) {
        res.send("Invalid Office Name");
        return;
    }
    if (office.type !== "Office") {
        res.send("Room is not an Office");
        return;
    }
    if (office.remainingCapacity === 0) {
        res.send("Office has full capacity");
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
        office: req.body.office,
        salary: req.body.salary,
        dayOff: req.body.dayOff
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
})

router.route("/add-academic-member")
.post(async (req,res) => {
    let user = await hrMemberModel.findOne({email: req.body.email});
    if (!user) {
        user = await academicMemberModel.findOne({email: req.body.email});
    }
    if (user) {
        res.send("Email already exists");
        return;
    }
    
    const office = await roomModel.findOne({name: req.body.office});
    if (!office) {
        res.send("Invalid Office Name");
        return;
    }
    if (office.type !== "Office") {
        res.send("Room is not an Office");
        return;
    }
    if (office.remainingCapacity === 0) {
        res.send("Office has full capacity");
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
        office: req.body.office,
        salary: req.body.salary
    });
    // TODO: 
    // TODO: faculty, department

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
.put(async (req,res) => {
    const user = await hrMemberModel.findOne({id: req.body.id});
    if (!user) {
        res.send("Invalid hr member id.");
        return;
    }

    if (req.body.name) {
        user.name = req.body.name;
    }
    if (req.body.email) {
        let otherUser = await hrMemberModel.findOne({email: req.body.email});
        if (!otherUser) {
            otherUser = await academicMemberModel.findOne({email: req.body.email});
        }
        if (otherUser) {
            res.send("Email already exists");
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
    if (req.body.salary) {
        user.salary = req.body.salary;
    }
    if (req.body.office && req.body.office !== user.office) {
        var office = await roomModel.findOne({name: req.body.office});
        if (!office) {
            res.send("Invalid Office Name");
            return;
        }
        if (office.type !== "Office") {
            res.send("Room is not an Office");
            return;
        }
        if (office.remainingCapacity === 0) {
            res.send("Office has full capacity");
            return;
        }

        var oldOffice = await roomModel.findOne({name: user.office});
        oldOffice.remainingCapacity++;
        office.remainingCapacity--;
        user.office = req.body.office;
    }

    try {
        await user.save();
        if (req.body.office && oldOffice) {
            await office.save();
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
        let otherUser = await hrMemberModel.findOne({email: req.body.email});
        if (!otherUser) {
            otherUser = await academicMemberModel.findOne({email: req.body.email});
        }
        if (otherUser) {
            res.send("Email already exists");
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
        user.role = req.body.role;
    }
    if (req.body.salary) {
        user.salary = req.body.salary;
    }
    if (req.body.dayOff) {
        user.dayOff = req.body.dayOff;
    }
    if (req.body.office && req.body.office !== user.office) {
        var office = await roomModel.findOne({name: req.body.office});
        if (!office) {
            res.send("Invalid Office Name");
            return;
        }
        if (office.type !== "Office") {
            res.send("Room is not an Office");
            return;
        }
        if (office.remainingCapacity === 0) {
            res.send("Office has full capacity");
            return;
        }

        var oldOffice = await roomModel.findOne({name: user.office});
        oldOffice.remainingCapacity++;
        office.remainingCapacity--;
        user.office = req.body.office;
    }
    if (req.body.faculty) {
        // TODO
    }
    if (req.body.department) {
        // TODO
    }
    
    try {
        await user.save();
        if (req.body.office && oldOffice) {
            await office.save();
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
        res.send("Invalid user id");
        return;
    }
    
    const office = await roomModel.findOne({name: user.office});
    office.remainingCapacity++;
    await office.save();

    res.send(user);
});

router.route("/delete-academic-member")
.delete(async (req,res) => {
    const user = await academicMemberModel.findOneAndDelete({id: req.body.id});
    if (!user) {
        res.send("Invalid user id.");
        return;
    }
    
    const office = await roomModel.findOne({name: user.office});
    office.remainingCapacity++;
    await office.save();

    // TODO: update courses
    // TODO: update attendance records, requests, slots

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
})

router.route("/update-room")
.post(async (req,res) => {
    let room = await roomModel.findOne({name: req.body.name});
    if(!room) {
        res.send("No room with such name");
        return;
    }
    let persons = room.capacity-room.remainingCapacity;
    if (persons>req.body.capacity) {
        res.send("Cannot update capacity");
        return;
    }
    if (req.body.name1) {
        room.name = req.body.name1;
    }
    if (req.body.capacity) {
        room.capacity = req.body.capacity;
    } 
    if (req.body.type) {
        room.type = req.body.type;
    }
    room.remainingCapacity = req.body.capacity - persons;
    try {
        await room.save();
        res.send("Updated room: "+room);
    }
    catch(error) {
        res.send(error);
    }

})

router.route("/delete-room")
.post (async(req,res) => {
    let room = await roomModel.findOne({name: req.body.name})
    if (!room) {
        res.send("No room to delete");
        return;
    }
    try {
        await roomModel.findOneAndDelete({name: req.body.name});
        res.send("Deleted room: "+room);
    }
    catch(error)
    {
        res.send(error);
    }
}) 

router.route("/add-course")
.post(async (req,res) => {
    let dep = await departmentModel.findOne({name: req.body.department});
    if (!dep) {
        res.send("Invalid Department Name");
        return;
    }
    //check for TAS and Doctors like departments???? 
    const newCourse = new courseModel({
        id: req.body.id,
        name: req.body.name,
        department: req.body.department,
        instructors: req.body.instructors,
        TAs: req.body.tas,
        totalSlotsNumber: req.body.slots,
        courseCoordinator: req.body.coordinator

    });
    try {
       await newCourse.save();
       res.send("Course Added: "+newCourse);   
    }
    catch (error) {
        
        res.send(error);
    }
})

router.route("/update-course")
.post(async (req,res) => {
    let course = await courseModel.findOne({id: req.body.id});
    if (!course) {
        res.send("No course with such ID");
        return;
    }
    if (req.body.id1) {
        course.id = req.body.id1;
    }
    if (req.body.name) {
        course.name = req.body.name;
    }
    if (req.body.department) {
        course.department = req.body.department;
    }
    if (req.body.instructors) {
        course.instructors = req.body.instructors;
    }
    if (req.body.tas) {
        course.TAs = req.body.tas;
    }
    if (req.body.slots) {
        course.totalSlotsNumber = req.body.slots;
    }
    if (req.body.coordinator) {
        course.courseCoordinator = req.body.coordinator;
    }
    try {
        await course.save();
        res.send("Updated Course: "+course);
    }
    catch(error)
    {
        res.send(error);
    }
})

router.route("/delete-course")
.post (async(req,res) => {
    let deletedCourse = await courseModel.findOne({id: req.body.id})
    if (!deletedCourse) {
        res.send("No course to delete");
        return;
    }
    try {
        await courseModel.findOneAndDelete({id: req.body.id});
        res.send("Deleted course: "+deletedCourse);
    }
    catch(error)
    {
        res.send(error);
    }
})

router.route("/add-department")
.post(async (req,res) => {
    let faculty = await facultyModel.findOne({name: req.body.faculty});
    if (!faculty) {
        res.send("Cannot add department.. No faculty with such name");
        return;
    }
    const newdepartment = new departmentModel({
        name: req.body.name,
        courses: req.body.courses,
        faculty: req.body.faculty,
        headOfDepartment: req.body.headOfDepartment
    })
    try {
       await newdepartment.save();
       res.send("Department Added: "+newdepartment);   
    }
    catch (error) {
        res.send(error);
    }
})

router.route("/update-department")
.post(async (req,res) => {
    let department = await departmentModel.findOne({name: req.body.name});
    if(!room) {
        res.send("No department with such name");
        return;
    }
    if (req.body.name1) {
        department.name = req.body.name1;
    }
    if (req.body.courses) {
        department.courses = req.body.courses;
    } 
    if (req.body.faculty) {
        department.faculty = req.body.faculty;
    }
    if (req.body.headOfDepartment) {
        department.headOfDepartment = req.body.headOfDepartment;
    }
    try {
        await department.save();
        res.send("Updated department: "+department);
    }
    catch(error) {
        res.send(error);
    }

})

router.route("/delete-department")
.post (async(req,res) => {
    let deletedDepartment = await departmentModel.findOne({name: req.body.name})
    if (!deletedDepartment) {
        res.send("No department to delete");
        return;
    }
    try {
        await departmentModel.findOneAndDelete({name: req.body.name});
        res.send("Deleted department: "+deletedDepartment);
    }
    catch(error)
    {
        res.send(error);
    }
})

router.route("/add-faculty")
.post(async (req,res) => {
    
    const newFaculty = new facultyModel({
        name: req.body.name,
        departments: req.body.departments
    });
    try {
       await newFaculty.save();
       res.send("Faculty Added: "+newFaculty);   
    }
    catch (error) {
        res.send(error);
    }
})

module.exports = router;