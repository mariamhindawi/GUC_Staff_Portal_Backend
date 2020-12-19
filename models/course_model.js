const mongoose = require("mongoose");
//const departmentSchema = require("./department_model");
//const academicMemberSchema = require("./academic_member_model");

const courseSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    instructors: {
        type: [String],
        required: true
    },
    TAs: {
        type: [String],
        required: true
    },
    totalSlotsNumber: {
        type: Number,
        required: true
    },
    courseCoordinator: {
        type: String,
        required: true
    }

})

module.exports = mongoose.model("course", courseSchema);