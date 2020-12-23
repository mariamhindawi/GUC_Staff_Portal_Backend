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
const { ConnectionStates } = require("mongoose");
const attendance_record_model = require("../models/attendance_record_model");
const { request } = require("express");

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

router.route("/attendance-records")
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
});

router.route("/missing-days")
.get(async (req,res) =>{
    const token = jwt.decode(req.headers.token);
    let user = await hrMemberModel.findOne({id:token.id});
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
    let daysOffAttended=[];
    let normalDaysAttended=[];
    let missingDays=[];
    let maxDate;

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
    let dayOff=convertDayOff(user.dayOff);

    if(month>=0 && month<11){
        userAttendanceRecords=await attendance_record_model.find(
             { $and: [ { user: token.id },{signInTime:{$ne:null}},{signOutTime:{$ne:null}},{signInTime:{$lt:new Date(year,month+1,11),$gte:new Date(year,month,11)}}]})
    }
    else if(month===11){
        userAttendanceRecords=await attendance_record_model.find(
            { $and: [ { user: token.id },{signInTime:{$ne:null}},{signOutTime:{$ne:null}},{signInTime:{$lt:new Date(year+1,0,11),$gte:new Date(year,11,11)}}]})
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

                let request= await annualLeaveModel.findOne({requestedBy:token.id,day:date,type:{$ne:"slotLinkingRequest"},type:{$ne:"dayOffChangeRequest"},
                type:{$ne:"maternityLeave"},type:{$ne:"replacementRequest"},status:"Accepted"});
                if(request){
                    if(request.type==="compensationRequest"){
                        if(daysOffAttended.includes(missingDays[i].getDate())){
                                missingDays.slice(i,i+1);
                        }
                    }
                }
                else {
                    request=await annualLeaveModel.find({requestedBy:token.id,type:"maternityLeave",status:"Accepted"});
                    if(request.length>0){
                          maxDate=new Date(new Date().getTime()+(request.duration*24*60*60*1000));
                    }
                    request=await annualLeaveModel.findOne({requestedBy:token.id,day:{$gte:{date},$lte:{maxDate}},type:"maternityLeave",status:"Accepted"});
                    if(request){
                        missingDays.slice(i,i+1);
                    }
                }
            }
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
    let missingHours;

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
        userAttendanceRecords=await attendance_record_model.find(
             { $and: [ { user: token.id },{signInTime:{$ne:null}},{signOutTime:{$ne:null}},{signInTime:{$lt:new Date(year,month+1,11),$gte:new Date(year,month,11)}}]})
    }
    else if(month===11){
        userAttendanceRecords=await attendance_record_model.find(
            { $and: [ { user: token.id },{signInTime:{$ne:null}},{signOutTime:{$ne:null}},{signInTime:{$lt:new Date(year+1,0,11),$gte:new Date(year,11,11)}}]})
    }

    missingHours=getMissingAndExtraHours(month,year,userAttendanceRecords,convertDayOff(user.dayOff)).missingHours;
    try {
        res.send(missingHours+'');
    }
    catch (error) {
        console.log(error.message)
        res.send(error);
    }
});

router.route("/extra-hours")
.get(async(req,res)=>{
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
    let extraHours;
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
        userAttendanceRecords=await attendance_record_model.find(
             { $and: [ { user: token.id },{signInTime:{$ne:null}},{signOutTime:{$ne:null}},{signInTime:{$lt:new Date(year,month+1,11),$gte:new Date(year,month,11)}}]})
    }
    else if(month===11){
        userAttendanceRecords=await attendance_record_model.find(
            { $and: [ { user: token.id },{signInTime:{$ne:null}},{signOutTime:{$ne:null}},{signInTime:{$lt:new Date(year+1,0,11),$gte:new Date(year,11,11)}}]})
    }

        extraHours=getMissingAndExtraHours(month,year,userAttendanceRecords,convertDayOff(user.dayOff)).extraHours;
    try {
        res.send(extraHours+'');
    }
    catch (error) {
        console.log(error.message)
        res.send(error);
    }
});
module.exports = router;