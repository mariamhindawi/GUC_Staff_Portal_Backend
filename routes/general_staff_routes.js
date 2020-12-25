const express = require("express");
const jwt = require("jsonwebtoken");

const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");
const attendanceRecordModel = require("../models/attendance_record_model");
const { requestModel, maternityLeaveModel } = require("../models/request_model");

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

async function getMissingDays(month, year, dayOff, userAttendanceRecords) {
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
            requestedBy: token.id, 
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
                requestedBy: token.id, 
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

function getMissingAndExtraHours(month, year, dayOff, userAttendanceRecords) {
    
    const numberOfDaysInMonth = getNumberOfDaysInMonth(month);
    const expectedDaysToAttend = getExpectedDaysToAttend(dayOff, new Date(year, month, 11).getDay(), numberOfDaysInMonth);
    const numberOfDaysWithExcuse = await getMissingDays(month, year, dayOff, userAttendanceRecords).numberOfDaysWithExcuse;
    const expectedHoursToSpend = (expectedDaysToAttend - numberOfDaysWithExcuse) * 8.4;
    
    let spentHours = 0;
    let spentMinutes = 0;
    let spentSeconds = 0;
    let missingHours = 0;
    let timeDiffInSeconds;

    for (let i = 0; i < userAttendanceRecords.length; i++) {
        let signInTime=userAttendanceRecords[i].signInTime;
        let signOutTime=userAttendanceRecords[i].signOutTime;

        if(signInTime.getHours()>18 || signOutTime.getHours()<7 ||(signOutTime.getHours()===7 && signOutTime.getMinutes()===0 && signOutTime.getSeconds()===0) ){
           timeDiffInSeconds=0;
        }
        else if(signInTime.getHours()<7 && signOutTime.getHours()>19){
         timeDiffInSeconds=12*60*60;
        }
        else if(signInTime.getHours()<7 && signOutTime.getHours()<19){
            let date=signInTime;
            date.setHours(7);
            date.setMinutes(0);
            date.setSeconds(0);
            date.setMilliseconds(0);
            timeDiffInSeconds=(signOutTime-date)/1000;
        }
        else if(signInTime.getHours()>7 && signOutTime.getHours()>19){
            let date=signOutTime;
            date.spentHours(19);
            date.setMinutes(0);
            date.setSeconds(0);
            date.setMilliseconds(0);
            timeDiffInSeconds=(date-signInTime)/1000;
        }
        else{
           timeDiffInSeconds=(signOutTime-signInTime)/1000;
        }
    }

    spentSeconds=spentSeconds+timeDiffInSeconds%60;
    spentMinutes=spentMinutes+(timeDiffInSeconds-spentSeconds)/60;
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

router.route("/view-profile")
.get(async (req, res) => {
    const token = jwt.decode(req.headers.token);
    let user = await hrMemberModel.findOne({id: token.id});
    if (!user) {
        user = await academicMemberModel.findOne({id: token.id});
    }
    let office = await roomModel.findOne({_id: user.office});
    res.send({user: user, office: office});
});

router.route("/view-attendance-records")
.get(async (req,res) => {
    if (!req.body.month && req.body.year) {
        res.send("No month specified");
        return;
    }
    if (req.body.month && !req.body.year) {
        res.send("No year specified");
        return;
    }

    const token = jwt.decode(req.headers.token);
    let user = await hrMemberModel.findOne({id: token.id});
    if (!user) {
        user = await academicMemberModel.findOne({id: token.id});
    }
    
    if (!req.body.month) {
        var userAttendanceRecords = await attendanceRecordModel.find({user: token.id});
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
            { user: token.id, signInTime: {$gte: new Date(year, month, 11), $lt: new Date(year, month+1, 11)} },
            { user: token.id, signOutTime: {$gte: new Date(year, month, 11), $lt: new Date(year, month+1, 11)} }
        ] });
    }
    
    res.send(userAttendanceRecords);
});

router.route("/view-missing-days")
.get(async (req,res) => {
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

    const token = jwt.decode(req.headers.token);
    let user = await hrMemberModel.findOne({id:token.id});
    if (!user) {
        user = await academicMemberModel.findOne({id: token.id});
    }
    
    const dayOff = convertDay(user.dayOff);
    const userAttendanceRecords = await attendanceRecordModel.find({ user: token.id, signInTime: {$ne:null, $gte: new Date(year, month, 11), $lt: new Date(year, month+1, 11)}, signOutTime: {$ne:null} });
    const missingDays = await (await getMissingDays(month, year, dayOff, userAttendanceRecords)).missingDays;

    res.send(missingDays);
});

router.route("/view-hours")
.get(async (req,res) =>{
    const token = jwt.decode(req.headers.token);
    let user = await hrMemberModel.findOne({id: token.id});
    if (!user) {
        user = await academicMemberModel.findOne({id: token.id});
    }
    if (!user) {
        res.send("Invalid user id.");
        return;
    }
    let month;
    let year;
    let userAttendanceRecords;
    let hours;

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
    if(month>=0 && month<11){
        userAttendanceRecords=await attendanceRecordModel.find(
             { $and: [ { user: token.id },{signInTime:{$ne:null}},{signOutTime:{$ne:null}},{signInTime:{$lt:new Date(year,month+1,11),$gte:new Date(year,month,11)}}]})
    }
    else if(month===11){
        userAttendanceRecords=await attendanceRecordModel.find(
            { $and: [ { user: token.id },{signInTime:{$ne:null}},{signOutTime:{$ne:null}},{signInTime:{$lt:new Date(year+1,0,11),$gte:new Date(year,11,11)}}]})
    }

    hours=getMissingAndExtraHours(month,year,userAttendanceRecords,convertDay(user.dayOff));
    try {
        res.send(hours);
    }
    catch (error) {
        console.log(error.message)
        res.send(error);
    }
});

module.exports = router;