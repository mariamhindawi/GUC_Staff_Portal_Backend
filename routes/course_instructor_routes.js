require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");

const academicMemberModel = require("../models/academic_member_model");
const roomModel = require("../models/room_model");
const courseModel = require("../models/course_model");
const slotModel = require("../models/slot_model");

const router = express.Router();

router.use((req, res, next) => {
    const token = jwt.decode(req.headers.token);
    if (token.role === "Course Instructor" || token.role === "Head of Department") {
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
    try{
        res.send(output)
        }
        catch(error){
            res.send("error")
        }
})



router.route("/view-all-staff-per-course")
.post(async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let user = await academicMemberModel.findOne({id:token.id});
    let course= await courseModel.findOne({department:user.department,name:req.body.course})
    let output=[]
    let instructors= await course.instructors;
    let tas= await course.TAs;
    for(let i=0;i<instructors.length;i++){
        let user = await academicMemberModel.findOne({id:instructors[i]});
        output.push(user)
    }
    for(let i=0;i<tas.length;i++){
        let user = await academicMemberModel.findOne({id:tas[i]});
        output.push(user)
    }
    try{
        res.send(output)
        }
        catch(error){
            res.send("error")
        }
})


router.route("/assign-course-coordinator")
.post(async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let user = await academicMemberModel.findOne({id:token.id});
    let course=await courseModel.findOne({name:req.body.course})
    let instructors=course.instructors
    let ta=req.body.id
    if(user.department===course.department){
        let course=await courseModel.findOneAndUpdate({name:req.body.course}, { courseCoordinator: ta })
    }
    try{
        res.send("Course coordinator assigned to course")
        }
        catch(error){
            res.send("Cannot assign course coordinator")
        }
})

router.route("/delete-academic-member")
.post(async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let user = await academicMemberModel.findOne({id:token.id});
    let course=await courseModel.findOne({name:req.body.course})
    if(ta){
        try{
        if(user.department===course.department){
            let course=await courseModel.findOneAndUpdate({name:req.body.course},{"$pull": { teachingAssistants: req.body.id }})
            res.send("Academic member deleted")
        }
        else{
            res.send("Cannot delete academic member from a course not in your department")
        }
            }
            catch(error){
               res.send("Cannot delete academic member")
            }
        }
        else{
            res.send("TA does not exist")
        }
})


router.route("/add-academic-member")
.post(async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let user = await academicMemberModel.findOne({id:token.id});
    let course=await courseModel.findOne({name:req.body.course})
    let ta=await academicMemberModel.findOne({id:req.body.id});
    if(ta.role==="Teaching Assistant"){
    if(ta){
        if(user.department===course.department){
            if(user.department===ta.department){
            let course=await courseModel.findOneAndUpdate({name:req.body.course},{"$push": { teachingAssistants: req.body.ta }})
            try{
                res.send("Academic member added")
                }
                catch(error){
                    res.send("Cannot delete academic member")
                 }
            }
            else{
                res.send("Can not add academic member not in your department")
            }}
            else{
                res.send("Can not add academic member to course not in your department")
            } 
        }
        else{
            res.send("TA does not exist")
        }
    }
    else{
        res.send("ID is not an ID of a TA")
    }

})

router.route('/view-coverage')
.get(async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let courseInstructor = await academicMemberModel.findOne({id: token.id});
    let courses = await courseModel.find({courseInstructors: courseInstructor.id});
    for( let i = 0; i<courses.length; i++) {
        let unassignedSlots = await slotModel.find({course: courses[i]._id,staffMember: "UNASSIGNED"});
        let totalSlots = await slotModel.find({course: courses[i]._id});
        let coverage = (totalSlots.length-unassignedSlots.length)/(totalSlots.length);
        res.send(courses[i].name+"Course: "+"'s coverage = "+coverage+"%");
    }
})

router.route('/view-teaching-assignments')
.get( async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let courseInstructor = await academicMemberModel.findOne({id: token.id});
    let course = await courseModel.findOne({id: req.body.course,courseInstructors: courseInstructor.id});
    if(!course) {
        res.send("No such course");
        return;
    }
    let slots = await slotModel.find({course: course._id});
    res.body.send(slots); // all info of slots
})

router.route('/assign-academic-member-to-slot')
.put( async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let academicMember = await academicMemberModel.findOne({id: req.body.id});
    if (!academicMember) {
        res.send("No TA with such id");
        return;
    }
    if (!(academicMember.role === "Teaching Assistant" || academicMember.role === "Course Coordinator")) {
        res.send("academic member is not a TA");
        return;
    }
    let room = await roomModel.findOne({name: req.body.room});
    let course = await courseModel.findOne({id: req.body.course});
    let slot = await slotModel.findOne({day: req.body.day,slotNumber: req.body.slotNumber,room: room._id,course: course._id,type: req.body.type});
    if(! slot) {
        res.body.send("No such slot");
        return;
    }
    if (!(slot.staffMember==="UNASSIGNED")) {
        res.send("Slot already assigned.. try updating it");
        return;
    }
    let otherSlot = await slotModel({day: req.body.day ,slotNumber: req.body.slotNumber,staffMember: academicMember.id});
    if (otherSlot) {
        res.send("This TA is assigned to another slot in the same time");
        return;
    }
    slot.staffMember = academicMember.id;
    try {
        await slot.save();
        res.send(slot);
    }
    catch (error) {
        res.body.send(error);
    }
})

router.route('/update-academic-member-to-slot')
.put( async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let academicMember = await academicMemberModel.findOne({id: req.body.id});
    if (!academicMember) {
        res.send("No TA with such id");
        return;
    }
    if (!(academicMember.role === "Teaching Assistant" || academicMember.role === "Course Coordinator")) {
        res.send("academic member is not a TA");
        return;
    }
    let room = await roomModel.findOne({name: req.body.room});
    let course = await courseModel.findOne({id: req.body.course});
    let slot = await slotModel.findOne({day: req.body.day,slotNumber: req.body.slotNumber,room: room._id,course: course._id,type: req.body.type});
    if(!slot) {
        res.body.send("No such slot");
        return;
    }
    slot.staffMember = academicMember.id;
    try {
        await slot.save();
        res.send(slot);
    }
    catch(error)
    {
        res.body.send(error);
    }
})

router.route('/delete-academic-member-to-slot')
.delete( async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let room = await roomModel.findOne({name: req.body.room});
    let course = await courseModel.findOne({id: req.body.course});
    let slot = await slotModel.findOne({day: req.body.day,slotNumber: req.body.slotNumber,room: room._id,course: course._id,type: req.body.type});
    if(! slot) {
        res.send("No such slot");
        return;
    }
    slot.staffMember = "UNASSIGNED";
    try {
        await slot.save();
        res.send(slot);

    }
    catch (error) {
        res.send(error);
    }
})

module.exports = router;