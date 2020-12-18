const mongoose = require("mongoose");
const {MongooseAutoIncrementID} = require('mongoose-auto-increment-reworked');

const hrMemberSchema = new mongoose.Schema({
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
    dayOff: {
        type: String,
        default: "Saturday",
        enum : ["Saturday"]
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

hrMemberSchema.plugin(MongooseAutoIncrementID.plugin, {
    modelName: "hr_member",
    field: "idCount",
    incrementBy: 1,
    nextCount: "nextCount",
    resetCount: "resetCount",
    startAt: 1,
    unique: true
  });

module.exports = mongoose.model("hr_member", hrMemberSchema);