const express = require("express");
const jwt = require("jsonwebtoken");

const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");
const attendanceRecordModel = require("../models/attendance_record_model");
const { requestModel, maternityLeaveModel } = require("../models/request_model");
const { ConnectionStates } = require("mongoose");

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

async function getMissingDays(month, year, dayOff, userAttendanceRecords, user) {
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
        res.send( {missingDays: [], numberOfDaysWithExcuse: 0});
    }

    let missingDays = [];
    for (let i = 0; i < numberOfDaysInMonth; i++) {
        let date = new Date(year, month, 11 + i);
        date.setTime(date.getTime()+(1000*60*60*2));
        if (date.getDay() !== 5 && date.getDay() !== dayOff && !normalDaysAttended.includes(date.getDate())) {
            missingDays.push(date);
        }
    }
   let finalMissingDays=[];
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
               
                numberOfDaysWithExcuse++;
            }
        }
        else {
            request = await maternityLeaveModel.findOne({
                requestedBy: user.id, 
                type: "maternityLeave", 
                status: "Accepted",
                day: {$lte: missingDays[i]}
            }).sort({day:-1});
                
            if (request && missingDays[i]<request[0].day.setDate(request[0].day.getDate()+request.duration)) {
                numberOfDaysWithExcuse++;
            }
            else{
                finalMissingDays.push(missingDays[i]);
            }
        }
    }

    return { missingDays: finalMissingDays, numberOfDaysWithExcuse: numberOfDaysWithExcuse };
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
    if (req.body.month===null && req.body.year) {
        res.send("No month specified");
        return;
    }
    if (req.body.month && req.body.year===null) {
        res.send("No year specified");
        return;
    }
    const token = jwt.decode(req.headers.token);
    let user = await hrMemberModel.findOne({id: token.id});
    if (!user) {
        user = await academicMemberModel.findOne({id: token.id});
    }
    
    if (req.body.month===null) {
        var userAttendanceRecords = await attendanceRecordModel.find({user: token.id});
    }
    else {
        if (!req.body.month instanceof Number || !req.body.year instanceof Number) {
            res.send("Wrong data types entered.");
            return;
        }
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
        res.send( {missingDays: [], numberOfDaysWithExcuse: 0});
        return;
    }
    let missingDays = [];
    for (let i = 0; i < numberOfDaysInMonth; i++) {
        let date = new Date(year, month, 11 + i);
        date.setTime(date.getTime()+(1000*60*60*2));
      
        if (date.getDay() !== 5 && date.getDay() !== dayOff && !normalDaysAttended.includes(date.getDate())) {
            missingDays.push(date);
        }
    }
    
    let numberOfDaysWithExcuse = 0;
    let finalMissingDays=[];

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
                numberOfDaysWithExcuse++;
            }
        }
        else {
            request = await maternityLeaveModel.findOne({
                requestedBy: user.id, 
                type: "maternityLeave", 
                status: "Accepted",
                day: {$lte: missingDays[i]}
            }).sort({day:-1});
                
            if (request && missingDays[i]<request[0].day.setDate(request[0].day.getDate()+request.duration)) {
                numberOfDaysWithExcuse++;
            }
            else{
                finalMissingDays.push(missingDays[i]);
            }
        }
        
    }
const x={missingDays:finalMissingDays,numberOfDaysWithExcuse:numberOfDaysWithExcuse}

    res.send(x.missingDays);
});

router.route("/view-hours")
.get(async (req,res) =>{
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
    const numberOfDaysInMonth = getNumberOfDaysInMonth(month);
    const expectedDaysToAttend = getExpectedDaysToAttend(dayOff, new Date(year, month, 11).getDay(), numberOfDaysInMonth);
    
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

    
    if (expectedDaysToAttend === normalDaysAttended.length) {
        res.send( {missingDays: [], numberOfDaysWithExcuse: 0});
        return;
    }

    let missingDays = [];
    for (let i = 0; i < numberOfDaysInMonth; i++) {
        let date = new Date(year, month, 11 + i);
        date.setTime(date.getTime()+(1000*60*60*2));
        if (date.getDay() !== 5 && date.getDay() !== dayOff && !normalDaysAttended.includes(date.getDate())) {
            missingDays.push(date);
        }
    }
    let finalMissingDays=[];
    numberOfDaysWithExcuse = 0;
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
                numberOfDaysWithExcuse++;
            }
        }
        else {
            request = await maternityLeaveModel.findOne({
                requestedBy: user.id, 
                type: "maternityLeave", 
                status: "Accepted",
                day: {$lte: missingDays[i]}
            }).sort({day:-1});
                
            if (request && missingDays[i]<request[0].day.setDate(request[0].day.getDate()+request.duration)) {
                numberOfDaysWithExcuse++;
            }
            else{
                finalMissingDays.push(missingDays[i]);
            }
        }
    }

    var x= { missingDays: finalMissingDays, numberOfDaysWithExcuse: numberOfDaysWithExcuse };
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

    const spentHours = timeDiffInSeconds / 3600;
    if (spentHours > requiredHours) {
       var x ={missingHours: 0, extraHours: spentHours - requiredHours};
    }
    else {
        var x= {missingHours: requiredHours - spentHours, extraHours: 0};
    }

    res.send(x);
});

module.exports = router;