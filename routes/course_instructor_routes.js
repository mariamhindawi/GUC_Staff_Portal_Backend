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

router.route("/view-staff")
.get(async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let user = await academicMemberModel.findOne({id:token.id});
    let output= await academicMemberModel.find({department:user.department})
    
    res.send(output);
       
})

router.route("/view-staff/:course")
.post(async (req,res) => {
         const token = jwt.decode(req.headers.token);
        let user = await academicMemberModel.findOne({ id: token.id });
        if(!req.params.course){
            res.send('Not all fields are entered.');
            return;
        }
        if (typeof req.params.course !== 'string') {
            res.send('Wrong data types entered.');
            return;
        }
        let course = await courseModel.findOne({name: req.params.course });
        if(!course){
            res.send('Course does not exist.');
            return;
        }
        if(course.department !==user.department){
            res.send("Course does not exist in your department.");
            return;
        }
        let output = [];
        let instructors = await course.courseInstructors;
        let tas = await course.teachingAssistants;

        for (let i = 0; i < instructors.length; i++) {
            let instructor = await academicMemberModel.findOne({ id: instructors[i] });
            output.push(instructor)
        }
        for (let i = 0; i < tas.length; i++) {
            let ta = await academicMemberModel.findOne({ id: tas[i] });
            output.push(ta)
        }
        res.send(output);
});


router.route("/assign-course-coordinator")
.post(async (req,res) => {
    const token = jwt.decode(req.headers.token);
    if(!req.body.course || !req.body.id){
        res.send("Not all fields are entered.");
        return;
    }
    if (typeof req.body.id !== 'string'|| typeof req.body.course !== 'string' ) {
        res.send('Wrong data types entered.');
        return;
    }
    let user = await academicMemberModel.findOne({id:token.id});
    let course=await courseModel.findOne({id:req.body.course})
    let academic=await academicMemberModel.findOne({id:req.body.id});

    if(!course){
        res.send("Course does not exist.");
        return;
    }
    if(!course.courseInstructors.includes(user)){
        res.send("You are not assigned to this course.");
        return;
    }
    if(!academic){
        res.send("Academic does not exist.");
        return;
    }
    if(!course.teachingAssistants.includes(academic) && !course.courseInstructors.includes(academic) ){
        res.send("Academic is not assigned to this course.");
        return;
    }

    course.courseCoordinator=academic;
    academic.role="Course Coordinator";

    try{
        await course.save();
        await academic.save();
        res.send("Course coordinator assigned to course successfully")
    }
    catch (error) {
        console.log(error.message)
        res.status(400).send(error.messages);
    }
})

router.route("/delete-ta-from-course/:id/:course")
.delete(async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let user = await academicMemberModel.findOne({id:token.id});
    let course=await courseModel.findOne({name:req.params.course})
    let ta=await academicMemberModel.findOne({id:req.params.id});

    if(!ta || (ta.role!=="Teaching Assistant"&& ta.role!=="Course Coordinator")){
        res.send("TA does not exist.");
        return;
    }
    if(!course){
        res.send("Course does not exist.");
        return;
    }
    if(!course.includes(user)){
        res.send("You are not assigned to this course.");
        return;
    }
    if(ta.department!==user.department){
        res.send("Cannot add a ta that is not in your department.");
        return;
    }
    if(!course.teachingAssistants.includes(ta)){
        res.send("TA is not assiged to this course");
        return;
    }
    
    const indx = course.teachingAssistants.findIndex(v => v === ta);
    course.courseInstructors.slice(indx,indx+1);
    try{
        await course.save();
        res.send("TA deleted from course successfully");
    }
    catch (error) {
        console.log(error.message)
        res.status(400).send(error.messages);
    }
   
})


router.route("/assign-ta-to-course/:id/:course")
.post(async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let user = await academicMemberModel.findOne({id:token.id});
    let course=await courseModel.findOne({name:req.params.course})
    let ta=await academicMemberModel.findOne({id:req.params.id});

    if(!ta || (ta.role!=="Teaching Assistant"&& ta.role!=="Course Coordinator")){
        res.send("TA does not exist.");
        return;
    }
    if(!course){
        res.send("Course does not exist.");
        return;
    }
    if(!course.includes(user)){
        res.send("You are not assigned to this course.");
        return;
    }
    if(ta.department!==user.department){
        res.send("Cannot add a ta that is not in your department.");
        return;
    }
    
    course.teachingAssistants.push(ta);
    try{
        await course.save();
        res.send("TA assigned to course successfully")
    }
    catch (error) {
        console.log(error.message)
        res.status(400).send(error.messages);
    }
    

   
})

router.route('/view-coverage')
.get(async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let courseInstructor = await academicMemberModel.findOne({id: token.id});
    let courses = await courseModel.find({courseInstructors: courseInstructor.id});
    let coverages = [];
    for( let i = 0; i<courses.length; i++) {
        let unassignedSlots = await slotModel.find({course: courses[i]._id,staffMember: "UNASSIGNED"});
        let totalSlots = await slotModel.find({course: courses[i]._id});
        if (totalSlots.length==0) {
            coverages.push("0%");
        }
        else {
            let coverage = ((totalSlots.length-unassignedSlots.length)/(totalSlots.length))*100;
            coverages.push(Math.round(coverage)+"%");
        }
        
    }
    res.send({courses: courses, coverages: coverages});
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
    let slot = await slotModel.findOne({day: req.body.day,slotNumber: req.body.slotNumber,room: room._id});
    if(! slot) {
        res.body.send("No such slot");
        return;
    }
    if (!(slot.staffMember==="UNASSIGNED")) {
        res.send("Slot already assigned.. try updating it");
        return;
    }
    let otherSlot = await slotModel.findOne({day: req.body.day ,slotNumber: req.body.slotNumber,staffMember: academicMember.id});
    console.log(otherSlot)
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
        res.send('Assigned to slot')
    }
    catch(error)
    {
        res.send(error);
    }
})

router.route('/delete-academic-member-to-slot')
.delete( async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let room = await roomModel.findOne({name: req.body.room});
    let slot = await slotModel.findOne({day: req.body.day,slotNumber: req.body.slotNumber,room: room._id});
    if(! slot) {
        res.send("No such slot");
        return;
    }
    console.log(slot)
    slot.staffMember = "UNASSIGNED";
    try {
        await slot.save();
        res.send('Deleted successfully')

    }
    catch (error) {
        res.send(error);
    }
})

module.exports = router;