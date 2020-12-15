const mongoose = require("mongoose");

const instructorSchema = new mongoose.Schema({
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
        // TODO: check format
    },
    password: {
        type: String,
        required: true
        // TODO: password requirments
    },
    gender: {
        type: String,
        required: true,
        enum : ["Male", "Female"]
    },
    faculty: {
        type: String
        // TODO: find faculties from faculty schema
        // enum:
    },
    department: {
        type: String
        // TODO: find department from department schema
        // enum:
    },
    role: {
        type: String,
        default: "Instructor",
        enum : ["Instructor", "Head of Department"]
    },
    office: {
        type: String,
        required: true
        // TODO: find office from rooms schema
        // enum
    },
    salary: {
        type: Number,
        required: true
    },
    dayOff: {
        type: String,
        enum : ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"]
    },
    leaveBalance: {
        type: Number,
        default: 0
    },
    accidentalLeaveBalance: {
        type: Number,
        default: 6
    },
    remainingHours: {
        type: Number
    }
});

module.exports = mongoose.model("instructor", instructorSchema);