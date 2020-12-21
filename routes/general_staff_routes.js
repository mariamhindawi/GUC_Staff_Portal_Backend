const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const jwtBlacklistModel = require("../models/jwt_blacklist_model");
const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const attendanceRecordModel = require("../models/attendance_record_model");
const { annualLeaveModel, accidentalLeaveModel,
    maternityLeaveModel, dayOffChangeModel,
    slotLinkingModel, compensationLeaveModel, sickLeaveModel } = require("../models/request_model");

const router = express.Router();

router.route("/view-profile")
.get(async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let user = await hrMemberModel.findOne({id: token.id});
    if (!user) {
        user = await academicMemberModel.findOne({email: req.body.email});
    }
    res.send(user);
});

router.route("/reset-password")
.put(async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let user = await hrMemberModel.findOne({email: req.body.email});
    if (!user) {
        user = await academicMemberModel.findOne({email: req.body.email});
    }

    const passwordCorrect = await bcrypt.compare(req.body.oldPassword, user.password);
    if (!passwordCorrect) {
        res.status(401).send("Wrong password.");
        return;
    }
    
    const salt = await bcrypt.genSalt(10);
    const newPassword = await bcrypt.hash(req.body.newPassword, salt);
    user.password = newPassword;
    
    try {
        await user.save();
        const blacklistedToken = new jwtBlacklistModel({
            token: req.headers.token
        });
        await blacklistedToken.save();        
        res.send("Password changed successfully.");
    }
    catch (error) {
        console.log(error.message);
        res.send(error);
    }
});

