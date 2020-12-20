const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    courses: {
        type: [String],
        required: true
    },
    faculty: {
        type: String,
        required: true
    },
    headOfDepartment: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model("department", departmentSchema);