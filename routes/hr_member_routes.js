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

function getMonthStats(currMonth, currYear){
    let daysInMonth;
    switch(currMonth){
        //31 days
        case 0:
        case 2:
        case 4:
        case 6:
        case 7:
        case 9:
        case 11:
            daysInMonth=31;
            break;
        case 1:
            //28 days
            if(currYear % 4===0){
                daysInMonth=28;
            }
            //29 days
            else{
                daysInMonth=29;
            }
            break;
        //30 days
        case 3:
        case 5:
        case 8:
        case 10:
            daysInMonth=30;
            break;
    }    
    return daysInMonth;
}
function convertDayOff(day){
    if(day==="Sunday"){
       return 0;
    }
    else if(day==="Monday"){
        return 1;
    }    
    else if(day==="Tuesday"){
        return 2;
    }
    else if(day==="Wednesday"){
        return 3; 
    }
    else if(day==="Thursday"){
        return 4;
    }
    else if(day==="Friday"){
        return 5;
    }
    else if(day==="Saturday"){
        return 6;
    }
}
 function getExpectedDaysToAttend(dayOff, firstDay, daysInMonth){
    let expectedDaysToAttend=20;  
    if(daysInMonth===31){
        if((firstDay)%7===5 || (firstDay+1)%7===5 || (firstDay+2)%7===5 ){
           expectedDaysToAttend=22;  
        }
        if((firstDay)%7===dayOff || (firstDay+1)%7===dayOff || (firstDay+2)%7===dayOff ){
            expectedDaysToAttend=21;
        }
    }
    else if(daysInMonth===30){
        expectedDaysToAttend=22;
        if((firstDay)%7===5 || (firstDay+1)%7===5){
            expectedDaysToAttend=21;  
         }
         if((firstDay)%7===dayOff || (firstDay+1)%7===dayOff){
             expectedDaysToAttend=20;
         }
    }
    else if(daysInMonth===29){
        expectedDaysToAttend=21;
        if((firstDay)%7===5){
            expectedDaysToAttend=20;  
         }
         if((firstDay+1)%7===dayOff){
             expectedDaysToAttend=20;
         }
    }
    return expectedDaysToAttend;
   
}
function getDaysOfTheMonth(daysInMonth){
    let daysOfTheMonth=[];
    for(var i=11;i<daysInMonth+1;i++){
        daysOfTheMonth.push(i);
    }
    for(var i=1;i<11;i++){
        daysOfTheMonth.push(i);
    }
    return daysOfTheMonth;
}
function getMissingDays(month,year,daysInMonth,dayOff,daysOfTheMonth,normalDaysAttended){

    let missingDays=[];
    //remove days off and Fridays
   for(var i=0;i<daysOfTheMonth.length;i++){
    if(daysOfTheMonth[i]<=daysInMonth){
        if(!normalDaysAttended.includes(daysOfTheMonth[i]) && new Date(year,month,daysOfTheMonth[i]).getDay()!==5 && new Date(year,month,daysOfTheMonth[i]).getDay()!==dayOff){
            missingDays.push(daysOfTheMonth[i]);
        }
    }
    else{
        if(month!==11){
            if(!normalDaysAttended.includes(daysOfTheMonth[i]) && new Date(year,month+1,daysOfTheMonth[i]).getDay()!==5 && new Date(year,month+1,daysOfTheMonth[i]).getDay()!==dayOff){
                missingDays.push(daysOfTheMonth[i]);
            }
        }
        else{
            if(!normalDaysAttended.includes(daysOfTheMonth[i]) && new Date(year+1,0,daysOfTheMonth[i]).getDay()!==5 && new Date(year+1,0,daysOfTheMonth[i]).getDay()!==dayOff){
                missingDays.push(daysOfTheMonth[i]);
            }
        }
   }
}
   return missingDays;
}
function getMissingAndExtraHours(month,year,userAttendanceRecords,dayOff){
    
    let daysInMonth=getMonthStats(month);
    let expectedDaysToAttend=getExpectedDaysToAttend(dayOff,new Date(year,month,11).getDay(),daysInMonth);
    let expectedHoursToSpend=expectedDaysToAttend*8.4;
    let spentHours=0;
    let spentMinutes=0;
    let spentSeconds=0;
    let missingHours=0;
    let timeDiiffInSeconds;

    for(var i=0;i<userAttendanceRecords.length;i++){
        let signInTime=userAttendanceRecords[i].signInTime;
        let signOutTime=userAttendanceRecords[i].signOutTime;

        if(signInTime.getHours()>18 || signOutTime.getHours()<7 ||(signOutTime.getHours()===7 && signOutTime.getMinutes()===0 && signOutTime.getSeconds()===0) ){
           timeDiiffInSeconds=0;
        }
        else if(signInTime.getHours()<7 && signOutTime.getHours()>19){
         timeDiiffInSeconds=12*60*60;
        }
        else if(signInTime.getHours()<7 && signOutTime.getHours()<19){
            let date=signInTime;
            date.setHours(7);
            date.setMinutes(0);
            date.setSeconds(0);
            date.setMilliseconds(0);
            timeDiiffInSeconds=(signOutTime-date)/1000;
        }
        else if(signInTime.getHours()>7 && signOutTime.getHours()>19){
            let date=signOutTime;
            date.spentHours(19);
            date.setMinutes(0);
            date.setSeconds(0);
            date.setMilliseconds(0);
            timeDiiffInSeconds=(date-signInTime)/1000;
        }
        else{
           timeDiiffInSeconds=(signOutTime-signInTime)/1000;
        }
    }

    spentSeconds=spentSeconds+timeDiiffInSeconds%60;
    spentMinutes=spentMinutes+(timeDiiffInSeconds-spentSeconds)/60;
    spentHours=spentHours+(spentMinutes-spentMinutes%60)/60;
    spentMinutes=spentMinutes%60;
   
    missingHours=((expectedHoursToSpend*60)-(spentHours*60)-(spentMinutes))/60.0;
  

    if(missingHours<0){
            extraHours=missingHours*-1;
            missingHours=0;
    }
    else{
        extraHours=0;
    }
    var obj={
        missingHours:missingHours,
        extraHours:extraHours
    }
    return obj;
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
        const department  = await departmentModel.findOne({name: req.body.department});
        if (!department) {
            res.send("Invalid department name.");
            return;
        }
        if ((req.body.role === "Head of Department" && department.headOfDepartment !== "UNASSIGNED") ||
            (!req.body.role && user.role === "Head of Department" && department.headOfDepartment !== "UNASSIGNED")) {
            res.send("Department already has a head.");
            return;
        }
        user.department = department._id;
    }

    if (req.body.role) {
        if (req.body.role === "Course Coordinator") {
            res.status(403).send("You cannot assign an academic member to be a course coordinator");
            return;
        }
        else if (req.body.role === "Head of Department" && !req.body.department) {
            const department = await departmentModel.findOne({_id: user.department});
            if (department.headOfDepartment !== "UNASSIGNED") {
                res.send("Department already has a head.");
                return;
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
    let user = await hrMemberModel.findOne({id: req.body.id});
    if (!user) {
        user = await academicMemberModel.findOne({id: req.body.id});
    }
    if (!user) {
        res.send("Invalid user id.");
        return;
    }
    let userAttendanceRecords;
    let month=req.body.month;
    let year=req.body.year;

    if(month<0 || month>11){
        res.send("Not a valid month");
        return;
    }
    if(year<2000){
        res.send("Not a valid year");
        return;
    }
    if(!month && year!==null){
        res.send("No month specified");
        return;
    }
    if(!year && month!==null){
        res.send("No year specified");
        return;
    }
    if(month===null && year===null){
        userAttendanceRecords=await attendance_record_model.find({user:token.id})
    }
    else{
        if(month>=0 && month<11){
            userAttendanceRecords=await attendance_record_model.find(
                {$or:[{ $and: [ { user: token.id },{signInTime:{$lt:new Date(year,month+1,11),$gte:new Date(year,month,11)}}]},
                { $and: [ { user: token.id },{signOutTime:{$lt:new Date(year,month,11),$gte:new Date(year,month,11)}}]}
            ]})
        }
        else if(month===11){
            userAttendanceRecords=await attendance_record_model.find(
                {$or:[{ $and: [ { user: token.id },{signInTime:{$lt:new Date(year+1,0,11),$gte:new Date(year,11,11)}}]},
                { $and: [ { user: token.id },{signOutTime:{$lt:new Date(year+1,0,11),$gte:new Date(year,11,11)}}]}
            ]})
        }
    }

    try {
        res.send(userAttendanceRecords);
    }
    catch (error) {
        console.log(error.message)
        res.send(error);
    }

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

router.route("/add-missing-record")
.post(async (req,res) =>{
    const token = jwt.decode(req.headers.token);
    let user = await hrMemberModel.findOne({id: req.body.id});
    if (!user) {
        user = await academicMemberModel.findOne({id: req.body.id});
    }
    if (!user) {
        res.send("Invalid user id.");
        return;
    }
    if(user.id===token.id){
        res.send("Cannot add missing record for yourself");
        return;
    }
    let missingRecordType=req.body.missingRecordType;
    let signInYear=req.body.signInYear;
    let signInMonth=req.body.signInMonth;
    let signInDay=req.body.signInDay;
    let signInHour=req.body.signInHour;
    let signInMinute=req.body.signInMinute;
    let signOutYear=req.body.signOutYear;
    let signOutMonth=req.body.signOutMonth;
    let signOutDay=req.body.signOutDay;
    let signOutHour=req.body.signOutHour;
    let signOutMinute=req.body.signOutMinute;
    let signInDate;
    let signOutDate;
    let userRecord;

    if(missingRecordType!=="signOut"&& missingRecordType!=="SignIn"){
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

router.route("/view-staff-missing-days")
.get(async (req,res)=>{
    let staffwithMissingDays=[];
    let academicMembers;
    let hrMembers;
    
    if(new Date().getDate()>=11){
        month=new Date().getMonth();
        year=new Date().getFullYear();
    }
    else{
        if(new Date().getMonth()===0){
            month=11;
            year=new Date().getFullYear()-1;
        }
        else{
            month=new Date().getMonth()-1;
            year=new Date().getFullYear();
        }
    }
    let daysInMonth=getMonthStats(month);
    let daysOfTheMonth=getDaysOfTheMonth(daysInMonth);

    academicMembers=await academicMemberModel.find();
    hrMembers=await hrMemberModel.find(); 

    for(var i=0;i<academicMembers.length;i++){
        let dayOff=convertDayOff(academicMembers[i].dayOff);
        let userAttendanceRecords;
        let daysOffAttended=[];
        let normalDaysAttended=[];
        let missingDays=[];
        let maxDate;
    
        if(month>=0 && month<11){
            userAttendanceRecords=await attendance_record_model.find(
                 { $and: [ { user: academicMembers[i].id },{signInTime:{$ne:null}},{signOutTime:{$ne:null}},{signInTime:{$lt:new Date(year,month+1,11),$gte:new Date(year,month,11)}}]})
        }
        else if(month===11){
            userAttendanceRecords=await attendance_record_model.find(
                { $and: [ { user: academicMembers[i].id },{signInTime:{$ne:null}},{signOutTime:{$ne:null}},{signInTime:{$lt:new Date(year+1,0,11),$gte:new Date(year,11,11)}}]})
        }
        for(var i=0;i<userAttendanceRecords.length;i++){
            if(userAttendanceRecords[i].signInTime.getDay()!==5 && userAttendanceRecords[i].signInTime.getDay()!==dayOff){
                normalDaysAttended.push(userAttendanceRecords[i].signInTime.getDate());
            }
            else{
                daysOffAttended.push(userAttendanceRecords[i].signInTime.getDate());
            }
        }
            missingDays=getMissingDays(month,year,daysInMonth,dayOff,daysOfTheMonth,normalDaysAttended);
    
            if(missingDays.length!==0){
                for(var i=0;i<missingDays.length;i++){
                    let date;
                    if(missingDays[i]>=11){
                        date=new Date(year,month,missingDays[i]);
                    }
                    else{
                        if(month!==11){
                            date=new Date(year,month+1,missingDays[i]);
                        }
                        else{
                            date=new Date(year+1,0,missingDays[i]);
                        }
                    }
                    missingDays[i]=date;
    
                    let request= await annualLeaveModel.findOne({requestedBy:academicMembers[i].id,day:date,type:{$ne:"slotLinkingRequest"},type:{$ne:"dayOffChangeRequest"},
                    type:{$ne:"maternityLeave"},type:{$ne:"replacementRequest"},status:"Accepted"});
                    if(request){
                        if(request.type==="compensationRequest"){
                            if(daysOffAttended.includes(missingDays[i].getDate())){
                                    missingDays.slice(i,i+1);
                            }
                        }
                    }
                    else {
                        request=await annualLeaveModel.find({requestedBy:academicMembers[i].id,type:"maternityLeave",status:"Accepted"});
                        if(request.length>0){
                              maxDate=new Date(new Date().getTime()+(request.duration*24*60*60*1000));
                        }
                        request=await annualLeaveModel.findOne({requestedBy:academicMembers[i].id,day:{$gte:{date},$lte:{maxDate}},type:"maternityLeave",status:"Accepted"});
                        if(request){
                            missingDays.slice(i,i+1);
                        }
                    }
                }
            }
        var obj={id:academicMembers[i].id,
                missingDays:missingDays
        }
        staffwithMissingDays.push(obj);
    }

    for(var i=0;i<hrMembers.length;i++){
        let dayOff=convertDayOff(hrMembers[i].dayOff);
        let userAttendanceRecords;
        let daysOffAttended=[];
        let normalDaysAttended=[];
        let missingDays=[];
        let maxDate;
    
        if(month>=0 && month<11){
            userAttendanceRecords=await attendance_record_model.find(
                 { $and: [ { user: hrMembers[i].id },{signInTime:{$ne:null}},{signOutTime:{$ne:null}},{signInTime:{$lt:new Date(year,month+1,11),$gte:new Date(year,month,11)}}]})
        }
        else if(month===11){
            userAttendanceRecords=await attendance_record_model.find(
                { $and: [ { user: hrMembers[i].id },{signInTime:{$ne:null}},{signOutTime:{$ne:null}},{signInTime:{$lt:new Date(year+1,0,11),$gte:new Date(year,11,11)}}]})
        }
        for(var i=0;i<userAttendanceRecords.length;i++){
            if(userAttendanceRecords[i].signInTime.getDay()!==5 && userAttendanceRecords[i].signInTime.getDay()!==dayOff){
                normalDaysAttended.push(userAttendanceRecords[i].signInTime.getDate());
            }
            else{
                daysOffAttended.push(userAttendanceRecords[i].signInTime.getDate());
            }
        }
            missingDays=getMissingDays(month,year,daysInMonth,dayOff,daysOfTheMonth,normalDaysAttended);
    
            if(missingDays.length!==0){
                for(var i=0;i<missingDays.length;i++){
                    let date;
                    if(missingDays[i]>=11){
                        date=new Date(year,month,missingDays[i]);
                    }
                    else{
                        if(month!==11){
                            date=new Date(year,month+1,missingDays[i]);
                        }
                        else{
                            date=new Date(year+1,0,missingDays[i]);
                        }
                    }
                    missingDays[i]=date;
    
                    let request= await annualLeaveModel.findOne({requestedBy:hrMembers[i].id,day:date,type:{$ne:"slotLinkingRequest"},type:{$ne:"dayOffChangeRequest"},
                    type:{$ne:"maternityLeave"},type:{$ne:"replacementRequest"},status:"Accepted"});
                    if(request){
                        if(request.type==="compensationRequest"){
                            if(daysOffAttended.includes(missingDays[i].getDate())){
                                    missingDays.slice(i,i+1);
                            }
                        }
                    }
                    else {
                        request=await annualLeaveModel.find({requestedBy:hrMembers[i].id,type:"maternityLeave",status:"Accepted"});
                        if(request.length>0){
                              maxDate=new Date(new Date().getTime()+(request.duration*24*60*60*1000));
                        }
                        request=await annualLeaveModel.findOne({requestedBy:hrMembers[i].id,day:{$gte:{date},$lte:{maxDate}},type:"maternityLeave",status:"Accepted"});
                        if(request){
                            missingDays.slice(i,i+1);
                        }
                    }
                }
            }
        var obj={id:hrMembers[i].id,
                missingDays:missingDays
        }
        staffwithMissingDays.push(obj);
    }
    try {
        res.send(staffwithMissingDays);
    }
    catch (error) {
        console.log(error.message)
        res.send(error);
    }
});

router.route("/view-staff-missing-hours")
.get(async(req,res)=>{
    let staffwithMissingHours=[];
    let academicMembers=await academicMemberModel.find();
    let hrMembers=await hrMemberModel.find();
    let month;
    let year;
    if(new Date().getDate()>=11){
        month=new Date().getMonth();
        year=new Date().getFullYear();
    }
    else{
        if(new Date().getMonth()===0){
            month=11;
            year=new Date().getFullYear()-1;
        }
        else{
            month=new Date().getMonth()-1;
            year=new Date().getFullYear();
        }
    }

    for(var i=0;i<academicMembers.length;i++){
        let userAttendanceRecords;
        let missingHours;
        if(month>=0 && month<11){
            userAttendanceRecords=await attendance_record_model.find(
                { $and: [ { user: academicMembers[i] },{signInTime:{$ne:null}},{signOutTime:{$ne:null}},{signInTime:{$lt:new Date(year,month+1,11),$gte:new Date(year,month,11)}}]})
        }
        else if(month===11){
            userAttendanceRecords=await attendance_record_model.find(
                { $and: [ { user: academicMembers[i] },{signInTime:{$ne:null}},{signOutTime:{$ne:null}},{signInTime:{$lt:new Date(year+1,0,11),$gte:new Date(year,11,11)}}]})
        }

        missingHours=getMissingAndExtraHours(month,year,userAttendanceRecords,convertDayOff(academicMembers[i].dayOff)).missingHours;
        var obj={
            id: academicMembers[i].id,
            missingHours: missingHours
        }
        staffwithMissingHours.push(obj);
    }
    
    for(var i=0;i<hrMembers.length;i++){
        let userAttendanceRecords;
        let missingHours;
        if(month>=0 && month<11){
            userAttendanceRecords=await attendance_record_model.find(
                { $and: [ { user: hrMembers[i] },{signInTime:{$ne:null}},{signOutTime:{$ne:null}},{signInTime:{$lt:new Date(year,month+1,11),$gte:new Date(year,month,11)}}]})
        }
        else if(month===11){
            userAttendanceRecords=await attendance_record_model.find(
                { $and: [ { user: hrMembers[i] },{signInTime:{$ne:null}},{signOutTime:{$ne:null}},{signInTime:{$lt:new Date(year+1,0,11),$gte:new Date(year,11,11)}}]})
        }

        missingHours=getMissingAndExtraHours(month,year,userAttendanceRecords,convertDayOff(hrMembers[i].dayOff)).missingHours;
        var obj={
            id:hrMembers[i].id,
            missingHours: missingHours
        }
        staffwithMissingHours.push(obj);
    }
    try {
        res.send(staffwithMissingHours);
    }
    catch (error) {
        console.log(error.message)
        res.send(error);
    }
       
});

module.exports = router;