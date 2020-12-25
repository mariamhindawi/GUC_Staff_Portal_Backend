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
const { requestModel,maternityLeaveModel } = require("../models/request_model");
const userBlacklistModel = require("../models/user_blacklist_model");

function convertDay(day) {
    switch (day) {
        case "Sunday": return 0;
        case "Monday": return 1;
        case "Tuesday": return 2;
        case "Wednesday": return 3;
        case "Thursday": return 4;
        case "Friday": return 5;
        case "Saturday": return 6;
    }
    return -1;
}

function getNumberOfDaysInMonth(currMonth, currYear) {
    switch (currMonth) {
        //31 days
        case 0:
        case 2:
        case 4:
        case 6:
        case 7:
        case 9:
        case 11:
            return 31;
        //30 days
        case 3:
        case 5:
        case 8:
        case 10:
            return 30;
        //28 days or 29 days
        case 1:
            if (currYear % 4 !== 0)
                return 29;
            return 28;
    }
    return -1;
}

 function getExpectedDaysToAttend(dayOff, firstDay, numberOfDaysInMonth) {
    let expectedDaysToAttend = 20;  
    if (numberOfDaysInMonth === 31) {
        expectedDaysToAttend = 23;
        if (firstDay % 7 === 5 || (firstDay+1) % 7 === 5 || (firstDay+2) % 7 === 5) {
           expectedDaysToAttend--;
        }
        if (firstDay % 7 === dayOff || (firstDay+1) % 7 === dayOff || (firstDay+2) % 7 === dayOff) {
            expectedDaysToAttend--;
        }
    }
    else if (numberOfDaysInMonth === 30){
        expectedDaysToAttend = 22;
        if (firstDay % 7 === 5 || (firstDay+1) % 7 === 5) {
            expectedDaysToAttend--;
         }
         if (firstDay % 7 === dayOff || (firstDay+1) % 7 === dayOff) {
             expectedDaysToAttend--;
         }
    }
    else if (numberOfDaysInMonth === 29) {
        expectedDaysToAttend = 21;
        if (firstDay % 7 === 5) {
            expectedDaysToAttend--;
         }
         if (firstDay % 7 === dayOff){
             expectedDaysToAttend--;
         }
    }
    return expectedDaysToAttend;
}

async function getMissingDays(month, year, dayOff, userAttendanceRecords,user) {
    const numberOfDaysInMonth = getNumberOfDaysInMonth(month, year);
    let normalDaysAttended = [];
    let daysOffAttended = [];

    for (let i = 0; i < userAttendanceRecords.length; i++) {
        let date = userAttendanceRecords[i].signInTime;
        if (date.getDay() !== 5 && date.getDay() !== dayOff && !normalDaysAttended.includes(date.getDate())) {
            normalDaysAttended.push(date.getDate());
        }
        else if (!daysOffAttended.includes(date.getDate())) {
            daysOffAttended.push(date.getDate());
        }
    }

    let expectedDaysToAttend = getExpectedDaysToAttend(dayOff, new Date(year, month, 11).getDay(), numberOfDaysInMonth);
    if (expectedDaysToAttend === normalDaysAttended.length) {
        return {missingDays: [], numberOfDaysWithExcuse: 0};
    }

    let missingDays = [];
    for (let i = 0; i < numberOfDaysInMonth; i++) {
        let date = new Date(year, month, 11 + i);
        if (date.getDay() !== 5 && date.getDay() !== dayOff && !normalDaysAttended.includes(date.getDate())) {
            missingDays.push(date);
        }
    }
    
    let numberOfDaysWithExcuse = 0;
    for (let i = 0; i < missingDays.length; i++) {
        let date = missingDays[i];
        let request = await requestModel.findOne({ 
            requestedBy: user.id, 
            day: date, 
            type: {$ne: "slotLinkingRequest", $ne: "dayOffChangeRequest", $ne:"replacementRequest", $ne: "maternityLeave"}, 
            status:"Accepted" 
        });

        if (request) {
            if (request.type !== "compensationRequest" || request.type === "compensationRequest" && daysOffAttended.includes(missingDays[i].getDate())) {
                missingDays.slice(i, i+1);
                i--;
                numberOfDaysWithExcuse++;
            }
        }
        else {
            request = await maternityLeaveModel.findOne({
                requestedBy: user.id, 
                type: "maternityLeave", 
                status: "Accepted",
                day: {$lte: missingDays[i]},
                duration: "" //{$gt: (missingDays[i] - $day)}
            });
            if (request) {
                missingDays.slice(i, i+1);
                i--;
                numberOfDaysWithExcuse++;
            }
        }
    }

    return { missingDays: missingDays, numberOfDaysWithExcuse: numberOfDaysWithExcuse };
}

