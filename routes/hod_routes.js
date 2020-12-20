require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");

const router = express.Router();

router.use((req, res, next) => {
    const token = jwt.decode(req.headers.token);
    if (token.role === "Head of Department") {
        next();
    }
    else {
        res.status(403).send("Unauthorized access.");
    }
});

router.route("/view-all-staff")
.get(async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let user = await academicMemberModel.findOne({id:token.id});
    let output= await academicMemberModel.find({department:user.department},{name:1,_id:0,email:1,role:1,faculty:1,department:1,office:1,salary:1})
    res.send(output)
})

router.route("/view-all-staff-dayoff")
.get(async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let user = await academicMemberModel.findOne({id:token.id});
    let output= await academicMemberModel.find({department:user.department},{dayoff:1,_id:0})
    res.send(output)
})

// router.get('/leave-requests/:reqId/accept',async(req,res)=>{
//     let request= await requestModel.findOneAndUpdate({type:'leave',id:req.params.reqId},{status:"Accepted"},{new:true})
//     res.send(request)
// })

// router.get('/leave-requests/:reqId/reject',async(req,res)=>{
//     let request= await requestModel.findOneAndUpdate({type:'leave',id:req.params.reqId},{status:"Rejected",Comment:req.body.comment},{new:true})
//     res.send(request)
// })

// router.get('/leave-requests',async(req,res)=>{
//     const token = jwt.decode(req.headers.token);
//     let hod = await academicMemberModel.findOne({id:token.id});
//     let requests= await requestModel.find({type:'leave'})
//     requests.filter(async(request)=>{
//         let requestor = await academicMemberModel.find({id:request.requestedBy})
//         return requestor.department===hod.department
//     })
//     res.send(requests)
// })

module.exports = router;