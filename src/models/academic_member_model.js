const mongoose = require("mongoose");
const {MongooseAutoIncrementID} = require("mongoose-auto-increment-reworked");

const academicMemberSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String, 
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        required: true,
        enum : ["Male", "Female"]
    },
    role: {
        type: String,
        required: true,
        enum : ["Course Instructor", "Head of Department", "Teaching Assistant", "Course Coordinator"]
    },
    department: {
        type: String,
        required: true,
        default: "UNASSIGNED"
    },
    office: {
        type: String,
        required: true
    },
    salary: {
        type: Number,
        required: true
    },
    dayOff: {
        type: String,
        required: true,
        default: "Saturday",
        enum : ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]
    },
    annualLeaveBalance: {
        type: Number,
        required: true,
        default: 0
    },
    accidentalLeaveBalance: {
        type: Number,
        required: true,
        default: 6
    },
    loggedIn: {
        type: Boolean,
        required: true,
        default: false
    }
});

academicMemberSchema.plugin(MongooseAutoIncrementID.plugin, {
    modelName: "academic_member",
    field: "idCount",
    incrementBy: 1,
    nextCount: "nextCount",
    resetCount: "resetCount",
    startAt: 1,
    unique: true
  });

module.exports = mongoose.model("academic_member", academicMemberSchema);