async function getMissingAndExtraHours(month, year, dayOff, userAttendanceRecords,user) {
    
    const numberOfDaysInMonth = getNumberOfDaysInMonth(month);
    const expectedDaysToAttend = getExpectedDaysToAttend(dayOff, new Date(year, month, 11).getDay(), numberOfDaysInMonth);
    const numberOfDaysWithExcuse = await getMissingDays(month, year, dayOff, userAttendanceRecords,user).numberOfDaysWithExcuse;
    const requiredHours = (expectedDaysToAttend - numberOfDaysWithExcuse) * 8.4;

    let timeDiffInSeconds = 0;
    for (let i = 0; i < userAttendanceRecords.length; i++) {
        let signInTime = userAttendanceRecords[i].signInTime;
        let signOutTime = userAttendanceRecords[i].signOutTime;

        if (signInTime.getHours() < 7) {
            signInTime.setHours(7);
            signInTime.setMinutes(0);
            signInTime.setSeconds(0);
            signInTime.setMilliseconds(0);
        }
        else if (signInTime.getHours() > 18) {
            signInTime.setHours(19);
            signInTime.setMinutes(0);
            signInTime.setSeconds(0);
            signInTime.setMilliseconds(0);
        }
        else {
            signInTime.setMilliseconds(0);
        }

        if (signOutTime.getHours() < 7) {
            signOutTime.setHours(7);
            signOutTime.setMinutes(0);
            signOutTime.setSeconds(0);
            signOutTime.setMilliseconds(0);
        }
        else if (signOutTime.getHours() > 18) {
            signOutTime.setHours(19);
            signOutTime.setMinutes(0);
            signOutTime.setSeconds(0);
            signOutTime.setMilliseconds(0);
        }
        else {
            signOutTime.setMilliseconds(0);
        }
        
        timeDiffInSeconds += (signOutTime - signInTime) / 1000;
    }
    
    // const spentHours = Math.floor(timeDiffInSeconds / 3600);
    // timeDiffInSeconds %= 3600;
    // const spentMinutes = Math.floor(timeDiffInSeconds / 60);
    // timeDiffInSeconds %= 60;
    // const spentSeconds = timeDiffInSeconds;

    const spentHours = timeDiffInSeconds / 3600;
    if (spentHours > requiredHours) {
        return {missingHours: 0, extraHours: spentHours - requiredHours};
    }
    else {
        return {missingHours: requiredHours - spentHours, extraHours: 0};
    }
}

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
    if (!req.body.email) {
        res.send("Must enter an email.");
        return;
    }

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
        res.send({user: newUser, office: office});
    }
    catch (error) {
        console.log(error.message)
        res.send(error);
    }
});

