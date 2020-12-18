require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const attendanceRecordModel = require("../models/attendance_record_model");

const router = express.Router();

router.route("/signIn")
.post(async (req,res) => {
    let user = await hrMemberModel.findOne({id: req.body.staffId});
    if (!user) {
        user = await academicMemberModel.findOne({id: req.body.staffId});
    }

    const date=new Date(Date.now()).toLocaleString("en-AU");
    const newRecord = new attendanceRecordModel({
        staffId: req.body.staffId,
        signInTime: date,
        signOutTime: null

    })
    try {
        await newRecord.save();
        res.send(newRecord);
    }
    catch (error) {
        console.log(error.message)
        res.send(error);
    }
});

router.route("/signOut")
.post(async (req,res) => {
    let record = await attendanceRecordModel.findOne({staffId: req.body.staffId});
    const date=new Date(Date.now()).toLocaleString("en-AU");
    let signInDay="";
    let signOutDay="";
    for(var i=0;i<(record.signInTime).length;i++){
   if(record.signInTime.charAt(i)!==","){
    signInDay=signInDay+(record.signInTime).charAt(i);
    signOutDay=signOutDay+date.charAt(i);
   }
   else{
       break;
   }
    }
    if(!record || record.signOutTime!==null || signInDay!==signOutDay){
        res.send("This sign out was not proceeded by a sign in");
        return;
    }
   
   
    record.signOutTime=date;
    try {
        await record.save();
        
        res.send(record);
    }
    catch (error) {
        console.log(error.message)
        res.send(error);
    }
});

module.exports = router;
