const mongoose = require("mongoose");

const hrSchema = new mongoose.Schema({
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
        required: true,
        // TODO: password requirments
    },
    gender: {
        type: String,
        required: true,
        enum : ["Male", "Female"]
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

module.exports = mongoose.model("hrMember", hrSchema);