router.route("/add-academic-member")
.post(async (req, res) => {
    if (!req.body.email) {
        res.send("Must enter an email.");
        return;
    }

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

    if (req.body.department) {
        var department  = await departmentModel.findOne({name: req.body.department});
        if (!department) {
            res.send("Invalid department name.");
            return;
        }
    }

    if (req.body.role === "Course Coordinator") {
        res.status(403).send("Cannot assign an academic member to be a course coordinator.");
        return;
    }
    else if (req.body.role === "Head of Department") {
        if (!department) {
            res.send("Cannot assign an academic member to be a head of department without specifying the department.");
            return;
        }
        if (department.headOfDepartment !== "UNASSIGNED") {
            res.send("Department already has a head.");
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
        if (req.body.role === "Head of Department") {
            department.headOfDepartment = newUser.id;
            await department.save();
        }
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
            let blacklistEntry = await userBlacklistModel.findOne({user: user.id});
            if (blacklistEntry) {
                blacklistEntry.blockedAt = new Date();
            }
            else {
                blacklistEntry = new userBlacklistModel({
                    user: user.id,
                    blockedAt: new Date()
                });
            }
            await blacklistEntry.save();
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

    if (req.body.department) {
        var department  = await departmentModel.findOne({name: req.body.department});
        if (!department) {
            res.send("Invalid department name.");
            return;
        }
        var oldDepartment = await departmentModel.findOne({_id: user.department});
        if (oldDepartment.name === department.name) {
            res.send("User is already assigned to this department.");
            return;
        }
        if (!req.body.role && user.role === "Head of Department") {
            if (department.headOfDepartment !== "UNASSIGNED") {
                res.send("Department already has a head.");
                return;
            }
            oldDepartment.headOfDepartment = "UNASSIGNED";
            department.headOfDepartment = user.id;
        }
        if (req.body.role === "Head of Department") {
            if (department.headOfDepartment !== "UNASSIGNED") {
                res.send("Department already has a head.");
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
        if (req.body.role === "Course Coordinator") {
            res.status(403).send("You cannot assign an academic member to be a course coordinator");
            return;
        }
        if (req.body.role === "Head of Department" && !req.body.department) {
            department = await departmentModel.findOne({_id: user.department});
            if (department.headOfDepartment !== "UNASSIGNED") {
                res.send("Department already has a head.");
                return;
            }
            department.headOfDepartment = user.id;
        }
        else if (req.body.role !== "Head of Department" && user.role === "Head of Department") {
            if (req.body.department) {
                oldDepartment.headOfDepartment = "UNASSIGNED";
            }
            else {
                department = await departmentModel.findOne({_id: user.department});
                department.headOfDepartment = "UNASSIGNED";
            }
        }
        user.role = req.body.role;
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
            let blacklistEntry = await userBlacklistModel.findOne({user: user.id});
            if (blacklistEntry) {
                blacklistEntry.blockedAt = new Date();
            }
            else {
                blacklistEntry = new userBlacklistModel({
                    user: user.id,
                    blockedAt: new Date()
                });
            }
            await blacklistEntry.save();
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

    await attendanceRecordModel.deleteMany({user: user.id});
    // TODO: Check if hr have notification
    await notificationModel.deleteMany({user: user.id});

    res.send(user);
});

router.route("/delete-academic-member")
.delete(async (req,res) => {
    const user = await academicMemberModel.findOne({id: req.body.id});
    if (!user) {
        res.send("Invalid user id.");
        return;
    }
    
    const slots = await slotModel.find({staffMember: user.id});
    if (slots.length !== 0) {
        res.send("Cannot delete academic member. Must reassign his slots first.");
        return;
    }

    await academicMemberModel.findOneAndDelete({id: user.id});

    const office = await roomModel.findOne({_id: user.office});
    office.remainingCapacity++;
    await office.save();

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
    
    await attendanceRecordModel.deleteMany({user: user.id});
    await notificationModel.deleteMany({user: user.id});
    await requestModel.deleteMany({requestedBy: user.id});

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
    if (req.body.totalSlotsNumber) {
        course.totalSlotsNumber = req.body.totalSlotsNumber;
    }
    if (req.body.department) {
        const department = await departmentModel.findOne({name: req.body.department});
        if (!department) {
            res.send("Invalid department name.");
            return;
        }
        course.department = department._id;
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
            res.send("Cannot add this instructor as a head of department as he/she is already a head of another department.");
            return;
        }
        if (headOfDepartment.role !== "Course Instructor") {
            res.send("Cannot assign this member to be head department as he/she is not a course instructor.");
            return;
        }
        if (headOfDepartment.department !== "UNASSIGNED") {
            res.send("Cannot assign this member to be head department as he/she is in another department.");
            return;
        }
    }

    let newDepartment = new departmentModel({
        name: req.body.name,
        faculty: faculty? faculty._id: "UNASSIGNED",
        headOfDepartment: headOfDepartment? headOfDepartment.id: "UNASSIGNED"
    });
    
    try {
        await newDepartment.save();
        if (headOfDepartment) {
            newDepartment = await departmentModel.findOne({name: req.body.name});
            headOfDepartment.role = "Head of Department";
            headOfDepartment.department = newDepartment._id;
            await headOfDepartment.save();
        }
        res.send(newDepartment);
    }
    catch (error) {
        console.log(error.message);
        res.send(error);
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
    if (req.body.headOfDepartment) {
        var newHeadOfDepartment = await academicMemberModel.findOne({id: req.body.headOfDepartment});
        if (!newHeadOfDepartment) {
            res.send("No academic member with such id to be head of this department.");
            return;
        }
        if (newHeadOfDepartment.role === "Head of Department") {
            res.send("Cannot add this instructor as a head of department as he/she is already a head of another department.");
            return;
        }
        if (newHeadOfDepartment.role !== "Course Instructor") {
            res.send("Cannot assign this member to be head department as he/she is not a course instructor.");
            return;
        }
        if (newHeadOfDepartment.department !== department._id.toString() && newHeadOfDepartment.department !== "UNASSIGNED") {
            res.send("Cannot assign this member to be head department as he/she is in another department.");
            return;
        }
        var oldHeadOfDepartment = await academicMemberModel.findOne({id: department.headOfDepartment});
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

    if (department.headOfDepartment !== "UNASSIGNED") {
        let headOfDepartment = await academicMemberModel.findOne({id: department.headOfDepartment});
        headOfDepartment.role = "Course Instructor";
        await headOfDepartment.save();
    }

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

    if (!req.body.newName) {
        res.send("Must enter faculty name.");
        return;
    }
    faculty.name = req.body.newName;

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

router.route("/view-staff-attendance-records")
.get(async (req,res) => {
    
    if (!req.body.month&& req.body.year) {
        res.send("No month specified");
        return;
    }
    if (req.body.month && !req.body.year) {
        res.send("No year specified");
        return;
    }

    let user = await hrMemberModel.findOne({id: req.body.id});
    if (!user) {
        user = await academicMemberModel.findOne({id: req.body.id});
    }
    if (!user) {
        res.send("Invalid user id.")
        return;
    }
    
    if (req.body.month===null) {
        var userAttendanceRecords = await attendanceRecordModel.find({user: req.body.id});
    }
    else {
        const month = req.body.month - 1;
        const year = req.body.year;
        if (month < 0 || month > 11) {
            res.send("Not a valid month");
            return;
        }
        if (year < 2000) {
            res.send("Not a valid year");
            return;
        }
        userAttendanceRecords = await attendanceRecordModel.find({ $or: [
            { user: req.body.id, signInTime: {$gte: new Date(year, month, 11), $lt: new Date(year, month+1, 11)} },
            { user: req.body.id, signOutTime: {$gte: new Date(year, month, 11), $lt: new Date(year, month+1, 11)} }
        ] });
    }
    
    res.send(userAttendanceRecords);
})

router.route("/view-staff-missing-days")
.get(async (req, res) => {
    if (!req.body.month && req.body.year) {
        res.send("No month specified");
        return;
    }
    if (req.body.month && !req.body.year) {
        res.send("No year specified");
        return;
    }
    
    if (!req.body.month) {
        const currentDate = new Date();
        if (currentDate.getDate() >= 11) {
            var month = currentDate.getMonth();
            var year = currentDate.getFullYear();
        }
        else {
            if (currentDate.getMonth() === 0){
                month = 11;
                year = currentDate.getFullYear() - 1;
            }
            else {
                month = currentDate.getMonth() - 1;
                year = currentDate.getFullYear();
            }
        }
    }
    else {
     
        month = req.body.month - 1;
        year = req.body.year;
        if (month < 0 || month > 11) {
            res.send("Not a valid month");
            return;
        }
        if (year < 2000) {
            res.send("Not a valid year");
            return;
        }
    }

    let hrMembers = await hrMemberModel.find({});
    let academicMembers = await academicMemberModel.find({});
    let membersWithMissingDays = [];

    for (let i = 0; i < hrMembers.length ; i++) {
        let user = hrMembers[i];
        let dayOff = convertDay(user.dayOff);
        let userAttendanceRecords = await attendanceRecordModel.find({ user: user.id, signInTime: {$ne:null, $gte: new Date(year, month, 11), $lt: new Date(year, month+1, 11)}, signOutTime: {$ne:null} });
        const numberOfDaysInMonth = getNumberOfDaysInMonth(month, year);
        let normalDaysAttended = [];
        let daysOffAttended = [];
    
        for (let i = 0; i < userAttendanceRecords.length; i++) {
            let date = userAttendanceRecords[i].signInTime;
            if (date.getDay() !== 5 && date.getDay() !== dayOff && !normalDaysAttended.includes(date.getDate())) {
                normalDaysAttended.push(date.getDate());
            }
            else if (!daysOffAttended.includes(date.getDate())) {
                daysOffAttended.push(date.getDate());
            }
        }
    
        let expectedDaysToAttend = getExpectedDaysToAttend(dayOff, new Date(year, month, 11).getDay(), numberOfDaysInMonth);
        if (expectedDaysToAttend === normalDaysAttended.length) {
            return {missingDays: [], numberOfDaysWithExcuse: 0};
        }
    
        let missingDays = [];
        for (let i = 0; i < numberOfDaysInMonth; i++) {
            let date = new Date(year, month, 11 + i);
            if (date.getDay() !== 5 && date.getDay() !== dayOff && !normalDaysAttended.includes(date.getDate())) {
                missingDays.push(date);
            }
        }
        
        let numberOfDaysWithExcuse = 0;
        for (let i = 0; i < missingDays.length; i++) {
            let date = missingDays[i];
            let request = await requestModel.findOne({ 
                requestedBy: user.id,
                day: date, 
                type: {$ne: "slotLinkingRequest", $ne: "dayOffChangeRequest", $ne:"replacementRequest", $ne: "maternityLeave"}, 
                status:"Accepted" 
            });
    
            if (request) {
                if (request.type !== "compensationRequest" || request.type === "compensationRequest" && daysOffAttended.includes(missingDays[i].getDate())) {
                    missingDays.slice(i, i+1);
                    i--;
                    numberOfDaysWithExcuse++;
                }
            }
            else {
                request = await maternityLeaveModel.findOne({
                    requestedBy: user.id, 
                    type: "maternityLeave", 
                    status: "Accepted",
                    day: {$lte: missingDays[i]}
                    // duration: "" //{$gt: (missingDays[i] - $day)}
                });
                if (request) {
                    missingDays.slice(i, i+1);
                    i--;
                    numberOfDaysWithExcuse++;
                }
            }
        }
        var x={missingDays:missingDays,numberOfDaysWithExcuse,numberOfDaysWithExcuse}
        if (x.missingDays.length > 0) {
            membersWithMissingDays.push({id: user.id, missingDays: x.missingDays});
        }
    }
    
    for (let i = 0; i < academicMembers.length ; i++) {
        let user = academicMembers[i];
        let dayOff = convertDay(user.dayOff);
        let userAttendanceRecords = await attendanceRecordModel.find({ user: user.id, signInTime: {$ne:null, $gte: new Date(year, month, 11), $lt: new Date(year, month+1, 11)}, signOutTime: {$ne:null} });
        let missingDays = await getMissingDays(month, year, dayOff, userAttendanceRecords,user).missingDays;
        if (missingDays.length > 0) {
            membersWithMissingDays.push({id: user.id, missingDays: missingDays});
        }
    }

    res.send(membersWithMissingDays);
});

router.route("/view-staff-missing-hours")
.get(async(req, res) => {
    if (!req.body.month && req.body.year) {
        res.send("No month specified");
        return;
    }
    if (req.body.month && !req.body.year) {
        res.send("No year specified");
        return;
    }
    
    if (!req.body.month) {
        const currentDate = new Date();
        if (currentDate.getDate() >= 11) {
            var month = currentDate.getMonth();
            var year = currentDate.getFullYear();
        }
        else {
            if (currentDate.getMonth() === 0){
                month = 11;
                year = currentDate.getFullYear() - 1;
            }
            else {
                month = currentDate.getMonth() - 1;
                year = currentDate.getFullYear();
            }
        }
    }
    else {
   
        month = req.body.month - 1;
        year = req.body.year;
        if (month < 0 || month > 11) {
            res.send("Not a valid month");
            return;
        }
        if (year < 2000) {
            res.send("Not a valid year");
            return;
        }
    }

    let hrMembers = await hrMemberModel.find({});
    let academicMembers = await academicMemberModel.find({});
    let membersWithMissingHours = [];

    for (let i = 0; i < hrMembers.length ; i++) {
        let user = hrMembers[i];
        let dayOff = convertDay(user.dayOff);
        let userAttendanceRecords = await attendanceRecordModel.find({ user: user.id, signInTime: {$ne:null, $gte: new Date(year, month, 11), $lt: new Date(year, month+1, 11)}, signOutTime: {$ne:null} });
        const numberOfDaysInMonth = getNumberOfDaysInMonth(month, year);
        let normalDaysAttended = [];
        let daysOffAttended = [];
    
        for (let i = 0; i < userAttendanceRecords.length; i++) {
            let date = userAttendanceRecords[i].signInTime;
            if (date.getDay() !== 5 && date.getDay() !== dayOff && !normalDaysAttended.includes(date.getDate())) {
                normalDaysAttended.push(date.getDate());
            }
            else if (!daysOffAttended.includes(date.getDate())) {
                daysOffAttended.push(date.getDate());
            }
        }
    
        let expectedDaysToAttend = getExpectedDaysToAttend(dayOff, new Date(year, month, 11).getDay(), numberOfDaysInMonth);
        if (expectedDaysToAttend === normalDaysAttended.length) {
            return {missingDays: [], numberOfDaysWithExcuse: 0};
        }
    
        let missingDays = [];
        for (let i = 0; i < numberOfDaysInMonth; i++) {
            let date = new Date(year, month, 11 + i);
            if (date.getDay() !== 5 && date.getDay() !== dayOff && !normalDaysAttended.includes(date.getDate())) {
                missingDays.push(date);
            }
        }
        
        let numberOfDaysWithExcuse = 0;
        for (let i = 0; i < missingDays.length; i++) {
            let date = missingDays[i];
            let request = await requestModel.findOne({ 
                requestedBy: user.id, 
                day: date, 
                type: {$ne: "slotLinkingRequest", $ne: "dayOffChangeRequest", $ne:"replacementRequest", $ne: "maternityLeave"}, 
                status:"Accepted" 
            });
    
            if (request) {
                if (request.type !== "compensationRequest" || request.type === "compensationRequest" && daysOffAttended.includes(missingDays[i].getDate())) {
                    missingDays.slice(i, i+1);
                    i--;
                    numberOfDaysWithExcuse++;
                }
            }
            else {
                request = await maternityLeaveModel.findOne({
                    requestedBy: user.id, 
                    type: "maternityLeave", 
                    status: "Accepted",
                    day: {$lte: missingDays[i]},
                    duration: "" //{$gt: (missingDays[i] - $day)}
                });
                if (request) {
                    missingDays.slice(i, i+1);
                    i--;
                    numberOfDaysWithExcuse++;
                }
            }
        }
    
        var y= { missingDays: missingDays, numberOfDaysWithExcuse: numberOfDaysWithExcuse };
        const requiredHours = (expectedDaysToAttend - y.numberOfDaysWithExcuse) * 8.4;
    
        let timeDiffInSeconds = 0;
        for (let i = 0; i < userAttendanceRecords.length; i++) {
            let signInTime = userAttendanceRecords[i].signInTime;
            let signOutTime = userAttendanceRecords[i].signOutTime;
    
            if (signInTime.getHours() < 7) {
                signInTime.setHours(7);
                signInTime.setMinutes(0);
                signInTime.setSeconds(0);
                signInTime.setMilliseconds(0);
            }
            else if (signInTime.getHours() > 18) {
                signInTime.setHours(19);
                signInTime.setMinutes(0);
                signInTime.setSeconds(0);
                signInTime.setMilliseconds(0);
            }
            else {
                signInTime.setMilliseconds(0);
            }
    
            if (signOutTime.getHours() < 7) {
                signOutTime.setHours(7);
                signOutTime.setMinutes(0);
                signOutTime.setSeconds(0);
                signOutTime.setMilliseconds(0);
            }
            else if (signOutTime.getHours() > 18) {
                signOutTime.setHours(19);
                signOutTime.setMinutes(0);
                signOutTime.setSeconds(0);
                signOutTime.setMilliseconds(0);
            }
            else {
                signOutTime.setMilliseconds(0);
            }
            
            timeDiffInSeconds += (signOutTime - signInTime) / 1000;
        }
        
        // const spentHours = Math.floor(timeDiffInSeconds / 3600);
        // timeDiffInSeconds %= 3600;
        // const spentMinutes = Math.floor(timeDiffInSeconds / 60);
        // timeDiffInSeconds %= 60;
        // const spentSeconds = timeDiffInSeconds;
    
        const spentHours = timeDiffInSeconds / 3600;
        if (spentHours > requiredHours) {
            var x= {missingHours: 0, extraHours: spentHours - requiredHours};
        }
        else {
            var x= {missingHours: requiredHours - spentHours, extraHours: 0};
        }
        if (x.missingHours > 0) {
            membersWithMissingHours.push({id: user.id, missingHours: x.missingHours});
        }
    }
    
    for (let i = 0; i < academicMembers.length ; i++) {
        let user = hrMembers[i];
        let dayOff = convertDay(user.dayOff);
        let userAttendanceRecords = await attendanceRecordModel.find({ user: user.id, signInTime: {$ne:null, $gte: new Date(year, month, 11), $lt: new Date(year, month+1, 11)}, signOutTime: {$ne:null} });
        const numberOfDaysInMonth = getNumberOfDaysInMonth(month, year);
        let normalDaysAttended = [];
        let daysOffAttended = [];
    
        for (let i = 0; i < userAttendanceRecords.length; i++) {
            let date = userAttendanceRecords[i].signInTime;
            if (date.getDay() !== 5 && date.getDay() !== dayOff && !normalDaysAttended.includes(date.getDate())) {
                normalDaysAttended.push(date.getDate());
            }
            else if (!daysOffAttended.includes(date.getDate())) {
                daysOffAttended.push(date.getDate());
            }
        }
    
        let expectedDaysToAttend = getExpectedDaysToAttend(dayOff, new Date(year, month, 11).getDay(), numberOfDaysInMonth);
        if (expectedDaysToAttend === normalDaysAttended.length) {
            return {missingDays: [], numberOfDaysWithExcuse: 0};
        }
    
        let missingDays = [];
        for (let i = 0; i < numberOfDaysInMonth; i++) {
            let date = new Date(year, month, 11 + i);
            if (date.getDay() !== 5 && date.getDay() !== dayOff && !normalDaysAttended.includes(date.getDate())) {
                missingDays.push(date);
            }
        }
        
        let numberOfDaysWithExcuse = 0;
        for (let i = 0; i < missingDays.length; i++) {
            let date = missingDays[i];
            let request = await requestModel.findOne({ 
                requestedBy: user.id, 
                day: date, 
                type: {$ne: "slotLinkingRequest", $ne: "dayOffChangeRequest", $ne:"replacementRequest", $ne: "maternityLeave"}, 
                status:"Accepted" 
            });
    
            if (request) {
                if (request.type !== "compensationRequest" || request.type === "compensationRequest" && daysOffAttended.includes(missingDays[i].getDate())) {
                    missingDays.slice(i, i+1);
                    i--;
                    numberOfDaysWithExcuse++;
                }
            }
            else {
                request = await maternityLeaveModel.findOne({
                    requestedBy: user.id, 
                    type: "maternityLeave", 
                    status: "Accepted",
                    day: {$lte: missingDays[i]},
                    duration: "" //{$gt: (missingDays[i] - $day)}
                });
                if (request) {
                    missingDays.slice(i, i+1);
                    i--;
                    numberOfDaysWithExcuse++;
                }
            }
        }
    
        var y= { missingDays: missingDays, numberOfDaysWithExcuse: numberOfDaysWithExcuse };
        const requiredHours = (expectedDaysToAttend - y.numberOfDaysWithExcuse) * 8.4;
    
        let timeDiffInSeconds = 0;
        for (let i = 0; i < userAttendanceRecords.length; i++) {
            let signInTime = userAttendanceRecords[i].signInTime;
            let signOutTime = userAttendanceRecords[i].signOutTime;
    
            if (signInTime.getHours() < 7) {
                signInTime.setHours(7);
                signInTime.setMinutes(0);
                signInTime.setSeconds(0);
                signInTime.setMilliseconds(0);
            }
            else if (signInTime.getHours() > 18) {
                signInTime.setHours(19);
                signInTime.setMinutes(0);
                signInTime.setSeconds(0);
                signInTime.setMilliseconds(0);
            }
            else {
                signInTime.setMilliseconds(0);
            }
    
            if (signOutTime.getHours() < 7) {
                signOutTime.setHours(7);
                signOutTime.setMinutes(0);
                signOutTime.setSeconds(0);
                signOutTime.setMilliseconds(0);
            }
            else if (signOutTime.getHours() > 18) {
                signOutTime.setHours(19);
                signOutTime.setMinutes(0);
                signOutTime.setSeconds(0);
                signOutTime.setMilliseconds(0);
            }
            else {
                signOutTime.setMilliseconds(0);
            }
            
            timeDiffInSeconds += (signOutTime - signInTime) / 1000;
        }
        
        // const spentHours = Math.floor(timeDiffInSeconds / 3600);
        // timeDiffInSeconds %= 3600;
        // const spentMinutes = Math.floor(timeDiffInSeconds / 60);
        // timeDiffInSeconds %= 60;
        // const spentSeconds = timeDiffInSeconds;
    
        const spentHours = timeDiffInSeconds / 3600;
        if (spentHours > requiredHours) {
            var x= {missingHours: 0, extraHours: spentHours - requiredHours};
        }
        else {
            var x= {missingHours: requiredHours - spentHours, extraHours: 0};
        }
        if (x.missingHours > 0) {
            membersWithMissingHours.push({id: user.id, missingHours: x.missingHours});
        }
    }
    
    res.send(membersWithMissingHours);
});

router.route("/add-missing-record")
.post(async (req,res) =>{
    const token = jwt.decode(req.headers.token);
    if (req.body.id === token.id) {
        res.send("Cannot add missing record for yourself");
        return;
    }

    let user = await hrMemberModel.findOne({id: req.body.id});
    if (!user) {
        user = await academicMemberModel.findOne({id: req.body.id});
    }
    if (!user) {
        res.send("Invalid user id.");
        return;
    }

    let missingRecordType = req.body.missingRecordType;
    let signInYear = req.body.signInYear;
    let signInMonth = req.body.signInMonth;
    let signInDay = req.body.signInDay;
    let signInHour = req.body.signInHour;
    let signInMinute = req.body.signInMinute;
    let signOutYear = req.body.signOutYear;
    let signOutMonth = req.body.signOutMonth;
    let signOutDay = req.body.signOutDay;
    let signOutHour = req.body.signOutHour;
    let signOutMinute = req.body.signOutMinute;
    let signInDate;
    let signOutDate;
    let userRecord;

    if (missingRecordType!=="signOut"&& missingRecordType!=="SignIn") {
        res.send("Inavalid missing record type.");
        return;
    }
    if(signInYear===null || signOutYear===null || signInMonth===null || signOutMonth===null || signInDay===null || signOutDay===null
    || signInHour===null|| signOutHour===null || signInMinute===null || signOutMinute===null ){
        res.send("Not all fields are entered.");
        return;
    }
    if(signInYear<2000 || signOutYear<2000){
        res.send("Invalid year.");
        return;
    }
    if(signInMonth<0 || signInMonth>11 || signOutMonth<0 || signOutMonth>11){
        res.send("Invalid month.");
        return;
    }
    if(signInHour<0 || signInHour>23 || signOutHour<0 || signOutHour>23 ){
        res.send("Invalid hour.");
        return;
    }
    if(signInMinute<0 || signInMinute>59 || signOutMinute<0 || signOutMinute>59 ){
        res.send("Invalid hour.");
        return;
    }
    if(signInDay!==signOutDay ||signInMonth!==signOutMonth || signInYear!==signOutYear){
            res.send("Cannot match these records together ");
            return;
    }
    if(signInHour>signOuHour){
        res.send("Cannot have the sign in hour that is greater than the sign out hour.");
        return;
    }   
    if(signInHour===signOuHour && signInMinute>signOutMinute){
        res.send("Cannot have the sign in hour equal to the sign out hour if the sign in minute is greater than the sign out minute.");
        return;
    }  
    if(missingRecordType==="signIn"){
        signInDate=new Date(signInYear,signInMonth,signInDay,signInHour,signInMinute,0,0);
        signOutDate=new Date(signOutYear,signOutMonth,signOutDay,signOutHour,signOutMinute,0,0);

        userRecord=await attendance_record_model.findOne({user:user.id,signOutTime:{$gte:signOutDate,
        $lte:new Date(signOutYear,signOutMonth,signOutDay,signOutHour,signOutMinute,59,0)},signInTime:null})

        if(!userRecord){
            res.send("Could not find specified sign out time.");
            return;
        }
        else{
            userRecord.signInTime=signInDate;
            try {
                await userRecord.save();
                res.send(userRecord);
            }
            catch (error) {
                console.log(error.message)
                res.send(error);
            }
        }
    }
    else if(missingRecordType==="signOut"){
        signInDate=new Date(signInYear,signInMonth,signInDay,signInHour,signInMinute,0,0);
        signOutDate=new Date(signOutYear,signOutMonth,signOutDay,signOutHour,signOutMinute,0,0);

        userRecord=await attendance_record_model.findOne({user:user.id,signInTime:{$gte:signInDate,
        $lte:new Date(signInYear,signInMonth,signInDay,signInHour,signInMinute,59,0)},signOutTime:null})

        if(!userRecord){
            res.send("Could not find specified sign in time.");
            return;
        }
        else{
            userRecord.signOutTime=signOutDate;
            try {
                await userRecord.save();
                res.send(userRecord);
            }
            catch (error) {
                console.log(error.message)
                res.send(error);
            }
        }
    }
});

module.exports = router;