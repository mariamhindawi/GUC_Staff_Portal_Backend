const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");
const courseModel = require("../models/course_model");
const departmentModel = require("../models/department_model");
const facultyModel = require("../models/faculty_model");
const { findOne } = require("../models/hr_member_model");
const attendance_record_model = require("../models/attendance_record_model");

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
    if (room.type==="Office") {
        if (req.body.type!=="Office") {
            if (persons > 0) {
                res.send("Cannot update type.. Reassign people in Office frist");
                return;
            }
        }
    }
    
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
    if (room.type==="Office") {
        res.send("Cannot delete room.. Reassign people in it first");
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

    })
    dep.courses.push(req.body.name);
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
    let headOfDepartment = await academicMemberModel.findOne({name: req.body.headOfDepartment});
    if (!headOfDepartment) {
        res.send("No academic member with such name to be head of this department");
        return;
    }
    console.log(headOfDepartment);
    if (headOfDepartment.role!=="Head of Department") {
        headOfDepartment.role = "Head of Department";
        try {
            await headOfDepartment.save();
        }
        catch(errpr) {
            res.send(error);
        }
    }
    const newdepartment = new departmentModel({
        name: req.body.name,
        courses: req.body.courses,
        faculty: req.body.faculty,
        headOfDepartment: req.body.headOfDepartment
    })
    faculty.departments.push(req.body.name);
    console.log(faculty.departments); 
    try {
        await faculty.save();
    }
    catch(error) {
        res.send("error");
    }

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
    let courses = await courseModel.find({department: req.body.name});
    for (i = 0; i < courses.length; i++) {
        let crs =  courses[i];
        crs.department = req.body.name1;
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
    let courses = await courseModel.find({department: req.body.name});
    for (i = 0; i < courses.length; i++) {
        let crs =  courses[i];
        await departmentModel.findOneAndDelete({name: crs.name});
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
router.route("/update-faculty")
.post(async (req,res) => {
    let faculty = await facultyModel.findOne({name: req.body.name});
    if(!faculty) {
        res.send("No department with such name");
        return;
    }
    if (req.body.name1) {
        faculty.name = req.body.name1;
    }
    if (req.body.departments) {
        faculty.departments = req.body.departments;
    }
    try {
        await faculty.save();
        res.send("Updated faculty: "+faculty);
    }
    catch(error) {
        res.send(error);
    }

})
router.route("/delete-faculty")
.post (async(req,res) => {
    let deletedFaculty = await facultyModel.findOne({name: req.body.name})
    if (!deletedFaculty) {
        res.send("No department to delete");
        return;
    }
    let departments = await departmentModel.find({faculty: req.body.name});
    for (i = 0; i < departments.length; i++) {
        let dep =  departments[i];
        dep.faculty="UNASSIGNED";
        dep.save();
    }
    try {
        await facultyModel.findOneAndDelete({name: req.body.name});
        res.send("Deleted faculty: "+deletedFaculty);
    }
    catch(error)
    {
        res.send(error);
    }
})

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
                userRecord.save();
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
                userRecord.save();
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