function getMonthStats(currMonth, currYear){
    let daysInMonth;
    switch(currMonth){
        //31 days
        case 0:
        case 1:
        case 3:
        case 5:
        case 7:
        case 8:
        case 10:
            daysInMonth=31;
            break;
        case 2:
            //28 days
            if(year % 4===0){
                daysInMonth=28;
            }
            //29 days
            else{
                daysInMonth=29;
            }
            break;
        //30 days
        case 4:
        case 6:
        case 9:
        case 11:
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
function getFirstDay(daysInMonth){
    let firstDay;
    if (daysInMonth === 31){
        firstDay=new Date().getDay()-((new Date().getDate()%7)-1);
    } 
    else if (daysInMonth === 30){
        firstDay=new Date().getDay()-((new Date().getDate()%7)-2);
    }
    else if(daysInMonth === 29){
        firstDay=new Date().getDay()-((new Date().getDate()%7)-4);
    }
    else if(daysInMonth === 28){
        firstDay=new Date().getDay()-((new Date().getDate()%7)-3);
    }
    return firstDay;
    
 }
function getExpectedDaysToAttend(dayOff, firstDay, daysInMonth){

    let expectedDaysToAttend=20;
    if (daysInMonth === 31){
        if(dayOff%7===firstDay+1 || dayOff%7===firstDay+2 || dayOff%7===firstDay+3){
                expectedDaysToAttend=expectedDaysToAttend+2;
        }
        else{
            expectedDaysToAttend=expectedDaysToAttend+3;
        }
            
    } 
    else if (daysInMonth === 30){
        if(dayOff%7===firstDay+1 || dayOff%7===firstDay+2){
            expectedDaysToAttend=expectedDaysToAttend+1;
        }   
        else{
            expectedDaysToAttend=expectedDaysToAttend+2;
        }

    }
    else if(daysInMonth === 29){
        if(! (dayOff%7===firstDay+1)){
            expectedDaysToAttend=expectedDaysToAttend+1;
        }   
    }
    return expectedDaysToAttend;
   
}
function getDaysOfTheMonth(daysInMonth){
    let daysOfTheMonth;
    for(var i=11;i<daysInMonth+1;i++){
        daysOfTheMonth.push(i);
    }
    for(var i=1;i<11;i++){
        daysOfTheMonth.push(i);
    }
    return daysOfTheMonth;
}
function getDaysOfTheWeek(daysInMonth, firstDay){
    let daysOfTheWeek;
    let counter=0;
    for(var i=11;i<daysInMonth+1;i++){
        daysOfTheWeek.push((firstDay+counter)%7);
    }
    for(var i=1;i<11;i++){
        daysOfTheWeek.push((firstDay+counter)%7);
    }
    return daysOfTheWeek;
}
function calculateHoursSpentInRecord(attendanceRecord){
    let spentHours;
    let spentMinutes;
    if(attendanceRecord.signInTime.getHours()<7){
        //if sign in time is before 7am and sign out time is after 7pm
        if(attendanceRecord.signOutTime.getHours()>=19){
            spentHours=spentHours+12;
        }  
        else{
        //if sign in time is before 7am and sign out time is before 7pm  
            spentHours=spentHours+(attendanceRecord.signOutTime.getHours()-7);
            spentMinutes=spentMinutes+attendanceRecord.signOutTime.getMinutes() +
            (attendanceRecord.signOutTime.getSeconds()/1.0);
        }
    }
    else{
        //if sign in time is after 7am and sign out time is after 7pm
        if(attendanceRecord.signOutTime.getHours()>=19){
                spentHours=spentHours+(19-attendanceRecord.signOutTime.getHours());
                spentMinutes=spentMinutes+attendanceRecord.signInTime.getMinutes()
                +(attendanceRecord.signInTime.getSeconds()/1.0);
        }  
        else{
            //if sign in time is after 7am and sign out time is before 7pm
            spentHours=spentHours+attendanceRecord.signInTime.getHours()
            + attendanceRecord.signOutTime.getHours();
            spentMinutes=spentMinutes+attendanceRecord.signInTime.getMinutes()
            + attendanceRecord.signOutTime.getMinutes()
            + (attendanceRecord.signInTime.getSeconds()/1.0)
            + (attendanceRecord.signOutTime.getSeconds()/1.0);
        }
    }
    return {spentHours:spentHours, spentMinutes:spentMinutes};
}
function getMissingDays(daysInMonth,attendedDays,daysOfTheMonth,daysOfTheWeek,dayOff,month,year){
    let dateOfRequest;
    let missingDays;
    for(var i=0;i<daysInMonth;i++){
        if((!attendedDays.includes(daysOfTheMonth[i]))&& daysOfTheWeek[i]!==dayOff &&
        daysOfTheWeek[i]!==5){
            //add to missing days
            missingDays.push(daysInMonth[i]);
            //check for requests
            
            //if no request deduct from salary
            if(daysInMonth[i]<11){
                dateOfRequest=daysInMonth[i]+"/"+(month+1)%12+"/"+year;
            }
            else{
                dateOfRequest=daysInMonth[i]+"/"+month+"/"+year;
            }
         //check requests
         let deductedDays=checkForRequests(staffId,dateOfRequest);
        }
    }
    return {missingDays:missingDays,deductedDays:deductedDays};
}
function getMissingHours(expectedDaysToAttend,spentHours){
let expectedHoursToSpend=expectedDaysToAttend*8.4;
let missingHours;
    if(expectedHoursToSpend-spentHours>=0){
        missingHours=0;
    }
    else{
        missingHours=(expectedHoursToSpend-spentHours)*-1;
    }
    return missingHours;
}
function getExtraHours(expectedDaysToAttend,spentHours){
    let expectedHoursToSpend=expectedDaysToAttend*8.4;
    let extraHours;
    if(expectedHoursToSpend-spentHours>=0){
        extraHours=expectedHoursToSpend-spentHours;
    }
    else{
        extraHours=0;
    }
    return extraHours;
}
function checkForRequests (staffId, dateOfRequest){
    let deductedDays;
    let request=await annualLeaveModel.find({ requestedBy: staffId, day: dateOfRequest, status:'Accepted'});
    if(!request){
        request=await accidentalLeaveModel.find({ requestedBy: staffId, day: dateOfRequest, status:'Accepted'});
    }
    if(!request){
        request=await sickLeaveModel.find({ requestedBy:staffId, day: dateOfRequest, status:'Accepted'});
    }
    if(!request){
        request=await compensationLeaveModel.find({ requestedBy: staffId, day: dateOfRequest, status:'Accepted'});
        if(!daysOffAttended.includes(daysOfTheMonth[i])){
            deductedDays++;
        }
    }
    if(!request){
        deductedDays++;
    }
    return deductedDays;
}
function calculateSalary(initialSalary,deductedDays, missingHours){
let finalSalary=initialSalary-(deductedDays*(initialSalary/60));
if(missingHours-2-(59/60)>0){
    finalSalary=(missingHours-2-(59/60))*(initialSalary/180);
}
return finalSalary;

}
function getAttendanceRecordsByMonth(userAttendanceRecords,month,year){
    let daysInMonth=getMonthStats(month,year);
    //check which records to consider
    for (var i=0;i<userAttendanceRecords.length();i++){
        let signInTime=new Date(userAttendanceRecords[i].signInTime);
        let signOutTime=new Date(userAttendanceRecords[i].signOutTime);

        //skip the records before the intended ones to consider
        if(signInTime.getFullYear<year || (signInTime.getDate<11 && signInTime.getMonth===month)
        || (signInTime.getDate>10 && signInTime.getMonth>(month+1)%12)){
            continue;
        }
        //break when the records are after the intended ones to consider
        else if(signInTime.getMonth !==11 && year === signInTime.getFullYear+1){
            break;
        }
        //the records to be considered
        else{
        response.push(userAttendanceRecords[i]);
        }
    }
}
router.route("/salary")
.get(async (req,res) => {
    let user = await hrMemberModel.findOne({id: token.id});
    if (!user) {
        user = await academicMemberModel.findOne({id: token.id});
    }
    if (!user) {
        res.send("Invalid user id.");
        return;
    }
    let month=req.body.month;
    let year=req.body.year;
    let daysInMonth=getMonthStats(month,year);
    let dayOff=convertDayOff(user.dayOff);
    let firstDay=getFirstDay(daysInMonth);
    let expectedDaysToAttend=getExpectedDaysToAttend(dayOff,firstDay,daysInMonth);
    let userAttendanceRecords=await attendanceRecordModel.find({staffId: token.id}).sort({signInTime: 1});

    let attendedDays;
    let daysOffAttended;
    let spentHours;
    let spentMinutes;
    let prevRecordDate;

     //check which records to consider
     for (var i=0;i<userAttendanceRecords.length();i++){
        let signInTime=new Date(userAttendanceRecords[i].signInTime);
        let signOutTime=new Date(userAttendanceRecords[i].signOutTime);

        //skip the records before the intended ones to consider
        if(signInTime.getFullYear<year || (signInTime.getDate<11 && signInTime.getMonth===month)){
            continue;
        }
        //break when the records are after the intended ones to consider
        else if(signInTime.getMonth !==11 && year === signInTime.getFullYear+1){
            break;
        }
        //the records to be considered
        else{
            if(signInTime!==null && signOutTime!==null){
                //calculate spent hours
                spentHours=spentHours+calculateHoursSpentInRecord(userAttendanceRecords[i]).spentHours;
                spentMinutes=spentMinutes+calculateHoursSpentInRecord(userAttendanceRecords[i].spentMinutes);
                if(signInTime.getDay === 5 || signInTime.getDay ===dayOff){
                    daysOffAttended.push(signInTime.getDate());
                }
                if(prevRecordDate!==signInTime.getDate){
                    attendedDays.push(signInTime.getDate);
                    prevRecordDate===signInTime.getDate;
                } 
            }
        }
    }
    spentHours=spentHours+Math.floor(spentMinutes/60);
    spentMinutes=spentMinutes-Math.floor(spentMinutes/60);
    spentHours=spentHours+(spentMinutes/60);

    if(!(expectedDaysToAttend===attendedDays.length())){
        //get missing days
        //construct 2 arrays 1  for days in month  and 1 for corresponding day of week
        let daysOfTheMonth=getDaysOfTheMonth(daysInMonth);
        let daysOfTheWeek=getDaysOfTheWeek(daysInMonth,firstDay);
        }
        //check missing hours and extra hours
        let missingHours=getMissingHours(expectedDaysToAttend,spentHours);
        let deductedDays=getMissingDays(daysInMonth,attendedDays,daysOfTheMonth,daysOfTheWeek,dayOff,month,year).deductedDays;
        let salary=calculateSalary(initialSalary,deductedDays,missingHours);

    try {
        res.send(salary);
    }
    catch (error) {
        console.log(error.message)
        res.send(error);
    }

});
router.route("/attendance-records")
.get(async (req,res) =>{
    let userAttendanceRecords;
    let response;
    if(req.body.month !==null){
       userAttendanceRecords=await attendanceRecordModel.find({staffId: token.id}).sort({signInTime: 1});
    }
    else{
        userAttendanceRecords= getAttendanceRecordsByMonth(userAttendanceRecords,month,year);
    }
    try {
        res.send(userAttendanceRecords);
    }
    catch (error) {
        console.log(error.message)
        res.send(error);
    }
});
router.route("/missing-days")
.get(async (req,res) =>{
    let user = await hrMemberModel.findOne({id: token.id});
    if (!user) {
        user = await academicMemberModel.findOne({id: token.id});
    }
    if (!user) {
        res.send("Invalid user id.");
        return;
    }
    let month=req.body.month;
    let year=req.body.year;
    let daysInMonth=getMonthStats(month,year);
    let dayOff=convertDayOff(user.dayOff);
    let firstDay=getFirstDay(daysInMonth);
    let expectedDaysToAttend=getExpectedDaysToAttend(dayOff,firstDay,daysInMonth);
    let userAttendanceRecords=await attendanceRecordModel.find({staffId: token.id}).sort({signInTime: 1});

    let attendedDays;
    let daysOffAttended;
    let prevRecordDate;
    let missingDays;

     //check which records to consider
     for (var i=0;i<userAttendanceRecords.length();i++){
        let signInTime=new Date(userAttendanceRecords[i].signInTime);
        let signOutTime=new Date(userAttendanceRecords[i].signOutTime);

        //skip the records before the intended ones to consider
        if(signInTime.getFullYear<year || (signInTime.getDate<11 && signInTime.getMonth===month)
        || (signInTime.getDate>10 && signInTime.getMonth>(month+1)%12)){
            continue;
        }
        //break when the records are after the intended ones to consider
        else if(signInTime.getMonth !==11 && year === signInTime.getFullYear+1){
            break;
        }
        //the records to be considered
        else{
            if(signInTime!==null && signOutTime!==null){
                if(signInTime.getDay === 5 || signInTime.getDay === dayOff){
                    daysOffAttended.push(signInTime.getDate());
                }
                if(prevRecordDate!==signInTime.getDate){
                    attendedDays.push(signInTime.getDate);
                    prevRecordDate===signInTime.getDate;
                } 
            }
        }
    }
    if(!(expectedDaysToAttend===attendedDays.length())){
        //get missing days
        //construct 2 arrays 1  for days in month  and 1 for corresponding day of week
        let daysOfTheMonth=getDaysOfTheMonth(daysInMonth);
        let daysOfTheWeek=getDaysOfTheWeek(daysInMonth,firstDay);
       
        //loop and find days that are not attended and are neither friday nor a day off        
         missingDays=getMissingDays(daysInMonth,attendedDays,daysOfTheMonth,daysOfTheWeek,dayOff,month,year).missingDays;
    }
    try {
        res.send(missingDays);
    }
    catch (error) {
        console.log(error.message)
        res.send(error);
    }
});

router.route("/missing-hours")
.get(async (req,res) =>{
    let user = await hrMemberModel.findOne({id: token.id});
    if (!user) {
        user = await academicMemberModel.findOne({id: token.id});
    }
    if (!user) {
        res.send("Invalid user id.");
        return;
    }
    let month=req.body.month;
    let year=req.body.year;
    let daysInMonth=getMonthStats(month,year);
    let dayOff=convertDayOff(user.dayOff);
    let firstDay=getFirstDay(daysInMonth);
    let expectedDaysToAttend=getExpectedDaysToAttend(dayOff,firstDay,daysInMonth);
    let userAttendanceRecords=await attendanceRecordModel.find({staffId: token.id}).sort({signInTime: 1});

    let attendedDays;
    let daysOffAttended;
    let spentHours;
    let spentMinutes;
    let prevRecordDate;
    let missingHours;

     //check which records to consider
     for (var i=0;i<userAttendanceRecords.length();i++){
        let signInTime=new Date(userAttendanceRecords[i].signInTime);
        let signOutTime=new Date(userAttendanceRecords[i].signOutTime);

        //skip the records before the intended ones to consider
        if(signInTime.getFullYear<year || (signInTime.getDate<11 && signInTime.getMonth===month)
        || (signInTime.getDate>10 && signInTime.getMonth>(month+1)%12)){
            continue;
        }
        //break when the records are after the intended ones to consider
        else if(signInTime.getMonth !==11 && year === signInTime.getFullYear+1){
            break;
        }
        //the records to be considered
        else{
            if(signInTime!==null && signOutTime!==null){
                //calculate spent hours
                spentHours=spentHours+calculateHoursSpentInRecord(userAttendanceRecords[i]).spentHours;
                spentMinutes=spentMinutes+calculateHoursSpentInRecord(userAttendanceRecords[i].spentMinutes);
                if(signInTime.getDay === 5 || signInTime.getDay ===dayOff){
                    daysOffAttended.push(signInTime.getDate());
                }
                if(prevRecordDate!==signInTime.getDate){
                    attendedDays.push(signInTime.getDate);
                    prevRecordDate===signInTime.getDate;
                } 
            }
        }
    }
    spentHours=spentHours+Math.floor(spentMinutes/60);
    spentMinutes=spentMinutes-Math.floor(spentMinutes/60);
    spentHours=spentHours+(spentMinutes/60);
    //check missing hours and extra hours
    missingHours=getMissingHours(expectedDaysToAttend,spentHours);
    try {
        res.send(missingHours);
    }
    catch (error) {
        console.log(error.message)
        res.send(error);
    }


});

router.route("/extra-hours")
.get(async(req,res)=>{
    let user = await hrMemberModel.findOne({id: token.id});
    if (!user) {
        user = await academicMemberModel.findOne({id: token.id});
    }
    if (!user) {
        res.send("Invalid user id.");
        return;
    }
    let month=req.body.month;
    let year=req.body.year;
    let daysInMonth=getMonthStats(month,year);
    let dayOff=convertDayOff(user.dayOff);
    let firstDay=getFirstDay(daysInMonth);
    let expectedDaysToAttend=getExpectedDaysToAttend(dayOff,firstDay,daysInMonth);
    let userAttendanceRecords=await attendanceRecordModel.find({id:token.id}).sort({signInTime: 1});

    let attendedDays;
    let daysOffAttended;
    let spentHours;
    let spentMinutes;
    let prevRecordDate;
    let missingHours;

     //check which records to consider
     for (var i=0;i<userAttendanceRecords.length();i++){
        let signInTime=new Date(userAttendanceRecords[i].signInTime);
        let signOutTime=new Date(userAttendanceRecords[i].signOutTime);

        //skip the records before the intended ones to consider
        if(signInTime.getFullYear<year || (signInTime.getDate<11 && signInTime.getMonth===month)
        || (signInTime.getDate>10 && signInTime.getMonth>(month+1)%12)){
            continue;
        }
        //break when the records are after the intended ones to consider
        else if(signInTime.getMonth !==11 && year === signInTime.getFullYear+1){
            break;
        }
        //the records to be considered
        else{
            if(signInTime!==null && signOutTime!==null){
                //calculate spent hours
                spentHours=spentHours+calculateHoursSpentInRecord(userAttendanceRecords[i]).spentHours;
                spentMinutes=spentMinutes+calculateHoursSpentInRecord(userAttendanceRecords[i].spentMinutes);
                if(signInTime.getDay === 5 || signInTime.getDay ===dayOff){
                    daysOffAttended.push(signInTime.getDate());
                }
                if(prevRecordDate!==signInTime.getDate){
                    attendedDays.push(signInTime.getDate);
                    prevRecordDate===signInTime.getDate;
                } 
            }
        }
    }
    spentHours=spentHours+Math.floor(spentMinutes/60);
    spentMinutes=spentMinutes-Math.floor(spentMinutes/60);
    spentHours=spentHours+(spentMinutes/60);
    //check missing hours and extra hours
    let extraHours=getExtraHours(expectedDaysToAttend,spentHours);
    try {
        res.send(extraHours);
    }
    catch (error) {
        console.log(error.message)
        res.send(error);
    }

});

module.exports = router;