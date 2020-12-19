require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const hrMemberModel = require("../models/hr_member_model");
const academicMemberModel = require("../models/academic_member_model");

const router = express.Router();

router.route("/view-profile")
.get(async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let user = await hrMemberModel.findOne({id:token.id});
    if(user){
    let user1=user.toObject()
    delete user1.password;
    delete user1.__v
    delete user1.idCount
    delete user1._id 
    console.log(user1)
    res.send(user1)}
    else{
        let user2 = await academicMemberModel.findOne({id:token.id});
        console.log(user2)

        if(user2){
            let user3=user2.toObject()
            delete user3.password;
            delete user3.__v
            delete user3.idCount
            delete user3._id 
            res.send(user3)}
            else{
                res.send("error")
            }
    }
})

router.route("/update-profile")
.put(async (req,res) => {
    const token = jwt.decode(req.headers.token);
    let user = await hrMemberModel.findOne({id:token.id});
    let email= req.body.email
    console.log(email)
    if(email){
        user = await hrMemberModel.findOneAndUpdate({id:token.id},{email:email});
    }
    let office=req.body.office
    if(office){
        user = await hrMemberModel.findOneAndUpdate({id:token.id},{office:office});
    }
    let gender=req.body.gender
    if(gender){
        user = await hrMemberModel.findOneAndUpdate({id:token.id},{gender:gender});
    }

    res.send(user)
})

router.route("/reset-password")
.post(async (req,res) => {
    try{
    const token = jwt.decode(req.headers.token);
    let user = await hrMemberModel.findOne({id:token.id});
   const passwordCorrect = await bcrypt.compare(req.body.password, user.password);
    if (!passwordCorrect) {
        res.status(401).send("Wrong password.");
        return;
    }
    else{
    const salt = await bcrypt.genSalt(10);
    const newPassword = await bcrypt.hash(req.body.newpassword, salt);
    user = await hrMemberModel.findOneAndUpdate({id:token.id},{password:newPassword});
    console.log(user.password);
    res.send("Success")
    }
}
    catch(error){
        res.send("Cannot reset password")
    }
})

module.exports = router;